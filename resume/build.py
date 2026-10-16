"""Write the General Résumé from content/resume.json and content/facts.json.

Out: site/resume.html (the page at /resume.html) and, with --pdf, its A4
print in site/resume.pdf and site/v2media/resume/Yao_Xiang_Resume_General.pdf
(the file the site links). The look is resume/head.html, his 16 Oct page's own styles.

usage: python3 resume/build.py [--pdf] [--check]   (--check: fail if site/resume.html is stale)
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'lib'))
import truth  # noqa: E402

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PAGE = ROOT / 'site/resume.html'
PDFS = [ROOT / 'site/resume.pdf', ROOT / 'site/v2media/resume/Yao_Xiang_Resume_General.pdf']


def item(d: dict) -> str:
    name = f'<a href="{d["href"]}" target="_blank">{d["name"]}</a>' if d.get('href') else d['name']
    tag = f' <span class="tag">{d["tag"]}</span>' if d.get('tag') else ''
    stack = f'''
        <div class="item-stack">
          <strong>Stack:</strong> {d["stack"]}
        </div>''' if d.get('stack') else ''
    bullets = '\n'.join(f'          <li>{b}</li>' for b in d['bullets'])
    return f'''
      <div class="item">
        <div class="item-header">
          <div>
            <span class="item-title">{name}</span> &ndash; <span class="item-role">{d["role"]}</span>{tag}
          </div>
          <span class="item-date">{d["date"]}</span>
        </div>{stack}
        <ul class="bullets">
{bullets}
        </ul>
      </div>
'''


def body(r: dict, f: dict) -> str:
    p, e = f['person'], r['education']
    honors = ''.join(f'''
        <div class="honor-item">
          <span class="honor-title">&bull; {h["text"]}</span>
          <span class="honor-metric">{h["metric"]}</span>
        </div>''' for h in e['honors'])
    roster = ' &bull;\n            '.join(e['roster'])
    skills = ''.join(f'''
        <div class="skill-row">
          <span class="skill-label">{s["label"]}</span>
          <span class="skill-vals">{s["vals"]}</span>
        </div>''' for s in r['skills']['rows'])
    return f'''<body>

  <div class="toolbar no-print">
    <span><strong>{p["name"]}</strong> — {r["toolbar"]}</span>
    <div style="display: flex; gap: 8px;">
      <button class="btn" onclick="window.print()">Print / Save as PDF (A4)</button>
    </div>
  </div>

  <div class="page">
    <!-- Header -->
    <header>
      <h1 class="name">{p["name"]}</h1>
      <div class="contact-bar">
        <span>{p["location"]}</span>
        <span>&bull;</span>
        <a href="mailto:{p["email"]}">{p["email"]}</a>
        <span>&bull;</span>
        <a href="{p["site"]}" target="_blank" class="print-link">{p["site_label"]}</a>
        <span>&bull;</span>
        <a href="{p["github"]}" target="_blank" class="print-link">{p["github_label"]}</a>
        <span>&bull;</span>
        <a href="{p["linkedin"]}" target="_blank" class="print-link">{p["linkedin_label"]}</a>
      </div>
      <div class="summary-text">
        {r["summary"]}
      </div>
    </header>

    <!-- Education & Verified Honors -->
    <section>
      <div class="section-title">
        <span>{e["heading"]}</span>
        {f'<span class="sub">{e["sub"]}</span>' if e.get("sub") else ""}
      </div>
      <div class="item-header">
        <span class="item-title">{e["school"]}</span>
        <span class="item-date">{e["date"]}</span>
      </div>
      <div style="font-size: 8.6pt; color: var(--text-muted); margin-bottom: 5px;">
        {e["detail"]}
      </div>
      <div class="honors-list">{honors}
        <div class="hackathon-roster">
          <span class="roster-label"><strong>{e["roster_label"]}</strong></span>
          <span class="roster-items">
            {roster}
          </span>
        </div>
      </div>
    </section>

    <!-- Work Experience -->
    <section>
      <div class="section-title">
        <span>{r["experience"]["heading"]}</span>
      </div>
{"".join(item(d) for d in r["experience"]["items"])}    </section>

    <!-- Key Engineering Projects -->
    <section>
      <div class="section-title">
        <span>{r["projects"]["heading"]}</span>
      </div>
{"".join(item(d) for d in r["projects"]["items"])}    </section>

    <!-- Technical Skills & Certifications -->
    <section>
      <div class="section-title">
        <span>{r["skills"]["heading"]}</span>
      </div>
      <div class="skills-grid">{skills}
      </div>
    </section>
  </div>

</body>
</html>
'''


def html() -> str:
    r, f = truth.load('resume.json'), truth.facts()
    head = (Path(__file__).parent / 'head.html').read_text()
    head = head.replace('<title></title>', f'<title>{r["title"]}</title>')
    return head + body(r, f)


def pdf(page: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / 'resume.pdf'
        subprocess.run([CHROME, '--headless', '--disable-gpu', '--no-pdf-header-footer',
                        f'--user-data-dir={tmp}/profile', f'--print-to-pdf={out}', page.as_uri()],
                       check=True, capture_output=True, timeout=120)
        pages = out.read_bytes().count(b'/Type /Page') - out.read_bytes().count(b'/Type /Pages')
        if pages != 1:
            raise SystemExit(f'résumé prints to {pages} pages, not 1: shorten a line in content/resume.json')
        for p in PDFS:
            p.write_bytes(out.read_bytes())


if __name__ == '__main__':
    if '--check' in sys.argv:
        if PAGE.read_text() != html():
            raise SystemExit('site/resume.html is not what resume/build.py writes: run python3 build.py --pdf')
        sys.exit()
    PAGE.write_text(html())
    print('wrote', PAGE.relative_to(ROOT))
    if '--pdf' in sys.argv:
        pdf(PAGE)
        print('printed', ', '.join(str(p.relative_to(ROOT)) for p in PDFS))
