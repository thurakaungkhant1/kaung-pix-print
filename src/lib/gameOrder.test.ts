import { describe, expect, test } from "bun:test";
import { mobileLegendsFirst } from "./gameOrder";

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
