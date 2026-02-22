# Goal Templates Features

## Feature Flag: `goalTemplatesEnabled`

A single feature flag that enables all goal template functionality in the envelope budget view. Controlled via Settings > Experimental Features > "Goal templates".

### What it enables

1. **Template Column** - Displays template amounts alongside budget/spent/balance columns
2. **Progress Bars** - Visual spending progress bars beneath each category row
3. **Balance Coloring** - Color-coded balance numbers based on template goal status

## Template Column

When enabled, an additional column shows the template amount for each category. Users can view and edit template values directly in the budget table.

## Progress Bars

Visual bars rendered below each expense category row showing spending progress.

### Visual States

| State | Condition | Bar Color |
|---|---|---|
| Funded | Budgeted >= template (or no template) | Green (`theme.templateNumberFunded`) |
| Underfunded | Budgeted < template and not overspent | Orange (`theme.templateNumberUnderFunded`) |
| Over-budget | Spent > budgeted | Red (`theme.budgetNumberNegative`) |

### Bar Anatomy

- **Background track**: `theme.tableBackground`, 6px tall, fully rounded
- **Budgeted fill** (when template set): Translucent (35% opacity) showing how much of the template is budgeted
- **Spent fill**: Solid color showing spending progress
- **Overflow section**: Darker shade for overspending beyond the budget

### Visibility Toggle

A titlebar button (eye icon) lets users show/hide progress bars without disabling the feature flag. Stored in the `showProgressBars` global preference.

## Balance Coloring

When a category has a template amount, the balance number color reflects funding status:

| Color | Meaning |
|---|---|
| Green (`theme.templateNumberFunded`) | Category is fully funded (budgeted >= template) |
| Orange (`theme.templateNumberUnderFunded`) | Category is underfunded (budgeted < template) |

## Theme Colors

Two theme tokens support these features:

- `templateNumberFunded` - Green, used for funded state in progress bars and balance text
- `templateNumberUnderFunded` - Orange, used for underfunded state in progress bars and balance text

## Key Files

- `CategoryProgressBar.tsx` - Progress bar component and calculation logic
- `ExpenseCategory.tsx` - Row height adjustment for progress bars
- `envelope/EnvelopeBudgetComponents.tsx` - Integration into budget month view
- `Titlebar.tsx` - Progress bar visibility toggle button
