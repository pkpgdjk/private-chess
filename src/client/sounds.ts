type BrowserWindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export type MoveSoundOptions = {
  enabled?: boolean;
  volume?: number;
};

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const browserWindow = window as BrowserWindowWithWebkitAudio;
  const AudioContextConstructor =
    typeof AudioContext === 'undefined' ? browserWindow.webkitAudioContext : AudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  audioContext ??= new AudioContextConstructor();
  return audioContext;
}

export function playMoveSound({ enabled = true, volume = 0.18 }: MoveSoundOptions = {}): void {
  if (!enabled) {
    return;
  }

  try {
    const context = getAudioContext();
    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      void context.resume().catch(() => undefined);
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startedAt = context.currentTime;
    const safeVolume = Math.max(0, Math.min(volume, 1));
    const cleanup = () => {
      oscillator.onended = null;
      oscillator.disconnect();
      gain.disconnect();
    };

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(620, startedAt);
    oscillator.frequency.exponentialRampToValueAtTime(420, startedAt + 0.08);

    gain.gain.setValueAtTime(0.0001, startedAt);
    gain.gain.exponentialRampToValueAtTime(safeVolume, startedAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + 0.09);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = cleanup;
    oscillator.start(startedAt);
    oscillator.stop(startedAt + 0.1);
  } catch {
    // Sound is optional and should never block a move.
  }
}
