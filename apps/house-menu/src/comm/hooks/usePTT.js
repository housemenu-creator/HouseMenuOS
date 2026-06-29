/**
 * usePTT — Push-to-Talk Hook
 *
 * Uses navigator.mediaDevices.getUserMedia for audio capture.
 * Uses refs for mutable state to avoid stale closure issues.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export function usePTT({ maxDuration = 15000, onRecordingComplete } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState(null);
  const [isPermitted, setIsPermitted] = useState(true);

  // Refs for mutable state (no stale closures)
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  const maxDurationRef = useRef(maxDuration);

  // Keep callback refs fresh
  useEffect(() => { onRecordingCompleteRef.current = onRecordingComplete; }, [onRecordingComplete]);
  useEffect(() => { maxDurationRef.current = maxDuration; }, [maxDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];
    setRecordingDuration(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const err = 'Micrófono no disponible en este dispositivo';
        setError(err);
        return { success: false, error: err };
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const callback = onRecordingCompleteRef.current;
        if (callback) {
          // Use the recorded duration from state (latest value via closure)
          setRecordingDuration((currentDuration) => {
            callback(blob, currentDuration);
            return currentDuration;
          });
        }
        chunksRef.current = [];
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Date.now() - startTime);
      }, 100);

      timerRef.current = setTimeout(() => {
        stopRecording();
      }, maxDurationRef.current);

      return { success: true };
    } catch (err) {
      console.warn('usePTT: Microphone access error:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Acceso al micrófono denegado');
        setIsPermitted(false);
      } else {
        setError(err.message || 'Error al acceder al micrófono');
      }

      setIsRecording(false);
      return { success: false, error: err.message };
    }
  }, [stopRecording]); // only depends on stopRecording, which is stable

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    error,
    isPermitted,
  };
}

export default usePTT;
