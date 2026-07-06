import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AIProcessingDisplay } from '../AIProcessingDisplay';
import type { AIProcessingStep } from '../../../../lib/aiService';

describe('AIProcessingDisplay', () => {
  const steps: AIProcessingStep[] = [
    { label: 'Paso 1', status: 'done' },
    { label: 'Paso 2', status: 'current' },
    { label: 'Paso 3', status: 'pending' },
    { label: 'Paso 4', status: 'error' },
  ];

  it('renderiza label principal', () => {
    render(<AIProcessingDisplay label="🧠 ANALIZANDO" steps={steps} progress={0.5} />);
    expect(screen.getByText('🧠 ANALIZANDO')).toBeDefined();
  });

  it('renderiza todos los pasos', () => {
    render(<AIProcessingDisplay label="Test" steps={steps} progress={0.5} />);
    expect(screen.getByText('Paso 1')).toBeDefined();
    expect(screen.getByText('Paso 2')).toBeDefined();
    expect(screen.getByText('Paso 3')).toBeDefined();
    expect(screen.getByText('Paso 4')).toBeDefined();
  });

  it('muestra el progreso en porcentaje', () => {
    render(<AIProcessingDisplay label="Test" steps={steps} progress={0.5} />);
    expect(screen.getByText('50%')).toBeDefined();
  });

  it('muestra 0% cuando progress es 0', () => {
    render(<AIProcessingDisplay label="Test" steps={steps} progress={0} />);
    expect(screen.getByText('0%')).toBeDefined();
  });

  it('muestra 100% cuando progress es 1', () => {
    render(<AIProcessingDisplay label="Test" steps={steps} progress={1} />);
    expect(screen.getByText('100%')).toBeDefined();
  });

  it('tiene clase ai-scanline en el overlay', () => {
    const { container } = render(<AIProcessingDisplay label="Test" steps={steps} progress={0.5} />);
    expect(container.querySelector('.ai-scanline')).toBeDefined();
  });
});
