# Requirements: CreativeFlow MVP

## Introduction

CreativeFlow is a voice-first, AI-powered smart Todo List PWA. Users speak their goals, receive AI-decomposed action steps via text-to-speech, and report progress through voice. The system uses the **ElevenLabs Conversational AI Agent** for the full voice interaction loop (STT, LLM reasoning, TTS), and client tools to push structured data from the agent into the UI. A stable anonymous `userId` enables cross-session memory: after each conversation ElevenLabs fires a post-call webhook, the app stores the conversation summary in Vercel KV, and on the next session start that summary is injected as a `dynamic_variable` so the agent greets the user with context. All state is managed client-side with Zustand, with task data persisted in IndexedDB.

---

## Requirements

### 1. Voice Task Creation

#### 1.1 Microphone Capture
**User Story**: As a user, I want to hold a mic button and speak my goal so that the app can capture my intent without typing.

**Acceptance Criteria**:
- The app starts an ElevenLabs Agent session via `startSession({ conversationToken, userId, dynamicVariables })` using the `@elevenlabs/react` SDK; the SDK handles microphone acquisition and WebRTC negotiation internally
- A short-lived WebRTC `conversationToken` is obtained from `GET /api/conversation/token` (server-side); the server calls `GET https://api.elevenlabs.io/v1/convai/conversation/token` and never exposes `ELEVENLABS_API_KEY` to the client
- A stable anonymous `userId` (UUID generated once on first launch and persisted in `localStorage`) is passed to `startSession()` so ElevenLabs links all conversations to this user across sessions
- A persistent floating mic button is visible on all screens
- While the agent session is active, the voice orb's state (idle / listening / speaking) is driven by `useConversationMode` (`isSpeaking`, `isListening`); the orb's real-time frequency visualization is powered by `getOutputByteFrequencyData()` during agent speech and `getInputByteFrequencyData()` during user input
- If microphone permission is denied, a guidance modal is shown with browser-specific instructions and the mic button is disabled
- The mic button is disabled while the agent is speaking to prevent feedback loops

#### 1.2 Speech-to-Text Streaming
**User Story**: As a user, I want to see my speech transcribed in real time so that I know the app is hearing me correctly.

**Acceptance Criteria**:
- STT is handled by the ElevenLabs Conversational AI Agent internally; the client receives incremental transcript updates via the SDK's `onUserTranscript` callback
- Incremental transcript chunks are displayed in a live transcript bubble, updated as each `onUserTranscript` event fires
- Turn detection (VAD) is configured on the ElevenLabs Agent (`turn_detection.silence_duration_ms: 800`); the agent determines end-of-utterance automatically
- If the agent session fails to connect more than 2 consecutive times, a fallback text input with a mic icon is rendered and the text is sent directly to the `decompose_goal` client tool handler
- Session reconnection is handled by the ElevenLabs SDK with built-in retry logic

#### 1.3 Task Decomposition
**User Story**: As a user, I want my spoken goal to be broken into 2–6 actionable steps so that I have a clear plan to follow.

**Acceptance Criteria**:
- When the user finishes speaking a goal, the ElevenLabs Agent processes the intent via its configured LLM and calls the **`decompose_goal` client tool** with a structured steps payload
- The `decompose_goal` client tool handler on the browser validates the payload with Zod; responses with `steps.length < 2` or `steps.length > 6` are rejected
- Each step has a unique `id`, non-empty `text`, `domainTag`, and positive `estimatedMinutes`
- A valid `TodoItem` is created and added to the Zustand store
- If the client tool call fails or Zod validation fails, an error toast is shown and no TodoItem is created
- A retry button re-triggers the last transcript by re-sending a text message to the active agent session
- Decompose latency p95 must be <1200ms (measured from `onUserTranscript` final chunk to `decompose_goal` tool invocation)

---

### 2. Voice Feedback & TTS Playback

#### 2.1 Step Readback via TTS
**User Story**: As a user, I want the app to read my action steps back to me via voice so that I can absorb the plan without looking at the screen.

