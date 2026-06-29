/**
 * PTTButton — Push-to-Talk Button
 *
 * Features:
 * - Hold-to-record (pointer down/up)
 * - Visual states: idle, recording (red + pulse), disabled
 * - Shows duration counter when recording
 * - Auto-stops at 15 seconds
 * - Uploads audio to Firebase Storage and sends as voice note
 * - Uses ToastContext for feedback
 */
import { useState, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePTT } from '../hooks/usePTT';
import { useComm } from '../hooks/useComm';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ToastContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@house/db';

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const PTT_MAX_DURATION = 15000;

export function PTTButton() {
  const { user } = useAuth();
  const { sendMessage, currentChannel } = useComm();
  const { showToast } = useToast();
  const [isDisabled, setIsDisabled] = useState(false);

  const handleRecordingComplete = useCallback(
    async (blob, duration) => {
      if (!user || !currentChannel) return;
      try {
        const timestamp = Date.now();
        const voicePath = `commVoiceNotes/${user.id}/${timestamp}.webm`;
        const storageRef = ref(storage, voicePath);

        await uploadBytes(storageRef, blob);
        const voiceNoteUrl = await getDownloadURL(storageRef);

        await sendMessage('🎤 Nota de voz', 'NORMAL', {
          isVoiceNote: true,
          voiceNoteUrl,
          duration,
        });

        showToast(`Nota de voz enviada (${formatDuration(duration)})`, 'success');
      } catch (err) {
        console.error('PTTButton: Failed to send voice note:', err);
        showToast('Error al enviar nota de voz', 'error');
      }
    },
    [user, currentChannel, sendMessage, showToast]
  );

  const { isRecording, recordingDuration, startRecording, stopRecording, error, isPermitted } = usePTT({
    maxDuration: PTT_MAX_DURATION,
    onRecordingComplete: handleRecordingComplete,
  });

  const handlePointerDown = useCallback(
    async (e) => {
      e.preventDefault();
      if (isDisabled || !isPermitted) return;
      const result = await startRecording();
      if (!result.success) {
        if (result.error) showToast('Permiso de micrófono requerido', 'error');
        setIsDisabled(true);
      }
    },
    [isDisabled, isPermitted, startRecording, showToast]
  );

  const handlePointerUp = useCallback(
    (e) => {
      e.preventDefault();
      if (isRecording) stopRecording();
    },
    [isRecording, stopRecording]
  );

  const handlePointerLeave = useCallback(() => {
    if (isRecording) stopRecording();
  }, [isRecording, stopRecording]);

  const btnClass = isDisabled || !isPermitted
    ? 'bg-cm-surface text-cm-text-tertiary cursor-not-allowed'
    : isRecording
      ? 'bg-cm-error text-white animate-pulse'
      : 'bg-cm-surface text-cm-text hover:bg-cm-surface-hover';

  return (
    <div className="relative">
      <motion.button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerUp}
        disabled={isDisabled || !isPermitted}
        whileTap={{ scale: 0.95 }}
        className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 ${btnClass}`}
        title={isRecording ? `Grabando... ${formatDuration(recordingDuration)}` : 'Push to Talk'}
      >
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div
              key="recording"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <Mic className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              {isDisabled || !isPermitted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {isRecording && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-cm-error"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        )}
      </motion.button>

      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <span className="text-xs font-medium text-cm-error">
              {formatDuration(recordingDuration)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PTTButton;
