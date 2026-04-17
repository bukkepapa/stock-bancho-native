export type ItemKey = 'egg' | 'cheese' | 'coffee';

export interface ItemDef {
  name: string;
  emoji: string;
  inputUnit: string;
  purchaseUnitLabel: string;
  decimal: boolean;
}

export const ITEMS: Record<ItemKey, ItemDef> = {
  egg:    { name: '卵',            emoji: '🥚', inputUnit: '個', purchaseUnitLabel: 'ケース',   decimal: false },
  cheese: { name: 'プロセスチーズ', emoji: '🧀', inputUnit: '個', purchaseUnitLabel: 'スリーブ', decimal: false },
  coffee: { name: 'アイスコーヒー', emoji: '☕', inputUnit: '本', purchaseUnitLabel: '本',       decimal: true  },
};

export const ITEM_KEYS: ItemKey[] = ['egg', 'cheese', 'coffee'];
export const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

// アプリカラー
export const COLORS = {
  primary:   '#1B5E20',
  primaryMid:'#2E7D32',
  light:     '#81C784',
  lightBg:   '#E8F5E9',
  accent:    '#F9A825',
  white:     '#FFFFFF',
  black:     '#1A1A1A',
  gray:      '#F5F5F5',
  grayMid:   '#9E9E9E',
  border:    '#C8E6C9',
  alertBg:   '#FFEBEE',
  alertBd:   '#EF9A9A',
  alertText: '#C62828',
  warnBg:    '#FFF8E1',
  warnBd:    '#FFE082',
  warnText:  '#F57F17',
  okBg:      '#E8F5E9',
  okText:    '#2E7D32',
};
