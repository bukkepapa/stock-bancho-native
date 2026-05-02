// ── 品目定義 ───────────────────────────────────────────────────
export interface ItemDef {
  id: string;               // 'egg' | 'cheese' | 'coffee' | 'item_xxx...'
  name: string;
  emoji: string;
  unit: string;             // 在庫の単位（個・本・袋など）
  dailyAmount: number;      // 1日の消費量（unit換算）
  purchaseAmount: number;   // 1回の購入量（unit換算）
  purchaseUnitName: string; // 購入時の呼び名（ケース・スリーブなど）
  decimal: boolean;         // 小数点入力を許可するか
}

export const DEFAULT_ITEMS: ItemDef[] = [
  {
    id: 'egg', name: '卵', emoji: '🥚', unit: '個',
    dailyAmount: 4, purchaseAmount: 10, purchaseUnitName: 'ケース', decimal: false,
  },
  {
    id: 'cheese', name: 'プロセスチーズ', emoji: '🧀', unit: '個',
    dailyAmount: 3, purchaseAmount: 4, purchaseUnitName: 'スリーブ', decimal: false,
  },
  {
    id: 'coffee', name: 'アイスコーヒー', emoji: '☕', unit: '本',
    dailyAmount: 0.3333, purchaseAmount: 1, purchaseUnitName: '本', decimal: true,
  },
];

// ── 単位プリセット ──────────────────────────────────────────────
export const UNIT_PRESETS = [
  '個', '本', '袋', 'パック', '枚', '束',
  '缶', '箱', '玉', '株', '切れ', '尾',
  '房', 'カップ', 'g', 'kg', 'ml', 'L',
];

