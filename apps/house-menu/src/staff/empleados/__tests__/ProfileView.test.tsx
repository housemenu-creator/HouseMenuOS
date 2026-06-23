import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileView from '../ProfileView';

// ── Hoisted mocks ──
const { mockSubscribe } = vi.hoisted(() => ({
  mockSubscribe: vi.fn(),
}));

// ── Framermotion mock ──
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// ── Employee service mock ──
vi.mock('../employeeService', () => ({
  subscribeEmployee: mockSubscribe,
}));

const UID = 'emp-001';
const BRANCH_ID = 'branch-1';

const mockProfile = {
  name: 'Carlos López',
  role: 'mozo',
  active: true,
  phone: '999-888-777',
  email: 'carlos@house.com',
};

describe('ProfileView', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows loading skeleton on mount', () => {
    mockSubscribe.mockImplementation(() => () => {});
    render(<ProfileView uid={UID} branchId={BRANCH_ID} />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders populated profile', () => {
    mockSubscribe.mockImplementation((_uid: string, cb: (data: any) => void) => {
      cb(mockProfile);
      return () => {};
    });
    render(<ProfileView uid={UID} branchId={BRANCH_ID} />);
    expect(screen.getAllByText(/Carlos López/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('mozo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(UID)).toBeDefined();
    expect(screen.getByText('Activo')).toBeDefined();
    expect(screen.getByText('999-888-777')).toBeDefined();
    expect(screen.getByText('carlos@house.com')).toBeDefined();
  });

  it('shows empty state when no data returned', () => {
    mockSubscribe.mockImplementation((_uid: string, cb: (data: any) => void) => {
      cb(null);
      return () => {};
    });
    render(<ProfileView uid={UID} branchId={BRANCH_ID} />);
    expect(screen.getByText('Perfil no encontrado')).toBeDefined();
  });

  it('shows error state when uid is empty', () => {
    render(<ProfileView uid="" branchId={BRANCH_ID} />);
    expect(screen.getByText('Error al cargar')).toBeDefined();
    expect(screen.getByText('Reintentar')).toBeDefined();
  });

  it('does not show contact section when phone/email missing', () => {
    mockSubscribe.mockImplementation((_uid: string, cb: (data: any) => void) => {
      cb({ name: 'Test', role: 'admin', active: true });
      return () => {};
    });
    render(<ProfileView uid={UID} branchId={BRANCH_ID} />);
    expect(screen.queryByText('Teléfono')).toBeNull();
    expect(screen.queryByText('Email')).toBeNull();
  });
});
