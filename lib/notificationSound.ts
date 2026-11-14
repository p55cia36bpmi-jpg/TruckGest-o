export type NotificationSoundVariant = 'checklist' | 'trip' | 'critical' | 'info';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

export async function unlockNotificationAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    return ctx.state === 'running';
  } catch {
    return false;
  }
}

interface ToneStep {
  frequency: number;
  startOffset: number;
  duration: number;
  type: OscillatorType;
  peakGain: number;
}

const SOUND_PATTERNS: Record<NotificationSoundVariant, ToneStep[]> = {
  checklist: [
    { frequency: 659.25, startOffset: 0, duration: 0.14, type: 'triangle', peakGain: 0.16 },
    { frequency: 880, startOffset: 0.15, duration: 0.22, type: 'triangle', peakGain: 0.18 },
  ],
  trip: [
    { frequency: 523.25, startOffset: 0, duration: 0.11, type: 'sine', peakGain: 0.16 },
    { frequency: 659.25, startOffset: 0.12, duration: 0.11, type: 'sine', peakGain: 0.17 },
    { frequency: 783.99, startOffset: 0.24, duration: 0.24, type: 'sine', peakGain: 0.19 },
  ],
  critical: [
    { frequency: 880, startOffset: 0, duration: 0.12, type: 'triangle', peakGain: 0.2 },
    { frequency: 659.25, startOffset: 0.14, duration: 0.12, type: 'triangle', peakGain: 0.18 },
    { frequency: 880, startOffset: 0.28, duration: 0.22, type: 'triangle', peakGain: 0.2 },
  ],
  info: [
    { frequency: 587.33, startOffset: 0, duration: 0.12, type: 'sine', peakGain: 0.14 },
    { frequency: 783.99, startOffset: 0.13, duration: 0.18, type: 'sine', peakGain: 0.14 },
  ],
};

export async function playNotificationSound(
  variant: NotificationSoundVariant
): Promise<'played' | 'blocked' | 'unsupported'> {
  const ctx = getAudioContext();
  if (!ctx) return 'unsupported';

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (ctx.state !== 'running') {
      return 'blocked';
    }

    const now = ctx.currentTime;
    const steps = SOUND_PATTERNS[variant] || SOUND_PATTERNS.info;

    for (const step of steps) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + step.startOffset;
      const end = start + step.duration;

      osc.type = step.type;
      osc.frequency.setValueAtTime(step.frequency, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(step.peakGain, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(end + 0.02);
    }

    return 'played';
  } catch {
    return 'blocked';
  }
}
