"""Find the Telegram chat that pressed Start on the question-log bot.

Holo sends each visitor question to the owner through the bot in
RESUME_TELEGRAM_BOT. A bot can only message a chat that has opened it, so this
reads the bot's updates and prints the first private chat's id, to be set as
HOLO_TG_CHAT. Exit 0 = found, 1 = nobody has pressed Start yet.

usage: python3 -I agent/tg_chat.py [keys.env]
"""
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path


def token(path: str) -> str:
    if os.environ.get('RESUME_TELEGRAM_BOT'):
        return os.environ['RESUME_TELEGRAM_BOT']
    text = Path(os.path.expanduser(path)).read_text()
    return dict(re.findall(r'^(?:export\s+)?([A-Z0-9_]+)=["\']?([^"\'\n]*)', text, re.MULTILINE))['RESUME_TELEGRAM_BOT']


def main() -> int:
    t = token(sys.argv[1] if len(sys.argv) > 1 else '~/.alibaba/keys.env')
    for attempt in range(5):
        try:
            got = json.load(urllib.request.urlopen(f'https://api.telegram.org/bot{t}/getUpdates', timeout=20))
            break
        except OSError:
            time.sleep(2 * (attempt + 1))
    else:
        print('telegram unreachable', file=sys.stderr)
        return 2
    for u in got['result']:
        chat = (u.get('message') or u.get('my_chat_member') or {}).get('chat', {})
        if chat.get('type') == 'private':
            print(chat['id'])
            return 0
    return 1


if __name__ == '__main__':
    sys.exit(main())
