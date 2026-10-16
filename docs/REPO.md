# How this repo fits together

One repo for everything about Yao Xiang that a visitor reads: the GitHub
profile page (`README.md`), the website at https://yxiang-828.vercel.app, its
guide Holo, and the résumé. They all come from `content/`, and the shared
facts (names, links, job titles and dates, education, projects, hackathons)
are written once, in `content/facts.json`.

```
content/facts.json     the base truth; every other file writes {{path}} into it
content/site.json      the website's text (cards, sections, Holo's page lines)
content/holo-*.json    Holo's facts and prepared answers
content/resume.json    the résumé's text
content/media.json     which picture goes where
lib/truth.py, .mjs     fill {{path}} from facts.json (Python for Holo, résumé,
                       README; JS for the website build); build.py checks both
                       give the same text
lib/check.mjs          the build's last step: fails on a stale value, a link to
                       the old site, an unfilled {{path}} or a dead link
site/                  the website (Vite + React); site/projects/ the project
                       pages, site/v2media/ its pictures and videos
agent/, api/           Holo (FastAPI); api/index.py is the Vercel function
resume/build.py        content/resume.json -> site/resume.html (+ PDF)
profile/               README.template.md -> README.md, and the profile banner
github-io/             the notice every page of the old yxiang-828.github.io
                       carries, pointing to its page here
```

## Change a fact

Edit `content/facts.json` (or the text file that holds the line), then

```
python3 build.py          # résumé page, README.md, the site, then the check
python3 build.py --pdf    # also re-print the résumé PDF (needs Chrome, macOS)
python3 build.py --check  # write nothing; fail if anything generated is stale
```

Commit what it wrote (`README.md`, `site/resume.html`, the PDFs). A value that
was once true and must never come back goes in `facts.json` `stale.values`.

## Run it locally

```
cd site && npm ci && npm run dev     # page on http://127.0.0.1:4871
agent/dev.sh                         # Holo on :8790 (keys from ~/.alibaba/keys.env)
agent/dev.sh index                   # re-embed Holo's facts after editing them
```

## Deploy

Vercel project `yxiang-828`, deployed from a commit of this repo with the
Vercel CLI (`vercel.json`: install and build in `site/`, output `site/dist`,
Holo as the Python function `api/index.py`). The build runs `lib/check.mjs`,
so a stale fact stops the deploy.

## The old site

https://yxiang-828.github.io (repo `Yxiang-828.github.io`) is the old
portfolio, kept because links to it went out in applications. It is archived:
every page there carries a bar to the same page here (`github-io/notice.py`).
Its history up to the move stays in that repo.