**Acceptance Criteria**:
- After the `decompose_goal` client tool fires, the ElevenLabs Agent's built-in TTS reads the steps back using the voice configured for the active tone profile
- TTS audio begins within <900ms (measured at the SDK's first `onAudioChunk` event)
- The currently-speaking step card is highlighted in real-time via the SDK's `onAudioAlignment` callback, which provides character-level timing for agent speech; the client matches the aligned text against known step texts to drive `activeStepId` — no additional client tool call is needed
- Audio is managed by the ElevenLabs Conversation SDK's internal audio pipeline
- If TTS is interrupted or the session drops, the transcript of the steps is displayed as text on screen and the session attempts reconnection

#### 2.2 Tone-Adaptive Responses
**User Story**: As a user, I want to choose a voice tone so that the agent's responses match my preferred motivational style.

**Acceptance Criteria**:
- Three tone profiles are available: `calm_mentor`, `hype_coach`, `gentle_guide`
- All three profiles share a **single ElevenLabs Agent** (`ELEVENLABS_AGENT_ID`); each profile maps to a distinct ElevenLabs `voiceId` injected as a `dynamic_variable` at session start so the agent's TTS uses the correct voice — no separate agents are required
- The selected tone profile is persisted in `localStorage`; on session start the profile's `voiceId` is resolved server-side and injected into `dynamic_variables` via `GET /api/conversation/token?profile=<tone>`
- Tone profile can be changed from the Profile page

#### 2.3 Audio Ducking
**User Story**: As a user, I want background audio to lower during TTS playback so that the voice response is clearly audible.

**Acceptance Criteria**:
- During agent speech (detected via SDK's `onStatusChange` → `speaking`), any background `AudioContext` gain is ramped to 0.3 over 150ms using `gainNode.gain.linearRampToValueAtTime`
- Gain is restored to 1.0 when the agent status returns to `listening` or `idle`
- Ducking recovers within 200ms under audio stress conditions

---

### 3. Progress Tracking

#### 3.1 Voice Progress Reporting
**User Story**: As a user, I want to speak my progress update so that the app can mark the right steps as completed without manual interaction.

**Acceptance Criteria**:
- From a project detail view, the user can press and hold the mic button to report progress; releasing ends the utterance
- The app calls `GET /api/conversation/token?context=progress_update&todoId=...` which encodes the current step list and statuses as `dynamic_variables` so the ElevenLabs Agent has full context from the first token
- The agent reasons over the spoken update and calls the **`update_steps` client tool** with a `results[]` array of `{ stepId, status }` to apply status changes in the browser

#### 3.2 LLM-Based Step Matching
**User Story**: As a user, I want the app to intelligently match my spoken update to the right step so that I don't have to say the exact step text.

**Acceptance Criteria**:
- The ElevenLabs Agent's LLM reasons over the spoken update and the full step list (provided via `dynamic_variables`) to determine which steps were completed
- Agent sets step status to `completed` when it confidently matches the update to a step (strikethrough + confetti Lottie + agent speaks praise)
- Agent sets step status to `clarification_needed` when it is uncertain (card pulse + agent asks a clarifying question)
- Agent sets step status to `unmatched` when the update doesn't map to any step (gentle shake + agent speaks redirect prompt)
- A completed step's status never reverts to `pending`

#### 3.3 Agent Context Awareness
**User Story**: As a user, I want the AI agent to know my full goal context when responding so that its feedback is relevant and specific.

**Acceptance Criteria**:
- When starting a `progress_update` session, `/api/conversation/token` injects `dynamic_variables` containing: `todoId`, `goal`, `toneProfile`, all steps with current statuses, `completedCount`, `remainingCount`, and `previous_sessions_summary` (fetched from Vercel KV by `userId`, giving the agent full cross-session context)
- `completedCount` always equals `steps.filter(s => s.status === 'completed').length`
- `completedCount + remainingCount` always equals `steps.length`

#### 3.4 Cross-Session Memory
**User Story**: As a user, I want the agent to remember my previous sessions so that it can greet me with context and pick up where I left off.

**Acceptance Criteria**:
- A stable anonymous `userId` is generated via `crypto.randomUUID()` on first app launch and persisted in `localStorage`; it never changes and requires no account creation
- When starting any session, `userId` is passed to both `GET /api/conversation/token` and `startSession()` so ElevenLabs links all conversations to this user in its platform
- After each conversation ends, ElevenLabs fires a `post_call_transcription` webhook to `POST /api/webhooks/elevenlabs`; the handler validates the `ElevenLabs-Signature` HMAC header using `ELEVENLABS_WEBHOOK_SECRET` before processing any payload
- On successful validation, the handler stores `{ transcript_summary, call_successful, conversation_id, timestamp }` in Vercel KV under the key `session:<userId>:latest` with a 90-day TTL
- On the next session start, `/api/conversation/token` reads `session:<userId>:latest` from KV and injects `previous_sessions_summary` as a `dynamic_variable`, enabling the agent to greet with context such as *"Welcome back! Last time you were planning your Q4 launch — want to continue?"*
- If the KV lookup fails or returns empty (first-ever session), `previous_sessions_summary` is omitted from `dynamic_variables` and the agent treats the session as a fresh start
- The agent system prompt uses `{{previous_sessions_summary}}` with a conditional fallback: if absent, use a standard introduction

---

### 4. Dashboard & Projects UI

#### 4.1 Dashboard
**User Story**: As a user, I want a dashboard that shows my recent flows and a voice interaction panel so that I can quickly resume or start a goal.

**Acceptance Criteria**:
- Dashboard displays a greeting, Recent Flows cards with progress bars, and a Voice Interaction panel with the animated orb
- Each flow card shows: goal title, domain tag, step count, and progress bar (completed/total)
- Tapping a flow card navigates to the project detail view

#### 4.2 Projects Page
**User Story**: As a user, I want to see all my active and completed flows in one place so that I can track my overall progress.

**Acceptance Criteria**:
- Projects page has two sections: "Active Flows" and "Completed Flows"
- Each card shows step count and a progress bar
- Completed flows display a trophy icon
- New task cards animate in with Framer Motion stagger entrance

#### 4.3 Floating Mic Button
**User Story**: As a user, I want a mic button always visible so that I can start a voice interaction from any screen.

**Acceptance Criteria**:
- The floating mic button is rendered in the root layout as a fixed-position overlay
- It is visible on Dashboard, Projects, and Profile pages
- **Hold to speak**: pressing starts a new ElevenLabs Agent session; releasing ends the utterance and triggers agent reasoning
- It is disabled (visually and functionally) while the agent is speaking

---

### 5. State Management & Persistence

#### 5.1 Zustand Store
**User Story**: As a developer, I want a well-structured Zustand store so that all UI state is predictable and testable.

**Acceptance Criteria**:
- Store contains `session`, `tasks`, `audio`, and `ui` slices as defined in the design
- Actions: `addTask`, `completeStep`, `requestClarification`, `setVoiceState`, `setTranscript`, `setAudioPlaying`, `setActiveContext`, `setSessionSummary`, `setUserId`
- Non-critical state updates (e.g. `persistToDB`) are deferred via `requestIdleCallback` during agent speech

#### 5.2 IndexedDB Persistence
**User Story**: As a user, I want my flows to be saved locally so that I don't lose my progress if I close the browser.

**Acceptance Criteria**:
- On app mount, `hydrateFromDB()` loads the last session from IndexedDB `sessions` store
- If no session exists, `tasks[]` is empty and the empty state UI is rendered
- State is persisted to IndexedDB on `beforeunload` and after each significant state mutation
- `session.active` is always `false` after hydration (no auto-resume of voice sessions)
- Transcripts are auto-purged after 30 days

#### 5.3 Reduced Motion Support
**User Story**: As a user with motion sensitivity, I want animations to be minimal so that the app is comfortable to use.

**Acceptance Criteria**:
- When `prefers-reduced-motion: reduce` is detected, all `spring`/`bounce` easings are replaced with `opacity`-only transitions
- The `ui.reducedMotion` flag in the store reflects the system preference

#### 5.4 Post-Call Webhook Handler
**User Story**: As a developer, I want a secure webhook endpoint to receive conversation data after each session so that the agent can maintain cross-session memory.

**Acceptance Criteria**:
- `POST /api/webhooks/elevenlabs` validates the `ElevenLabs-Signature` HMAC header using `ELEVENLABS_WEBHOOK_SECRET` before processing any payload; requests with invalid signatures return HTTP 401
- On a `post_call_transcription` event, the handler extracts `data.user_id`, `data.analysis.transcript_summary`, and `data.analysis.call_successful` from the payload
- A `UserSessionRecord` is written to Vercel KV under `session:<userId>:latest` with a 90-day TTL; the endpoint returns HTTP 200 on success
- All error cases (missing signature, invalid JSON, KV write failure) return appropriate non-2xx status codes so ElevenLabs retries via its platform retry logic
- `ELEVENLABS_WEBHOOK_SECRET` and KV credentials are stored only in `process.env` and never exposed to the client

---

### 6. Performance & PWA

#### 6.1 Latency Targets
**User Story**: As a user, I want the app to feel fast and responsive so that voice interactions feel natural.

**Acceptance Criteria**:
- STT first token: <600ms (measured via SDK's first `onUserTranscript` event after mic press)
- Agent LLM response p95: <1200ms (measured from mic release to `decompose_goal` / `update_steps` tool invocation)
- Agent TTS stream start: <900ms (measured at SDK's first `onAudioChunk` event)
- UI interaction latency: <16ms (60fps)

#### 6.2 PWA & Offline
**User Story**: As a user, I want the app to work offline for cached content so that I can view my flows without internet.

**Acceptance Criteria**:
- App is configured as a PWA via `next-pwa` with `display: standalone`
- Static assets are 100% cached by the service worker
- Bundle size is <120KB gzipped

---

### 7. Security

#### 7.1 API Key Protection
**User Story**: As a developer, I want API keys to never reach the client so that credentials are not exposed.

**Acceptance Criteria**:
- `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, and `ELEVENLABS_WEBHOOK_SECRET` are stored only in `process.env` server-side variables and never exposed in the client bundle
- The client obtains a short-lived **WebRTC conversation token** from `GET /api/conversation/token` (server-side via `GET /v1/convai/conversation/token`); this is the only ElevenLabs credential the browser receives
- All API routes include `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`
- CORS is restricted to `process.env.NEXT_PUBLIC_APP_URL`

#### 7.2 Privacy
**User Story**: As a user, I want my data to stay on my device so that my voice and task data is private.

**Acceptance Criteria**:
- No raw audio is stored; only transcripts are persisted locally
- Session IDs are anonymous (`crypto.randomUUID()`); no PII is collected
- `localStorage.clear()` on explicit reset removes all local data
- CSP header is set as specified in the design