// ── 食材絵文字マップ（50品目） ─────────────────────────────────
export const FOOD_EMOJI_MAP: { keywords: string[]; emoji: string }[] = [
  { keywords: ['卵', 'たまご', 'エッグ', 'egg'], emoji: '🥚' },
  { keywords: ['チーズ', 'cheese'], emoji: '🧀' },
  { keywords: ['コーヒー', 'カフェ', 'coffee'], emoji: '☕' },
  { keywords: ['牛乳', 'ミルク', 'ぎゅうにゅう', 'milk'], emoji: '🥛' },
  { keywords: ['パン', 'ぱん', 'bread'], emoji: '🍞' },
  { keywords: ['米', 'ごはん', 'ご飯', 'こめ', 'rice'], emoji: '🍚' },
  { keywords: ['バター', 'ばたー', 'butter'], emoji: '🧈' },
  { keywords: ['ヨーグルト', 'よーぐると', 'yogurt'], emoji: '🥛' },
  { keywords: ['肉', 'にく', '牛肉', '豚肉', 'ぎゅうにく', 'ぶたにく'], emoji: '🥩' },
  { keywords: ['鶏', 'とり', 'チキン', 'chicken'], emoji: '🍗' },
  { keywords: ['ハム', 'ベーコン', 'ソーセージ', 'ウィンナー', 'ham'], emoji: '🌭' },
  { keywords: ['魚', 'さかな', 'fish'], emoji: '🐟' },
  { keywords: ['エビ', 'えび', '海老', 'shrimp'], emoji: '🦐' },
  { keywords: ['サーモン', 'さけ', '鮭', 'salmon'], emoji: '🐟' },
  { keywords: ['まぐろ', 'マグロ', 'tuna'], emoji: '🐡' },
  { keywords: ['トマト', 'とまと', 'tomato'], emoji: '🍅' },
  { keywords: ['ニンジン', 'にんじん', '人参', 'carrot'], emoji: '🥕' },
  { keywords: ['ブロッコリー', 'broccoli'], emoji: '🥦' },
  { keywords: ['レタス', 'れたす', 'キャベツ', 'きゃべつ', 'lettuce'], emoji: '🥬' },
  { keywords: ['玉ねぎ', 'たまねぎ', 'オニオン', 'onion'], emoji: '🧅' },
  { keywords: ['じゃがいも', 'ジャガイモ', 'ポテト', 'potato'], emoji: '🥔' },
  { keywords: ['きのこ', 'キノコ', 'しいたけ', 'エリンギ', 'しめじ', 'mushroom'], emoji: '🍄' },
  { keywords: ['ほうれん草', 'ほうれんそう', 'spinach'], emoji: '🥬' },
  { keywords: ['なす', 'ナス', '茄子', 'eggplant'], emoji: '🍆' },
  { keywords: ['ピーマン', 'pepper'], emoji: '🫑' },
  { keywords: ['きゅうり', 'キュウリ', '胡瓜', 'cucumber'], emoji: '🥒' },
  { keywords: ['コーン', 'とうもろこし', 'corn'], emoji: '🌽' },
  { keywords: ['アボカド', 'avocado'], emoji: '🥑' },
  { keywords: ['りんご', 'リンゴ', 'アップル', 'apple'], emoji: '🍎' },
  { keywords: ['バナナ', 'banana'], emoji: '🍌' },
  { keywords: ['みかん', 'ミカン', 'オレンジ', 'orange'], emoji: '🍊' },
  { keywords: ['いちご', 'イチゴ', 'strawberry'], emoji: '🍓' },
  { keywords: ['ぶどう', 'ブドウ', 'グレープ', 'grape'], emoji: '🍇' },
  { keywords: ['すいか', 'スイカ', 'watermelon'], emoji: '🍉' },
  { keywords: ['もも', 'モモ', 'ピーチ', 'peach'], emoji: '🍑' },
  { keywords: ['なし', 'ナシ', '梨', 'pear'], emoji: '🍐' },
  { keywords: ['レモン', 'lemon'], emoji: '🍋' },
  { keywords: ['油', 'あぶら', 'オリーブオイル', 'サラダ油', 'oil'], emoji: '🫒' },
  { keywords: ['塩', 'しお', 'salt'], emoji: '🧂' },
  { keywords: ['醤油', 'しょうゆ', '酢', 'みりん', 'だし'], emoji: '🫙' },
  { keywords: ['砂糖', 'さとう', 'sugar'], emoji: '🍬' },
  { keywords: ['小麦粉', 'こむぎこ', '薄力粉', '強力粉', 'flour'], emoji: '🌾' },
  { keywords: ['納豆', 'なっとう', 'natto'], emoji: '🫘' },
  { keywords: ['豆腐', 'とうふ', 'tofu'], emoji: '⬜' },
  { keywords: ['ビール', 'びーる', 'beer'], emoji: '🍺' },
  { keywords: ['お茶', 'おちゃ', '緑茶', 'ほうじ茶', 'tea'], emoji: '🍵' },
  { keywords: ['ジュース', 'じゅーす', 'ドリンク', 'juice'], emoji: '🧃' },
  { keywords: ['水', 'みず', 'ミネラルウォーター', 'water'], emoji: '💧' },
  { keywords: ['アイス', 'アイスクリーム', 'ice cream'], emoji: '🍦' },
  { keywords: ['チョコ', 'チョコレート', 'chocolate'], emoji: '🍫' },
];

// ── 品目名から絵文字を提案 ─────────────────────────────────────
export function suggestEmoji(name: string): string | null {
  if (!name) return null;
  for (const entry of FOOD_EMOJI_MAP) {
    for (const kw of entry.keywords) {
      if (name.includes(kw)) return entry.emoji;
    }
  }
  return null;
}

// ── ランダムID生成 ────────────────────────────────────────────
export function generateItemId(): string {
  return 'item_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── 後方互換のために維持 ──────────────────────────────────────
export const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

export const COLORS = {
  primary:    '#1B5E20',
  primaryMid: '#2E7D32',
  light:      '#81C784',
  lightBg:    '#E8F5E9',
  accent:     '#F9A825',
  white:      '#FFFFFF',
  black:      '#1A1A1A',
  gray:       '#F5F5F5',
  grayMid:    '#9E9E9E',
  border:     '#C8E6C9',
  alertBg:    '#FFEBEE',
  alertBd:    '#EF9A9A',
  alertText:  '#C62828',
  warnBg:     '#FFF8E1',
  warnBd:     '#FFE082',
  warnText:   '#F57F17',
  okBg:       '#E8F5E9',
  okText:     '#2E7D32',
};
