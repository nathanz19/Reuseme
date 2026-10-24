import { Packer } from "docx";
import { describe, expect, it } from "vitest";
import { SEED_BLOCKS, SEED_PRESETS } from "@/data/seed";
import { buildResumeDocument, resumeDocxFilename } from "@/lib/exportDocx";
import type { ResumePreset } from "@/types/resume";
import { docxPlainText, readZipText } from "./docxZip";

async function packed(preset: ResumePreset, blocks = SEED_BLOCKS) {
  const buffer = await Packer.toBuffer(buildResumeDocument(preset, blocks));
  const documentXml = readZipText(buffer, "word/document.xml");
  const rels = readZipText(buffer, "word/_rels/document.xml.rels");
  return { buffer, documentXml, rels, text: docxPlainText(documentXml) };
}

describe("resumeDocxFilename", () => {
  it("keeps a readable document name and strips path characters", () => {
    expect(resumeDocxFilename("Frontend SWE")).toBe("Frontend SWE.docx");
    expect(resumeDocxFilename("  Q3 résumé  ")).toBe("Q3 résumé.docx");
    expect(resumeDocxFilename("a/b:c")).toBe("a b c.docx");
    expect(resumeDocxFilename("   ")).toBe("resume.docx");
  });
});

describe("buildResumeDocument", () => {
  it("writes the active resume, effective bullets, and a letter-size page", async () => {
    const preset = structuredClone(SEED_PRESETS[0]);
    preset.bulletOverrides = { "exp-1": { 0: "Rewritten dashboard bullet" } };
    preset.additionalSections = [
      { id: "target-title", title: "Target", content: "Senior Frontend Engineer" },
      { id: "summary", title: "Summary", content: "Builds accessible interfaces." },
      { id: "interests", title: "Interests", content: "Cartography" },
    ];
    const { documentXml, rels, text } = await packed(preset);

    expect(documentXml).toContain('w:w="12240"');
    expect(documentXml).toContain('w:h="15840"');
    expect(documentXml).toContain("Times New Roman");
    expect(text.indexOf("Alex Morgan")).toBeGreaterThanOrEqual(0);
    expect(text.indexOf("Senior Frontend Engineer")).toBeLessThan(text.indexOf("SUMMARY"));
    expect(text.indexOf("SUMMARY")).toBeLessThan(text.indexOf("EDUCATION"));
    expect(text.indexOf("EDUCATION")).toBeLessThan(text.indexOf("EXPERIENCE"));
    expect(text.indexOf("EXPERIENCE")).toBeLessThan(text.indexOf("PROJECTS"));
    expect(text.indexOf("INTERESTS")).toBeGreaterThan(text.indexOf("CERTIFICATIONS"));
    expect(text.indexOf("SKILLS")).toBeGreaterThan(text.indexOf("INTERESTS"));
    expect(text).toContain("Rewritten dashboard bullet");
    expect(text).not.toContain("Built React dashboards consumed by 40k monthly active analysts.");
    expect(text).toContain("Lumen Cartography");
    expect(text).toContain("Accessibility (WCAG)");
    expect(text).not.toContain("Harbor Ledger");
    expect(text).not.toContain("Lighthouse a11y");
    expect(rels).toContain("https://github.com/example");
    expect(text).toContain("GitHub");
  });

  it("uses the modern font and omits empty sections", async () => {
    const preset = structuredClone(SEED_PRESETS[1]);
    preset.customSkillsSection = [];
    preset.activeBlockIds = ["edu-1"];
    const { documentXml, text } = await packed(preset);

    expect(documentXml).toContain("Calibri");
    expect(text).toContain("EDUCATION");
    expect(text).not.toContain("EXPERIENCE");
    expect(text).not.toContain("SKILLS");
    expect(text).not.toContain("Software Engineer");
  });

  it("escapes names and keeps a blank document valid", async () => {
    const preset = structuredClone(SEED_PRESETS[0]);
    preset.header = { ...preset.header, fullName: "Alex & Morgan", links: [{ label: "Site", url: "not a url" }] };
    preset.activeBlockIds = [];
    preset.customSkillsSection = [];
    const named = await packed(preset);
    expect(named.text).toContain("Alex & Morgan");
    expect(named.text).toContain("Site");
    expect(named.rels).not.toContain("not a url");

    const empty: ResumePreset = {
      ...preset,
      name: " ",
      header: { fullName: " ", email: " ", phone: " ", location: " ", links: [] },
    };
    const blank = await packed(empty, []);
    expect(blank.buffer.subarray(0, 2).toString()).toBe("PK");
    expect(blank.documentXml).toContain("w:document");
  });
});
