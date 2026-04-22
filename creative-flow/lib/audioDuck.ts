/**
 * Singleton AudioContext manager for background audio ducking.
 *
 * Usage:
 *   audioDuck.rampTo(0.3)  // duck on agent speech
 *   audioDuck.rampTo(1.0)  // restore on listening / idle
 *
 * Any <audio> or <video> element can be connected:
 *   audioDuck.connect(mediaElement)
 *
 * The context is lazily created on first call so it satisfies browsers'
 * "must be created from a user gesture" requirement.
 */

class AudioDuckManager {
  private ctx: AudioContext | null = null
  private gain: GainNode | null = null
  private sources = new WeakSet<MediaElementAudioSourceNode>()

  /** Lazily initialise the AudioContext + gain node. */
  private init(): { ctx: AudioContext; gain: GainNode } {
    if (this.ctx && this.gain) return { ctx: this.ctx, gain: this.gain }

    const ctx = new AudioContext()
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(1.0, ctx.currentTime)
    gain.connect(ctx.destination)

    this.ctx = ctx
    this.gain = gain
    return { ctx, gain }
  }

  /**
   * Connect an HTMLMediaElement to the gain node so its volume is
   * controlled by ducking ramps. Safe to call multiple times for the
   * same element (no-op on subsequent calls).
   */
  connect(el: HTMLMediaElement): void {
    const { ctx, gain } = this.init()
    const src = ctx.createMediaElementSource(el)
    if (this.sources.has(src)) return
    this.sources.add(src)
    src.connect(gain)
  }

  /**
   * Smoothly ramp the gain to a target value.
   * @param target  0.0–1.0
   * @param ms      Ramp duration in milliseconds (default 150)
   */
  rampTo(target: number, ms = 150): void {
    const { ctx, gain } = this.init()
    const now = ctx.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(target, now + ms / 1000)
  }

  /** Current gain value (synchronous read from Web Audio param). */
  get currentGain(): number {
    return this.gain?.gain.value ?? 1.0
  }

  /** Suspend the AudioContext when the tab is hidden to save resources. */
  suspend(): void {
    this.ctx?.suspend()
  }

  /** Resume the AudioContext when the tab becomes visible again. */
  resume(): void {
    this.ctx?.resume()
  }
}

// Export a single shared instance
export const audioDuck = new AudioDuckManager()
