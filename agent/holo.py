"""Holo's chat: the site's agent.

One question runs one loop, and each step is streamed to the page as it ends
(server-sent events), so the visitor sees how the answer was made:

  search  keyword + meaning + prepared questions, fused (knowledge.py)
  draft   Holo answers from those facts only (NVIDIA Nemotron 3 Super)
  check   optional (HOLO_CHECK=on): a second model labels each sentence
          with the fact that states it and code drops the unsupported ones;
          off because it did not catch slips in the replay (eval_check.py)
  answer  the text, the facts behind it, page links to them, next questions

If the model is down the visitor still gets the best fact as plain text.
Each question goes to the owner on Telegram. Limits per visitor and per day
keep the free NVIDIA tier alive.

run (dev):  uv run --directory agent uvicorn holo:app --port 8790 --env-file <file>
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import subprocess
import time
from collections import defaultdict, deque
from pathlib import Path

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

import nim
from knowledge import Knowledge, unit, words

# httpx logs each request's URL at INFO and Vercel keeps INFO logs; Telegram's URL carries the bot token
logging.getLogger('httpx').setLevel(logging.WARNING)

HERE = Path(__file__).resolve().parent
PROMPT = (HERE / 'prompt.md').read_text()
SHOTS = json.loads((HERE / 'shots.json').read_text())
KB = Knowledge()
PER_MINUTE = int(os.environ.get('HOLO_PER_MINUTE', '6'))
PER_DAY = int(os.environ.get('HOLO_PER_DAY', '40'))
SITE_PER_DAY = int(os.environ.get('HOLO_SITE_PER_DAY', '600'))
TG_TOKEN = os.environ.get('RESUME_TELEGRAM_BOT', '')
TG_CHAT = os.environ.get('HOLO_TG_CHAT', '')
# The claim check is off: on 23 hand-labelled answers (eval_check.py) it either cut true facts
# from 7 answers or caught none of the 4 slips, and added 2-8 s. Prompt rules at the source did more.
CHECK_ON = os.environ.get('HOLO_CHECK', '') == 'on'


def _version() -> str:
    if os.environ.get('HOLO_VERSION'):
        return os.environ['HOLO_VERSION']
    try:
        return subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=HERE, capture_output=True,
                              text=True, timeout=3, check=False).stdout.strip() or 'unknown'
    except OSError:
        return 'unknown'


VERSION = _version()
app = FastAPI(title='Holo', docs_url=None, redoc_url=None)
origins = [o for o in os.environ.get('HOLO_ORIGINS', '').split(',') if o]
if origins:
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=['GET', 'POST'], allow_headers=['*'])
http = httpx.AsyncClient()


class Turn(BaseModel):
    q: str = Field(max_length=600)
    a: str = Field(max_length=600)
    used: list[str] = Field(default_factory=list, max_length=8)


class Ask(BaseModel):
    q: str = Field(min_length=1, max_length=500)
    history: list[Turn] = Field(default_factory=list, max_length=6)
    asked: list[str] = Field(default_factory=list, max_length=60)
    stop: str | None = Field(default=None, max_length=40)


# --- limits -----------------------------------------------------------------

hits_by_visitor: dict[str, deque] = defaultdict(deque)
site_today = {'day': '', 'n': 0}


def visitor(request: Request) -> str:
    """A short daily pseudonym for the visitor; the address itself is never kept."""
    ip = (request.headers.get('x-forwarded-for') or (request.client.host if request.client else '')).split(',')[-1].strip()
    return hashlib.sha256(f"{time.strftime('%Y-%m-%d')}|{ip}".encode()).hexdigest()[:6]


def over_limit(who: str) -> str | None:
    now, day = time.time(), time.strftime('%Y-%m-%d')
    if site_today['day'] != day:
        site_today.update(day=day, n=0)
        hits_by_visitor.clear()
    seen = hits_by_visitor[who]
    if site_today['n'] >= SITE_PER_DAY:
        return 'site'
    if len(seen) >= PER_DAY:
        return 'day'
    if sum(1 for t in seen if now - t < 60) >= PER_MINUTE:
        return 'minute'
    seen.append(now)
    site_today['n'] += 1
    return None


# --- the loop ---------------------------------------------------------------

def facts_block(hits: list[dict]) -> str:
    return '\n'.join(f"- [{h['id']}] {h['title']}: {h['text']}" for h in hits)


# The model sometimes closes on a line that only sums up ("That's what he did.");
# the owner read these as forced (room/4091). Only such a last sentence goes.
FILLER = re.compile(r"\s*\bThat(?:'s|’s| is| was)\b[^.!?\d]{0,40}[.!]\s*$")


def trim_filler(text: str) -> str:
    m = FILLER.search(text)
    return text[:m.start()].rstrip() if m and m.start() > 0 and len(m.group(0).split()) <= 7 else text


def draft_messages(ask: Ask, hits: list[dict]) -> list[dict]:
    system = (PROMPT + f"\n\nToday is {time.strftime('%d %B %Y')}.\n\n## What you know (for this question)\n"
              + facts_block(hits)
              + '\n\nRemember: at most 50 words, only what you know above, stop when the question is answered, no offer at the end.')
    msgs = [{'role': 'system', 'content': system}]
    for q, a in SHOTS:
        msgs += [{'role': 'user', 'content': q}, {'role': 'assistant', 'content': a}]
    for t in ask.history[-3:]:
        msgs += [{'role': 'user', 'content': t.q}, {'role': 'assistant', 'content': t.a}]
    return msgs + [{'role': 'user', 'content': ask.q}]


CHECK = """Facts (the only things known about Yao Xiang, called Xiang, and about this chat):
{facts}

