import assert from "node:assert/strict";
import test from "node:test";
import { getOrgRankRange } from "./OrgRankSheet";

test("组织排行日期范围包含当天，并从 days - 1 天前开始", () => {
  assert.deepEqual(getOrgRankRange(new Date(2026, 8, 1), 1), {
    start: "2026-09-01",
    end: "2026-09-01",
  });
  assert.deepEqual(getOrgRankRange(new Date(2026, 8, 1), 7), {
    start: "2026-08-26",
    end: "2026-09-01",
  });
});

test("日期范围计算不会被跨月边界截断", () => {
  assert.deepEqual(getOrgRankRange(new Date(2026, 2, 1), 14), {
    start: "2026-02-16",
    end: "2026-03-01",
  });
});
