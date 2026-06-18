# Local-LLM Fallback Pipeline — Implementation Plan

Cloud-primary (Gemini) with a local-model fallback (Ollama) so the AI menu
assistant keeps working when the internet is down. Built and verified in the
sandbox copy; nothing committed or pushed.

## Validated facts (benchmarked 2026-06-13)

- Ollama v0.20.3 installed, server running on `http://localhost:11434`.
- OpenAI-compatible endpoint (`/v1/chat/completions`) confirmed working.
- Model: **`llama3.2:3b`** (2.5 GB). Warm latency ~2.5–3s on CPU (Intel Arc,
  100% CPU, 15.6 GB RAM). Cold load ~10.7s.
- Quality acceptable for menu Q&A with a tight system prompt.

## Architecture

```
browser → Express /api/ai/menu-chat            (unchanged: rate limit, X-Internal-Token)
        → Python  /api/ai/menu-chat
             ├─ try  Gemini gemini-2.5-flash    primary — best quality, needs internet
             └─ except → Ollama llama3.2:3b      fallback — local, no internet
```

Failover triggers (Gemini → local): Gemini not configured, connection error
(internet down — the demo case), 429 quota, or API 5xx.

## Changes by file

### `packages/ai-chat/main.py` (~40 lines, the core)
- Add a second client:
  `local_client = AsyncOpenAI(api_key="ollama", base_url=f"{OLLAMA_BASE_URL}/v1")`.
- **Make Gemini fail fast** so failover is snappy: build `gemini_client` with
  `timeout=3.0, max_retries=0`. (Default SDK retries/backoff would otherwise
  make the first offline request hang ~10–30s — looks broken on camera.)
- Refactor the agent run (`main.py:161-187`) into a helper that takes a model +
  client, then: `try` Gemini → on the failure set above, `except` → run local.
- Add `backend` ("gemini" | "local") to `ChatResponse` so the UI/demo can show
  which model answered. Express already forwards the JSON unchanged.
- Relax the hard `GEMINI_API_KEY` 503 guard (`main.py:155-156`): if Gemini is
  absent but local is reachable, serve from local instead of erroring.

### `packages/ai-chat/main.py` `/health`
- Report `gemini` and `local_llm` reachability alongside `db`. Useful for the
  demo and as a recruiter-facing detail.

### Config / `.env.example`
- Add `OLLAMA_BASE_URL` (default `http://localhost:11434`) and
  `LOCAL_LLM_MODEL` (default `llama3.2:3b`).
- `GEMINI_API_KEY` becomes optional (local-only operation supported).

### `README.md`
- Document Ollama setup: install, `ollama pull llama3.2:3b`, env vars.

### `requirements.txt`
- No change — Ollama is OpenAI-compatible; no new Python deps.

### `docker-compose.yml` (optional, later)
- Add an `ollama` service if containerized local AI is wanted. For the demo,
  native Ollama on the host is simpler.

## Demo considerations

- **Pre-warm before filming.** Cold load is ~10.7s. Send a throwaway request
  (or set a long `keep_alive`) so the model is resident during the unplug demo.
- The `backend: "local"` field is on-screen proof the local model served the
  reply after the internet was cut.

## Verification (mandatory, before any filming)

1. Start Postgres, Express, Python, Ollama. Confirm chat works (backend=gemini).
2. **Physically disconnect the internet (WAN), keep the LAN/Wi-Fi up.**
3. Place an order from the phone → kitchen updates (already LAN-only).
4. Ask the assistant a question → reply returns with `backend: "local"` in ~3s.
5. Reconnect → confirm it returns to `backend: "gemini"`.

## Honest constraints / out of scope

- CPU-only inference; no GPU offload on this machine (Intel Arc unsupported by
  mainline Ollama). ~3s warm is fine for a demo, not for high concurrency.
- Local AI means real hardware (a mini-PC), not a "$5 server." Pick the hardware
  story accordingly.
- 3B quality < Gemini. Acceptable for menu Q&A; not for complex reasoning.
- Not touched here: the table-number spoofing fix, payments, multi-tenancy.
```
