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
  TabStopType,
  type ParagraphChild,
} from "docx";
import { getEffectiveBullets } from "@/lib/getEffectiveBullets";
import { isBlockSection, resolveSectionOrder, SKILLS_SECTION_ID } from "@/lib/sectionOrder";
import {
  SECTION_LABELS,
  SECTION_ORDER,
  type AccomplishmentBlock,
  type AdditionalSection,
  type ResumePreset,
} from "@/types/resume";

import type { ReferenceFormat } from "@/schemas/referenceFormat";

type DocxFont = { family: string; size: number; reference?: ReferenceFormat };

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
  const reference = preset.referenceFormat;
  const font: DocxFont = {
    family: reference?.details?.fontFace ?? (reference ? { serif: "Georgia", sans: "Arial", mono: "Courier New" }[reference.font] : modern ? "Calibri" : "Times New Roman"),
    size: reference ? Math.round((reference.details?.bodyPx ?? { small: 13, medium: 14, large: 16 }[reference.bodySize]) * 1.5) : BODY,
    reference,
  };
  const pageMargin = reference ? Math.round((reference.details?.marginPx ?? { narrow: 24, standard: 32, wide: 48 }[reference.margins]) * 15) : 720;
  const muted = modern ? "475569" : "334155";
  const children: Paragraph[] = [];

  if (preset.header.fullName.trim()) {
    children.push(new Paragraph({
      alignment: reference ? reference.headerAlignment : undefined,
      border: modern
        ? { bottom: { style: BorderStyle.SINGLE, size: 12, color: "0369A1", space: 4 } }
        : undefined,
      spacing: { after: modern ? 80 : 40 },
      children: [run(reference?.layout?.nameCase === "uppercase" ? preset.header.fullName.toUpperCase() : preset.header.fullName, font, {
        bold: true,
        size: reference?.details ? Math.round(reference.details.namePx * 1.5) : reference ? { medium: 36, large: 42, "extra-large": 48 }[reference.nameSize] : modern ? 36 : 32,
        color: reference ? reference.accent.slice(1) : modern ? "0C4A6E" : "0F172A",
      })],
    }));
  }

  const subtitle = reference?.layout?.subtitle === "under-name" ? preset.additionalSections?.find((section) => section.id === "target-title")?.content : undefined;
  if (subtitle) children.push(new Paragraph({ alignment: reference?.headerAlignment, spacing: { after: 80 }, children: [run(subtitle, font)] }));
  const contact = contactParagraph(preset, font, muted);
  if (contact) children.push(contact);

  const extras = new Map((preset.additionalSections ?? []).map((section) => [section.id, section]));
  const byId = new Map(vaultBlocks.map((block) => [block.id, block]));
  const bySection = new Map(SECTION_ORDER.map((category) => [category, [] as AccomplishmentBlock[]]));
  for (const id of preset.activeBlockIds) {
    const block = byId.get(id);
    if (block) bySection.get(block.category)?.push(block);
  }

  for (const id of resolveSectionOrder(preset)) {
    if (id === "target-title" && reference?.layout?.subtitle === "under-name") continue;
    if (isBlockSection(id)) {
      const blocks = bySection.get(id) ?? [];
      if (!blocks.length) continue;
      children.push(sectionHeading(id === "experience" ? reference?.details?.experienceHeading ?? SECTION_LABELS[id] : SECTION_LABELS[id], font));
      for (const block of blocks) children.push(...blockParagraphs(block, preset, font, muted));
    } else if (id === SKILLS_SECTION_ID) {
      if (preset.customSkillsSection.length === 0) continue;
      children.push(sectionHeading(reference?.details?.skillsHeading ?? "Skills", font));
      if (reference?.layout && reference.layout.skillsStyle !== "inline") {
        const columns = reference.layout.skillsStyle === "columns" ? reference.layout.skillsColumns : 1;
        const width = 12240 - 2 * pageMargin;
        for (let index = 0; index < preset.customSkillsSection.length; index += columns) children.push(new Paragraph({
          tabStops: Array.from({ length: columns - 1 }, (_, tab) => ({ type: TabStopType.LEFT, position: Math.round(width * (tab + 1) / columns) })),
          spacing: { after: 40 }, children: [run(preset.customSkillsSection.slice(index, index + columns).map((skill) => `• ${skill}`).join("\t"), font)],
        }));
      } else children.push(new Paragraph({ spacing: { after: 60 }, children: [run(preset.customSkillsSection.join(", "), font)] }));
    } else {
      const section = extras.get(id);
      if (section) children.push(...additionalParagraphs(id === "summary" && reference?.layout ? { ...section, title: reference.layout.summaryHeading } : section, font, section.id !== "target-title"));
    }
  }

  if (!children.length) children.push(new Paragraph({ children: [run("", font)] }));

  return new Document({
    styles: reference ? { default: { document: {
      run: { font: font.family, size: font.size },
      paragraph: { spacing: { line: reference.details ? Math.round(reference.details.lineHeight * 240) : { compact: 300, balanced: 336, airy: 372 }[reference.spacing] } },
    } } } : undefined,
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
          margin: { top: pageMargin, right: pageMargin, bottom: pageMargin, left: pageMargin },
        },
      },
      children,
    }],
  });
}

