import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WelcomeHeader from '../WelcomeHeader';

describe('WelcomeHeader', () => {
  const baseProps = {
    currentTime: new Date('2026-06-20T09:30:00'),
    user: { name: 'Juan Perez', role: 'mozo' },
    activeBranchName: 'Monteverde',
  };

  it('renders greeting with user first name', () => {
    render(<WelcomeHeader {...baseProps} />);
    expect(screen.getByText(/Juan/i)).toBeDefined();
  });

  it('renders the branch location badge', () => {
    render(<WelcomeHeader {...baseProps} />);
    expect(screen.getByText('Monteverde')).toBeDefined();
  });

  it('renders the current time as clock', () => {
    render(<WelcomeHeader {...baseProps} />);
    expect(screen.getByText(/09:30/)).toBeDefined();
  });
});
