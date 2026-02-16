// @ts-strict-ignore
import React from 'react';
import type { ComponentProps } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type {
  CategoryEntity,
  CategoryGroupEntity,
} from 'loot-core/types/models';

import { RenderMonths } from './RenderMonths';
import { SidebarCategory } from './SidebarCategory';

import { useBudgetComponents } from '.';

import {
  DropHighlight,
  useDraggable,
  useDroppable,
} from '@desktop-client/components/sort';
import type {
  DragState,
  OnDragChangeCallback,
  OnDropCallback,
} from '@desktop-client/components/sort';
import { Row } from '@desktop-client/components/table';
import { useDragRef } from '@desktop-client/hooks/useDragRef';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';

type ExpenseCategoryProps = {
  cat: CategoryEntity;
  categoryGroup?: CategoryGroupEntity;
  editingCell: { id: string; cell: string } | null;
  dragState: DragState<CategoryEntity> | DragState<CategoryGroupEntity> | null;
  onEditName?: ComponentProps<typeof SidebarCategory>['onEditName'];
  onEditMonth?: (id: CategoryEntity['id'], month: string) => void;
  onSave?: ComponentProps<typeof SidebarCategory>['onSave'];
  onDelete?: ComponentProps<typeof SidebarCategory>['onDelete'];
  onDragChange: OnDragChangeCallback<CategoryEntity>;
  onBudgetAction: (month: string, action: string, arg: unknown) => void;
  onShowActivity: (id: CategoryEntity['id'], month: string) => void;
  onReorder: OnDropCallback;
  isLast?: boolean;
};

export function ExpenseCategory({
  cat,
  categoryGroup,
  editingCell,
  dragState,
  onEditName,
  onEditMonth,
  onSave,
  onDelete,
  onBudgetAction,
  onShowActivity,
  onDragChange,
  onReorder,
  isLast,
}: ExpenseCategoryProps) {
  let dragging = dragState && dragState.item === cat;

  if (dragState && dragState.item.id === cat.group) {
    dragging = true;
  }

  const progressBarEnabled = useFeatureFlag('progressBar');
  const [showProgressBarsPref] = useGlobalPref('showProgressBars');
  const showProgressBars = progressBarEnabled && showProgressBarsPref !== false;

  const { dragRef } = useDraggable({
    type: 'category',
    onDragChange,
    item: cat,
    canDrag: editingCell === null,
  });
  const handleDragRef = useDragRef(dragRef);

  const { dropRef, dropPos } = useDroppable({
    types: 'category',
    id: cat.id,
    onDrop: onReorder,
  });

  const { ExpenseCategoryComponent: MonthComponent } = useBudgetComponents();

  return (
    <Row
      innerRef={dropRef}
      collapsed
      style={{
        ...(showProgressBars && { height: 'auto', flex: '0 0 auto' }),
        backgroundColor: theme.budgetCurrentMonth,
        opacity: cat.hidden || categoryGroup?.hidden ? 0.5 : undefined,
      }}
    >
      <DropHighlight pos={dropPos} offset={{ top: 1 }} />

      <View style={{ flex: 1, flexDirection: 'row' }}>
        <SidebarCategory
          innerRef={handleDragRef}
          category={cat}
          categoryGroup={categoryGroup}
          dragPreview={dragging && dragState.preview}
          dragging={dragging && !dragState.preview}
          editing={
            editingCell &&
            editingCell.cell === 'name' &&
            editingCell.id === cat.id
          }
          onEditName={onEditName}
          onSave={onSave}
          onDelete={onDelete}
          inputCellStyle={showProgressBars ? undefined : { paddingBottom: 0 }}
        />

        <RenderMonths>
          {({ month }) => (
            <MonthComponent
              month={month}
              editing={
                editingCell &&
                editingCell.id === cat.id &&
                editingCell.cell === month
              }
              category={cat}
              onEdit={onEditMonth}
              onBudgetAction={onBudgetAction}
              onShowActivity={onShowActivity}
              isLast={isLast}
            />
          )}
        </RenderMonths>
      </View>
    </Row>
  );
}
