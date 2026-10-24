import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
  UnderlineType,
  type ParagraphChild,
} from "docx";
import { getEffectiveBullets } from "@/lib/getEffectiveBullets";
import {
  SECTION_LABELS,
  SECTION_ORDER,
  type AccomplishmentBlock,
  type AdditionalSection,
  type ResumePreset,
} from "@/types/resume";

const BULLETS = "resume-bullets";
const BODY = 22;
const DOT = " · ";

/** Word download of the resume text the canvas prints. PDF stays on the browser print dialog. */
export async function downloadResumeDocx(
  preset: ResumePreset,
  vaultBlocks: readonly AccomplishmentBlock[],
): Promise<void> {
  const blob = await Packer.toBlob(buildResumeDocument(preset, vaultBlocks));
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = resumeDocxFilename(preset.name);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function resumeDocxFilename(name: string): string {
  const cleaned = name.replace(/[\u0000-\u001f\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
  return `${cleaned || "resume"}.docx`;
}

export function buildResumeDocument(
  preset: ResumePreset,
  vaultBlocks: readonly AccomplishmentBlock[],
): Document {
  const modern = preset.templateId === "modern-tech";
  const font = modern ? "Calibri" : "Times New Roman";
  const muted = modern ? "475569" : "334155";
  const children: Paragraph[] = [];

  if (preset.header.fullName.trim()) {
    children.push(new Paragraph({
      border: modern
        ? { bottom: { style: BorderStyle.SINGLE, size: 12, color: "0369A1", space: 4 } }
        : undefined,
      spacing: { after: modern ? 80 : 40 },
      children: [run(preset.header.fullName, font, {
        bold: true,
        size: modern ? 36 : 32,
        color: modern ? "0C4A6E" : "0F172A",
      })],
    }));
  }

  const contact = contactParagraph(preset, font, muted);
  if (contact) children.push(contact);

  const extras = preset.additionalSections ?? [];
  for (const section of extras.filter((item) => item.id === "target-title" || item.id === "summary")) {
    children.push(...additionalParagraphs(section, font, section.id !== "target-title"));
  }

  const byId = new Map(vaultBlocks.map((block) => [block.id, block]));
  const bySection = new Map(SECTION_ORDER.map((category) => [category, [] as AccomplishmentBlock[]]));
  for (const id of preset.activeBlockIds) {
    const block = byId.get(id);
    if (block) bySection.get(block.category)?.push(block);
  }
  for (const category of SECTION_ORDER) {
    const blocks = bySection.get(category) ?? [];
    if (!blocks.length) continue;
    children.push(sectionHeading(SECTION_LABELS[category], font));
    for (const block of blocks) children.push(...blockParagraphs(block, preset, font, muted));
  }

  for (const section of extras.filter((item) => item.id !== "target-title" && item.id !== "summary")) {
    children.push(...additionalParagraphs(section, font, true));
  }

  if (preset.customSkillsSection.length > 0) {
    children.push(sectionHeading("Skills", font));
    children.push(new Paragraph({
      spacing: { after: 60 },
      children: [run(preset.customSkillsSection.join(", "), font)],
    }));
  }

  if (!children.length) children.push(new Paragraph({ children: [run("", font)] }));

  return new Document({
    title: preset.name.trim() || "Resume",
    creator: preset.header.fullName.trim() || "Reuseme",
    description: "Resume",
    numbering: {
      config: [{
        reference: BULLETS,
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: { indent: { left: 360, hanging: 180 } },
          },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children,
    }],
  });
}

function additionalParagraphs(section: AdditionalSection, font: string, showHeading: boolean): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  if (showHeading && section.title.trim()) paragraphs.push(sectionHeading(section.title, font));
  const lines = section.content.replace(/\r\n/g, "\n").split("\n");
  if (section.content.trim()) {
    for (const line of lines) {
      paragraphs.push(new Paragraph({
        spacing: { after: 40 },
        children: [run(line, font)],
      }));
    }
  }
  return paragraphs;
}

function blockParagraphs(
  block: AccomplishmentBlock,
  preset: ResumePreset,
  font: string,
  muted: string,
): Paragraph[] {
  const bullets = getEffectiveBullets(block, preset);
  const dates = [block.startDate, block.endDate].filter(Boolean).join(" – ");
  const meta = [block.organization, block.location, dates].filter(Boolean).join(DOT);
  const title: ParagraphChild[] = [run(block.title, font, { bold: true })];
  if (meta) title.push(run(` — ${meta}`, font, { color: muted }));
  const paragraphs = [
    new Paragraph({
      spacing: { before: 120, after: 40 },
      keepNext: bullets.length > 0,
      children: title,
    }),
  ];
  for (const bullet of bullets) {
    paragraphs.push(new Paragraph({
      numbering: { reference: BULLETS, level: 0 },
      spacing: { after: 40 },
      children: [run(bullet, font)],
    }));
  }
  return paragraphs;
}

function sectionHeading(title: string, font: string): Paragraph {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1", space: 1 } },
    spacing: { before: 200, after: 80 },
    keepNext: true,
    children: [run(title.toUpperCase(), font, { bold: true })],
  });
}

function contactParagraph(preset: ResumePreset, font: string, color: string): Paragraph | null {
  const { header } = preset;
  const children: ParagraphChild[] = [];
  const add = (child: ParagraphChild) => {
    if (children.length) children.push(run(DOT, font, { color }));
    children.push(child);
  };
  for (const value of [header.email, header.phone, header.location]) {
    if (value.trim()) add(run(value, font, { color }));
  }
  for (const link of header.links) {
    const label = link.label.trim();
    if (!label) continue;
    const url = link.url.trim();
    if (/^(https?:|mailto:)/i.test(url)) {
      add(new ExternalHyperlink({
        link: url,
        children: [new TextRun({
          text: label,
          font,
          size: BODY,
          style: "Hyperlink",
          color: "0563C1",
          underline: { type: UnderlineType.SINGLE },
        })],
      }));
    } else {
      add(run(label, font, { color }));
    }
  }
  if (!children.length) return null;
  return new Paragraph({ spacing: { after: 80 }, children });
}

function run(text: string, font: string, options: { bold?: boolean; size?: number; color?: string } = {}): TextRun {
  return new TextRun({ text, font, size: options.size ?? BODY, bold: options.bold, color: options.color });
}
