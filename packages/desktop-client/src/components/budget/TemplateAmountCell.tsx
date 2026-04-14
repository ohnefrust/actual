import { useState } from 'react';
import type { CSSProperties } from 'react';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';

import { InputCell } from '@desktop-client/components/table';
import { useFormat } from '@desktop-client/hooks/useFormat';

export type TemplateAmountCellProps = {
  value: number | null;
  onSave: (value: number | null) => void;
  style?: CSSProperties;
};

export function TemplateAmountCell({
  value,
  onSave,
  style,
}: TemplateAmountCellProps) {
  const [editing, setEditing] = useState(false);
  const format = useFormat();

  return (
    <InputCell
      name="template"
      width="flex"
      textAlign="right"
      exposed={editing}
      focused={editing}
      onExpose={() => setEditing(true)}
      onBlur={() => setEditing(false)}
      value={value != null ? format.forEdit(value) : ''}
      formatter={rawValue =>
        rawValue === '' ? '' : format(rawValue, 'financial')
      }
      onUpdate={rawValue => {
        const integerAmount = format.fromEdit(rawValue, null);

        if (integerAmount !== value) {
          onSave(integerAmount);
        }
        setEditing(false);
      }}
      valueStyle={{
        cursor: 'default',
        margin: 1,
        padding: '0 4px',
        borderRadius: 4,
        ':hover': {
          boxShadow: 'inset 0 0 0 1px ' + theme.pageTextSubdued,
          backgroundColor: theme.budgetCurrentMonth,
        },
      }}
      inputProps={{
        style: {
          backgroundColor: theme.budgetCurrentMonth,
        },
      }}
      style={{ ...styles.tnum, ...(style || null) }}
    />
  );
}
