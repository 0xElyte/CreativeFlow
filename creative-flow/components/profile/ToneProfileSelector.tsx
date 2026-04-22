"use client"

import { motion } from "framer-motion"
import { TONE_CONFIGS } from "@/lib/constants"
import { useStore } from "@/lib/store"
import type { ToneProfile } from "@/lib/types"

const PROFILES: ToneProfile[] = ["calm_mentor", "hype_coach", "gentle_guide"]

/**
 * Tone profile radio group.
 * Selecting a profile updates the Zustand store and persists the choice
 * to localStorage so it survives page reloads.
 *
 * localStorage key: "cf_tone_profile"
 */
export default function ToneProfileSelector() {
  const toneProfile = useStore((s) => s.audio.toneProfile)
  const setToneProfile = useStore((s) => s.setToneProfile)

  const handleSelect = (profile: ToneProfile) => {
    setToneProfile(profile)
    localStorage.setItem("cf_tone_profile", profile)
  }

  return (
    <div
      className="flex flex-col gap-3"
      role="radiogroup"
      aria-label="Choose your assistant tone"
    >
      {PROFILES.map((profile) => {
        const cfg = TONE_CONFIGS[profile]
        const isActive = toneProfile === profile

        return (
          <motion.button
            key={profile}
            role="radio"
            aria-checked={isActive}
            onClick={() => handleSelect(profile)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            transition={{ duration: 0.15 }}
            className="w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-4 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: isActive ? "var(--cf-card)" : "var(--cf-surface)",
              border: isActive
                ? `1.5px solid var(${cfg.accentVar})`
                : "1.5px solid var(--cf-card-border)",
              boxShadow: isActive
                ? `0 0 0 1px var(${cfg.accentVar} / 0.2), 0 2px 12px oklch(0% 0 0 / 0.06)`
                : "none",
            }}
          >
            {/* Colour dot */}
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: cfg.accentColor }}
              aria-hidden
            />

            {/* Labels */}
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span
                className="text-sm font-semibold leading-tight"
                style={{ color: isActive ? "var(--cf-text-1)" : "var(--cf-text-2)" }}
              >
                {cfg.label}
              </span>
              <span
                className="text-xs leading-snug"
                style={{ color: "var(--cf-text-3)" }}
              >
                {cfg.description}
              </span>
            </div>

            {/* Radio indicator */}
            <span
              className="w-4 h-4 rounded-full flex-shrink-0 border-2 flex items-center justify-center"
              style={{
                borderColor: isActive ? cfg.accentColor : "var(--cf-bg-border)",
              }}
              aria-hidden
            >
              {isActive && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: cfg.accentColor }}
                />
              )}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
