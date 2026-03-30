import type { CategoryGroupEntity } from './category-group';

export type CategoryEntity = {
  last_month_leftover: string;
  carryover: string;
  id: string;
  name: string;
  is_income?: boolean;
  group: CategoryGroupEntity['id'];
  goal_def?: string;
  template_settings?: { source: 'notes' | 'ui' };
  sort_order?: number;
  tombstone?: boolean;
  hidden?: boolean;
};
