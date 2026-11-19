import { describe, expect, test } from "bun:test";
import { isMobileLegendsGame, mobileLegendsFirst } from "./gameOrder";

describe("mobileLegendsFirst", () => {
  test("puts every Mobile Legends game first and keeps the rest in their original order", () => {
    const list = [
      { category_key: "pubg-mobile", name: "PUBG Mobile" },
      { category_key: "free-fire", name: "Free Fire" },
      { category_key: "mobile-legends", name: "Mobile Legends" },
      { category_key: "genshin", name: "Genshin Impact" },
      { category_key: "mlbb-ph", name: "MLBB Philippines" },
    ];
    expect(mobileLegendsFirst(list).map((g) => g.category_key)).toEqual([
      "mobile-legends", "mlbb-ph", "pubg-mobile", "free-fire", "genshin",
    ]);
  });
});

test("every Mobile Legends VPS slug and name is recognised (needs Zone ID)", () => {
  for (const id of ["mobile-legends", "k-mlbb-br", "k-mlbb-global", "k-mlbb-ph", "k-mlbb-ru", "k-mlbb-sgmy", "k-mlbb-us", "k-mla"])
    expect(isMobileLegendsGame({ id, name: id === "k-mla" ? "Mobile Legends Adventure" : "" })).toBe(true);
  expect(isMobileLegendsGame({ id: "k-league-of-legends-ph", name: "League of Legends Philippines" })).toBe(false);
});
