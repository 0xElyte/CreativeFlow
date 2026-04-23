# CreativeFlow

**Live demo:** [https://creative-flow-labs.vercel.app](https://creative-flow-labs.vercel.app)

> Speak your goal. Get a step-by-step action plan. Track your progress — all by voice.

Built for the [ElevenHacks](https://hacks.elevenlabs.io) hackathon.

---

## What it does

CreativeFlow is a voice-first AI task planner powered by the **ElevenLabs Conversational AI** agent. You speak a goal, the agent decomposes it into structured steps, reads them back to you, asks for your confirmation, then saves the task to your account. You can return to any task and use your voice to mark steps as done or flag blockers.

**The full loop — no typing required.**

---

## How it uses ElevenLabs

| Feature | Usage |
|---|---|
| **Conversational AI agent** | Single agent handles STT → LLM reasoning → TTS for the entire interaction |
| **Client tools** | `decompose_goal` creates a draft task in the UI; `confirm_goal` promotes it to active; `update_steps` marks progress |
| **Dynamic variables** | `context`, `goal`, `steps`, `tone_profile`, `voice_id`, `previous_sessions_summary` injected at session start |
| **Three voice profiles** | Calm Mentor · Hype Coach · Gentle Guide — each uses a distinct ElevenLabs voice, selectable in Settings |
| **Cross-session memory** | Post-call webhook stores a transcript summary in Redis; injected back into the next session |

---

## Tech stack

- **Next.js 16** (App Router) + **TypeScript**
- **ElevenLabs Conversational AI** (`@elevenlabs/react`)
- **Clerk** — authentication
- **Redis** — per-account task persistence
- **Zustand** — client state
- **Framer Motion** — animations
- **Tailwind CSS v4**
- **Vercel** — deployment

---

## Key features

- 🎙️ **Two-phase voice confirmation** — agent proposes a plan, user confirms before it's saved
- 📋 **Task detail screen** — numbered ActionTiles with domain tags, time estimates, completion tracking
- 🔄 **Edit mode by voice** — open any task and talk to mark steps done or flag blockers
- 🎨 **Three tone profiles** — the same agent speaks differently based on your preference
- 💾 **Persistent per-account storage** — tasks survive across devices via Redis
- 🗑️ **Full CRUD** — create, read, update, and delete tasks

---

## Running locally

```bash
# 1. Clone
git clone https://github.com/0xElyte/CreativeFlow.git
cd CreativeFlow/creative-flow

# 2. Install
npm install

# 3. Set environment variables (copy and fill in)
cp .env.example .env.local

# 4. Run
npm run dev
```

**Required env vars:**

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
ELEVENLABS_WEBHOOK_SECRET=
REDIS_URL=
```

---

## Architecture

```
Browser
  └── ElevenLabs React SDK (WebRTC)
        ├── useVoiceSession  →  GET /api/conversation/token  →  ElevenLabs API
        └── useClientTools
              ├── decompose_goal  →  Zustand store (draft task)
              ├── confirm_goal    →  Zustand store (active task)  →  POST /api/tasks
              └── update_steps   →  Zustand store (step status)  →  POST /api/tasks

  POST /api/webhooks/elevenlabs  →  Redis (transcript summary for next session)
```
