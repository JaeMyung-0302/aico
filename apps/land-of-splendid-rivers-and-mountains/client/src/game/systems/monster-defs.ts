import type { MonsterDefinition } from "@land-of-splendid-rivers-and-mountains/shared";

// Returns a deterministic first-entry placeholder from the provided map.
// Throws if the map is empty rather than relying on `!` non-null assertions
// in the caller — this keeps the failure mode explicit and debuggable
// (empty monster data is a content-packaging bug, not a runtime edge case).
export const getFallbackMonsterDef = (
  defs: ReadonlyMap<string, MonsterDefinition>,
): MonsterDefinition => {
  const first = defs.values().next().value;
  if (!first) {
    throw new Error(
      "getFallbackMonsterDef: no monster definitions loaded (empty map)",
    );
  }
  return first;
};
