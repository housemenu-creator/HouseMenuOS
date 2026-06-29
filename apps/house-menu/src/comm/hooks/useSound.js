/**
 * useSound — Sound notification hook for communication system
 *
 * Features:
 * - Role-based sounds: kitchen=metallic, cash=soft, delivery=vibration+beep
 * - Uses Web Audio API for better mobile support
 * - Pre-loads sounds on mount
 * - Priority-based volume modulation
 */
import { useEffect, useRef, useCallback } from 'react';

/**
 * Sound configurations per role
 * Each role gets a distinct sound pattern for recognition
 */
const SOUND_CONFIGS = {
  kitchen: {
    url: null, // Will use synthesized metallic sound
    type: 'metallic',
    baseVolume: 0.7,
  },
  cash: {
    url: null, // Will use synthesized soft beep
    type: 'soft',
    baseVolume: 0.5,
  },
  delivery: {
    url: null, // Will use vibration + beep pattern
    type: 'vibration',
    baseVolume: 0.8,
  },
  default: {
    url: null,
    type: 'default',
    baseVolume: 0.6,
  },
};

/**
 * Priority volume multipliers
 */
const PRIORITY_MULTIPLIERS = {
  URGENT: 1.0,
  NORMAL: 0.7,
  INFO: 0.4,
};

/**
 * Get AudioContext, creating one if needed
 */
function getAudioContext() {
  if (typeof window === 'undefined') return null;

  if (!window.audioContext) {
    window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return window.audioContext;
}

/**
 * Play a synthesized metallic sound (kitchen)
 * Short, sharp metallic ping
 */
function playMetallicSound(volume) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(880, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.1);

  gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.15);
}

/**
 * Play a soft beep (cash)
 * Gentle, non-intrusive notification
 */
function playSoftBeep(volume) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(440, ctx.currentTime);
  oscillator.frequency.setValueAtTime(554, ctx.currentTime + 0.1); // A# note

  gainNode.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.25);
}

/**
 * Play vibration + beep pattern (delivery)
 * Attention-grabbing but not annoying
 */
function playVibrationPattern(volume) {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Vibration pattern via oscillator
  const playBeep = (startTime, freq) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(freq, startTime);

    gainNode.gain.setValueAtTime(volume * 0.25, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.1);
  };

  // Play three quick beeps
  const now = ctx.currentTime;
  playBeep(now, 660);
  playBeep(now + 0.12, 660);
  playBeep(now + 0.24, 880);

  // Trigger device vibration if available
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }
}

/**
 * Play default notification sound
 */
function playDefaultSound(volume) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(523, ctx.currentTime); // C5

  gainNode.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.2);
}

/**
 * useSound hook
 * @returns {Object} { playSound, isSupported }
 */
export function useSound() {
  const isSupported = typeof window !== 'undefined' && (
    window.AudioContext || window.webkitAudioContext
  );

  // Pre-load any external sounds on mount
  useEffect(() => {
    if (isSupported) {
      // Resume audio context if suspended (browser autoplay policy)
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    }
  }, [isSupported]);

  /**
   * Play a sound based on priority and role
   * @param {'URGENT'|'NORMAL'|'INFO'} priority - Message priority
   * @param {string} role - Target role for sound selection
   */
  const playSound = useCallback((priority = 'NORMAL', role = 'default') => {
    if (!isSupported) return;

    const config = SOUND_CONFIGS[role] || SOUND_CONFIGS.default;
    const priorityMultiplier = PRIORITY_MULTIPLIERS[priority] || 0.5;
    const volume = config.baseVolume * priorityMultiplier;

    switch (config.type) {
      case 'metallic':
        playMetallicSound(volume);
        break;
      case 'soft':
        playSoftBeep(volume);
        break;
      case 'vibration':
        playVibrationPattern(volume);
        break;
      default:
        playDefaultSound(volume);
    }
  }, [isSupported]);

  return { playSound, isSupported };
}

export default useSound;