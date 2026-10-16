#!/bin/sh
# Local run of Holo's agent on 127.0.0.1:8790 (the Vite dev/preview server
# proxies /api here). Keys come from the owner's keys file; Holo's own
# settings (HOLO_TG_CHAT, limits) from agent/.env, which git ignores.
cd "$(dirname "$0")" || exit 1
set -a
. "${KEYS:-$HOME/.alibaba/keys.env}"
[ -f .env ] && . ./.env
set +a
case "$1" in
  index) exec uv run python build_index.py ;;
  eval) shift; exec uv run python eval.py "$@" ;;
  *) exec uv run uvicorn holo:app --host 127.0.0.1 --port "${PORT:-8790}" ;;
esac
