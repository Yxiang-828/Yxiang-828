"""Put a "this page has moved" bar on every page of the old site.

The old portfolio, https://yxiang-828.github.io (repo Yxiang-828.github.io,
branch main), went out in internship applications, so its pages stay up; each
one gets a bar over everything that links to the same page on the new site
(facts.json person.site): projects/X.html to /projects/X.html, the résumé
pages to /resume.html, anything else to the home page. The home page keeps
the bar it got on 15 Oct (c02885c there). Run again to update: the bar sits
between markers and is replaced, never stacked.

usage: python3 github-io/notice.py <checkout of Yxiang-828.github.io main>
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'lib'))
import truth  # noqa: E402

START, END = '<!-- moved-bar: github-io/notice.py in Yxiang-828/Yxiang-828 -->', '<!-- /moved-bar -->'
RESUME = {'resume.html', 'cv.html', 'resume_old.html'}

# Fixed bar; its height (it wraps on a phone) is written to --moved-h so the
# page and its own fixed nav start below it instead of under it.
BAR = START + '''
<style>
#moved-bar{position:fixed;top:0;left:0;right:0;z-index:2147483000;display:flex;flex-wrap:wrap;gap:0 .35em;align-items:center;justify-content:center;box-sizing:border-box;min-height:56px;margin:0;padding:8px 14px;background:#FF1E56;color:#fff;font:600 clamp(15px,2.3vw,22px)/1.3 Inter,system-ui,-apple-system,sans-serif;letter-spacing:0;text-align:center;text-decoration:none;visibility:visible!important;opacity:1!important}
#moved-bar b{font-weight:800;text-decoration:underline;text-underline-offset:4px;overflow-wrap:anywhere}
body{padding-top:var(--moved-h,56px)!important}
body>nav,.glass-nav{top:var(--moved-h,56px)!important}
</style>
<a id="moved-bar" href="{url}">This page has moved to <b>{label}</b> &rarr;</a>
<script>(function(){{var b=document.getElementById('moved-bar');function h(){{document.documentElement.style.setProperty('--moved-h',b.offsetHeight+'px')}}h();addEventListener('resize',h)}})()</script>
''' + END


def target(rel: str) -> str:
    name = Path(rel).name
    if name in RESUME:
        return '/resume.html'
    page = 'projects/' + name
    if '/projects/' in '/' + rel and (ROOT / 'site' / page).exists():
        return '/' + page
    return '/'


def apply(checkout: Path) -> list[tuple[str, str]]:
    site = truth.facts()['person']['site']
    done = []
    for p in sorted(checkout.rglob('*.html')):
        rel = p.relative_to(checkout).as_posix()
        if rel == 'index.html' or '/node_modules/' in '/' + rel:
            continue
        html = p.read_text()
        html = re.sub(re.escape(START) + r'.*?' + re.escape(END) + r'\n?', '', html, flags=re.S)
        m = re.search(r'<body[^>]*>', html)
        if not m:
            raise SystemExit(f'{rel}: no <body>')
        path = target(rel)
        url = site + path
        label = url.split('://', 1)[1].rstrip('/')
        bar = BAR.replace('{url}', url).replace('{label}', label).replace('{{', '{').replace('}}', '}')
        p.write_text(html[:m.end()] + '\n' + bar + '\n' + html[m.end():])
        done.append((rel, path))
    return done


if __name__ == '__main__':
    for rel, path in apply(Path(sys.argv[1]).resolve()):
        print(f'{rel} -> {path}')