function additionalParagraphs(section: AdditionalSection, font: DocxFont, showHeading: boolean): Paragraph[] {
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
  font: DocxFont,
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
  const details = font.reference?.details;
  const layout = font.reference?.layout;
  if (layout) {
    const metadata = [block.organization, block.location].filter(Boolean).join(DOT);
    const metaColor = layout.metadataColor === "muted" ? muted : undefined;
    const metaRuns = () => [run(metadata, font, { bold: layout.metadataWeight === "bold", color: metaColor }),
      ...(dates ? [run(`${layout.datesPlacement === "right" ? "\t" : " | "}${dates}`, font, { bold: layout.metadataWeight === "bold", color: metaColor })] : [])];
    const tabs = [{ type: TabStopType.RIGHT, position: 12240 - Math.round((details?.marginPx ?? 32) * 30) }];
    const blockGap = Math.round((details?.blockGapPx ?? 8) * 15);
    const titleParagraph = new Paragraph({ children: [run(block.title, font, { bold: true })], keepNext: true, spacing: { before: layout.metadataPlacement === "below" ? blockGap : 0, after: 0 } });
    const metadataParagraph = new Paragraph({ tabStops: tabs, children: metaRuns(), keepNext: true, spacing: { before: layout.metadataPlacement === "above" ? blockGap : 0, after: 0 } });
    if (layout.metadataPlacement === "inline") paragraphs.splice(0, paragraphs.length, new Paragraph({
      tabStops: tabs, spacing: { before: Math.round((details?.blockGapPx ?? 8) * 15), after: 20 }, keepNext: true,
      children: [run(block.title, font, { bold: true }), run(" — ", font), ...metaRuns()],
    }));
    else paragraphs.splice(0, paragraphs.length, ...(layout.metadataPlacement === "above" ? [metadataParagraph, titleParagraph] : [titleParagraph, metadataParagraph]));
  } else if (details && details.entryLayout !== "inline") {
    const organizationFirst = details.entryLayout === "organization-first" && block.category !== "project";
    const first = organizationFirst ? block.organization || block.title : block.title;
    const second = organizationFirst ? block.organization ? block.title : "" : block.organization;
    const width = 12240 - Math.round(details.marginPx * 30);
    paragraphs.splice(0, paragraphs.length, new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: width }],
      spacing: { before: Math.round(details.blockGapPx * 15), after: 0 }, keepNext: true,
      children: [run(first, font, { bold: true }), ...(dates ? [run(`\t${dates}`, font, { bold: true })] : [])],
    }));
    if (second || block.location) paragraphs.push(new Paragraph({
      keepNext: bullets.length > 0, spacing: { after: 20 },
      children: [run([second, block.location].filter(Boolean).join(DOT), font, { bold: organizationFirst })],
    }));
  }
  for (const bullet of bullets) {
    paragraphs.push(new Paragraph({
      numbering: layout?.descriptionStyle === "paragraphs" ? undefined : { reference: BULLETS, level: 0 },
      spacing: { after: 40 },
      children: [run(bullet, font)],
    }));
  }
  return paragraphs;
}

function sectionHeading(title: string, font: DocxFont): Paragraph {
  const details = font.reference?.details;
  const rule = { style: BorderStyle.SINGLE, size: details ? Math.round(details.ruleWidthPx * 6) : font.reference?.headingRule === "thick" ? 12 : 6, color: details?.ruleColor.slice(1) ?? font.reference?.accent.slice(1) ?? "CBD5E1", space: 1 };
  return new Paragraph({
    border: font.reference?.headingRule === "none" || details?.ruleWidthPx === 0 ? undefined : details?.rulePosition === "above" ? { top: rule } : { bottom: rule },
    spacing: { before: details ? Math.round(details.sectionGapPx * 15) : font.reference ? { compact: 120, balanced: 180, airy: 270 }[font.reference.spacing] : 200, after: details ? Math.round(details.headingGapPx * 15) : 80 },
    keepNext: true,
    children: [run(font.reference?.headingCase === "title" ? title : title.toUpperCase(), font, { bold: true, color: font.reference?.accent.slice(1), size: details ? Math.round(details.headingPx * 1.5) : undefined })],
  });
}

function contactParagraph(preset: ResumePreset, font: DocxFont, color: string): Paragraph | null {
  const { header } = preset;
  const spread = preset.referenceFormat?.layout?.contactLayout === "spread";
  if (spread) font = { ...font, size: Math.round(font.size * 0.8) };
  const children: ParagraphChild[] = [];
  let contactCount = 0;
  const add = (child: ParagraphChild) => {
    if (children.length) children.push(run(spread && contactCount < 3 ? "\t" : font.reference?.details?.contactSeparator === "pipe" ? " | " : DOT, font, { color }));
    children.push(child);
    contactCount++;
  };
  const contactValues = spread ? [header.phone, header.email, header.location] : [header.email, header.phone, header.location];
  for (const [index, value] of contactValues.entries()) {
    if (value.trim()) add(run(`${spread && preset.referenceFormat?.layout?.contactIcons ? ["☎ ", "✉ ", "⌖ "][index] : ""}${value}`, font, { color }));
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
          font: font.family,
          size: font.size,
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
  const width = 12240 - Math.round((font.reference?.details?.marginPx ?? 32) * 30);
  return new Paragraph({ alignment: spread ? AlignmentType.LEFT : font.reference?.headerAlignment, tabStops: spread ? [{ type: TabStopType.CENTER, position: Math.round(width / 2) }, { type: TabStopType.RIGHT, position: width }] : undefined, spacing: { after: 80 }, children });
}

function run(text: string, font: DocxFont, options: { bold?: boolean; size?: number; color?: string } = {}): TextRun {
  return new TextRun({ text, font: font.family, size: options.size ?? font.size, bold: options.bold, color: options.color });
}
