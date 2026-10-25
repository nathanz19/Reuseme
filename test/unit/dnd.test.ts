import { describe, expect, it } from "vitest";
import {
  RESUME_DROP_ID,
  VAULT_DROP_ID,
  dragPointerY,
  insertionBeforeBlockId,
  isResumeDropTarget,
  parseSectionSortableId,
  placeholderId,
  resumeDropCollision,
  sectionDroppableId,
  sectionSortableId,
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

  it("resolves a canvas reorder in the gap between blocks to the nearest sibling", () => {
    const rect = (top: number, height: number) => ({
      top,
      bottom: top + height,
      left: 0,
      right: 400,
      width: 400,
      height,
    });
    const droppableRects = new Map([
      [RESUME_DROP_ID, rect(0, 1000)],
      [sectionDroppableId("experience"), rect(0, 300)],
      ["exp-1", rect(20, 80)],
      ["exp-2", rect(112, 80)],
      ["edu-1", rect(320, 80)],
    ]);
    const container = (id: string, data: object) =>
      ({ id, data: { current: data } }) as unknown as Parameters<
        typeof resumeDropCollision
      >[0]["droppableContainers"][number];
    const droppableContainers = [
      container(RESUME_DROP_ID, {}),
      container(sectionDroppableId("experience"), { category: "experience" }),
      container("exp-1", { origin: "canvas", category: "experience" }),
      container("exp-2", { origin: "canvas", category: "experience" }),
      container("edu-1", { origin: "canvas", category: "education" }),
    ];
    const collisions = resumeDropCollision({
      active: {
        id: "exp-1",
        data: { current: { origin: "canvas", blockId: "exp-1", category: "experience" } },
        rect: { current: { initial: null, translated: null } },
      },
      collisionRect: rect(70, 80),
      droppableRects,
      droppableContainers,
      pointerCoordinates: { x: 200, y: 106 },
    });
    expect(collisions[0]?.id).toBe("exp-2");
    expect(collisions.map((c) => c.id)).not.toContain("edu-1");

    const overVault = resumeDropCollision({
      active: {
        id: "exp-1",
        data: { current: { origin: "canvas", blockId: "exp-1", category: "experience" } },
        rect: { current: { initial: null, translated: null } },
      },
      collisionRect: rect(70, 80),
      droppableRects: new Map([...droppableRects, [VAULT_DROP_ID, { ...rect(0, 1000), left: -500, right: -100 }]]),
      droppableContainers: [...droppableContainers, container(VAULT_DROP_ID, {})],
      pointerCoordinates: { x: -300, y: 106 },
    });
    expect(overVault[0]?.id).toBe(VAULT_DROP_ID);
  });

  it("keeps section drags and block drags on their own droppables", () => {
    const rect = (top: number, height: number) => ({
      top,
      bottom: top + height,
      left: 0,
      right: 400,
      width: 400,
      height,
    });
    const container = (id: string, data: object) =>
      ({ id, data: { current: data } }) as unknown as Parameters<
        typeof resumeDropCollision
      >[0]["droppableContainers"][number];
    const droppableRects = new Map([
      [RESUME_DROP_ID, rect(0, 1000)],
      [sectionSortableId("education"), rect(0, 100)],
      [sectionDroppableId("education"), rect(0, 100)],
      ["edu-1", rect(30, 60)],
      [sectionSortableId("experience"), rect(110, 300)],
      [sectionDroppableId("experience"), rect(110, 300)],
      ["exp-1", rect(140, 120)],
      ["exp-2", rect(270, 120)],
    ]);
    const droppableContainers = [
      container(RESUME_DROP_ID, {}),
      container(sectionSortableId("education"), { origin: "section", sectionId: "education" }),
      container(sectionDroppableId("education"), { category: "education" }),
      container("edu-1", { origin: "canvas", category: "education" }),
      container(sectionSortableId("experience"), { origin: "section", sectionId: "experience" }),
      container(sectionDroppableId("experience"), { category: "experience" }),
      container("exp-1", { origin: "canvas", category: "experience" }),
      container("exp-2", { origin: "canvas", category: "experience" }),
    ];

    const sectionCollisions = resumeDropCollision({
      active: {
        id: sectionSortableId("experience"),
        data: { current: { origin: "section", sectionId: "experience" } },
        rect: { current: { initial: null, translated: null } },
      },
      collisionRect: rect(-60, 300),
      droppableRects,
      droppableContainers,
      pointerCoordinates: { x: 10, y: 50 },
    });
    expect(sectionCollisions[0]?.id).toBe(sectionSortableId("education"));
    expect(sectionCollisions.every((c) => parseSectionSortableId(String(c.id)))).toBe(true);

    const vaultCollisions = resumeDropCollision({
      active: {
        id: "vault:exp-4",
        data: { current: { origin: "vault", blockId: "exp-4", category: "experience" } },
        rect: { current: { initial: null, translated: null } },
      },
      collisionRect: rect(200, 80),
      droppableRects,
      droppableContainers,
      pointerCoordinates: { x: 200, y: 240 },
    });
    expect(vaultCollisions.length).toBeGreaterThan(0);
    expect(vaultCollisions.some((c) => parseSectionSortableId(String(c.id)))).toBe(false);
  });

  it("round-trips section sortable ids", () => {
    expect(parseSectionSortableId(sectionSortableId("custom-1"))).toBe("custom-1");
    expect(parseSectionSortableId(sectionDroppableId("project"))).toBe(null);
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
