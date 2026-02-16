import { render } from '@testing-library/react';
import { vi } from 'vitest';

import {
  CategoryProgressBar,
  computeCategoryProgress,
} from './CategoryProgressBar';

import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';

vi.mock('@desktop-client/hooks/useFeatureFlag', () => ({
  useFeatureFlag: vi.fn(),
}));
vi.mock('@desktop-client/hooks/useFormat', () => ({
  useFormat: () => (v: number) => String(v),
}));

describe('computeCategoryProgress', () => {
  describe('under budget scenarios', () => {
    it('should return within-budget when spent is less than assigned', () => {
      const result = computeCategoryProgress({
        assigned: 10000,
        activity: -3000,
        balance: 7000,
      });

      expect(result.state).toBe('within-budget');
      expect(result.baselineAmount).toBe(10000);
      expect(result.progressRatio).toBeCloseTo(0.3);
      expect(result.overflowRatio).toBe(0);
    });

    it('should return within-budget with 0% when no spending', () => {
      const result = computeCategoryProgress({
        assigned: 10000,
        activity: 0,
        balance: 10000,
      });

      expect(result.state).toBe('within-budget');
      expect(result.baselineAmount).toBe(10000);
      expect(result.progressRatio).toBe(0);
      expect(result.overflowRatio).toBe(0);
    });
  });

  describe('on budget scenario', () => {
    it('should return within-budget when spent equals assigned', () => {
      const result = computeCategoryProgress({
        assigned: 10000,
        activity: -10000,
        balance: 0,
      });

      expect(result.state).toBe('within-budget');
      expect(result.baselineAmount).toBe(10000);
      expect(result.progressRatio).toBe(1.0);
      expect(result.overflowRatio).toBe(0);
    });
  });

  describe('overspent scenarios', () => {
    it('should return over-budget when spent exceeds assigned', () => {
      const result = computeCategoryProgress({
        assigned: 10000,
        activity: -12000,
        balance: -2000,
      });

      expect(result.state).toBe('over-budget');
      expect(result.baselineAmount).toBe(10000);
      expect(result.progressRatio).toBe(1.0);
      expect(result.overflowRatio).toBeCloseTo(0.2);
    });

    it('should handle large overflow (3x budget)', () => {
      const result = computeCategoryProgress({
        assigned: 10000,
        activity: -40000,
        balance: -30000,
      });

      expect(result.state).toBe('over-budget');
      expect(result.progressRatio).toBe(1.0);
      expect(result.overflowRatio).toBeCloseTo(3.0);
    });
  });

  describe('no budget scenarios', () => {
    it('should return within-budget when assigned=0 and spent=0', () => {
      const result = computeCategoryProgress({
        assigned: 0,
        activity: 0,
        balance: 0,
      });

      expect(result.state).toBe('within-budget');
      expect(result.baselineAmount).toBe(0);
      expect(result.progressRatio).toBe(0);
      expect(result.overflowRatio).toBe(0);
    });

    it('should return over-budget when assigned=0 but spent>0', () => {
      const result = computeCategoryProgress({
        assigned: 0,
        activity: -500,
        balance: -500,
      });

      expect(result.state).toBe('over-budget');
      expect(result.baselineAmount).toBe(500);
      expect(result.progressRatio).toBe(1.0);
      expect(result.overflowRatio).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle negative assigned amount', () => {
      const result = computeCategoryProgress({
        assigned: -10000,
        activity: 0,
        balance: -10000,
      });

      expect(result.state).toBe('within-budget');
      expect(result.baselineAmount).toBe(0);
    });

    it('should handle all zero values', () => {
      const result = computeCategoryProgress({
        assigned: 0,
        activity: 0,
        balance: 0,
      });

      expect(result.state).toBe('within-budget');
      expect(result.progressRatio).toBe(0);
      expect(result.overflowRatio).toBe(0);
    });

    it('should calculate remaining as balance in all cases', () => {
      const result = computeCategoryProgress({
        assigned: 10000,
        activity: -3000,
        balance: 7000,
      });

      expect(result.remaining).toBe(7000);
    });

    it('should preserve balance in over-budget case', () => {
      const result = computeCategoryProgress({
        assigned: 10000,
        activity: -15000,
        balance: -5000,
      });

      expect(result.remaining).toBe(-5000);
    });

    it('should handle spent with no budget', () => {
      const result = computeCategoryProgress({
        assigned: 0,
        activity: -2000,
        balance: -2000,
      });

      expect(result.state).toBe('over-budget');
      expect(result.baselineAmount).toBe(2000);
      expect(result.progressRatio).toBe(1.0);
      expect(result.remaining).toBe(-2000);
    });

    it('should handle large positive balance', () => {
      const result = computeCategoryProgress({
        assigned: 5000,
        activity: -1000,
        balance: 4000,
      });

      expect(result.state).toBe('within-budget');
      expect(result.remaining).toBe(4000);
    });
  });
});

describe('CategoryProgressBar rendering', () => {
  it('does not render when progressBar feature flag is disabled', () => {
    vi.mocked(useFeatureFlag).mockReturnValue(false);
    const { container } = render(
      <CategoryProgressBar assigned={10000} activity={-3000} balance={7000} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when progressBar feature flag is enabled', () => {
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    const { container } = render(
      <CategoryProgressBar assigned={10000} activity={-3000} balance={7000} />,
    );
    expect(container.firstChild).not.toBeNull();
  });
});
