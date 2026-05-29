import { useState, useEffect, useRef, useCallback } from 'react';

const COMMANDS = [
  { pattern: /inicia?r?\s+(.+)/i, action: 'preparando' },
  { pattern: /(?:marca?r?|listo)\s+(.+)/i, action: 'listo' },
];

export function useVoiceCommands(onCommand) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const onCommandRef = useRef(onCommand);
  const isListeningRef = useRef(false);

  onCommandRef.current = onCommand;
  isListeningRef.current = isListening;

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-PE';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const text = last[0].transcript.trim().toLowerCase();
      setTranscript(text);

      if (last.isFinal) {
        for (const cmd of COMMANDS) {
          const match = text.match(cmd.pattern);
          if (match) {
            onCommandRef.current?.(match[1].trim(), cmd.action);
            break;
          }
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop(); } catch {}
    };
  }, []);

  useEffect(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (isListening) {
      try { rec.start(); } catch {}
    } else {
      try { rec.stop(); } catch {}
      setTranscript('');
    }
  }, [isListening]);

  const toggleListening = useCallback(() => setIsListening((p) => !p), []);

  return { isListening, toggleListening, transcript };
}
