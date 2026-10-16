"""Read content/ with every {{path}} filled from content/facts.json.

facts.json is the one place a shared fact is written (who, links, roles and
their dates, education, projects, hackathons). Any other content file, and the
résumé, profile README and redirect templates, refer to it as {{path}} or
{{path|fmt}}; lib/truth.mjs does the same for the page's build, and build.py
checks that both give the same text.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'content'
TOKEN = re.compile(r'\{\{\s*([\w.]+)\s*(?:\|\s*(\w+)\s*)?\}\}')
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
          'August', 'September', 'October', 'November', 'December']


def fmt(value, how: str | None, path: str) -> str:
    if how is None:
        return str(value)
    if how == 'url':  # inside a link's query: spaces as +, like encodeURIComponent
        return quote(str(value), safe="-_.!~*'()").replace('%20', '+')
    if value == 'present':
        return 'Present'
    m = re.fullmatch(r'(\d{4})-(\d{2})', str(value))
    if not m:
        raise ValueError(f'{{{{{path}|{how}}}}}: {value!r} is not YYYY-MM')
    year, month = m.group(1), MONTHS[int(m.group(2)) - 1]
    if how == 'mon':
        return f'{month[:3]} {year}'
    if how == 'month':
        return f'{month} {year}'
    if how == 'm':
        return month[:3]
    if how == 'mm':
        return month
    if how == 'y':
        return year
    raise ValueError(f'{{{{{path}|{how}}}}}: unknown format {how!r} (mon, month, m, mm, y, url)')


def facts() -> dict:
    return json.loads((CONTENT / 'facts.json').read_text())


def lookup(data: dict, path: str):
    node = data
    for part in path.split('.'):
        if isinstance(node, list) and part.isdigit():
            node = node[int(part)]
        elif isinstance(node, dict) and part in node:
            node = node[part]
        else:
            raise KeyError(f'{{{{{path}}}}} is not in content/facts.json')
    if isinstance(node, (dict, list)):
        raise KeyError(f'{{{{{path}}}}} is a group, not a value')
    return node


def fill(text: str, data: dict | None = None) -> str:
    data = data if data is not None else facts()
    return TOKEN.sub(lambda m: fmt(lookup(data, m.group(1)), m.group(2), m.group(1)), text)


def resolve(node, data: dict | None = None):
    data = data if data is not None else facts()
    if isinstance(node, str):
        return fill(node, data)
    if isinstance(node, list):
        return [resolve(x, data) for x in node]
    if isinstance(node, dict):
        return {k: resolve(v, data) for k, v in node.items()}
    return node


def load(name: str):
    """content/<name> parsed, with its {{tokens}} filled."""
    return resolve(json.loads((CONTENT / name).read_text()))


if __name__ == '__main__':
    import sys
    print(json.dumps(load(sys.argv[1]), ensure_ascii=False, indent=2))
