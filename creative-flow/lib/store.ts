import { create } from "zustand"
import type { TodoItem, ToneProfile, VoiceState } from "./types"

/* ─── Slice shapes ───────────────────────────────────────── */
interface SessionSlice {
  active: boolean
  voiceState: VoiceState
  transcript: string
  userId: string
  /** taskId of a draft pending user confirmation; null when no draft is in flight */
  pendingDraftId: string | null
}

interface AudioSlice {
  playing: boolean
  currentStepId: string | null
  toneProfile: ToneProfile
}

interface SessionHistorySlice {
  summary: string | null
  lastConversationId: string | null
}

interface UISlice {
  reducedMotion: boolean
  activeView: "dashboard" | "projects" | "profile"
}

/* ─── Full store ─────────────────────────────────────────── */
export interface AppStore {
  session: SessionSlice
  tasks: TodoItem[]
  audio: AudioSlice
  sessionHistory: SessionHistorySlice
  ui: UISlice

  // Task actions
  addTask: (item: TodoItem) => void
  confirmTask: (taskId: string) => void
  discardDraft: (taskId: string) => void
  completeStep: (todoId: string, stepId: string) => void
  requestClarification: (todoId: string, stepId: string, query: string) => void

  // Session / voice actions
  setVoiceState: (state: VoiceState) => void
  setTranscript: (text: string) => void
  setPendingDraftId: (id: string | null) => void
  setAudioPlaying: (playing: boolean, stepId?: string | null) => void
  setToneProfile: (profile: ToneProfile) => void

  // Cross-session memory
  setSessionSummary: (summary: string, conversationId: string) => void

  // Identity
  setUserId: (userId: string) => void

  // UI
  setReducedMotion: (value: boolean) => void

  // Persistence
  hydrateTasks: (tasks: TodoItem[]) => void
}

export const useStore = create<AppStore>((set) => ({
  /* ── Initial state ── */
  session: {
    active: false,
    voiceState: "idle",
    transcript: "",
    userId: "",
    pendingDraftId: null,
  },
  tasks: [],
  audio: {
    playing: false,
    currentStepId: null,
    toneProfile: "calm_mentor",
  },
  sessionHistory: {
    summary: null,
    lastConversationId: null,
  },
  ui: {
    reducedMotion: false,
    activeView: "dashboard",
  },

  /* ── Task actions ── */
  addTask: (item) =>
    set((s) => ({ tasks: [item, ...s.tasks] })),

  confirmTask: (taskId) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId && t.status === "draft"
          ? { ...t, status: "active" as const, updatedAt: Date.now() }
          : t
      ),
    })),

  discardDraft: (taskId) =>
    set((s) => ({
      tasks: s.tasks.filter((t) => !(t.id === taskId && t.status === "draft")),
    })),

  completeStep: (todoId, stepId) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id !== todoId
          ? t
          : {
              ...t,
              updatedAt: Date.now(),
              steps: t.steps.map((step) =>
                step.id !== stepId || step.status === "completed"
                  ? step
                  : { ...step, status: "completed" as const, completedAt: Date.now() }
              ),
            }
      ),
    })),

  requestClarification: (todoId, stepId, _query) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id !== todoId
          ? t
          : {
              ...t,
              updatedAt: Date.now(),
              steps: t.steps.map((step) =>
                step.id !== stepId
                  ? step
                  : { ...step, status: "clarification_needed" as const }
              ),
            }
      ),
    })),

  /* ── Voice / audio actions ── */
  setVoiceState: (voiceState) =>
    set((s) => ({
      session: {
        ...s.session,
        voiceState,
        active: voiceState !== "idle",
      },
    })),

  setTranscript: (transcript) =>
    set((s) => ({ session: { ...s.session, transcript } })),

  setPendingDraftId: (pendingDraftId) =>
    set((s) => ({ session: { ...s.session, pendingDraftId } })),

  setAudioPlaying: (playing, stepId = null) =>
    set((s) => ({
      audio: {
        ...s.audio,
        playing,
        currentStepId: playing ? (stepId ?? s.audio.currentStepId) : null,
      },
    })),

  setToneProfile: (toneProfile) =>
    set((s) => ({ audio: { ...s.audio, toneProfile } })),

  /* ── Cross-session memory ── */
  setSessionSummary: (summary, conversationId) =>
    set(() => ({
      sessionHistory: { summary, lastConversationId: conversationId },
    })),

  /* ── Identity ── */
  setUserId: (userId) =>
    set((s) => ({ session: { ...s.session, userId } })),

  /* ── UI ── */
  setReducedMotion: (reducedMotion) =>
    set((s) => ({ ui: { ...s.ui, reducedMotion } })),

  /* ── Persistence ── */
  hydrateTasks: (tasks) => set({ tasks }),
}))