A visitor asked: {q}
Holo, the wolf who guides visitors on Xiang's site, answered in these numbered sentences:
{sentences}

For each sentence decide two things.
"xiang": true if it states something about Xiang (Yao Xiang), his work, projects, results, dates, numbers, skills or habits, or about how this chat works (models, search, checking). False for Holo's remarks about herself, her own tastes, the visitor, her images, comparisons and teasing ("a wolf keeps a pack"), for saying she doesn't know or hasn't been told, and for pointing to the email button.
"fact": when "xiang" is true, the id of the fact that states it (it may say it in other words, shorter, or in the first person); null if no fact states it or a fact says otherwise (a finalist is not a winner, a team's work is not his alone, a technique belongs only to the project whose fact names it, Holo's tastes are not his, a skill level is not stated unless a fact states it).

Return JSON only, one entry per sentence:
[{{"n": 1, "xiang": true, "fact": "E1a"}}, ...]"""

SENTENCE_END = re.compile(r'(?<=[.!?…])["”’)]?\s+(?=["“‘(*A-Z0-9])')


def sentences(text: str) -> list[str]:
    return [p.strip() for p in SENTENCE_END.split(text.strip()) if p.strip()]


async def check(hits: list[dict], q: str, draft: str, *, thinking: bool = False) -> dict:
    """Label each sentence of the draft (about Xiang? which fact states it?) and drop the unsupported ones.

    The model only labels; code does the cutting, so whatever stays is Holo's
    draft word for word."""
    known = {h['id'] for h in hits}
    parts = sentences(draft)
    numbered = '\n'.join(f'{i}. {p}' for i, p in enumerate(parts, 1))
    msgs = [{'role': 'user', 'content': CHECK.format(facts=facts_block(hits), q=q, sentences=numbered)}]
    try:
        raw, _ = await nim.chat(http, msgs, max_tokens=2000 if thinking else 400, temperature=0.0, thinking=thinking,
                                timeout=8, tries=1, model=nim.CHECK)
        model = nim.CHECK
    except nim.NimError:
        if nim.CHECK == nim.CHAT:
            raise
        raw, _ = await nim.chat(http, msgs, max_tokens=400, temperature=0.0, timeout=8, tries=1)
        model = nim.CHAT
    m = re.search(r'\[.*\]', raw, re.DOTALL)
    try:
        got = json.loads(m.group(0)) if m else None
    except json.JSONDecodeError:
        got = None
    if not isinstance(got, list):
        raise nim.NimError('unreadable verdict')
    label = {x.get('n'): x for x in got if isinstance(x, dict)}
    keep, cut, used = [], [], []
    for i, p in enumerate(parts, 1):
        x = label.get(i, {})
        fact = x.get('fact')
        if x.get('xiang') is True and fact not in known:
            cut.append(p)
            continue
        keep.append(p)
        if fact in known:
            used.append(fact)
    return {'text': ' '.join(keep), 'cut': cut, 'used': list(dict.fromkeys(used)), 'model': model,
            'claims': sum(1 for x in label.values() if x.get('xiang') is True)}


def grounded_in(text: str, hits: list[dict]) -> list[str]:
    """The facts an answer stands on: hits sharing three or more content words with it, and at least 60% as many as the best."""
    said = set(words(text))
    shared = sorted(((len(said & set(words(h['text']))), h['id']) for h in hits), key=lambda x: -x[0])
    best = shared[0][0] if shared else 0
    return [fid for n, fid in shared if n >= max(3, 0.6 * best)]


def links_for(used: list[str]) -> list[dict]:
    seen, out = set(), []
    for fid in used:
        f = KB.by_id[fid]
        if f.to and f.to not in seen:
            seen.add(f.to)
            out.append({'to': f.to, 'label': f.title})
    return out[:3]


def sse(event: str, data: dict) -> str:
    return f'event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n'


async def tell_owner(who: str, ask: Ask, answer: dict) -> bool:
    if not (TG_TOKEN and TG_CHAT):
        return False
    lines = [f'Holo · visitor {who} · at {ask.stop or "?"}', f'Q: {ask.q}', f'A: {answer["text"]}']
    if answer.get('cut'):
        lines.append('check cut: ' + ' | '.join(answer['cut']))
    if answer.get('plain'):
        lines.append('(model down: sent the top fact as plain text)')
    try:
        r = await http.post(f'https://api.telegram.org/bot{TG_TOKEN}/sendMessage', timeout=8,
                            json={'chat_id': TG_CHAT, 'text': '\n'.join(lines)[:3900], 'disable_web_page_preview': True})
        print(f'telegram {r.status_code} visitor {who}', flush=True)
        return r.status_code == 200
    except httpx.HTTPError as e:
        print(f'telegram failed: {type(e).__name__}', flush=True)
        return False


async def run(ask: Ask, who: str):
    t0 = time.perf_counter()
    ms = lambda t: round((time.perf_counter() - t) * 1000)
    asked = set(ask.asked)

    # 1. search
    t = time.perf_counter()
    previous = ask.history[-1].q if ask.history else ''
    qvecs, embed_error = None, None
    try:
        qvecs = await nim.embed(http, [ask.q, f'{previous} {ask.q}'.strip()], 'query')
        qvecs = [unit(v) for v in qvecs]
    except nim.NimError as e:
        embed_error = str(e)
    found = KB.search(ask.q, qvecs)
    hits = found['hits']
    # a follow-up ("what stack does it use?") keeps the facts the last answer stood on
    if ask.history:
        have = {h['id'] for h in hits}
        for fid in [u for u in ask.history[-1].used if u in KB.by_id and u not in have][:4]:
            f = KB.by_id[fid]
            hits.append({'id': f.id, 'title': f.title, 'to': f.to, 'text': f.text, 'score': 0.0,
                         'ranks': {'previous answer': 1}})
    matched = None
    if found['prepared'] and found['prepared'][0][0] >= 0.7:
        matched = found['prepared'][0][1]
        asked.add(matched)
    yield sse('step', {'stage': 'search', 'ms': ms(t), 'of': len(KB.facts), 'lists': found['lists'],
                       'hits': [{k: h[k] for k in ('id', 'title', 'score', 'ranks')} for h in hits],
                       'prepared': matched, 'note': f'meaning search down ({embed_error}); keyword only' if embed_error else None})

    # 2. draft
    t = time.perf_counter()
    try:
        draft, _ = await nim.chat(http, draft_messages(ask, hits), max_tokens=160, temperature=0.5)
        draft = trim_filler(draft)
    except nim.NimError as e:
        top = hits[0] if hits else None
        answer = {'text': top['text'] if top else "Holo can't answer just now; the email button at the bottom of the page reaches Xiang.",
                  'plain': True, 'used': [top['id']] if top else [], 'cut': []}
        yield sse('step', {'stage': 'draft', 'ms': ms(t), 'model': nim.CHAT, 'error': str(e).split(' ')[0][:40]})
        answer.update(links=links_for(answer['used']), chips=KB.chips(qvecs[0] if qvecs else None, asked, ask.stop),
                      matched=matched, ms=ms(t0))
        yield sse('answer', answer)
        await tell_owner(who, ask, answer)
        return
    yield sse('step', {'stage': 'draft', 'ms': ms(t), 'model': nim.CHAT})

    # 3. check (off by default, see CHECK_ON)
    checked, check_error = None, None
    text, cut, used = draft, [], grounded_in(draft, hits)
    if CHECK_ON:
        t = time.perf_counter()
        try:
            checked = await check(hits, ask.q, draft)
        except nim.NimError as e:
            check_error = str(e)[:160]
        if checked and checked['text']:
            text, cut, used = checked['text'], checked['cut'], checked['used']
        yield sse('step', {'stage': 'check', 'ms': ms(t), 'model': checked['model'] if checked else nim.CHECK,
                           'claims': checked['claims'] if checked else None,
                           'cut': cut, 'changed': text != draft, 'error': check_error})

    answer = {'text': text, 'used': used, 'cut': cut, 'draft': draft if text != draft else None,
              'links': links_for(used), 'chips': KB.chips(qvecs[0] if qvecs else None, asked, ask.stop),
              'matched': matched, 'ms': ms(t0), 'checked': checked is not None}
    yield sse('answer', answer)
    await tell_owner(who, ask, answer)


@app.post('/api/ask')
async def ask_holo(ask: Ask, request: Request):
    who = visitor(request)
    limit = over_limit(who)
    if limit:
        wait = {'minute': 'a minute', 'day': 'tomorrow', 'site': 'tomorrow'}[limit]
        return JSONResponse({'limit': limit, 'wait': wait}, status_code=429)
    return StreamingResponse(run(ask, who), media_type='text/event-stream',
                             headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})


@app.get('/api/healthz')
async def healthz():
    return {'ok': True}


@app.get('/api/readyz')
async def readyz():
    ready = bool(os.environ.get('NVIDIA_API_KEY')) and not KB.stale
    body = {'ok': ready, 'facts': len(KB.facts), 'prepared': len(KB.prepared), 'stale': KB.stale[:10],
            'key': bool(os.environ.get('NVIDIA_API_KEY')), 'telegram': bool(TG_TOKEN and TG_CHAT)}
    return JSONResponse(body, status_code=200 if ready else 503)


@app.get('/api/version')
async def version():
    return {'version': VERSION, 'model': nim.CHAT, 'embed': nim.EMBED}
