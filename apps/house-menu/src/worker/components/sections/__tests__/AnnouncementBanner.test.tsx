import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnnouncementBanner from '../AnnouncementBanner';

describe('AnnouncementBanner', () => {
  it('renders announcement title and content when announcement is provided', () => {
    render(
      <AnnouncementBanner announcement="Hoy hay promo 2x1" defaultPhrase="Buen turno" />,
    );
    expect(screen.getByText('Hoy hay promo 2x1')).toBeDefined();
    expect(screen.getByText('Comunicado del Local')).toBeDefined();
  });

  it('renders motivational phrase when no announcement exists', () => {
    render(
      <AnnouncementBanner announcement={null} defaultPhrase="Échale ganas" />,
    );
    expect(screen.getByText('Échale ganas')).toBeDefined();
    expect(screen.getByText('Frase del Turno')).toBeDefined();
  });

  it('returns nothing when both announcement and phrase are empty', () => {
    const { container } = render(
      <AnnouncementBanner announcement={null} defaultPhrase="" />,
    );
    expect(container.innerHTML).toBe('');
  });
});
