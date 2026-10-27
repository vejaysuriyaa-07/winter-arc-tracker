import { describe, expect, it } from "vitest";
import { fixtureState } from "./fixtures/arc14";
import { backupFileName, describeBackup } from "./backup";

describe("backup", () => {
  it("file name carries the day", () => {
    expect(backupFileName("2026-10-26")).toBe("grove-backup-2026-10-26.json");
  });
  it("a short description for the import confirmation", () => {
    expect(describeBackup(fixtureState())).toBe("1 arc (Winter Arc), 5 habits, 10 days logged"); // the sixth is a deleted tombstone
    const s = fixtureState();
    s.arcs.push({ ...s.arcs[0]!, id: "x", name: "Study Arc" });
    s.arcs.push({ ...s.arcs[0]!, id: "y", name: "Gone", deleted: true });
    expect(describeBackup(s)).toBe("2 arcs (Winter Arc, Study Arc), 5 habits, 10 days logged");
  });
});
