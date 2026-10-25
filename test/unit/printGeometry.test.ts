import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The PDF is an unscaled clone of the canvas, so a print rule may change only
 * visibility or color. A rule that changes size, padding, margin, or font
 * would make the PDF wrap differently from the canvas and from the measurer.
 */

const root = join(__dirname, "../..");
const componentsDir = join(root, "src/components");

// print:p-*, print:px-*, print:m-*, print:w-*, print:h-*, print:text-*, print:leading-*, and similar.
const GEOMETRY_PRINT_UTILITY =
  /(?:^|[\s"'`{])print:-?(?:p[xytrblse]?|m[xytrblse]?|w|h|size|min-[wh]|max-[wh]|text|leading|gap|space-[xy]|font|tracking|border|inset|top|left|right|bottom|scale|translate|rotate|zoom)-[^\s"'`}]*/g;

function printMediaBlocks(css: string): string[] {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks: string[] = [];
  for (const match of stripped.matchAll(/@media\s+print\s*\{/g)) {
    const start = match.index + match[0].length;
    let depth = 1;
    let index = start;
    while (depth > 0 && index < stripped.length) {
      if (stripped[index] === "{") depth += 1;
      if (stripped[index] === "}") depth -= 1;
      index += 1;
    }
    blocks.push(stripped.slice(start, index - 1));
  }
  return blocks;
}

function declarations(block: string) {
  const rules: { selector: string; property: string; value: string }[] = [];
  for (const rule of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = rule[1].trim();
    for (const declaration of rule[2].split(";")) {
      const [property, ...value] = declaration.split(":");
      if (property?.trim()) {
        rules.push({ selector, property: property.trim().toLowerCase(), value: value.join(":").trim() });
      }
    }
  }
  return rules;
}

describe("print geometry guard", () => {
  it("no component uses a geometry print: utility", () => {
    const offenders: string[] = [];
    for (const file of readdirSync(componentsDir).filter((name) => name.endsWith(".tsx"))) {
      const source = readFileSync(join(componentsDir, file), "utf8");
      for (const match of source.matchAll(GEOMETRY_PRINT_UTILITY)) {
        offenders.push(`${file}: ${match[0].trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the guard pattern catches geometry utilities and ignores visibility ones", () => {
    const catches = (text: string) => text.match(GEOMETRY_PRINT_UTILITY) !== null;
    for (const bad of ["print:pr-0", "print:p-4", "print:mt-2", "print:w-full", "print:h-10", "print:text-sm", "print:leading-4"]) {
      expect(catches(`class="a ${bad} b"`), bad).toBe(true);
    }
    for (const good of ["print:hidden", "print:shadow-none", "print:outline-none", "print:overflow-visible", "print:pointer-events-none"]) {
      expect(catches(`class="a ${good} b"`), good).toBe(false);
    }
  });

  it("@media print in globals.css does not change padding, margin, font, or line height of resume elements", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
    const blocks = printMediaBlocks(css);
    expect(blocks.length).toBeGreaterThan(0);
    const forbidden = /^(padding|margin|font|line-height|letter-spacing|word-spacing|gap|zoom|transform|scale|translate)/;
    const offenders: string[] = [];
    for (const block of blocks) {
      for (const { selector, property, value } of declarations(block)) {
        // The paper (@page), the page shell (html, body), and the print copy's own box.
        const shell = selector === "@page" || /^(html|body)(\s*,\s*(html|body))*$/.test(selector);
        const printCopyBox = selector === "#resume-print-copy" && property === "margin";
        if (shell || printCopyBox) continue;
        if (forbidden.test(property)) offenders.push(`${selector} { ${property}: ${value} }`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the print copy is a clone without a scale", () => {
    const source = readFileSync(join(root, "src/lib/printResume.ts"), "utf8");
    expect(source).not.toMatch(/transform|scale\(/);
  });
});
