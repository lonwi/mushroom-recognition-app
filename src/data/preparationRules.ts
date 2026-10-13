export type PreparationCategory = 'CLEAN' | 'COOK' | 'STORE';

export interface PreparationRule {
  id: 'clean' | 'blanch' | 'cooking' | 'store' | 'dry';
  category: PreparationCategory;
}

/** Copy lives in i18n (`preparation.rules`). This list only assigns a category. */
export const PREPARATION_GUIDE: readonly PreparationRule[] = [
  { id: 'clean', category: 'CLEAN' },
  { id: 'blanch', category: 'COOK' },
  { id: 'cooking', category: 'COOK' },
  { id: 'store', category: 'STORE' },
  { id: 'dry', category: 'STORE' },
];

export const PREPARATION_TABS = [
  { id: 'ALL', testID: 'tab-prep-all', labelKey: 'preparation.allTab', icon: '' },
  { id: 'CLEAN', testID: 'tab-prep-clean', labelKey: 'preparation.cleanTab', icon: '🧹 ' },
  { id: 'COOK', testID: 'tab-prep-cook', labelKey: 'preparation.cookTab', icon: '🍳 ' },
  { id: 'STORE', testID: 'tab-prep-store', labelKey: 'preparation.storeTab', icon: '📦 ' },
] as const;
