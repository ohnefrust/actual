# Category Progress Bar Implementation Guide

## Overview

Visual progress bars rendered beneath each expense category row in the envelope budget view, showing spending progress relative to the budgeted amount. Controlled by the `goalTemplatesEnabled` feature flag.

## Files

- `CategoryProgressBar.tsx` - Component and `computeCategoryProgress` pure function
- `CategoryProgressBar.test.tsx` - Unit tests for progress calculation and rendering
- `ExpenseCategory.tsx` - Manages row height when progress bars are shown
- `envelope/EnvelopeBudgetComponents.tsx` - Integrates progress bar into `ExpenseCategoryMonth`

## Component Architecture

### `computeCategoryProgress(params): ProgressResult`

Pure calculation function with no React dependencies.

**Input (ProgressParams):**

```typescript
{
  assigned: number;   // Amount budgeted (cents)
  activity: number;   // Amount spent (cents, negative = spending)
  balance: number;    // Current balance (cents)
  template?: number;  // Template/goal amount (cents, optional)
}
```

**Output (ProgressResult):**

```typescript
{
  baselineAmount: number;  // The "100%" denominator for the bar
  spentRatio: number;      // Spent vs baseline ratio (0.0-1.0)
  budgetedRatio: number;   // Budgeted vs template ratio (0.0-1.0, always 1 without template)
  overflowRatio: number;   // Overflow beyond 1.0 (overspending)
  remaining: number;       // Balance remaining (can be negative)
  state: 'funded' | 'underfunded' | 'over-budget';
}
```

### Logic Rules

| Condition | state | baselineAmount | spentRatio |
|---|---|---|---|
| No budget, no spending | `funded` | 0 | 0 |
| No budget, has spending | `over-budget` | spent | 1.0 |
| Spent > assigned | `over-budget` | assigned | 1.0 + overflow |
| Spent <= assigned, no template or assigned >= template | `funded` | template or assigned | spent/assigned |
| Spent <= assigned, template > assigned | `underfunded` | template | spent/assigned * budgetedRatio |

### `CategoryProgressBar` Component

**Props:** `assigned`, `activity`, `balance`, `template?` (all in cents)

**Feature gating:** Returns `null` when `goalTemplatesEnabled` is disabled or when `baselineAmount` is 0.

**Rendering:**
- 6px tall bar with 3px border radius
- Background: `theme.tableBackground`
- Optional translucent budgeted fill when template is set (35% opacity)
- Solid spent fill on top
- Darker overflow section for overspending (72% brightness)
- Tooltip on hover with percentage, template, budgeted, spent, and balance

### Colors

| State | Color |
|---|---|
| `funded` | `theme.templateNumberFunded` (green) |
| `underfunded` | `theme.templateNumberUnderFunded` (orange) |
| `over-budget` | `theme.budgetNumberNegative` (red) |

## Visibility Toggle

Users can toggle progress bar visibility via the titlebar button (eye icon). This is stored in the `showProgressBars` global pref. The progress bar feature flag must also be enabled.

## Testing

Run tests:

```bash
yarn test -- CategoryProgressBar
```

Tests cover:
- Under/on/over budget scenarios
- No budget edge cases
- Template-aware underfunded/funded logic
- Rendering gated by feature flag
- Edge cases (zero, negative, large values)
