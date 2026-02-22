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
  /** Template amount (in cents) */
  template?: number;
};

export type ProgressResult = {
  /** The "100%" baseline amount for the bar */
  baselineAmount: number;
  /** Spent vs budgeted ratio, normalized to the baseline width */
  spentRatio: number;
  /** Budgeted vs template ratio (baseline width) */
  budgetedRatio: number;
  /** Extra overflow beyond 1.0 (for overspending visualization) */
  overflowRatio: number;
  /** Amount remaining (can be negative) */
  remaining: number;
  /** Visual state for color/styling */
  state: 'funded' | 'underfunded' | 'over-budget';
};

export function computeCategoryProgress(
  params: ProgressParams,
): ProgressResult {
  const { assigned, activity, balance, template = 0 } = params;
  const spent = Math.abs(activity);
  const hasTemplate = template > 0;
  const budgetedRatio = hasTemplate ? Math.min(assigned / template, 1) : 1;

  // No budget case
  if (assigned <= 0) {
    if (spent <= 0) {
      return {
        baselineAmount: 0,
        spentRatio: 0,
        budgetedRatio: 0,
        overflowRatio: 0,
        remaining: 0,
        state: 'funded',
      };
    }

    // Spent something but no budget
    return {
      baselineAmount: spent,
      spentRatio: 1.0,
      budgetedRatio: 0,
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
      spentRatio: 1.0,
      budgetedRatio: 1,
      overflowRatio: overflow,
      remaining: balance,
      state: 'over-budget',
    };
  }

  const isUnderfunded = hasTemplate && assigned < template;
  const baselineAmount = hasTemplate ? template : assigned;
  const spentRatio =
    assigned > 0 ? Math.min(spent / assigned, 1) * budgetedRatio : 0;

  // spent <= assigned (covers 0%, any %, and exactly 100%), no overspend
  return {
    baselineAmount,
    spentRatio,
    budgetedRatio,
    overflowRatio: 0,
    remaining: balance,
    state: isUnderfunded ? 'underfunded' : 'funded',
  };
}

/**
 * Returns color for the progress bar based on state
 */
function getProgressBarColor(state: ProgressResult['state']): string {
  switch (state) {
    case 'over-budget':
      return theme.budgetNumberNegative;
    case 'underfunded':
      return theme.templateNumberUnderFunded;
    default:
      return theme.templateNumberFunded;
  }
}

type CategoryProgressBarProps = {
  /** Amount assigned/budgeted (in cents) */
  assigned: number;
  /** Amount spent (in cents, negative for spending) */
  activity: number;
  /** Current balance (in cents) */
  balance: number;
  /** Template amount (in cents) */
  template?: number;
};

export function CategoryProgressBar({
  assigned,
  activity,
  balance,
  template,
}: CategoryProgressBarProps) {
  const progressBarEnabled = useFeatureFlag('progressBar');
  const format = useFormat();

  const progress = useMemo(
    () =>
      computeCategoryProgress({
        assigned,
        activity,
        balance,
        template,
      }),
    [assigned, activity, balance, template],
  );

  const fillColor = getProgressBarColor(progress.state);

  // Compute tooltip text
  const tooltipParts: string[] = [];
  if (progress.baselineAmount > 0) {
    const percent = Math.round(
      (progress.spentRatio + progress.overflowRatio) * 100,
    );
    tooltipParts.push(
      template && template > 0
        ? `${percent}% of template spent`
        : `${percent}% of budget spent`,
    );
  }
  if (template && template > 0) {
    tooltipParts.push(`Template: ${format(template, 'financial')}`);
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
          {/* Subtle budgeted fill (template baseline) */}
          {template && template > 0 && progress.budgetedRatio > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                borderRadius: 3,
                backgroundColor: fillColor,
                opacity: 0.35,
                width: `${progress.budgetedRatio * 100}%`,
              }}
            />
          )}

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
                  ? `${(progress.spentRatio / (progress.spentRatio + progress.overflowRatio)) * 100}%`
                  : `${progress.spentRatio * 100}%`,
            }}
          />

          {/* Overflow fill (dark red) for overspending */}
          {progress.overflowRatio > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: `${(progress.spentRatio / (progress.spentRatio + progress.overflowRatio)) * 100}%`,
                height: '100%',
                borderRadius: 0,
                backgroundColor: fillColor,
                filter: 'brightness(0.72)',
                width: `${(progress.overflowRatio / (progress.spentRatio + progress.overflowRatio)) * 100}%`,
              }}
            />
          )}
        </View>
      </View>
    </Tooltip>
  );
}
