# Tasks: CreativeFlow MVP

## Task List

- [ ] 1. Project Setup & Infrastructure
  - [ ] 1.1 Initialize Next.js 14 App Router project with TypeScript, Tailwind CSS, and Framer Motion
  - [ ] 1.2 Install and configure Zustand, idb, zod, @elevenlabs/client, @elevenlabs/react, @vercel/kv, fast-check, vitest, msw, next-pwa
  - [ ] 1.3 Configure PWA manifest (display: standalone, background_color: #0f0f11) and service worker via next-pwa
  - [ ] 1.4 Set up environment variable schema: server-side only: `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_WEBHOOK_SECRET`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`; public: `NEXT_PUBLIC_APP_URL`
  - [ ] 1.5 Configure CSP headers and CORS restrictions in Next.js middleware

- [ ] 2. Data Models & Store
  - [ ] 2.1 Define TypeScript interfaces: TodoItem, TodoStep, ToneProfile, ToneConfig, DecomposeGoalPayload, UpdateStepsPayload, UserSessionRecord, ConversationTokenResponse, AppStore
  - [ ] 2.2 Implement Zustand store with session, tasks, audio, sessionHistory, and ui slices
  - [ ] 2.3 Implement store actions: addTask, completeStep, requestClarification, setVoiceState, setTranscript, setAudioPlaying, setActiveContext, setSessionSummary, setUserId
  - [ ] 2.4 Implement IndexedDB persistence layer using idb (hydrateFromDB, persistToDB)
  - [ ] 2.5 Wire persistToDB to beforeunload event and defer non-critical calls via requestIdleCallback
  - [ ] 2.6 Implement 30-day transcript auto-purge on hydration

- [ ] 3. ElevenLabs Agent Session Integration
  - [ ] 3.1 Implement `GET /api/conversation/token` route: validate `origin`, `context`, `profile`, and `userId` params; call ElevenLabs `GET /v1/convai/conversation/token?agent_id=...` to obtain a WebRTC token; fetch `UserSessionRecord` from Vercel KV by `userId`; return `{ conversationToken, dynamicVariables: { tone_profile, voice_id, context, goal?, steps?, previous_sessions_summary? } }`
  - [ ] 3.2 Add Cache-Control: no-store and X-Content-Type-Options: nosniff headers to /api/conversation/token
  - [ ] 3.3 Implement `useVoiceSession` hook using `@elevenlabs/react` `ConversationProvider` and granular hooks: `useConversationControls` (stable actions), `useConversationStatus` (connection state), `useConversationMode` (isSpeaking/isListening), `useConversationInput` (isMuted/setMuted), `useConversationClientTool` (register tools at component scope)
  - [ ] 3.4 Implement hold-to-speak interaction: on mic press, read `userId` from `localStorage`, fetch `{ conversationToken, dynamicVariables }` from `/api/conversation/token`, call `startSession({ conversationToken, userId, dynamicVariables })`; call `endSession()` on mic release
  - [ ] 3.5 Wire `onUserTranscript` to `store.setTranscript()`; wire `useConversationMode` (`isSpeaking`/`isListening`) to `store.setVoiceState()`; wire `onAudioAlignment` to step text matching: for each alignment event, match `charText` against `steps[].text` and call `store.setAudioPlaying(true, matchedStepId)` when a match is found
  - [ ] 3.6 Implement fallback text input when agent session fails to connect more than 2 consecutive times
  - [ ] 3.7 Implement stable `userId` lifecycle: on app mount, read from `localStorage`; if absent, generate via `crypto.randomUUID()`, persist, and call `store.setUserId()`
  - [ ] 3.8 Implement `POST /api/webhooks/elevenlabs`: validate `ElevenLabs-Signature` HMAC header using ElevenLabs SDK `constructEvent(rawBody, sigHeader, WEBHOOK_SECRET)`; on `post_call_transcription` event, write `UserSessionRecord` to Vercel KV under `session:<userId>:latest` with 90-day TTL; return 200 on success, 401 on bad signature, 500 on KV error
  - [ ] 3.9 Update `/api/conversation/token` to call `kv.get('session:<userId>:latest')` and inject the result's `transcript_summary` as `previous_sessions_summary` in `dynamicVariables`; omit the field if the KV record is absent or the get fails

- [ ] 4. Agent Client Tools
  - [ ] 4.1 Implement decompose_goal client tool handler: receive agent payload, validate with Zod (steps 2–6, required fields), call store.addTask()
  - [ ] 4.2 Remove `highlight_step` as an agent client tool; step highlighting is now driven entirely by `onAudioAlignment` character-level timing events wired in Task 3.5
  - [ ] 4.3 Implement update_steps client tool handler: iterate results[], call completeStep() or requestClarification() per step, enforce no revert from completed
  - [ ] 4.4 Register `decompose_goal` and `update_steps` client tools using `useConversationClientTool` hook at the component level (auto-unregistered on unmount) rather than as a static map in `startSession`
  - [ ] 4.5 Implement error toast and retry button for decompose_goal validation failures; retry calls `sendUserMessage` with the last transcript text to re-trigger decomposition
  - [ ] 4.6 Implement real-time orb frequency visualization: use `getOutputByteFrequencyData()` during agent speech and `getInputByteFrequencyData()` during user input; map amplitude to orb scale and glow in a `requestAnimationFrame` loop
  - [ ] 4.7 Implement `sendFeedback` thumbs up/down button (shown after session ends when `useConversationFeedback().canSendFeedback` is true); feeds into ElevenLabs platform analytics

- [ ] 5. Audio Ducking & Orb State
  - [ ] 5.1 Implement singleton AudioContext manager with gain node for background audio ducking
  - [ ] 5.2 Implement audio ducking: on onStatusChange → 'speaking', ramp gain to 0.3 over 150ms; restore to 1.0 on 'listening'/'idle'
  - [ ] 5.3 Wire VoiceOrb animation states to SDK onStatusChange: idle, listening, processing, speaking
  - [ ] 5.4 Implement TONE_CONFIGS map (ToneProfile → voiceId) and tone profile selection persisted to localStorage

- [ ] 6. ElevenLabs Agent Configuration (Platform)
  - [ ] 6.1 Create a single ElevenLabs Conversational AI Agent on the platform with system prompt referencing `{{tone_profile}}`, `{{voice_id}}`, `{{context}}`, `{{goal}}`, `{{steps}}`, and `{{previous_sessions_summary}}` (with conditional fallback when absent)
  - [ ] 6.2 Configure agent conversation flow: turn_eagerness `normal` for `new_goal` context (balanced); configure `patient` mode for `progress_update` context (user may be mid-thought); set soft timeout to 3 seconds with filler message "Let me break that down..." (LLM-generated filler enabled)
  - [ ] 6.3 Register `decompose_goal` client tool on the agent (for `new_goal` context): tool must be set to **block** the conversation so the agent awaits the client's response before reading steps back
  - [ ] 6.4 Register `update_steps` as a client tool on the agent (for `progress_update` context); set to **block** so the agent awaits store confirmation before responding
  - [ ] 6.5 Configure Conversation Analysis — Success Evaluation criteria (in Agent's Analysis tab):
    - `goal_was_decomposed`: "Did the agent successfully decompose the user's goal into 2-6 concrete, actionable steps?"
    - `user_made_progress`: "Did the user report completing at least one step during the session?"
    - `session_quality`: "Was the conversation productive and did the agent stay on-task without confusing or frustrating the user?"
  - [ ] 6.6 Configure Conversation Analysis — Data Collection: extract `completed_step_count` (integer) and `session_context` ("new_goal" or "progress_update") from each transcript for analytics aggregation
  - [ ] 6.7 Configure post-call webhook in ElevenLabs platform settings pointing to `POST https://<NEXT_PUBLIC_APP_URL>/api/webhooks/elevenlabs`; enable `post_call_transcription` event type
  - [ ] 6.8 Store `ELEVENLABS_AGENT_ID` in server-side environment variables; confirm agent responds correctly to both contexts in platform testing

- [ ] 7. UI Components
  - [ ] 7.1 Implement VoiceOrb component with Framer Motion states (idle, listening, processing, speaking)
  - [ ] 7.2 Implement FloatingMicButton as fixed-position root layout overlay, disabled during TTS
  - [ ] 7.3 Implement TodoCard component with progress bar, domain tag, trophy icon for completed flows
  - [ ] 7.4 Implement StepList component with strikethrough, active highlight, and clarification pulse animation
  - [ ] 7.5 Implement Dashboard page: greeting, Recent Flows cards, Voice Interaction panel with orb
  - [ ] 7.6 Implement Projects page: Active Flows and Completed Flows sections with stagger entrance animation
  - [ ] 7.7 Implement Profile page: tone profile selector, notification preferences placeholders
  - [ ] 7.8 Implement reduced motion support: detect prefers-reduced-motion, set ui.reducedMotion, replace spring/bounce with opacity transitions

- [ ] 8. Voice Interaction Orchestration
  - [ ] 8.1 Implement voiceInteractionLoop: set activeContext ('new_goal' or 'progress_update') based on current screen before mic press
  - [ ] 8.2 Wire new_goal context: mic press fetches token → startSession with `decompose_goal` tool registered → mic release ends utterance; step highlighting is handled automatically via `onAudioAlignment` (no tool needed)
  - [ ] 8.3 Wire progress_update context: mic press fetches token with todoId + steps encoded as dynamic_variables → startSession with update_steps tool → mic release ends utterance
  - [ ] 8.4 Implement `sendContextualUpdate` call when user taps a step to manually complete it during an active session (e.g. "User manually marked step \"Buy protein powder\" as complete via UI tap")
  - [ ] 8.5 Implement microphone permission denied modal with browser-specific guidance

- [ ] 9. Testing
  - [ ] 9.1 Write unit tests for Zustand store actions (completeStep, addTask, hydrateFromDB) using Vitest
  - [ ] 9.2 Write unit tests for Zod schemas: valid/invalid decompose_goal payloads, boundary cases (2 and 6 steps)
  - [ ] 9.3 Write property-based tests using fast-check: completedCount invariant, step status monotonicity, hydration idempotency
  - [ ] 9.4 Write integration tests mocking the @elevenlabs/react SDK: simulate onUserTranscript, onStatusChange, and client tool invocations; verify full store → UI flow
  - [ ] 9.5 Write integration test for `/api/conversation/token`: verify `dynamicVariables` are correctly assembled for both contexts, that `previous_sessions_summary` is injected when KV returns a record, and omitted when KV returns null
  - [ ] 9.6 Write integration test for `POST /api/webhooks/elevenlabs`: verify HMAC validation (rejects invalid signatures with 401), verify KV write on valid `post_call_transcription` payload, verify graceful 500 on KV failure

- [ ] 10. Performance & Deployment
  - [ ] 10.1 Add Performance.mark instrumentation for stt_first_token (first onUserTranscript), agent_response (tool invocation), and tts_start (first onAudioChunk)
  - [ ] 10.2 Configure webpack-bundle-analyzer in CI to enforce <120KB gzipped bundle
  - [ ] 10.3 Configure Vercel deployment with Node.js 20.x runtime and all required environment variables: `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_WEBHOOK_SECRET`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `NEXT_PUBLIC_APP_URL`
  - [ ] 10.4 Set up GitHub Actions CI: lint → test → build → deploy on main
