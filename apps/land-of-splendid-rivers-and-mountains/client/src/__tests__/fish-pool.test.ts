import { describe, it, expect } from "vitest";
import { getFishPool } from "@/game/systems/fishing";

describe("getFishPool", () => {
  it("강에서는 민물 어종만 나온다", () => {
    const pool = getFishPool("spring", "river");
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((f) => f.location === "river")).toBe(true);
    expect(pool.some((f) => f.id === "crucianCarp")).toBe(true);
  });

  it("바다에서는 해양 어종만 나온다", () => {
    const pool = getFishPool("summer", "ocean");
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((f) => f.location === "ocean")).toBe(true);
    expect(pool.some((f) => f.id === "seaBream")).toBe(true);
  });

  it("강 풀에 도미(seaBream)가 섞이지 않는다 (회귀 가드)", () => {
    for (const season of ["spring", "summer", "autumn", "winter"] as const) {
      expect(
        getFishPool(season, "river").some((f) => f.id === "seaBream"),
      ).toBe(false);
    }
  });

  it("계절 필터도 함께 적용된다", () => {
    // salmon은 가을 전용 민물 어종
    expect(getFishPool("autumn", "river").some((f) => f.id === "salmon")).toBe(
      true,
    );
    expect(getFishPool("spring", "river").some((f) => f.id === "salmon")).toBe(
      false,
    );
  });
});
