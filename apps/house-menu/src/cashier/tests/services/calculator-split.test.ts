import { describe, it, expect } from 'vitest';
import {
  calculateSplitDistribution,
  getUnassignedItems,
  validateSplitBalance,
} from '../../services/calculator';

const mockItems = [
  { price: 10, quantity: 2 },  // total 20
  { price: 25, quantity: 1 },  // total 25
  { price: 5, quantity: 3 },   // total 15
  { price: 8, quantity: 2 },   // total 16
];

describe('calculateSplitDistribution', () => {
  it('distributes items across multiple diners', () => {
    const diners = [
      { name: 'Ana', items: [0, 2] },
      { name: 'Luis', items: [1] },
    ];
    const result = calculateSplitDistribution(mockItems, diners);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Ana');
    expect(result[0].total).toBe(35); // 20 + 15
    expect(result[1].name).toBe('Luis');
    expect(result[1].total).toBe(25);
  });

  it('handles empty diner items', () => {
    const diners = [
      { name: 'Ana', items: [] },
    ];
    const result = calculateSplitDistribution(mockItems, diners);
    expect(result[0].total).toBe(0);
  });

  it('filters out-of-range indices', () => {
    const diners = [
      { name: 'Test', items: [0, 99] },
    ];
    const result = calculateSplitDistribution(mockItems, diners);
    expect(result[0].total).toBe(20);
    expect(result[0].items).toEqual([0]);
  });

  it('allows same item assigned to multiple diners (split item)', () => {
    // Note: current implementation doesn't prevent this
    const diners = [
      { name: 'A', items: [0] },
      { name: 'B', items: [0] },
    ];
    const result = calculateSplitDistribution(mockItems, diners);
    expect(result[0].total).toBe(20);
    expect(result[1].total).toBe(20);
  });
});

describe('getUnassignedItems', () => {
  it('returns unassigned indices', () => {
    const diners = [{ items: [1] }];
    const unassigned = getUnassignedItems(4, diners);
    expect(unassigned).toEqual([0, 2, 3]);
  });

  it('returns all items when no assignment', () => {
    const unassigned = getUnassignedItems(3, []);
    expect(unassigned).toEqual([0, 1, 2]);
  });
});

describe('validateSplitBalance', () => {
  it('returns balanced=true when all items assigned', () => {
    const diners = [{ items: [0, 1, 2, 3] }];
    const result = validateSplitBalance(mockItems, diners);
    expect(result.balanced).toBe(true);
    expect(result.totalAssigned).toBe(76);
  });

  it('returns balanced=false with unassigned items', () => {
    const diners = [{ items: [0] }];
    const result = validateSplitBalance(mockItems, diners);
    expect(result.balanced).toBe(false);
    expect(result.unassigned).toEqual([1, 2, 3]);
  });

  it('handles empty items', () => {
    const result = validateSplitBalance([], []);
    expect(result.balanced).toBe(true);
    expect(result.totalAssigned).toBe(0);
    expect(result.totalOrder).toBe(0);
  });
});
