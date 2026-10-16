"""Vercel's entry for Holo's agent (agent/holo.py).

vercel.json rewrites every /api/* path to this one function, and FastAPI
routes it by the original path, the same as uvicorn does locally.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'agent'))

from holo import app  # noqa: E402,F401
