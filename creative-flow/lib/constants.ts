import type { ToneConfig, ToneProfile } from './types'

export const TONE_CONFIGS: Record<ToneProfile, ToneConfig> = {
  calm_mentor: {
    voiceId: 'GLSWsaquVBsIPLPPRi2s',
    label: 'Calm Mentor',
    description: 'Measured, wise, grounding',
    accentVar: '--cf-amber',
    accentColor: 'oklch(73% 0.17 55)',
  },
  hype_coach: {
    voiceId: '1GCQiLWWVadqyDYY3CK9',
    label: 'Hype Coach',
    description: 'Energetic, motivating, bold',
    accentVar: '--cf-coral',
    accentColor: 'oklch(65% 0.22 30)',
  },
  gentle_guide: {
    voiceId: '',
    label: 'Gentle Guide',
    description: 'Soft, encouraging, patient',
    accentVar: '--cf-violet',
    accentColor: 'oklch(54% 0.19 295)',
  },
}

export const DOMAIN_LABELS: Record<string, string> = {
  brand: 'Brand',
  writing: 'Writing',
  fitness: 'Fitness',
  work: 'Work',
  creative: 'Creative',
  research: 'Research',
  music: 'Music',
  design: 'Design',
}
