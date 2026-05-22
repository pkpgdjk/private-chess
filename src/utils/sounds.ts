import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useSettingsStore } from '@/store/settingsStore';

export type FeedbackType = 'move' | 'capture' | 'check' | 'castle' | 'gameOver' | 'illegal';

// Sound cache — populated once when assets are available
const soundCache: Partial<Record<FeedbackType, Audio.Sound>> = {};

let initialized = false;

/**
 * Pre-load sound assets.
 * TODO: Replace placeholder with bundled sound files, e.g.:
 *   soundCache.move = (await Audio.Sound.createAsync(require('@/assets/sounds/move.mp3'))).sound;
 */
export async function initSounds(): Promise<void> {
  if (initialized) return;
  // No bundled assets yet — haptics provide full feedback for the MVP.
  initialized = true;
}

/** Unload all cached sounds to free memory. */
export async function unloadSounds(): Promise<void> {
  await Promise.all(
    Object.values(soundCache).map((s) => s?.unloadAsync?.())
  );
  initialized = false;
}

/** Play haptic and/or sound feedback based on user settings. */
export async function playFeedback(type: FeedbackType): Promise<void> {
  const { soundEffects, hapticFeedback } = useSettingsStore.getState();

  if (hapticFeedback) {
    try {
      switch (type) {
        case 'move':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'capture':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'castle':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'check':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'gameOver':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'illegal':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
      }
    } catch {
      // Haptics unavailable on this device — ignore silently
    }
  }

  if (soundEffects) {
    try {
      const sound = soundCache[type];
      if (sound) {
        await sound.replayAsync();
      }
    } catch {
      // Sound playback errors are non-critical
    }
  }
}
