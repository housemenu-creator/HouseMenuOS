import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TimerBadge from '../TimerBadge';

describe('TimerBadge', () => {
  it('renders nothing when elapsedMs is 0', () => {
    const { container } = render(<TimerBadge elapsedMs={0} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when elapsedMs is null', () => {
    const { container } = render(<TimerBadge elapsedMs={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when elapsedMs is undefined', () => {
    const { container } = render(<TimerBadge elapsedMs={undefined} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when elapsedMs is negative', () => {
    const { container } = render(<TimerBadge elapsedMs={-100} />);
    expect(container.innerHTML).toBe('');
  });

  it('formats elapsed time as m:ss', () => {
    render(<TimerBadge elapsedMs={90000} />);
    expect(screen.getByText('1:30')).toBeDefined();
  });

  it('formats 0 seconds as 0:00', () => {
    render(<TimerBadge elapsedMs={1000} />);
    expect(screen.getByText('0:01')).toBeDefined();
  });

  it('formats over an hour as h h m', () => {
    render(<TimerBadge elapsedMs={7200000} />);
    expect(screen.getByText('2h 0m')).toBeDefined();
  });

  it('uses muted color under 10 min threshold', () => {
    render(<TimerBadge elapsedMs={300000} />); // 5 min
    const span = screen.getByText('5:00');
    expect(span.className).toContain('text-cm-muted/60');
  });

  it('uses warning color between 10-15 min', () => {
    render(<TimerBadge elapsedMs={660000} />); // 11 min
    const span = screen.getByText('11:00');
    expect(span.className).toContain('text-cm-warning');
  });

  it('uses error color over 15 min', () => {
    render(<TimerBadge elapsedMs={960000} />); // 16 min
    const span = screen.getByText('16:00');
    expect(span.className).toContain('text-cm-error');
  });

  it('applies additional className', () => {
    render(<TimerBadge elapsedMs={60000} className="extra-class" />);
    const span = screen.getByText('1:00');
    expect(span.className).toContain('extra-class');
  });

  it('renders clock icon', () => {
    render(<TimerBadge elapsedMs={60000} />);
    const clockIcon = document.querySelector('.lucide-clock');
    expect(clockIcon).toBeDefined();
  });
});
