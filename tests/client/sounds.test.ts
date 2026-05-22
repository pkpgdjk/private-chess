import { afterEach, describe, expect, it, vi } from 'vitest';

type FakeOscillatorNode = {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  frequency: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  onended: ((event: Event) => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  type: OscillatorType;
};

type FakeGainNode = {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  gain: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
};

function createFakeAudioContext() {
  const oscillator: FakeOscillatorNode = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    onended: null,
    start: vi.fn(),
    stop: vi.fn(),
    type: 'sine',
  };
  const gain: FakeGainNode = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
  };
  const context = {
    createGain: vi.fn(() => gain),
    createOscillator: vi.fn(() => oscillator),
    currentTime: 1,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    state: 'suspended',
  };

  return { context, gain, oscillator };
}

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe('playMoveSound', () => {
  it('resumes a suspended audio context without blocking playback', async () => {
    const fake = createFakeAudioContext();
    class FakeAudioContext {
      constructor() {
        return fake.context;
      }
    }

    vi.stubGlobal('window', {});
    vi.stubGlobal('AudioContext', FakeAudioContext);

    const { playMoveSound } = await import('@/client/sounds');

    playMoveSound();

    expect(fake.context.resume).toHaveBeenCalledTimes(1);
    expect(fake.context.createOscillator).toHaveBeenCalledTimes(1);
  });

  it('disconnects audio nodes when playback ends', async () => {
    const fake = createFakeAudioContext();
    class FakeAudioContext {
      constructor() {
        return fake.context;
      }
    }

    vi.stubGlobal('window', {});
    vi.stubGlobal('AudioContext', FakeAudioContext);

    const { playMoveSound } = await import('@/client/sounds');

    playMoveSound();
    fake.oscillator.onended?.(new Event('ended'));

    expect(fake.oscillator.disconnect).toHaveBeenCalledTimes(1);
    expect(fake.gain.disconnect).toHaveBeenCalledTimes(1);
  });
});
