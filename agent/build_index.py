"""Embed every fact and prepared phrasing once, into agent/index.json.

Run after any change to content/site.json, holo-facts.json or holo-qa.json;
only what changed is embedded again (each vector is stored with the hash of
its text). The service answers by keyword alone for anything not embedded,
and /api/readyz names it.

usage: NVIDIA_API_KEY=... python agent/build_index.py
"""
from __future__ import annotations

import asyncio
import json
import sys
import time
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
import nim
from knowledge import INDEX, digest, load_facts, load_prepared, pack, unit


async def main() -> None:
    facts = load_facts()
    prepared = load_prepared(facts)
    old = json.loads(INDEX.read_text()) if INDEX.exists() else {'facts': {}, 'phrasings': {}}
    out = {'model': nim.EMBED, 'built': time.strftime('%Y-%m-%d %H:%M'), 'facts': {}, 'phrasings': {}}
    todo_f = []
    for f in facts:
        got = old['facts'].get(f.id)
        if got and got['hash'] == digest(f.embedded) and old.get('model') == nim.EMBED:
            out['facts'][f.id] = got
        else:
            todo_f.append(f)
    phrasings = sorted({q for p in prepared for q in p.q})
    todo_q = []
    for q in phrasings:
        if digest(q) in old['phrasings'] and old.get('model') == nim.EMBED:
            out['phrasings'][digest(q)] = old['phrasings'][digest(q)]
        else:
            todo_q.append(q)
    async with httpx.AsyncClient() as client:
        for i in range(0, len(todo_f), 16):
            batch = todo_f[i:i + 16]
            vecs = await nim.embed(client, [f.embedded for f in batch], 'passage', timeout=60, tries=4)
            for f, v in zip(batch, vecs):
                out['facts'][f.id] = {'hash': digest(f.embedded), 'vec': pack(unit(v))}
        for i in range(0, len(todo_q), 32):
            batch = todo_q[i:i + 32]
            vecs = await nim.embed(client, batch, 'query', timeout=60, tries=4)
            for q, v in zip(batch, vecs):
                out['phrasings'][digest(q)] = pack(unit(v))
    INDEX.write_text(json.dumps(out, separators=(',', ':')))
    print(f'{len(facts)} facts ({len(todo_f)} embedded now), {len(phrasings)} phrasings ({len(todo_q)} now), '
          f'{INDEX.stat().st_size // 1024} KB -> {INDEX}')


if __name__ == '__main__':
    asyncio.run(main())
