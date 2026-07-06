import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import React from 'react';
import { renderWithProviders } from '../../test/test-utils';
import TenantResolver from '../TenantResolver';

// Mocks
const mockNavigate = vi.fn();
let mockParams = { slug: 'sushi-sakura' };

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => mockNavigate,
    Outlet: () => <div data-testid="outlet">Child Route Content</div>,
  };
});

const mockResolveSlug = vi.fn();
vi.mock('../../lib/slugService', () => ({
  resolveSlug: (slug) => mockResolveSlug(slug),
}));

const mockSetTenantId = vi.fn();
vi.mock('../../lib/tenantService', () => ({
  setTenantId: (id) => mockSetTenantId(id),
}));

const mockSetActiveBranchId = vi.fn();
vi.mock('@house/store', () => ({
  appStore: {
    getState: () => ({
      setActiveBranchId: mockSetActiveBranchId,
    }),
  },
}));

describe('TenantResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { slug: 'sushi-sakura' };
  });

  it('debe mostrar pantalla de cargando mientras resuelve el slug', async () => {
    let resolvePromise;
    mockResolveSlug.mockImplementation(() => {
      resolvePromise = new Promise(() => {}); // nunca resuelve
      return resolvePromise;
    });

    renderWithProviders(<TenantResolver />);
    expect(screen.getByText('Buscando restaurante...')).toBeDefined();
  });

  it('debe renderizar el Outlet si el slug se resuelve correctamente', async () => {
    mockResolveSlug.mockResolvedValue({
      tenantId: 'tnt_sushi',
      branchId: 'brn_sushi1',
    });

    await act(async () => {
      renderWithProviders(<TenantResolver />);
    });

    expect(mockSetTenantId).toHaveBeenCalledWith('tnt_sushi');
    expect(mockSetActiveBranchId).toHaveBeenCalledWith('brn_sushi1');
    expect(screen.getByTestId('outlet')).toBeDefined();
  });

  it('debe mostrar pantalla 404 si el slug no se encuentra', async () => {
    mockResolveSlug.mockResolvedValue(null);

    await act(async () => {
      renderWithProviders(<TenantResolver />);
    });

    expect(screen.getByText('Restaurante No Encontrado')).toBeDefined();
    expect(screen.getByText(/sushi-sakura/)).toBeDefined();
  });

  it('debe navegar al inicio si hace click en Ir al Inicio en el error', async () => {
    mockResolveSlug.mockResolvedValue(null);

    await act(async () => {
      renderWithProviders(<TenantResolver />);
    });

    const button = screen.getByText('Ir al Inicio');
    button.click();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
