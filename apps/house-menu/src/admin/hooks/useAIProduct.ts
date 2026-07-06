import { useState, useCallback } from 'react';
import { describeProduct, AI_STEPS_DESCRIBE } from '../../lib/aiService';
import type { ProductDescription, AIProcessingStep } from '../../lib/aiService';
import { menuService } from '../../lib/menuService';

export function useAIProduct(branchId: string) {
  const [image, setImage] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProductDescription | null>(null);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<AIProcessingStep[]>(AI_STEPS_DESCRIBE);
  const [error, setError] = useState<string | null>(null);

  const updateProgress = useCallback((currentStep: number, total: number) => {
    setProgress(currentStep / total);
    setSteps(prev =>
      prev.map((s, i) => ({
        ...s,
        status: i < currentStep
          ? ('done' as const)
          : i === currentStep
            ? ('current' as const)
            : ('pending' as const),
      }))
    );
  }, []);

  const analyze = useCallback(
    async (file: File, categories: string[]) => {
      setProcessing(true);
      setError(null);
      setProgress(0);
      setSteps(
        AI_STEPS_DESCRIBE.map((s, i) => ({
          ...s,
          status: i === 0 ? ('current' as const) : ('pending' as const),
        }))
      );

      try {
        const base64 = await fileToBase64(file);
        updateProgress(1, 4);

        const desc = await describeProduct(base64, categories);
        updateProgress(4, 4);

        setResult(desc);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al procesar la imagen';
        setError(msg);
        setSteps(prev =>
          prev.map(s =>
            s.status === 'current' ? { ...s, status: 'error' as const } : s
          )
        );
      } finally {
        setProcessing(false);
      }
    },
    [updateProgress]
  );

  const saveProduct = useCallback(
    async (overrides: Partial<ProductDescription>): Promise<string | null> => {
      if (!result) return null;
      const merged = { ...result, ...overrides };
      try {
        const id = await menuService.createProductWithData(branchId, {
          name: merged.name,
          description: merged.description,
          base_price: merged.price,
          category: merged.category,
          tags: merged.tags,
          spicy: merged.isSpicy,
          vegan: merged.isVegan,
          glutenFree: merged.isGlutenFree,
          available: true,
        });
        return id;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar producto');
        return null;
      }
    },
    [result, branchId]
  );

  const reset = useCallback(() => {
    setImage(null);
    setProcessing(false);
    setResult(null);
    setProgress(0);
    setSteps(AI_STEPS_DESCRIBE);
    setError(null);
  }, []);

  return { image, setImage, processing, progress, steps, result, error, analyze, saveProduct, reset };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Error al leer la imagen'));
    reader.readAsDataURL(file);
  });
}
