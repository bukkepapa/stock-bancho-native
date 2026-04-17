export interface DailyConsumption {
  amount: number;
  unit: string;
}

export interface PurchaseUnit {
  amount: number;
  unit: string;
  label: string;
}

export interface Settings {
  dailyConsumption: { egg: DailyConsumption; cheese: DailyConsumption; coffee: DailyConsumption };
  purchaseUnit:     { egg: PurchaseUnit;     cheese: PurchaseUnit;     coffee: PurchaseUnit };
  shoppingDays: number[];   // 0=日 … 6=土
  notifyHour:   number;
  notifyMinute: number;
}

export interface InventoryItem {
  count: number;
  unit: string;
  updatedAt: string | null;
}

export interface Inventory {
  egg:    InventoryItem;
  cheese: InventoryItem;
  coffee: InventoryItem;
}

export interface PurchasedItem {
  count: number;
  unit:  string;
}

export interface PurchaseLog {
  date:         string;   // 'YYYY-MM-DD'
  wentShopping: boolean;
  purchased:    { egg: PurchasedItem; cheese: PurchasedItem; coffee: PurchasedItem };
  memo:         string;
}

export interface AppState {
  settings:     Settings;
  inventory:    Inventory;
  purchaseLogs: PurchaseLog[];
}

export const DEFAULT_SETTINGS: Settings = {
  dailyConsumption: {
    egg:    { amount: 4,   unit: '個' },
    cheese: { amount: 3,   unit: '個' },
    coffee: { amount: 300, unit: 'ml' },
  },
  purchaseUnit: {
    egg:    { amount: 10,  unit: '個',  label: '1ケース' },
    cheese: { amount: 4,   unit: '個',  label: '1スリーブ' },
    coffee: { amount: 900, unit: 'ml',  label: '1本(900ml)' },
  },
  shoppingDays: [1, 4],
  notifyHour:   20,
  notifyMinute: 0,
};

export const DEFAULT_INVENTORY: Inventory = {
  egg:    { count: 0, unit: '個', updatedAt: null },
  cheese: { count: 0, unit: '個', updatedAt: null },
  coffee: { count: 0, unit: '本', updatedAt: null },
};
