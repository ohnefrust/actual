import * as db from '../db';

import { setSingleCategoryTemplate } from './goal-template';

vi.mock('../db');

describe('setSingleCategoryTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.updateWithSchema).mockResolvedValue(undefined);
  });

  it('clears UI templates without allowing note-backed templates to be re-imported immediately', async () => {
    await setSingleCategoryTemplate({
      categoryId: 'cat1',
      amount: null,
    });

    expect(db.updateWithSchema).toHaveBeenCalledWith('categories', {
      id: 'cat1',
      goal_def: null,
      template_settings: { source: 'ui' },
    });
  });

  it('stores edited templates as UI-authored templates', async () => {
    await setSingleCategoryTemplate({
      categoryId: 'cat1',
      amount: 12000,
    });

    expect(db.updateWithSchema).toHaveBeenCalledWith('categories', {
      id: 'cat1',
      goal_def: JSON.stringify([
        {
          type: 'simple',
          monthly: 12000,
          directive: 'template',
          priority: 0,
        },
      ]),
      template_settings: { source: 'ui' },
    });
  });
});
