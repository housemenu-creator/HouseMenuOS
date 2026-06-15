import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriorityBadge from '../PriorityBadge';
import { PRIORITY } from '../../kdsTypes';

describe('PriorityBadge', () => {
  it('renders NORMAL priority by default', () => {
    render(<PriorityBadge />);
    expect(screen.getByText('Normal')).toBeDefined();
    const icon = document.querySelector('.lucide-clock');
    expect(icon).toBeDefined();
  });

  it('renders NORMAL priority label', () => {
    render(<PriorityBadge priority={PRIORITY.NORMAL} />);
    expect(screen.getByText('Normal')).toBeDefined();
  });

  it('renders RUSH priority with Bell icon and pulse', () => {
    render(<PriorityBadge priority={PRIORITY.RUSH} />);
    expect(screen.getByText('Rush')).toBeDefined();
    const icon = document.querySelector('.lucide-bell');
    expect(icon).toBeDefined();
    const span = screen.getByText('Rush');
    expect(span.className).toContain('animate-pulse');
  });

  it('renders LOW priority', () => {
    render(<PriorityBadge priority={PRIORITY.LOW} />);
    expect(screen.getByText('Baja')).toBeDefined();
    const icon = document.querySelector('.lucide-triangle-alert');
    expect(icon).toBeDefined();
  });

  it('falls back to NORMAL for unknown priority', () => {
    render(<PriorityBadge priority={'unknown'} />);
    expect(screen.getByText('Normal')).toBeDefined();
  });

  it('applies additional className', () => {
    render(<PriorityBadge priority={PRIORITY.NORMAL} className="extra-class" />);
    const span = screen.getByText('Normal');
    expect(span.className).toContain('extra-class');
  });
});
