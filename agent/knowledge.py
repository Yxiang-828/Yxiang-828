"""What Holo knows, and how a question finds it.

Knowledge = the page's own lines (content/site.json, each with its id) plus the
plain facts the page leaves implicit (content/holo-facts.json). Prepared
questions (content/holo-qa.json) point at those ids. Nothing else.

A question finds its facts three ways, fused with Reciprocal Rank Fusion:
keyword (BM25 over the facts), meaning (cosine between the question's
embedding and each fact's), and the prepared questions nearest in meaning,
whose facts come in their stated order. A second meaning list embeds the
previous question with this one, so "what stack does it use?" still finds
the project the visitor was asking about.
"""
from __future__ import annotations

import base64
import hashlib
import json
import math
import re
import struct
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'lib'))
import truth  # noqa: E402  content/ with {{facts}} filled from content/facts.json

SITE = Path(__file__).resolve().parent.parent
CONTENT = SITE / 'content'
INDEX = Path(__file__).resolve().parent / 'index.json'
DIM = 2048
RRF_K = 60
PINNED = 0.8  # cosine to a prepared phrasing; paraphrases scored 0.85-0.99, other questions under 0.6


@dataclass(frozen=True)
class Fact:
    id: str
    title: str      # short label for the trace and the page link
    to: str | None  # the page stop that shows it
    text: str

    @property
    def embedded(self) -> str:
        return f'{self.title}: {self.text}'


@dataclass(frozen=True)
class Prepared:
    id: str
    to: str | None
    src: tuple[str, ...]
    q: tuple[str, ...]


def digest(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def load_facts() -> list[Fact]:
    site = truth.load('site.json')
    out: list[Fact] = []
    for line in site['intro']['intro']:
        # the page's intro is in his own "I"; a copied "I" had Holo speak as him, so she reads the third person
        out.append(Fact(line['id'], 'About', 'intro', line.get('holo') or line['text']))
    exp = site['experience']
    for job, title in ((exp['kabam'], 'KABAM'), (exp['ta'], 'Teaching')):
        head = f"{job['title']} ({job['when']})"
        out.append(Fact(job['id'], title, 'experience', f"{head}. Stack: {', '.join(job['stack'])}."))
        for b in job['bullets']:
            out.append(Fact(b['id'], title, 'experience', f'{head}, in his words: {b["text"]}'))
    for p in site['projects']:
        head = f"{p['title']} ({p['tag']})"
        # `more`: lines kept off the tour card (they are on the project's own page)
        lines = [x for x in [p.get('what'), *(p.get('bullets') or []), p.get('fleet'), *(p.get('more') or [])] if x]
        for i, line in enumerate(lines):
            text = f'{head}, in his words: {line["text"]}'
            if i == 0:
                text += f" Stack: {', '.join(p['stack'])}."
                text += ''.join(f" {link['text']}: {link['href']}." for link in p['links'])
            out.append(Fact(line['id'], p['title'], p['id'], text))
    hack = site['sections']['hackathons']
    for r in hack['results']:
        note = f" ({r['note']})" if r.get('note') else ''
        out.append(Fact(r['id'], 'Hackathons', 'hackathons', f"Hackathon: {r['year']} {r['name']}, {r['result']}{note}."))
    out.append(Fact(hack['also']['id'], 'Hackathons', 'hackathons', hack['also']['text']))
    for c in hack['certs']:
        out.append(Fact(c['id'], 'Certificates', 'hackathons',
                        f"Certificate: {c['name']} ({c['year']}), Coursera, verify at {c['verify']}."))
    # F11 lists every project with its card line, so "which is his best?" has something to rest on
    # (with names only she was handed no project at all and refused, room/4546)
    cards = '; '.join(f"{p['title']} ({p['tag']})" for p in site['projects'])
    for f in truth.load('holo-facts.json')['facts']:
        out.append(Fact(f['id'], f['title'], f['to'], f['text'].replace("[each project's card line]", cards)))
    ids = [f.id for f in out]
    assert len(ids) == len(set(ids)), 'duplicate fact ids'
    return out


def load_prepared(facts: list[Fact]) -> list[Prepared]:
    known = {f.id for f in facts}
    out = []
    for item in truth.load('holo-qa.json')['qa']:
        missing = [s for s in item['src'] if s not in known]
        assert not missing, f"{item['id']} points at unknown facts {missing}"
        out.append(Prepared(item['id'], item['to'], tuple(item['src']), tuple(item['q'])))
    return out


# --- vectors ----------------------------------------------------------------

def pack(vec: list[float]) -> str:
    return base64.b64encode(struct.pack(f'<{len(vec)}e', *vec)).decode()


def unpack(blob: str) -> list[float]:
    raw = base64.b64decode(blob)
    return list(struct.unpack(f'<{len(raw) // 2}e', raw))


def unit(vec: list[float]) -> list[float]:
    n = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / n for x in vec]


def dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


# --- keyword ----------------------------------------------------------------

WORD = re.compile(r"[a-z0-9][a-z0-9+#.\-]*[a-z0-9+#]|[a-z0-9]")
STOP = {'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'did', 'do', 'does', 'for', 'from', 'has', 'have', 'he', 'his', 'how', 'i', 'in', 'is', 'it', 'its', 'me', 'my', 'of', 'on', 'or', 'she', 'so', 'that', 'the', 'their', 'them', 'they', 'this', 'to', 'was', 'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'you', 'your', 'about', 'can', 'tell'}


