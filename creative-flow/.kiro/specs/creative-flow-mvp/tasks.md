# Tasks: CreativeFlow MVP

## Task List

- [x] 1. Project Setup & Infrastructure
  - [x] 1.1 Initialize Next.js 16 App Router project with TypeScript, Tailwind CSS v4, and Framer Motion v12
  - [x] 1.2 Install and configure Zustand v5, idb v8, zod v4, @elevenlabs/react v1.2, @elevenlabs/client (peer), ioredis v5, @clerk/nextjs v7, fast-check v4, vitest v4, msw v2, next-pwa
  - [x] 1.3 Configure PWA manifest (display: standalone, background_color: #0f0f11) and service worker via next-pwa
  - [x] 1.4 Set up environment variable schema — server-side: `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_WEBHOOK_SECRET`, `REDIS_URL`, `CLERK_SECRET_KEY`; public: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - [x] 1.5 Configure Clerk middleware: protect all routes except `/sign-in`, `/sign-up`, and `/api/webhooks/*`

- [x] 2. Data Models & Store
  - [x] 2.1 Define TypeScript interfaces: `TodoItem`, `TodoStep`, `ToneProfile`, `ToneConfig`, `DecomposeGoalPayload`, `UpdateStepsPayload`, `UserSessionRecord`, `ConversationTokenResponse`, `AppStore`; define `TodoStatus` (`draft | active | completed | archived`) and `StepStatus` (`pending | completed | clarification_needed | unmatched`)
  - [x] 2.2 Implement Zustand store with five slices: `session` (active, voiceState, transcript, userId, pendingDraftId), `tasks`, `audio` (playing, currentStepId, toneProfile), `sessionHistory` (summary, lastConversationId), and `ui` (reducedMotion, activeView)
  - [x] 2.3 Implement store actions: `addTask`, `confirmTask`, `discardDraft`, `deleteTask`, `completeStep`, `requestClarification`, `setVoiceState`, `setTranscript`, `setPendingDraftId`, `setAudioPlaying`, `setToneProfile`, `setSessionSummary`, `setUserId`, `setReducedMotion`, `hydrateTasks`
  - [x] 2.4 Implement IndexedDB persistence layer using idb v8 (`hydrateFromDB`, `persistToDB`) — database keyed per userId
  - [x] 2.5 Wire `persistToDB` to `beforeunload` and defer non-critical writes via `requestIdleCallback`
  - [x] 2.6 Implement 30-day task auto-purge on hydration

- [x] 3. Authentication & Identity
  - [x] 3.1 Integrate Clerk: add `ClerkProvider` to root layout, create `(auth)` route group with `/sign-in/[[...sign-in]]` and `/sign-up/[[...sign-up]]` pages
  - [x] 3.2 Implement `AuthSyncProvider`: reads `useUser()` from Clerk and syncs `user.id` into Zustand store via `setUserId` on auth state change; clears store on sign-out
  - [x] 3.3 Implement `StoreHydrationProvider`: on Clerk user load, hydrates tasks from Redis (`GET /api/tasks`), restores tone profile from `localStorage`, syncs non-draft task changes back to Redis on store change, and detects `prefers-reduced-motion`
  - [x] 3.4 Implement `ElevenLabsProvider`: wraps `ConversationProvider` with app-level `onMessage` (wires transcript + performance marks), `onModeChange` (triggers audio ducking), and `onAudioAlignment` (step highlighting) callbacks

- [x] 4. ElevenLabs Agent Session Integration
  - [x] 4.1 Implement `GET /api/conversation/token`: authenticate via Clerk `auth()`, validate `context`, `profile`, `todoId?`, `goal?`, `steps?` with Zod; call ElevenLabs `GET /v1/convai/conversation/token?agent_id=...`; fetch `UserSessionRecord` from Redis `session:{userId}:latest`; return `{ conversationToken, dynamicVariables: { tone_profile, voice_id, context, goal?, steps?, previous_sessions_summary? } }`
  - [x] 4.2 Add `Cache-Control: no-store` and `X-Content-Type-Options: nosniff` headers to `/api/conversation/token`
  - [x] 4.3 Implement `useVoiceSession` hook using `useConversationControls` (startSession, endSession, sendContextualUpdate, frequency data), `useConversationStatus`, and `useConversationMode` from `@elevenlabs/react`; sync SDK state to Zustand store
  - [x] 4.4 Implement tap-to-toggle session interaction: on mic press, build token request URL from Zustand `toneProfile` + context params, fetch `{ conversationToken, dynamicVariables }` from `/api/conversation/token`, call `startSession()`; expose `stop()` to end the session; guard against double-start while connecting
  - [x] 4.5 Wire `onMessage` (in `ElevenLabsProvider`) to `store.setTranscript()` for user messages; wire `useConversationMode` (`isSpeaking`/`isListening`) → `store.setVoiceState()`; wire `onAudioAlignment` to character-level step text matching → `store.setAudioPlaying(true, matchedStepId)`
  - [x] 4.6 Implement fallback text input when agent session fails to connect 2 or more consecutive times (`showFallback` flag in `useVoiceSession`)
  - [x] 4.7 Implement `POST /api/webhooks/elevenlabs`: validate `ElevenLabs-Signature` HMAC header using custom `validateSignature()` with replay-attack protection (5-minute window); on `post_call_transcription` event, write `UserSessionRecord` to Redis `session:{userId}:latest` with 90-day TTL; return 200 / 401 / 500 accordingly
  - [x] 4.8 Update `/api/conversation/token` to read `session:{userId}:latest` from Redis and inject `transcript_summary` as `previous_sessions_summary` in `dynamicVariables`; omit field on cache miss or Redis error

- [x] 5. Tasks API & Server Persistence
  - [x] 5.1 Implement `GET /api/tasks`: authenticate via Clerk, read `tasks:{userId}` hash from Redis, return all stored tasks as JSON array
  - [x] 5.2 Implement `POST /api/tasks`: authenticate via Clerk, validate task payload with Zod (`TaskSchema` — drafts never persisted), upsert to Redis hash `tasks:{userId}` with 30-day TTL
  - [x] 5.3 Implement `DELETE /api/tasks/[id]`: authenticate via Clerk, delete single field from Redis hash `tasks:{userId}`

- [x] 6. Agent Client Tools
  - [x] 6.1 Implement `decompose_goal` client tool handler: receive agent payload, validate with Zod (steps 2–8, required fields per step), discard any existing draft, call `store.addTask()` with status `"draft"`, call `store.setPendingDraftId()`
  - [x] 6.2 Implement `confirm_goal` client tool handler: read `pendingDraftId` from store, call `store.confirmTask()` to promote draft → active, clear `pendingDraftId`, then call `onComplete` to end the voice session
  - [x] 6.3 Implement `update_steps` client tool handler: validate payload with Zod, iterate `results[]`, call `completeStep()` or `requestClarification()` per step, enforce no revert from completed
  - [x] 6.4 Register all three tools (`decompose_goal`, `confirm_goal`, `update_steps`) via `useConversationClientTool` hook in `useClientTools` — auto-unregistered on unmount; all store reads done via `useStore.getState()` to avoid stale closures
  - [x] 6.5 Implement error state and retry capability for `decompose_goal` validation failures (`lastError`, `canRetryDecompose` flags); retry via `sendContextualUpdate` with last transcript
  - [x] 6.6 Implement real-time orb frequency visualization: `getOutputByteFrequencyData()` during agent speech and `getInputByteFrequencyData()` during user input; map amplitude to orb scale and glow in a `requestAnimationFrame` loop
  - [x] 6.7 Implement `FeedbackButtons` thumbs up/down component (shown after session ends when `useConversationFeedback().canSendFeedback` is true); feeds into ElevenLabs platform analytics

- [x] 7. Audio Ducking & Orb State
  - [x] 7.1 Implement singleton `audioDuck` module: `AudioContext` + `GainNode` with `rampTo(value, durationMs)` using `linearRampToValueAtTime`
  - [x] 7.2 Wire audio ducking via `ElevenLabsProvider` `onModeChange`: ramp gain to 0.3 over 150ms on `"speaking"`, restore to 1.0 on all other modes
  - [x] 7.3 Wire `VoiceOrb` animation states to voice state from Zustand store: `idle`, `connecting`, `listening`, `processing`, `speaking`
  - [x] 7.4 Implement `TONE_CONFIGS` map (`ToneProfile → { voiceId, label, description, accentVar, accentColor }`) in `lib/constants.ts`; persist selected tone profile to `localStorage` under `cf_tone_profile`

- [x] 8. ElevenLabs Agent Configuration (Platform)
  - [x] 8.1 Create a single ElevenLabs Conversational AI Agent with system prompt referencing `{{tone_profile}}`, `{{voice_id}}`, `{{context}}`, `{{goal}}`, `{{steps}}`, and `{{previous_sessions_summary}}` (with conditional fallback when absent)
  - [x] 8.2 Configure agent conversation flow: balanced turn-eagerness for `new_goal`; patient mode for `progress_update` (user may be mid-thought); LLM-generated filler enabled ("Let me break that down...")
  - [x] 8.3 Register `decompose_goal` as a blocking client tool on the agent for `new_goal` context — agent awaits client response before reading steps back
  - [x] 8.4 Register `confirm_goal` as a blocking client tool on the agent — agent awaits store confirmation that the draft was promoted before continuing
  - [x] 8.5 Register `update_steps` as a blocking client tool on the agent for `progress_update` context
  - [x] 8.6 Configure Conversation Analysis — Success Evaluation: `goal_was_decomposed`, `user_made_progress`, `session_quality`
  - [x] 8.7 Configure Conversation Analysis — Data Collection: `completed_step_count` (integer), `session_context` ("new_goal" or "progress_update")
  - [x] 8.8 Configure post-call webhook pointing to `POST /api/webhooks/elevenlabs`; enable `post_call_transcription` event type

- [x] 9. UI Components
  - [x] 9.1 Implement `VoiceOrb` component with Framer Motion animation states (idle, connecting, listening, processing, speaking) and real-time frequency visualization via `requestAnimationFrame`
  - [x] 9.2 Implement `VoicePanel`: mic toggle button (tap-to-start / tap-to-stop), voice state display, transcript readout, fallback text input on repeated connection failure
  - [x] 9.3 Implement `FeedbackButtons`: thumbs up/down shown post-session when `canSendFeedback` is true
  - [x] 9.4 Implement `TodoCard` component with progress bar, domain tag color, trophy icon for completed flows
  - [x] 9.5 Implement `StepList` component with strikethrough completed steps, active highlight via `currentStepId`, and clarification pulse animation
  - [x] 9.6 Implement `ActionTile` component: individual step tile with tap-to-complete, domain color accent
  - [x] 9.7 Implement `DashboardPage`: personalized greeting, `RecentFlows` task cards, `VoicePanel` with orb
  - [x] 9.8 Implement `ProjectsPage`: Active Flows and Completed Flows sections with stagger entrance animation
  - [x] 9.9 Implement `ProfilePage`: `ToneProfileSelector` (Calm Mentor / Hype Coach / Gentle Guide), persists to `localStorage`
  - [x] 9.10 Implement `TaskDetailPage`: full step list with `ActionTile` tiles; opens progress-update voice session for the active task
  - [x] 9.11 Implement `AppShell`: bottom navigation bar wired to `activeView`, wraps `AuthSyncProvider`, `StoreHydrationProvider`, `ElevenLabsProvider`
  - [x] 9.12 Implement reduced motion support: detect `prefers-reduced-motion`, set `ui.reducedMotion`, replace spring/bounce with opacity transitions

- [x] 10. Voice Interaction Orchestration
  - [x] 10.1 Set `activeContext` (`new_goal` or `progress_update`) based on current view before session start
  - [x] 10.2 Wire `new_goal` context: mic press → fetch token → `startSession` with `decompose_goal` + `confirm_goal` tools; step highlighting driven automatically via `onAudioAlignment`
  - [x] 10.3 Wire `progress_update` context: mic press → fetch token with `todoId` + serialised steps as dynamic variables → `startSession` with `update_steps` tool
  - [x] 10.4 Implement `sendContextualUpdate` for UI-triggered step completions during an active session (e.g. "User manually marked step X as complete via UI tap")
  - [x] 10.5 Implement microphone permission denied modal with browser-specific guidance

- [x] 11. Testing
  - [x] 11.1 Write unit tests for Zustand store actions (`completeStep`, `addTask`, `confirmTask`, `discardDraft`, `hydrateTasks`) using Vitest
  - [x] 11.2 Write unit tests for Zod schemas: valid/invalid `decompose_goal` payloads, boundary cases (2 and 8 steps)
  - [x] 11.3 Write property-based tests using fast-check: completedCount invariant, step status monotonicity, hydration idempotency
  - [x] 11.4 Write integration tests mocking `@elevenlabs/react` SDK: simulate `onMessage`, `onStatusChange`, and client tool invocations; verify full store → UI flow
  - [x] 11.5 Write integration test for `GET /api/conversation/token`: verify `dynamicVariables` assembled correctly for both contexts; `previous_sessions_summary` injected when Redis returns a record, omitted when Redis returns null
  - [x] 11.6 Write integration test for `POST /api/webhooks/elevenlabs`: verify HMAC validation (rejects invalid signatures with 401), verify Redis write on valid `post_call_transcription` payload, verify graceful 500 on Redis failure

- [x] 12. Performance & Deployment
  - [x] 12.1 Add `Performance.mark` instrumentation: `cf:session_start` (mic press), `cf:stt_first_token` (first user transcript), `cf:tts_start` (first agent message); measure `cf:stt_latency` and `cf:agent_response_latency`
  - [x] 12.2 Configure `@next/bundle-analyzer` — run via `ANALYZE=true next build`
  - [x] 12.3 Configure Vercel deployment with required environment variables: `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_WEBHOOK_SECRET`, `REDIS_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - [ ] 12.4 Set up GitHub Actions CI: lint → test → build → deploy on main
