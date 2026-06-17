import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Render a component wrapped in MemoryRouter + basic providers.
 * Context mocks (Auth, Branch, Toast, Theme) are handled via `vi.mock` in each test file.
 */
export function renderWithProviders(ui, { initialEntries = ['/'], ...renderOptions } = {}) {
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        {children}
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
