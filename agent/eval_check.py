"""Replay the fact-check on the drafts of a saved eval run, against hand labels.

A label says whether the draft holds a claim about Xiang that no fact supports
(graded by hand from runs/eval-20261015-100017.json). A good check cuts
exactly those and leaves every other draft word for word.

usage: python eval_check.py runs/<eval>.json [--thinking]
"""
from __future__ import annotations

import asyncio
import json
import sys
import time
from pathlib import Path

import holo

# draft holds an unsupported claim about Xiang (by hand, 15 Oct)
UNSUPPORTED = {
    'explain transformers to me': 'says Xiang works with and builds transformers',
    "what's his favourite food?": "gives him Holo's tastes (bread, meat, wine, honey)",
    'is he good at C++?': 'infers his C++ level from debugging on the Jetson',
    'are you chatgpt?': "'the words are his': the model writes them",
}


async def main() -> None:
    run = json.loads(Path(sys.argv[1]).read_text())
    thinking = '--thinking' in sys.argv
    good = bad = 0
    rows = []
    for item in run:
        a = item.get('answer')
        if not a:
            continue
        draft = a.get('draft') or a['text']
        ids = [h['id'] for h in item['steps'][0]['hits']]
        hits = [{'id': i, 'title': holo.KB.by_id[i].title, 'text': holo.KB.by_id[i].text} for i in ids]
        t = time.perf_counter()
        try:
            got = await holo.check(hits, item['q'], draft, thinking=thinking)
        except Exception as e:  # noqa: BLE001
            got = {'text': draft, 'cut': [f'ERROR {e}'], 'used': [], 'claims': 0}
        secs = time.perf_counter() - t
        expect = item['q'] in UNSUPPORTED
        cut = bool(got['cut'])
        ok = cut == expect
        good += ok
        bad += not ok
        rows.append({'q': item['q'], 'expect_cut': expect, 'cut': got['cut'], 'final': got['text'], 'ok': ok,
                     's': round(secs, 1)})
        print(f"{'ok ' if ok else 'BAD'} {secs:4.1f}s  {item['q']}\n     cut {got['cut']}\n     -> {got['text']}\n", flush=True)
    secs = sorted(r['s'] for r in rows)
    print(f'{holo.nim.CHECK} thinking={thinking}: {good} right, {bad} wrong of {good + bad}; median {secs[len(secs) // 2]} s, max {secs[-1]} s')
    out = sys.argv[1].replace('.json', f'-check-{holo.nim.CHECK.split("/")[-1]}{"-think" if thinking else ""}.json')
    Path(out).write_text(json.dumps(rows, indent=1, ensure_ascii=False))


if __name__ == '__main__':
    asyncio.run(main())
