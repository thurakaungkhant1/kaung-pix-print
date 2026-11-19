/** True for Mobile Legends titles (e.g. "mobile-legends", "Mobile Legends: Bang Bang (PH)", "MLBB"). */
export const isMobileLegendsGame = (g: { category_key?: string; id?: string; name?: string }) => {
  const text = `${g.category_key ?? ""} ${g.id ?? ""} ${g.name ?? ""}`.toLowerCase();
  return /mobile[\s_-]*legends?|\bmlbb\b/.test(text);
};

/** Moves Mobile Legends games to the front, keeping the original order within each group. */
export const mobileLegendsFirst = <T extends { category_key?: string; id?: string; name?: string }>(list: T[]): T[] => [
  ...list.filter(isMobileLegendsGame),
  ...list.filter((g) => !isMobileLegendsGame(g)),
];
