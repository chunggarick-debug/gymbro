// ===== 靜態資料：食物資料庫（香港）+ 訓練課表模板 =====

export const FOOD_CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: '主食', label: '🍚 粉麵飯' },
  { id: '蛋白質', label: '🍗 蛋白質' },
  { id: '蔬菜', label: '🥬 蔬菜' },
  { id: '水果', label: '🍎 水果' },
  { id: '飲料', label: '🧋 凍飲' },
  { id: '點心', label: '🥧 點心' },
];

// name, emoji, category, unit, kcal, protein, carbs, fat (per 1 serving)
export const FOOD_DB = [
  // 粉麵飯
  { name: '白飯', emoji: '🍚', category: '主食', unit: '碗', kcal: 280, protein: 5, carbs: 60, fat: 0.5 },
  { name: '糙米飯', emoji: '🍚', category: '主食', unit: '碗', kcal: 240, protein: 5, carbs: 50, fat: 2 },
  { name: '叉燒飯', emoji: '🍛', category: '主食', unit: '碟', kcal: 700, protein: 28, carbs: 80, fat: 25 },
  { name: '海南雞飯', emoji: '🍛', category: '主食', unit: '碟', kcal: 750, protein: 35, carbs: 70, fat: 30 },
  { name: '揚州炒飯', emoji: '🍚', category: '主食', unit: '碟', kcal: 650, protein: 20, carbs: 85, fat: 24 },
  { name: '乾炒牛河', emoji: '🍜', category: '主食', unit: '碟', kcal: 750, protein: 28, carbs: 80, fat: 32 },
  { name: '豬扒飯', emoji: '🍛', category: '主食', unit: '碟', kcal: 750, protein: 30, carbs: 80, fat: 30 },
  { name: '雲吞麵', emoji: '🍜', category: '主食', unit: '碗', kcal: 380, protein: 16, carbs: 55, fat: 10 },
  { name: '牛腩麵', emoji: '🍜', category: '主食', unit: '碗', kcal: 500, protein: 25, carbs: 55, fat: 20 },
  { name: '魚蛋粉', emoji: '🍜', category: '主食', unit: '碗', kcal: 420, protein: 20, carbs: 60, fat: 10 },
  { name: '車仔麵', emoji: '🍜', category: '主食', unit: '碗', kcal: 600, protein: 22, carbs: 75, fat: 22 },
  { name: '撈麵', emoji: '🍜', category: '主食', unit: '碗', kcal: 450, protein: 13, carbs: 60, fat: 16 },
  { name: '火腿通粉', emoji: '🍜', category: '主食', unit: '碗', kcal: 350, protein: 14, carbs: 55, fat: 8 },
  { name: '沙嗲牛肉麵', emoji: '🍜', category: '主食', unit: '碗', kcal: 550, protein: 28, carbs: 60, fat: 22 },
  { name: '腸粉', emoji: '🥢', category: '主食', unit: '碟', kcal: 250, protein: 4, carbs: 45, fat: 6 },

  // 蛋白質
  { name: '雞胸肉', emoji: '🍗', category: '蛋白質', unit: '份(100g)', kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: '雞脾(雞腿)', emoji: '🍗', category: '蛋白質', unit: '隻', kcal: 250, protein: 20, carbs: 0, fat: 18 },
  { name: '牛肉', emoji: '🥩', category: '蛋白質', unit: '份(100g)', kcal: 250, protein: 26, carbs: 0, fat: 15 },
  { name: '豬肉', emoji: '🥩', category: '蛋白質', unit: '份(100g)', kcal: 240, protein: 26, carbs: 0, fat: 14 },
  { name: '叉燒', emoji: '🥓', category: '蛋白質', unit: '份(100g)', kcal: 240, protein: 22, carbs: 10, fat: 12 },
  { name: '燒肉', emoji: '🥓', category: '蛋白質', unit: '份(100g)', kcal: 300, protein: 18, carbs: 0, fat: 24 },
  { name: '白切雞', emoji: '🍗', category: '蛋白質', unit: '份(100g)', kcal: 200, protein: 25, carbs: 0, fat: 10 },
  { name: '蒸魚', emoji: '🐟', category: '蛋白質', unit: '份(100g)', kcal: 120, protein: 20, carbs: 0, fat: 4 },
  { name: '三文魚(鮭魚)', emoji: '🐟', category: '蛋白質', unit: '份(100g)', kcal: 208, protein: 20, carbs: 0, fat: 13 },
  { name: '蝦', emoji: '🍤', category: '蛋白質', unit: '份(100g)', kcal: 99, protein: 24, carbs: 0, fat: 1 },
  { name: '雞蛋', emoji: '🥚', category: '蛋白質', unit: '隻', kcal: 78, protein: 6, carbs: 0.6, fat: 5 },
  { name: '豆腐', emoji: '🧊', category: '蛋白質', unit: '份', kcal: 80, protein: 8, carbs: 2, fat: 4 },
  { name: '豆乾(豆腐乾)', emoji: '🧊', category: '蛋白質', unit: '份', kcal: 150, protein: 15, carbs: 4, fat: 8 },
  { name: '乳清蛋白', emoji: '🥤', category: '蛋白質', unit: '匙', kcal: 120, protein: 24, carbs: 3, fat: 1.5 },
  { name: '無糖豆漿', emoji: '🥛', category: '蛋白質', unit: '杯', kcal: 90, protein: 9, carbs: 5, fat: 3 },

  // 蔬菜
  { name: '菜心', emoji: '🥬', category: '蔬菜', unit: '碟', kcal: 40, protein: 3, carbs: 7, fat: 0.3 },
  { name: '芥蘭', emoji: '🥬', category: '蔬菜', unit: '碟', kcal: 40, protein: 3, carbs: 7, fat: 0.3 },
  { name: '生菜', emoji: '🥬', category: '蔬菜', unit: '碟', kcal: 20, protein: 1, carbs: 3, fat: 0.2 },
  { name: '西蘭花', emoji: '🥦', category: '蔬菜', unit: '碟', kcal: 34, protein: 3, carbs: 6, fat: 0.3 },
  { name: '通菜', emoji: '🥬', category: '蔬菜', unit: '碟', kcal: 35, protein: 2, carbs: 6, fat: 0.3 },
  { name: '沙律', emoji: '🥗', category: '蔬菜', unit: '份', kcal: 60, protein: 2, carbs: 8, fat: 2 },
  { name: '粟米', emoji: '🌽', category: '蔬菜', unit: '條', kcal: 110, protein: 3, carbs: 25, fat: 1 },

  // 水果
  { name: '香蕉', emoji: '🍌', category: '水果', unit: '隻', kcal: 90, protein: 1, carbs: 23, fat: 0.3 },
  { name: '蘋果', emoji: '🍎', category: '水果', unit: '個', kcal: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { name: '橙', emoji: '🍊', category: '水果', unit: '個', kcal: 62, protein: 1, carbs: 15, fat: 0.2 },
  { name: '提子', emoji: '🍇', category: '水果', unit: '份', kcal: 70, protein: 0.5, carbs: 18, fat: 0.2 },
  { name: '奇異果', emoji: '🥝', category: '水果', unit: '個', kcal: 42, protein: 0.8, carbs: 10, fat: 0.4 },

  // 凍飲
  { name: '凍奶茶', emoji: '🧋', category: '飲料', unit: '杯', kcal: 350, protein: 4, carbs: 40, fat: 16 },
  { name: '凍檸茶', emoji: '🍋', category: '飲料', unit: '杯', kcal: 130, protein: 0, carbs: 33, fat: 0 },
  { name: '凍鴛鴦', emoji: '☕', category: '飲料', unit: '杯', kcal: 250, protein: 5, carbs: 30, fat: 10 },
  { name: '珍珠奶茶', emoji: '🧋', category: '飲料', unit: '杯', kcal: 500, protein: 5, carbs: 80, fat: 18 },
  { name: '檸檬茶', emoji: '🍋', category: '飲料', unit: '杯', kcal: 120, protein: 0, carbs: 30, fat: 0 },
  { name: '凍檸水', emoji: '🍋', category: '飲料', unit: '杯', kcal: 10, protein: 0, carbs: 2, fat: 0 },
  { name: '咖啡', emoji: '☕', category: '飲料', unit: '杯', kcal: 5, protein: 0, carbs: 0, fat: 0 },
  { name: '可樂', emoji: '🥤', category: '飲料', unit: '罐', kcal: 140, protein: 0, carbs: 39, fat: 0 },

  // 點心
  { name: '蛋撻', emoji: '🥧', category: '點心', unit: '件', kcal: 200, protein: 4, carbs: 22, fat: 11 },
  { name: '菠蘿包', emoji: '🍞', category: '點心', unit: '個', kcal: 350, protein: 8, carbs: 50, fat: 12 },
  { name: '雞尾包', emoji: '🍞', category: '點心', unit: '個', kcal: 300, protein: 7, carbs: 45, fat: 9 },
  { name: '餐蛋治(三文治)', emoji: '🥪', category: '點心', unit: '份', kcal: 420, protein: 16, carbs: 40, fat: 20 },
  { name: '雞蛋仔', emoji: '🧇', category: '點心', unit: '底', kcal: 400, protein: 8, carbs: 55, fat: 15 },
  { name: '魚蛋', emoji: '🍢', category: '點心', unit: '串', kcal: 150, protein: 6, carbs: 10, fat: 9 },
  { name: '燒賣', emoji: '🥟', category: '點心', unit: '籠', kcal: 220, protein: 10, carbs: 20, fat: 10 },
  { name: '蝦餃', emoji: '🥟', category: '點心', unit: '籠', kcal: 240, protein: 10, carbs: 22, fat: 10 },
  { name: '糯米雞', emoji: '🍙', category: '點心', unit: '隻', kcal: 400, protein: 16, carbs: 55, fat: 12 },
];

export const WORKOUT_TEMPLATES = [
  {
    id: 'full', name: '全身新手', emoji: '🧘',
    exercises: [
      { name: '深蹲', sets: 3, reps: 10 },
      { name: '槓鈴臥推', sets: 3, reps: 8 },
      { name: '啞鈴划船', sets: 3, reps: 10 },
      { name: '啞鈴肩推', sets: 3, reps: 10 },
      { name: '平板支撐', sets: 3, reps: '30秒' },
    ],
  },
  {
    id: 'chest', name: '胸', emoji: '🏋️',
    exercises: [
      { name: '槓鈴臥推', sets: 4, reps: 8 },
      { name: '啞鈴臥推', sets: 4, reps: 10 },
      { name: '上斜臥推', sets: 3, reps: 10 },
      { name: '啞鈴飛鳥', sets: 3, reps: 12 },
      { name: '繩索夾胸', sets: 3, reps: 12 },
      { name: '伏地挺身', sets: 3, reps: 15 },
    ],
  },
  {
    id: 'back', name: '背', emoji: '🦍',
    exercises: [
      { name: '引體向上', sets: 4, reps: 8 },
      { name: '槓鈴划船', sets: 4, reps: 8 },
      { name: '啞鈴單臂划船', sets: 3, reps: 10 },
      { name: '滑輪下拉', sets: 3, reps: 10 },
      { name: '坐姿划船', sets: 3, reps: 12 },
    ],
  },
  {
    id: 'shoulders', name: '肩', emoji: '🙆',
    exercises: [
      { name: '啞鈴肩推', sets: 4, reps: 10 },
      { name: '槓鈴肩推', sets: 3, reps: 8 },
      { name: '側平舉', sets: 3, reps: 15 },
      { name: '前平舉', sets: 3, reps: 12 },
      { name: '反向飛鳥', sets: 3, reps: 15 },
      { name: '面拉', sets: 3, reps: 15 },
    ],
  },
  {
    id: 'legs', name: '腿', emoji: '🦵',
    exercises: [
      { name: '深蹲', sets: 4, reps: 8 },
      { name: '硬舉', sets: 4, reps: 8 },
      { name: '腿推', sets: 3, reps: 10 },
      { name: '弓箭步', sets: 3, reps: 12 },
      { name: '腿彎舉', sets: 3, reps: 12 },
      { name: '腿伸展', sets: 3, reps: 12 },
      { name: '臀橋', sets: 3, reps: 15 },
      { name: '提踵', sets: 3, reps: 15 },
    ],
  },
  {
    id: 'arms', name: '手臂', emoji: '💪',
    exercises: [
      { name: '二頭彎舉', sets: 3, reps: 12 },
      { name: '錘式彎舉', sets: 3, reps: 12 },
      { name: '三頭下壓', sets: 3, reps: 12 },
      { name: '窄握臥推', sets: 3, reps: 10 },
      { name: '法式推舉', sets: 3, reps: 12 },
    ],
  },
  {
    id: 'core', name: '核心', emoji: '🔥',
    exercises: [
      { name: '捲腹', sets: 3, reps: 15 },
      { name: '棒式', sets: 3, reps: '45秒' },
      { name: '俄羅斯轉體', sets: 3, reps: 20 },
      { name: '登山者', sets: 3, reps: '30秒' },
      { name: '懸垂舉腿', sets: 3, reps: 12 },
      { name: '死蟲式', sets: 3, reps: 12 },
    ],
  },
];
