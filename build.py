"""Build everything this repo serves from content/, then check it.

  1. site/resume.html from content/resume.json (resume/build.py; --pdf also
     re-prints the PDFs with Chrome, which only this Mac has),
  2. README.md, the GitHub profile page (profile/build.py),
  3. Holo's reader (lib/truth.py) and the page's (lib/truth.mjs) must fill
     every content/*.json the same,
  4. the site (site/, npm run build), whose last step is lib/check.mjs.

usage: python3 build.py [--pdf] [--check]
  --check  write nothing: fail if README.md or site/resume.html is not what
           its builder writes, then build and check the site.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'lib'))
import truth  # noqa: E402


def run(*cmd: str, cwd: Path = ROOT) -> None:
    print('$', ' '.join(cmd), flush=True)
    subprocess.run(cmd, cwd=cwd, check=True)


def same_in_both() -> None:
    for f in sorted((ROOT / 'content').glob('*.json')):
        if f.name == 'facts.json':
            continue
        js = subprocess.run(['node', 'lib/truth.mjs', f.name], cwd=ROOT, check=True,
                            capture_output=True, text=True).stdout
        if json.loads(js) != truth.load(f.name):
            raise SystemExit(f'content/{f.name}: lib/truth.py and lib/truth.mjs fill it differently')
    print('truth.py and truth.mjs fill content/ the same')


if __name__ == '__main__':
    check = ['--check'] if '--check' in sys.argv else []
    run(sys.executable, 'resume/build.py', *check, *(['--pdf'] if '--pdf' in sys.argv and not check else []))
    run(sys.executable, 'profile/build.py', *check)
    same_in_both()
    if not (ROOT / 'site/node_modules').exists():
        run('npm', 'ci', '--no-audit', '--no-fund', cwd=ROOT / 'site')
    run('npm', 'run', 'build', cwd=ROOT / 'site')