def words(text: str) -> list[str]:
    return [w for w in WORD.findall(text.lower()) if w not in STOP]


class BM25:
    def __init__(self, docs: list[list[str]], k1: float = 1.5, b: float = 0.75):
        self.docs, self.k1, self.b = [Counter(d) for d in docs], k1, b
        self.len = [len(d) for d in docs]
        self.avg = sum(self.len) / max(len(docs), 1)
        df = Counter(w for d in docs for w in set(d))
        n = len(docs)
        self.idf = {w: math.log(1 + (n - c + 0.5) / (c + 0.5)) for w, c in df.items()}

    def scores(self, query: list[str]) -> list[float]:
        out = []
        for tf, ln in zip(self.docs, self.len):
            s = 0.0
            for w in query:
                if w in tf:
                    f = tf[w]
                    s += self.idf[w] * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * ln / self.avg))
            out.append(s)
        return out


# --- the store --------------------------------------------------------------

def ranked(scores: list[float], floor: float = 0.0, top: int = 20) -> list[int]:
    order = sorted(range(len(scores)), key=lambda i: -scores[i])
    return [i for i in order[:top] if scores[i] > floor]


class Knowledge:
    def __init__(self):
        self.facts = load_facts()
        self.by_id = {f.id: f for f in self.facts}
        self.prepared = load_prepared(self.facts)
        self.bm25 = BM25([words(f'{f.title} {f.text}') for f in self.facts])
        self.fact_vec: dict[str, list[float]] = {}
        self.q_vec: list[tuple[int, list[float]]] = []  # (prepared index, phrasing vector)
        self.stale: list[str] = []
        stored = json.loads(INDEX.read_text()) if INDEX.exists() else {'facts': {}, 'phrasings': {}}
        for f in self.facts:
            got = stored['facts'].get(f.id)
            if got and got['hash'] == digest(f.embedded):
                self.fact_vec[f.id] = unpack(got['vec'])
            else:
                self.stale.append(f.id)
        for i, p in enumerate(self.prepared):
            for q in p.q:
                got = stored['phrasings'].get(digest(q))
                if got:
                    self.q_vec.append((i, unpack(got)))
                else:
                    self.stale.append(f'{p.id}:{q}')

    def search(self, question: str, qvecs: list[list[float]] | None, k: int = 6) -> dict:
        """Fuse keyword, meaning and prepared-question rankings; return the top k facts with how each got there."""
        lists: dict[str, list[str]] = {}
        lists['keyword'] = [self.facts[i].id for i in ranked(self.bm25.scores(words(question)))]
        best_prepared: list[tuple[float, int]] = []
        if qvecs:
            ids = [f.id for f in self.facts if f.id in self.fact_vec]
            for name, vec in zip(('meaning', 'meaning+previous'), qvecs):
                sims = [dot(vec, self.fact_vec[i]) for i in ids]
                lists[name] = [ids[j] for j in ranked(sims, floor=-1.0)]
            sims: dict[int, float] = {}
            for i, v in self.q_vec:
                s = dot(qvecs[0], v)
                sims[i] = max(s, sims.get(i, -1.0))
            best_prepared = sorted(((s, i) for i, s in sims.items()), reverse=True)
            lists['prepared'] = [s for _, i in best_prepared[:3] for s in self.prepared[i].src]
        fused: dict[str, float] = {}
        where: dict[str, dict[str, int]] = {}
        for name, ids in lists.items():
            seen = set()
            for rank, fid in enumerate(i for i in ids if not (i in seen or seen.add(i))):
                fused[fid] = fused.get(fid, 0.0) + 1.0 / (RRF_K + rank + 1)
                where.setdefault(fid, {})[name] = rank + 1
        top = sorted(fused, key=lambda i: -fused[i])
        # a visitor asking a prepared question, in any words, gets all of its facts
        if best_prepared and best_prepared[0][0] >= PINNED:
            pinned = list(self.prepared[best_prepared[0][1]].src)
            for fid in pinned:
                where.setdefault(fid, {})['pinned'] = 1
            top = pinned + [i for i in top if i not in pinned]
        top = top[:k]
        return {
            'hits': [{'id': i, 'title': self.by_id[i].title, 'to': self.by_id[i].to,
                      'text': self.by_id[i].text, 'score': round(fused.get(i, 0.0), 4), 'ranks': where[i]} for i in top],
            'prepared': [(round(s, 3), self.prepared[i].id) for s, i in best_prepared[:5]],
            'lists': {name: len(ids) for name, ids in lists.items()},
        }

    def chips(self, qvec: list[float] | None, asked: set[str], stop: str | None, n: int = 3) -> list[dict]:
        """Prepared questions to offer next: nearest in meaning to what was just asked, not yet asked."""
        if qvec is None:
            pool = [p for p in self.prepared if p.to == stop] + [p for p in self.prepared if p.to != stop]
        else:
            sims: dict[int, float] = {}
            for i, v in self.q_vec:
                sims[i] = max(dot(qvec, v), sims.get(i, -1.0))
            pool = [self.prepared[i] for i in sorted(sims, key=lambda i: -sims[i])]
        out, used_src = [], set()
        for p in pool:
            if p.id in asked or set(p.src) <= used_src:
                continue
            out.append({'id': p.id, 'q': p.q[0]})
            used_src |= set(p.src)
            if len(out) == n:
                break
        return out
