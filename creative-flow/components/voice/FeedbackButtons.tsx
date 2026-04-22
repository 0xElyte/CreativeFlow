"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useConversationFeedback } from "@elevenlabs/react"

/**
 * Thumbs up / down feedback buttons.
 * Shown only after a session ends and the SDK reports canSendFeedback = true.
 * Feeds ElevenLabs platform analytics for the conversation.
 * Must be rendered inside <ConversationProvider>.
 */
export default function FeedbackButtons() {
  const { canSendFeedback, sendFeedback } = useConversationFeedback()

  return (
    <AnimatePresence>
      {canSendFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3"
          role="group"
          aria-label="Rate this session"
        >
          <span
            className="text-xs"
            style={{ color: "var(--cf-text-3)" }}
          >
            Was this helpful?
          </span>
          <button
            onClick={() => sendFeedback(true)}
            className="rounded-lg px-2 py-1 text-base leading-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: "var(--cf-surface)",
              border: "1.5px solid var(--cf-card-border)",
            }}
            aria-label="Thumbs up — helpful"
          >
            👍
          </button>
          <button
            onClick={() => sendFeedback(false)}
            className="rounded-lg px-2 py-1 text-base leading-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: "var(--cf-surface)",
              border: "1.5px solid var(--cf-card-border)",
            }}
            aria-label="Thumbs down — not helpful"
          >
            👎
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
