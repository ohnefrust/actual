import React, { useMemo } from 'react';

import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useFormat } from '@desktop-client/hooks/useFormat';

/**
 * Computes the visual state of a category progress bar based on budgeted vs spent amounts.
 * Always compares spent against budgeted (assigned), removing goal-based logic.
 */
export type ProgressParams = {
  /** Amount assigned/budgeted (in cents) */
  assigned: number;
  /** Amount spent (in cents, negative for spending) */
  activity: number;
  /** Current balance (in cents) */
  balance: number;
};

export type ProgressResult = {
  /** The "100%" baseline amount for the bar */
  baselineAmount: number;
  /** Fill ratio from 0.0 to 1.0 (clamped for main bar) */
  progressRatio: number;
  /** Extra overflow beyond 1.0 (for overspending visualization) */
  overflowRatio: number;
  /** Amount remaining (can be negative) */
  remaining: number;
  /** Visual state for color/styling */
  state: 'within-budget' | 'over-budget';
};

export function computeCategoryProgress(
  params: ProgressParams,
): ProgressResult {
  const { assigned, activity, balance } = params;
  const spent = Math.abs(activity);

  // No budget case
  if (assigned <= 0) {
    if (spent <= 0) {
      return {
        baselineAmount: 0,
        progressRatio: 0,
        overflowRatio: 0,
        remaining: 0,
        state: 'within-budget',
      };
    }

    // Spent something but no budget
    return {
      baselineAmount: spent,
      progressRatio: 1.0,
      overflowRatio: 0,
      remaining: balance,
      state: 'over-budget',
    };
  }

  // Budget exists (assigned > 0)
  if (spent > assigned) {
    const overflow = (spent - assigned) / assigned;
    return {
      baselineAmount: assigned,
      progressRatio: 1.0,
      overflowRatio: overflow,
      remaining: balance,
      state: 'over-budget',
    };
  }

  // spent <= assigned (covers 0%, any %, and exactly 100%)
  return {
    baselineAmount: assigned,
    progressRatio: spent / assigned,
    overflowRatio: 0,
    remaining: balance,
    state: 'within-budget',
  };
}

/**
 * Returns color for the progress bar based on state
 */
function getProgressBarColor(state: ProgressResult['state']): string {
  return state === 'over-budget'
    ? theme.budgetNumberNegative
    : theme.templateNumberFunded;
}

type CategoryProgressBarProps = {
  /** Amount assigned/budgeted (in cents) */
  assigned: number;
  /** Amount spent (in cents, negative for spending) */
  activity: number;
  /** Current balance (in cents) */
  balance: number;
};

export function CategoryProgressBar({
  assigned,
  activity,
  balance,
}: CategoryProgressBarProps) {
  const progressBarEnabled = useFeatureFlag('progressBar');
  const format = useFormat();

  const progress = useMemo(
    () =>
      computeCategoryProgress({
        assigned,
        activity,
        balance,
      }),
    [assigned, activity, balance],
  );

  const fillColor = getProgressBarColor(progress.state);

  // Compute tooltip text
  const tooltipParts: string[] = [];
  if (progress.baselineAmount > 0) {
    const percent = Math.round(
      (progress.progressRatio + progress.overflowRatio) * 100,
    );
    tooltipParts.push(`${percent}% of budget spent`);
  }
  if (assigned !== 0) {
    tooltipParts.push(`Budgeted: ${format(assigned, 'financial')}`);
  }
  if (activity !== 0) {
    tooltipParts.push(`Spent: ${format(Math.abs(activity), 'financial')}`);
  }
  if (balance !== 0) {
    tooltipParts.push(`Balance: ${format(balance, 'financial')}`);
  }

  const tooltipContent = tooltipParts.join(' • ');

  // Don't render if feature is disabled or no baseline
  if (!progressBarEnabled || progress.baselineAmount <= 0) {
    return null;
  }

  return (
    <Tooltip content={tooltipContent} wrapperStyle={{ width: '100%' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <View
          style={{
            flex: 1,
            position: 'relative',
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.tableBackground,
            overflow: 'hidden',
          }}
        >
          {/* Normal progress bar fill */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              borderRadius: progress.overflowRatio > 0 ? 0 : 3,
              backgroundColor: fillColor,
              width:
                progress.overflowRatio > 0
                  ? `${(progress.progressRatio / (progress.progressRatio + progress.overflowRatio)) * 100}%`
                  : `${progress.progressRatio * 100}%`,
            }}
          />

          {/* Overflow fill (dark red) for overspending */}
          {progress.overflowRatio > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: `${(progress.progressRatio / (progress.progressRatio + progress.overflowRatio)) * 100}%`,
                height: '100%',
                borderRadius: 0,
                backgroundColor: fillColor,
                filter: 'brightness(0.72)',
                width: `${(progress.overflowRatio / (progress.progressRatio + progress.overflowRatio)) * 100}%`,
              }}
            />
          )}
        </View>
      </View>
    </Tooltip>
  );
}
