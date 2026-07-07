import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIProduct } from '../useAIProduct';

const mockDescribeProduct = vi.fn();
vi.mock('../../../lib/aiService', () => ({
  describeProduct: (...args: unknown[]) => mockDescribeProduct(...args),
  AI_STEPS_DESCRIBE: [
    { label: 'Analizando imagen...', status: 'current' },
    { label: 'Reconociendo ingredientes', status: 'pending' },
    { label: 'Identificando categoría', status: 'pending' },
    { label: 'Calculando precio sugerido', status: 'pending' },
  ],
}));

const mockCreateProductWithData = vi.fn();
vi.mock('../../../lib/menuService', () => ({
  menuService: {
    createProductWithData: (...args: unknown[]) => mockCreateProductWithData(...args),
  },
}));

describe('useAIProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initial state', () => {
    const { result } = renderHook(() => useAIProduct('branch-1'));
    expect(result.current.processing).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBe(0);
  });

  it('reset clears all state', () => {
    const { result } = renderHook(() => useAIProduct('branch-1'));
    act(() => result.current.reset());
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.processing).toBe(false);
  });

  it('maneja error de AI', async () => {
    mockDescribeProduct.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useAIProduct('branch-1'));
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current.analyze(file, ['Platos']);
    });

    expect(result.current.error).toBe('API error');
    expect(result.current.processing).toBe(false);
  });

  it('saveProduct retorna id en modo manual (sin result)', async () => {
    mockCreateProductWithData.mockResolvedValue('new-product-id');

    const { result } = renderHook(() => useAIProduct('branch-1'));

    // Sin AI result, pero con name en overrides → debe guardar igual
    const id = await result.current.saveProduct({ name: 'Test', price: 25 });
    expect(id).toBe('new-product-id');
    expect(mockCreateProductWithData).toHaveBeenCalledWith('branch-1', expect.objectContaining({
      name: 'Test',
      base_price: 25,
    }));
  });

  it('saveProduct retorna null si no hay name', async () => {
    const { result } = renderHook(() => useAIProduct('branch-1'));
    const id = await result.current.saveProduct({ price: 25 });
    expect(id).toBeNull();
    expect(mockCreateProductWithData).not.toHaveBeenCalled();
  });

  it('setImage actualiza el estado', () => {
    const { result } = renderHook(() => useAIProduct('branch-1'));
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    act(() => result.current.setImage(file));
    expect(result.current.image).toBe(file);
  });
});
