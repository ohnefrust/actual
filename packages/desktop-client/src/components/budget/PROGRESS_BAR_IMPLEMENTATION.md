# Category Progress Bar Implementation Guide

## Overview

This document describes the YNAB-style category progress bar feature added to the Actual Budget envelope budget view. The progress bar provides visual feedback on spending/savings progress relative to category targets.

## Files Added

- `CategoryProgressBar.tsx` - Main component and `computeCategoryProgress` helper function
- `CategoryProgressBar.test.ts` - Comprehensive unit tests for the progress calculation logic

## Files Modified

- `envelope/EnvelopeBudgetComponents.tsx` - Integration of the progress bar into `ExpenseCategoryMonth`

## Component Architecture

### `computeCategoryProgress(params): ProgressResult`

**Pure calculation function** - no React dependencies, can be tested in isolation.

**Input (ProgressParams):**

```typescript
{
  assigned: number; // Amount budgeted/assigned (cents)
  activity: number; // Amount spent (cents, negative = spending)
  balance: number; // Current balance (cents)
  goalAmount: number | null; // Target amount (cents, null if no goal)
  isLongGoal: boolean; // true = savings goal, false = spending goal
}
```

**Output (ProgressResult):**

```typescript
{
  baselineAmount: number; // The "100%" denominator for the bar
  progressRatio: number; // Fill ratio 0.0-1.0 (clamped for bar)
  overflowRatio: number; // Extra overflow beyond 1.0
  remaining: number; // Amount remaining (can be negative)
  state: 'neutral' | 'underfunded' | 'funded' | 'complete' | 'overspent';
}
```

### Logic Rules

#### No Goal (goalAmount = null)

| Condition               | baselineAmount | progressRatio            | state     |
| ----------------------- | -------------- | ------------------------ | --------- |
| No overspend            | assigned       | min(spent/assigned, 1.0) | neutral   |
| Overspent (balance < 0) | assigned       | 1.0                      | overspent |
| Overflow calc           | assigned       | 1.0                      | overspent |
| Zero assigned           | 0              | 0                        | neutral   |

#### Spending Goal (goalAmount != null, isLongGoal = false)

| Condition  | baselineAmount | progressRatio    | overflowRatio     | state       |
| ---------- | -------------- | ---------------- | ----------------- | ----------- |
| Under goal | goalAmount     | spent/goalAmount | 0                 | underfunded |
| At goal    | goalAmount     | 1.0              | 0                 | funded      |
| Over goal  | goalAmount     | 1.0              | (spent-goal)/goal | overspent   |

#### Savings Goal (isLongGoal = true)

| Condition     | baselineAmount | progressRatio              | state       |
| ------------- | -------------- | -------------------------- | ----------- |
| Under goal    | goalAmount     | max(0, balance/goalAmount) | underfunded |
| At/above goal | goalAmount     | 1.0                        | complete    |

### `CategoryProgressBar` Component

**Props:**

```typescript
{
  assigned: number;
  activity: number;
  balance: number;
  goalAmount: number | null;
  isLongGoal: boolean;
}
```

**Rendering:**

- Flex container (height: 6px, border-radius: 3px)
- Animated fill bar (blue/orange/green based on state)
- Overflow indicator (red, extends right for overspending)
- Tooltip on hover showing:
  - Percent complete
  - Target amount
  - Assigned amount
  - Activity/spending
  - Balance
  - Remaining amount

**Animation:**

- Uses react-spring with tension: 300, friction: 30
- Smooth width transitions when values change
- No layout shift during animation

**Colors (from theme tokens):**
| State | Color |
|---|---|
| neutral | `theme.budgetNumberNeutral` |
| underfunded | `theme.templateNumberUnderFunded` (orange) |
| funded / complete | `theme.templateNumberFunded` (green) |
| overspent | `theme.budgetNumberNegative` (red) |

## Integration in EnvelopeBudgetComponents

The progress bar is rendered inside `ExpenseCategoryMonth` below the three data columns (budget/spent/balance):

