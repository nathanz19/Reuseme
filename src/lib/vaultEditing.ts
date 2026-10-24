import type { ResumePreset } from "@/types/resume";

/** Remove references to deleted blocks or rewrites tied to old bullet indexes. */
export function cleanBlockReferences(
  presets: ResumePreset[],
  blockId: string,
  deleted: boolean,
): ResumePreset[] {
  return presets.map((preset) => {
    const bulletOverrides = { ...preset.bulletOverrides };
    delete bulletOverrides[blockId];
    return {
      ...preset,
      activeBlockIds: deleted
        ? preset.activeBlockIds.filter((id) => id !== blockId)
        : preset.activeBlockIds,
      bulletOverrides,
    };
  });
}
