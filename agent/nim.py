"""NVIDIA's hosted models (build.nvidia.com, OpenAI-style API): chat and embeddings."""
from __future__ import annotations

import asyncio
import os
import time

import httpx

BASE = 'https://integrate.api.nvidia.com/v1'
# 3.5 Super takes her persona lines; 3 Super ignored them (0/24 lines to the visitor, room/4517)
CHAT = os.environ.get('HOLO_MODEL', 'nvidia/nemotron-3.5-super-vl-120b-a12b')
# 3.5 Super returned HTTP 500 on 5 of 51 calls on 17 Oct; a failed call goes once to this model
FALLBACK = os.environ.get('HOLO_FALLBACK_MODEL', 'nvidia/nemotron-3-super-120b-a12b')
CHECK = os.environ.get('HOLO_CHECK_MODEL', 'nvidia/nemotron-3-ultra-550b-a55b')
EMBED = os.environ.get('HOLO_EMBED', 'nvidia/nemotron-3-embed-1b')


class NimError(RuntimeError):
    pass


def _key() -> str:
    key = os.environ.get('NVIDIA_API_KEY', '')
    if not key:
        raise NimError('NVIDIA_API_KEY is not set')
    return key


async def _post(client: httpx.AsyncClient, path: str, body: dict, timeout: float, tries: int,
                meta: dict | None = None) -> dict:
    last = ''
    for attempt in range(tries):
        if meta is not None:
            meta['tries'] = attempt + 1
        try:
            r = await client.post(BASE + path, json=body, timeout=timeout,
                                  headers={'Authorization': f'Bearer {_key()}'})
            if r.status_code == 200:
                return r.json()
            last = f'{r.status_code} {r.text[:160]}'
            if r.status_code not in (429, 500, 502, 503, 504):
                break
        except httpx.HTTPError as e:
            last = f'{type(e).__name__}: {e}'
        await asyncio.sleep(0.6 * (attempt + 1))
    raise NimError(last)


async def chat(client: httpx.AsyncClient, messages: list[dict], *, max_tokens: int, temperature: float,
               timeout: float = 20, tries: int = 2, thinking: bool = False,
               model: str = CHAT, meta: dict | None = None) -> tuple[str, float]:
    """meta, if given, is filled with what the API sent back besides the text: the exact request body,
    finish reason, token usage, response id, tries."""
    t = time.perf_counter()
    body = {'model': model, 'messages': messages, 'max_tokens': max_tokens, 'temperature': temperature}
    if 'nemotron-3' in model:
        # a long prompt ignores /no_think; this flag is what turns its reasoning off
        body['chat_template_kwargs'] = {'enable_thinking': thinking}
    if meta is not None:
        meta['request'] = body
    got = await _post(client, '/chat/completions', body, timeout, tries, meta)
    choice = got['choices'][0]
    text = (choice['message'].get('content') or '').strip()
    if meta is not None:
        meta.update(id=got.get('id'), model=got.get('model'), finish=choice.get('finish_reason'),
                    usage=got.get('usage'), raw=choice['message'].get('content'),
                    reasoning=choice['message'].get('reasoning_content'), ms=round((time.perf_counter() - t) * 1000))
    if not text:
        raise NimError('empty answer')
    return text, time.perf_counter() - t


async def embed(client: httpx.AsyncClient, texts: list[str], kind: str, timeout: float = 15,
                tries: int = 2) -> list[list[float]]:
    """kind: 'query' for questions, 'passage' for facts (the model embeds the two differently)."""
    got = await _post(client, '/embeddings', {'model': EMBED, 'input': texts, 'input_type': kind}, timeout, tries)
    return [d['embedding'] for d in sorted(got['data'], key=lambda d: d['index'])]
