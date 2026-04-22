export type VoiceState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking'

export type ToneProfile = 'calm_mentor' | 'hype_coach' | 'gentle_guide'

export type StepStatus = 'pending' | 'completed' | 'clarification_needed' | 'unmatched'

export type TodoStatus = 'active' | 'completed' | 'archived'

export type NavView = 'dashboard' | 'projects' | 'search' | 'profile'

export interface TodoStep {
  id: string
  text: string
  domainTag: string
  estimatedMinutes: number
  status: StepStatus
  completedAt?: number
}

export interface TodoItem {
  id: string
  goal: string
  domain: string
  steps: TodoStep[]
  status: TodoStatus
  toneProfile: ToneProfile
  createdAt: number
  updatedAt: number
  completedAt?: number
}

export interface ToneConfig {
  voiceId: string
  label: string
  description: string
  /** CSS variable name e.g. '--cf-amber' */
  accentVar: string
  /** Hex/oklch for SVG/canvas use */
  accentColor: string
}

export interface DecomposeGoalPayload {
  goal: string
  domain: string
  steps: Array<{
    text: string
    domainTag: string
    estimatedMinutes: number
  }>
}

export interface UpdateStepsPayload {
  results: Array<{
    stepId: string
    status: 'completed' | 'clarification_needed'
    query?: string
  }>
}

export interface UserSessionRecord {
  transcript_summary: string
  call_successful: boolean
  conversation_id: string
  timestamp: number
}

export interface ConversationTokenResponse {
  conversationToken: string
  dynamicVariables: {
    tone_profile: ToneProfile
    voice_id: string
    context: 'new_goal' | 'progress_update'
    goal?: string
    steps?: string
    previous_sessions_summary?: string
  }
}