```tsx
<View style={{ flex: 1, flexDirection: 'column' }}>
  <View style={{ flex: 1, flexDirection: 'row' }}>
    {/* Budget/Spent/Balance columns */}
  </View>

  <View
    style={{
      paddingRight: monthRightPadding,
      paddingLeft: 5,
      paddingBottom: 4,
    }}
  >
    <CategoryProgressBar {...props} />
  </View>
</View>
```

**Data Flow:**

```tsx
const budgeted = useEnvelopeSheetValue(envelopeBudget.catBudgeted(category.id));
const spent = useEnvelopeSheetValue(envelopeBudget.catSumAmount(category.id));
const balance = useEnvelopeSheetValue(envelopeBudget.catBalance(category.id));
const goal = useEnvelopeSheetValue(envelopeBudget.catGoal(category.id));
const longGoal = useEnvelopeSheetValue(envelopeBudget.catLongGoal(category.id));

<CategoryProgressBar
  assigned={budgeted ?? 0}
  activity={spent ?? 0}
  balance={balance ?? 0}
  goalAmount={goal ?? null}
  isLongGoal={longGoal === 1}
/>;
```

## State Transitions

### Example 1: Spending Goal (Monthly Budget)

User budgets $100 for groceries:

1. **Initially:** assigned=100, activity=0, goal=100 → underfunded, 0% fill
2. **After spending $30:** activity=-30 → underfunded, 30% fill
3. **After spending $100:** activity=-100 → funded, 100% fill
4. **After overspending $110:** activity=-110 → overspent, 100% fill + red overflow

### Example 2: Savings Goal (#goal directive)

User sets savings goal of $1000 (isLongGoal=true):

1. **Initially:** balance=0, goal=1000 → underfunded, 0% fill
2. **After saving $500:** balance=500 → underfunded, 50% fill
3. **After reaching $1000:** balance=1000 → complete, 100% fill
4. **After spending/losing balance:** balance=800 → underfunded, 80% fill

### Example 3: No Goal

Category with no goal:

1. **Initially:** assigned=500, activity=0 → neutral, 0% fill
2. **After spending $200:** activity=-200 → neutral, 40% fill
3. **After spending $600:** activity=-600, balance=-100 → overspent, 100% fill + red overflow

## Testing

Unit tests cover:

- ✅ No goal scenarios (neutral, overspent, edge cases)
- ✅ Spending goal scenarios (underfunded, funded, overspent)
- ✅ Savings goal scenarios (underfunded, complete)
- ✅ Edge cases (zero amounts, negative values, null goals)
- ✅ Remaining amount calculations
- ✅ Overflow ratio calculations

Run tests with:

```bash
npm test -- CategoryProgressBar
```

## Visual Behavior

### Height & Sizing

- Bar height: 6px
- Border radius: 3px (fully rounded corners)
- Responsive: fills available month column width
- Consistent width across categories for easy comparison

### Overflow

- Extends to the right of the main bar
- Capped at 100px to prevent excessive visual width
- Color: red (`theme.budgetNumberNegative`)
- Smooth animation when overflow grows/shrinks

### Hover States

- Background: unchanged
- Tooltip appears above bar
- Tooltip shows detailed breakdown of progress

## Performance

- `computeCategoryProgress` is memoized via `useMemo`
- Only recalculates when input values change
- Animation via react-spring (GPU-accelerated)
- No layout thrashing

## Edge Cases Handled

✅ Zero/null values gracefully return neutral state
✅ Negative amounts handled via Math.abs()
✅ Overflow capped to prevent extreme widths
✅ Missing goals default to null (no goal rendering)
✅ Invalid percentages (NaN) return safe fallback
✅ Very large spending multiples of goal handled

## Future Enhancements (Out of Scope)

- Mobile budget view integration
- Tracking budget mode support
- Goal creation UI modifications
- Forecasting logic
- Custom color themes per category
- Animation customization

## References

- `packages/desktop-client/src/components/budget/envelope/EnvelopeBudgetComponents.tsx` - Integration point
- `packages/desktop-client/src/spreadsheet/bindings.ts` - Sheet bindings documentation
- `packages/component-library/src/theme.ts` - Theme token reference
- `loot-core/shared/months.ts` - Month utilities
