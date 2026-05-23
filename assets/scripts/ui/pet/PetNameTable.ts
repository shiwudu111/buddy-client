export const PET_NAME_MAX_LENGTH = 4;

const PET_NAME_TABLE = [
  "小橘",
  "团团",
  "糖豆",
  "星星",
  "布丁",
  "糯米",
  "可可",
  "豆包",
  "果冻",
  "雪球",
  "奶盖",
  "栗子",
  "泡芙",
  "桃桃",
  "米粒",
  "小满",
  "阿芒",
  "晴晴",
  "点点",
  "元宝",
] as const;

export function resolveRandomPetName(): string {
  const index = Math.floor(Math.random() * PET_NAME_TABLE.length);
  return PET_NAME_TABLE[index] ?? PET_NAME_TABLE[0];
}

export function measurePetNameLength(name: string): number {
  return Array.from(name.trim()).length;
}

export function isPetNameWithinLimit(name: string): boolean {
  return measurePetNameLength(name) <= PET_NAME_MAX_LENGTH;
}
