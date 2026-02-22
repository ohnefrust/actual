import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';

import { useCategories } from '@desktop-client/hooks/useCategories';

type TemplateGoalsByCategory = Record<string, number | null>;
type TemplateGoalsByMonth = Record<string, TemplateGoalsByCategory>;

const TemplateGoalContext = createContext<TemplateGoalsByMonth>({});

type TemplateGoalProviderProps = {
  enabled: boolean;
  startMonth: string;
  numMonths: number;
  children: ReactNode;
};

export function TemplateGoalProvider({
  enabled,
  startMonth,
  numMonths,
  children,
}: TemplateGoalProviderProps) {
  const { data: { list: categories = [] } = { list: [] } } = useCategories();
  const [templateGoalsByMonth, setTemplateGoalsByMonth] =
    useState<TemplateGoalsByMonth>({});

  const months = useMemo(
    () =>
      Array.from({ length: numMonths }, (_, index) =>
        monthUtils.addMonths(startMonth, index),
      ),
    [numMonths, startMonth],
  );
  const categoryTemplateFingerprint = useMemo(
    () =>
      categories
        .map(
          category =>
            `${category.id}:${category.template_settings?.source || ''}:${category.goal_def || ''}`,
        )
        .join('|'),
    [categories],
  );

  useEffect(() => {
    let mounted = true;

    async function loadTemplateGoals() {
      if (!enabled) {
        setTemplateGoalsByMonth({});
        return;
      }

      const entries = await Promise.all(
        months.map(async month => {
          try {
            const goals = await send('budget/get-template-goals', { month });
            return [month, goals as TemplateGoalsByCategory] as const;
          } catch (error) {
            console.error(
              `Failed to load template goals for month "${month}"`,
              error,
            );
            return [month, {}] as const;
          }
        }),
      );

      if (!mounted) {
        return;
      }

      setTemplateGoalsByMonth(
        entries.reduce((all, [month, goals]) => {
          all[month] = goals;
          return all;
        }, {} as TemplateGoalsByMonth),
      );
    }

    loadTemplateGoals();

    return () => {
      mounted = false;
    };
  }, [enabled, months, categoryTemplateFingerprint]);

  return (
    <TemplateGoalContext.Provider value={templateGoalsByMonth}>
      {children}
    </TemplateGoalContext.Provider>
  );
}

export function useTemplateGoalsForMonth(
  month: string,
): TemplateGoalsByCategory {
  const templateGoalsByMonth = useContext(TemplateGoalContext);
  return templateGoalsByMonth[month] ?? {};
}

export function useTemplateGoal(
  categoryId: string,
  month: string,
): number | null {
  const templateGoalsByMonth = useContext(TemplateGoalContext);
  return templateGoalsByMonth[month]?.[categoryId] ?? null;
}
