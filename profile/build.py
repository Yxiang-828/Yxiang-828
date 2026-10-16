"""Write README.md, the GitHub profile page, from profile/README.template.md.

The template is his profile README with every shared fact written as {{path}}
into content/facts.json (lib/truth.py fills them), and the hackathon table
built from facts.json hackathons.list, so the profile cannot drift from the
site, Holo and the résumé again (16 Oct: it still said "Intern", Matrix-4, the
old LinkedIn and github.io links).

usage: python3 profile/build.py [--check]   (--check: fail if README.md is stale)
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'lib'))
import truth  # noqa: E402

MARK = '<!-- hackathons: rows from content/facts.json hackathons.list -->'


def table(f: dict) -> str:
    rows = ['| Year | Hackathon | Project |', '| --- | --- | --- |']
    for h in f['hackathons']['list']:
        name = f'**{h["name"]} — {h["result"]}**' if h.get('result') else h['name']
        rows.append(f'| {h["year"]} | {name} | {h["project"]} |')
    return '\n'.join(rows)


def readme() -> str:
    f = truth.facts()
    text = (Path(__file__).parent / 'README.template.md').read_text()
    assert text.count(MARK) == 1, f'{MARK} must be in the template once'
    return truth.fill(text.replace(MARK, table(f)), f)


if __name__ == '__main__':
    out, text = ROOT / 'README.md', readme()
    if '--check' in sys.argv:
        if out.read_text() != text:
            raise SystemExit('README.md is not what profile/build.py writes: run python3 build.py')
    else:
        out.write_text(text)
        print('wrote README.md')
