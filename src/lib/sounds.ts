// Soft, short tones made with Web Audio (no audio files). They play only while
// Settings > Sounds is on, and only for live moments (a check, a full bloom, a visitor arriving).
export type SoundEvent = "check" | "fullBloom" | "visitor";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  return ctx;
}

function tone(ac: AudioContext, freq: number, at: number, dur: number, gain: number): void {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(ac.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}

const NOTES: Record<SoundEvent, [number, number, number][]> = {
  check: [[880, 0, 0.12]],
  fullBloom: [[659, 0, 0.35], [784, 0.09, 0.35], [988, 0.18, 0.5]],
  visitor: [[784, 0, 0.25], [1175, 0.12, 0.4]],
};

export function playSound(event: SoundEvent, enabled: boolean): void {
  if (!enabled) return;
  try {
    const ac = audio();
    if (!ac) return;
    if (ac.state === "suspended") ac.resume().catch(() => {}); // refused outside a tap: stay quiet
    const t0 = ac.currentTime + 0.01;
    for (const [f, dt, dur] of NOTES[event]) tone(ac, f, t0 + dt, dur, event === "check" ? 0.05 : 0.07);
  } catch {
    // sound is a nicety; never break a tap over it
  }
}
