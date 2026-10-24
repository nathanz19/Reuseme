import { describe, expect, it } from "vitest";
import {
  RESUME_DROP_ID,
  dragPointerY,
  insertionBeforeBlockId,
  isResumeDropTarget,
  placeholderId,
  sectionDroppableId,
} from "@/lib/dnd";

describe("canvas drop targeting", () => {
  const blockIds = ["edu-1", "exp-1"];

  it("treats the page, a section, a block, and the skeleton as canvas targets", () => {
    expect(isResumeDropTarget(RESUME_DROP_ID, blockIds)).toBe(true);
    expect(isResumeDropTarget(sectionDroppableId("experience"), blockIds)).toBe(
      true,
    );
    expect(isResumeDropTarget("exp-1", blockIds)).toBe(true);
    expect(isResumeDropTarget(placeholderId("proj-2"), blockIds)).toBe(true);
    expect(isResumeDropTarget("vault:proj-2", blockIds)).toBe(false);
    expect(isResumeDropTarget(null, blockIds)).toBe(false);
  });

  it("inserts before the block whose midpoint is below the pointer", () => {
    const blocks = [
      { id: "a", top: 0, height: 40 },
      { id: "b", top: 48, height: 40 },
    ];
    expect(insertionBeforeBlockId(10, blocks)).toBe("a");
    expect(insertionBeforeBlockId(30, blocks)).toBe("b");
    expect(insertionBeforeBlockId(90, blocks)).toBe(null);
  });

  it("reads the pointer from the drag activator plus delta", () => {
    const activator = new Event("pointermove");
    Object.defineProperty(activator, "clientY", { value: 100 });
    expect(dragPointerY({ activatorEvent: activator, delta: { y: 15 } })).toBe(
      115,
    );
    expect(
      dragPointerY({
        activatorEvent: new Event("keydown"),
        delta: { y: 15 },
      }),
    ).toBe(null);
  });
});
