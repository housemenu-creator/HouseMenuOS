/**
 * PTTButton Tests — RED (Test First)
 *
 * Tests for the Push-to-Talk button component
 * Note: MediaRecorder API is tested via usePTT hook unit tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Shared mock so tests can assert on showToast calls
const { mockShowToast } = vi.hoisted(() => ({
  mockShowToast: vi.fn(),
}));

// Mock useAuth before importing the component
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-1', role: 'kitchen', name: 'Test Chef' },
  }),
}));

// Mock ToastContext — component uses useToast() internally, not a prop
vi.mock('../../../components/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

// Mock useComm hook
vi.mock('../../hooks/useComm', () => ({
  useComm: () => ({
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
    currentChannel: 'kitchen',
  }),
}));

// Mock usePTT hook to avoid MediaRecorder complexity in unit tests
vi.mock('../../hooks/usePTT', () => ({
  usePTT: vi.fn().mockReturnValue({
    isRecording: false,
    recordingDuration: 0,
    startRecording: vi.fn().mockResolvedValue({ success: true }),
    stopRecording: vi.fn(),
    error: null,
    isPermitted: true,
  }),
}));

// Mock Firebase storage
vi.mock('@house/db', () => ({
  storage: {},
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn().mockResolvedValue('https://example.com/audio.webm'),
}));

describe('PTTButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with Mic icon when not recording', async () => {
      const { PTTButton } = await import('../PTTButton');
      render(<PTTButton />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders disabled when isPermitted is false', async () => {
      const { usePTT } = await import('../../hooks/usePTT');
      usePTT.mockReturnValue({
        isRecording: false,
        recordingDuration: 0,
        startRecording: vi.fn(),
        stopRecording: vi.fn(),
        error: 'Permission denied',
        isPermitted: false,
      });

      const { PTTButton } = await import('../PTTButton');
      render(<PTTButton />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Recording State UI', () => {
    it('shows duration counter when recording', async () => {
      const { usePTT } = await import('../../hooks/usePTT');
      usePTT.mockReturnValue({
        isRecording: true,
        recordingDuration: 5000,
        startRecording: vi.fn(),
        stopRecording: vi.fn(),
        error: null,
        isPermitted: true,
      });

      const { PTTButton } = await import('../PTTButton');
      render(<PTTButton />);

      // Should show duration
      const duration = screen.getByText('0:05');
      expect(duration).toBeInTheDocument();
    });

    it('button shows recording state', async () => {
      const { usePTT } = await import('../../hooks/usePTT');
      usePTT.mockReturnValue({
        isRecording: true,
        recordingDuration: 3000,
        startRecording: vi.fn(),
        stopRecording: vi.fn(),
        error: null,
        isPermitted: true,
      });

      const { PTTButton } = await import('../PTTButton');
      render(<PTTButton />);

      // The button should have the recording class (red pulse)
      const button = screen.getByRole('button');
      expect(button).toHaveClass('animate-pulse');
    });
  });

  describe('User Interaction', () => {
    it('calls startRecording on pointer down', async () => {
      const startRecording = vi.fn().mockResolvedValue({ success: true });
      const { usePTT } = await import('../../hooks/usePTT');
      usePTT.mockReturnValue({
        isRecording: false,
        recordingDuration: 0,
        startRecording,
        stopRecording: vi.fn(),
        error: null,
        isPermitted: true,
      });

      const { PTTButton } = await import('../PTTButton');
      render(<PTTButton />);

      const button = screen.getByRole('button');

      await act(async () => {
        fireEvent.pointerDown(button);
      });

      await waitFor(() => {
        expect(startRecording).toHaveBeenCalled();
      });
    });

    it('calls stopRecording on pointer up', async () => {
      const stopRecording = vi.fn();
      const { usePTT } = await import('../../hooks/usePTT');
      usePTT.mockReturnValue({
        isRecording: true,
        recordingDuration: 3000,
        startRecording: vi.fn(),
        stopRecording,
        error: null,
        isPermitted: true,
      });

      const { PTTButton } = await import('../PTTButton');
      render(<PTTButton />);

      const button = screen.getByRole('button');

      await act(async () => {
        fireEvent.pointerUp(button);
      });

      await waitFor(() => {
        expect(stopRecording).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows toast when startRecording fails', async () => {
      const startRecording = vi.fn().mockResolvedValue({ success: false, error: 'Permission denied' });
      const { usePTT } = await import('../../hooks/usePTT');
      usePTT.mockReturnValue({
        isRecording: false,
        recordingDuration: 0,
        startRecording,
        stopRecording: vi.fn(),
        error: 'Permission denied',
        isPermitted: true,
      });

      const { PTTButton } = await import('../PTTButton');
      render(<PTTButton />);

      const button = screen.getByRole('button');

      await act(async () => {
        fireEvent.pointerDown(button);
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Permiso de micrófono requerido', 'error');
      });
    });
  });
});