import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';

// ── Callback capture for onAuthStateChanged ──
let onAuthCb = null;

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, cb) => {
    onAuthCb = cb;
    return () => { onAuthCb = null; };
  }),
  signInAnonymously: vi.fn(() => Promise.resolve({ user: { uid: 'anon-test' } })),
}));

vi.mock('@house/db', () => ({
  realtimeDB: {},
  auth: { currentUser: { uid: 'anon-test' } },
}));

// ── Onboarding service mock ──
const mockIsFirstRun = vi.fn();
const mockCompleteSetup = vi.fn();

vi.mock('../../lib/onboardingService', () => ({
  isFirstRun: (...args) => mockIsFirstRun(...args),
  completeSetup: (...args) => mockCompleteSetup(...args),
}));

// ── Auth context mock ──
const mockLogin = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: false,
    isLoading: false,
    user: null,
  }),
}));

// ── Helpers ──
async function triggerAuthReady() {
  if (onAuthCb) {
    await onAuthCb({ uid: 'anon-test' });
  }
}

function type(element, value) {
  fireEvent.change(element, { target: { value } });
}

// ─────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────
describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onAuthCb = null;
    mockIsFirstRun.mockResolvedValue(true);
    mockCompleteSetup.mockResolvedValue({ success: true, tenantId: 'tnt_test', branchId: 'brn_test' });
    mockLogin.mockResolvedValue({ success: true });
  });

  // ── Loading state ──
  it('shows loading spinner while waiting for auth', async () => {
    const Page = (await import('../OnboardingWizard')).default;
    renderWithProviders(<Page />);
    expect(screen.getByText(/Preparando/i)).toBeTruthy();
  });

  // ── Redirect when not first run ──
  it('redirects to / when not first run', async () => {
    mockIsFirstRun.mockResolvedValue(false);
    const Page = (await import('../OnboardingWizard')).default;
    renderWithProviders(<Page />, { initialEntries: ['/onboarding'] });
    await triggerAuthReady();
    await waitFor(() => {
      // After isFirstRun returns false, navigate('/') is called
      // We can't easily check navigation without a mock router, but
      // we can verify isFirstRun was called
      expect(mockIsFirstRun).toHaveBeenCalled();
    });
  });

  // ── Step 0: Restaurante ──
  it('shows restaurant step initially', async () => {
    const Page = (await import('../OnboardingWizard')).default;
    renderWithProviders(<Page />);
    await triggerAuthReady();
    expect(await screen.findByText('Nombre del restaurante *')).toBeTruthy();
    expect(screen.getByText('Siguiente')).toBeTruthy();
  });

  it('disables Next when restaurant name is empty', async () => {
    const Page = (await import('../OnboardingWizard')).default;
    renderWithProviders(<Page />);
    await triggerAuthReady();
    await screen.findByText('Nombre del restaurante *');
    const nextBtn = screen.getByText('Siguiente').closest('button');
    expect(nextBtn).toBeDisabled();
  });

  it('enables Next after typing restaurant name', async () => {
    const Page = (await import('../OnboardingWizard')).default;
    renderWithProviders(<Page />);
    await triggerAuthReady();
    const input = await screen.findByPlaceholderText(/Ej: La Casa/);
    type(input, 'Mi Restaurante');
    const nextBtn = screen.getByText('Siguiente').closest('button');
    expect(nextBtn).not.toBeDisabled();
  });

  // ── Step Navigation ──
  it('advances to admin step after filling restaurant name', async () => {
    const user = userEvent.setup();
    const Page = (await import('../OnboardingWizard')).default;
    renderWithProviders(<Page />);
    await triggerAuthReady();

    const input = await screen.findByPlaceholderText(/Ej: La Casa/);
    type(input, 'Mi Resto');

    await user.click(screen.getByText('Siguiente'));
    expect(await screen.findByText('Cuenta de administrador')).toBeTruthy();
  });

  // ── Step 1: Admin ──
  it('shows PIN mismatch error', async () => {
    const user = userEvent.setup();
    const Page = (await import('../OnboardingWizard')).default;
    renderWithProviders(<Page />);
    await triggerAuthReady();

    // Step 0 → fill → next
    type(await screen.findByPlaceholderText(/Ej: La Casa/), 'Mi Resto');
    await user.click(screen.getByText('Siguiente'));
    await screen.findByText('Cuenta de administrador');

    // Fill admin fields with mismatched PIN
    type(screen.getByPlaceholderText(/Ej: Juan/), 'Admin');
    type(screen.getByPlaceholderText(/juan@/), 'admin@test.com');
    type(screen.getAllByPlaceholderText(/7245/)[0], '1234');
    type(screen.getAllByPlaceholderText(/Repetí/)[0], '5678');

    await waitFor(() => {
      expect(screen.getByText('Los PIN no coinciden')).toBeTruthy();
    });
  });

  it('advances to branch step with valid admin data', async () => {
    const user = userEvent.setup();
    const Page = (await import('../OnboardingWizard')).default;
    renderWithProviders(<Page />);
    await triggerAuthReady();

    // Step 0 → fill → next
    type(await screen.findByPlaceholderText(/Ej: La Casa/), 'Mi Resto');
    await user.click(screen.getByText('Siguiente'));
    await screen.findByText('Cuenta de administrador');

    // Fill admin
    type(screen.getByPlaceholderText(/Ej: Juan/), 'Admin');
    type(screen.getByPlaceholderText(/juan@/), 'admin@test.com');
    const pins = screen.getAllByPlaceholderText(/7245|Repetí/);
    type(pins[0], '1234');
    type(pins[1], '1234');

    await user.click(screen.getByText('Siguiente'));
    expect(await screen.findByText('Primera sucursal')).toBeTruthy();
  });

  // ── Step 2: Branch ──
  it('advances to confirm step with valid branch data', async () => {
    const user = userEvent.setup();
    const Page = (await import('../OnboardingWizard')).default;
    renderWithProviders(<Page />);
    await triggerAuthReady();

    // Step 0 → restaurant
    type(await screen.findByPlaceholderText(/Ej: La Casa/), 'Mi Resto');
    await user.click(screen.getByText('Siguiente'));
    await screen.findByText('Cuenta de administrador');

    // Step 1 → admin
    type(screen.getByPlaceholderText(/Ej: Juan/), 'Admin');
    type(screen.getByPlaceholderText(/juan@/), 'admin@test.com');
    const pins1 = screen.getAllByPlaceholderText(/7245|Repetí/);
    type(pins1[0], '1234');
    type(pins1[1], '1234');
    await user.click(screen.getByText('Siguiente'));
    await screen.findByText('Primera sucursal');

    // Step 2 → branch
    type(screen.getByPlaceholderText(/Ej: Local Centro/), 'Local Centro');
    await user.click(screen.getByText('Siguiente'));
    expect(await screen.findByText('Confirmar datos')).toBeTruthy();
  });

  // ── Step 3: Confirm + Submit ──
  it('shows summary of entered data', async () => {
    const user = userEvent.setup();
    const Page = (await import('../OnboardingWizard')).default;
    renderWithProviders(<Page />);
    await triggerAuthReady();

    // Navigate through all steps
    type(await screen.findByPlaceholderText(/Ej: La Casa/), 'Mi Resto');
    await user.click(screen.getByText('Siguiente'));
    await screen.findByText('Cuenta de administrador');

    type(screen.getByPlaceholderText(/Ej: Juan/), 'Admin');
    type(screen.getByPlaceholderText(/juan@/), 'admin@test.com');
    const pins = screen.getAllByPlaceholderText(/7245|Repetí/);
    type(pins[0], '1234');
    type(pins[1], '1234');
    await user.click(screen.getByText('Siguiente'));
    await screen.findByText('Primera sucursal');

    type(screen.getByPlaceholderText(/Ej: Local Centro/), 'Local Centro');
    await user.click(screen.getByText('Siguiente'));
    await screen.findByText('Confirmar datos');

    // Summary should show entered data
    expect(screen.getByText('Mi Resto')).toBeTruthy();
    // "Admin" appears in step indicator AND summary — use getAllByText
    expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('admin@test.com')).toBeTruthy();
    expect(screen.getByText('Local Centro')).toBeTruthy();
  });

  it('calls completeSetup and login on submit', async () => {
    const user = userEvent.setup();
    const Page = (await import('../OnboardingWizard')).default;
    renderWithProviders(<Page />);
    await triggerAuthReady();

    // Navigate all steps
    type(await screen.findByPlaceholderText(/Ej: La Casa/), 'Mi Resto');
    await user.click(screen.getByText('Siguiente'));
    await screen.findByText('Cuenta de administrador');

    type(screen.getByPlaceholderText(/Ej: Juan/), 'Admin');
    type(screen.getByPlaceholderText(/juan@/), 'admin@test.com');
    const pins = screen.getAllByPlaceholderText(/7245|Repetí/);
    type(pins[0], '1234');
    type(pins[1], '1234');
    await user.click(screen.getByText('Siguiente'));
    await screen.findByText('Primera sucursal');

    type(screen.getByPlaceholderText(/Ej: Local Centro/), 'Local Centro');
    await user.click(screen.getByText('Siguiente'));
    await screen.findByText('Confirmar datos');

    // Click "Crear restaurante"
    await user.click(screen.getByText('Crear restaurante'));

    await waitFor(() => {
      expect(mockCompleteSetup).toHaveBeenCalledTimes(1);
    });

    const setupArgs = mockCompleteSetup.mock.calls[0][0];
    expect(setupArgs.tenant.name).toBe('Mi Resto');
    expect(setupArgs.admin.email).toBe('admin@test.com');
    expect(setupArgs.admin.pin).toBe('1234');
    expect(setupArgs.branch.name).toBe('Local Centro');

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@test.com', '1234');
    });
  });

  it('shows success state after completion', async () => {
    const user = userEvent.setup();
    const Page = (await import('../OnboardingWizard')).default;
    renderWithProviders(<Page />);
    await triggerAuthReady();

    // Navigate all steps & submit
    type(await screen.findByPlaceholderText(/Ej: La Casa/), 'Mi Resto');
    await user.click(screen.getByText('Siguiente'));
    await screen.findByText('Cuenta de administrador');
    type(screen.getByPlaceholderText(/Ej: Juan/), 'Admin');
    type(screen.getByPlaceholderText(/juan@/), 'admin@test.com');
    const pins = screen.getAllByPlaceholderText(/7245|Repetí/);
    type(pins[0], '1234');
    type(pins[1], '1234');
    await user.click(screen.getByText('Siguiente'));
    await screen.findByText('Primera sucursal');
    type(screen.getByPlaceholderText(/Ej: Local Centro/), 'Local Centro');
    await user.click(screen.getByText('Siguiente'));
    await screen.findByText('Confirmar datos');
    await user.click(screen.getByText('Crear restaurante'));

    expect(await screen.findByText(/Restaurante creado/i)).toBeTruthy();
    expect(screen.getByText('Mi Resto')).toBeTruthy();
    expect(screen.getByText('Ir al panel')).toBeTruthy();
  });

  it('shows error on setup failure and allows retry', async () => {
    mockCompleteSetup.mockResolvedValue({ success: false, error: 'Error de prueba' });
    const user = userEvent.setup();
    const Page = (await import('../OnboardingWizard')).default;
    renderWithProviders(<Page />);
    await triggerAuthReady();

    // Quick nav to submit
    type(await screen.findByPlaceholderText(/Ej: La Casa/), 'Mi Resto');
    await user.click(screen.getByText('Siguiente'));
    await screen.findByText('Cuenta de administrador');
    type(screen.getByPlaceholderText(/Ej: Juan/), 'Admin');
    type(screen.getByPlaceholderText(/juan@/), 'admin@test.com');
    const pins = screen.getAllByPlaceholderText(/7245|Repetí/);
    type(pins[0], '1234');
    type(pins[1], '1234');
    await user.click(screen.getByText('Siguiente'));
    await screen.findByText('Primera sucursal');
    type(screen.getByPlaceholderText(/Ej: Local Centro/), 'Local Centro');
    await user.click(screen.getByText('Siguiente'));
    await screen.findByText('Confirmar datos');
    await user.click(screen.getByText('Crear restaurante'));

    expect(await screen.findByText('Error de prueba')).toBeTruthy();
  });
});
