/**
 * VoiceNotePlayer — Inline audio player for voice notes
 *
 * Features:
 * - Play/pause button
 * - Progress bar (seekable)
 * - Duration display "0:08 / 0:15"
 * - Uses HTMLAudioElement
 * - Shows order badge if orderId is present
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Link } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Format milliseconds to mm:ss
 */
function formatDuration(ms) {
  if (!ms || isNaN(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * VoiceNotePlayer Component
 * @param {Object} props
 * @param {string} props.url - Audio URL
 * @param {number} props.duration - Duration in ms
 * @param {string} props.orderId - Optional order ID to link to
 * @param {Function} props.onOrderClick - Callback when order link is clicked
 */
export function VoiceNotePlayer({ url, duration, orderId, onOrderClick }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);

  const audioRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    if (!url) return;

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setTotalDuration(audio.duration * 1000); // Convert to ms
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime * 1000); // Convert to ms
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [url]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Seek to position
  const handleSeek = useCallback((e) => {
    if (!audioRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const seekTime = percent * (totalDuration / 1000);

    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime * 1000);
  }, [totalDuration]);

  // Handle order link click
  const handleOrderClick = useCallback(() => {
    if (onOrderClick && orderId) {
      onOrderClick(orderId);
    }
  }, [onOrderClick, orderId]);

  // Calculate progress percentage
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex items-center gap-2">
        {/* Play/Pause button */}
        <motion.button
          onClick={togglePlay}
          whileTap={{ scale: 0.9 }}
          className="
            w-8 h-8 rounded-full
            bg-cm-accent hover:bg-cm-accent-hover
            flex items-center justify-center
            transition-colors
          "
        >
          <AnimatePresence mode="wait">
            {isPlaying ? (
              <motion.div
                key="pause"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Pause className="w-4 h-4 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="play"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Play className="w-4 h-4 text-white ml-0.5" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Progress bar */}
        <div
          onClick={handleSeek}
          className="
            flex-1 h-2 bg-cm-surface rounded-full cursor-pointer
            overflow-hidden
          "
        >
          <motion.div
            className="h-full bg-cm-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Duration */}
        <span className="text-xs text-cm-text-secondary whitespace-nowrap">
          {formatDuration(currentTime)} / {formatDuration(totalDuration)}
        </span>
      </div>

      {/* Order link if present */}
      {orderId && (
        <button
          onClick={handleOrderClick}
          className="
            self-start flex items-center gap-1
            text-xs text-cm-accent hover:text-cm-accent-hover
            transition-colors
          "
        >
          <Link className="w-3 h-3" />
          <span>Pedido #{orderId}</span>
        </button>
      )}
    </div>
  );
}

export default VoiceNotePlayer;