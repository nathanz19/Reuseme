import { expect, test } from "@playwright/test";
import {
  analyzeDemoJd,
  canvasBlock,
  confirmTailor,
  hoverClick,
  openApp,
  vaultCard,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("analyzing the demo JD shows coverage and forgotten experience", async ({
  page,
}) => {
  await analyzeDemoJd(page);
  await expect(page.getByText("78%")).toBeVisible();
  await expect(page.getByText("Missing: Docker, Kubernetes")).toBeVisible();

  const forgotten = page.locator("li").filter({
    hasText: "Distributed Systems Engineer · Orbit State Labs",
  });
  await expect(forgotten).toContainText("Score 76");

  await page.getByRole("button", { name: "Vault", exact: true }).first().click();
  await expect(vaultCard(page, "Backend Engineer")).toContainText(
    "Go microservices background",
  );
});

test("a failed match keeps the previous rankings", async ({ page }) => {
  await analyzeDemoJd(page);
  const textarea = page.getByPlaceholder("Paste job description…");
  await textarea.fill(`${await textarea.inputValue()}\n__FIXTURE_MATCH_FAIL__`);
  await page.getByRole("button", { name: "Analyze & Rank Vault" }).click();

  await expect(page.getByText(/simulated API error/)).toBeVisible();
  await expect(page.getByText("78%")).toBeVisible();
});

test("accepting a tailored bullet updates only the canvas and is undoable", async ({
  page,
}) => {
  await hoverClick(canvasBlock(page, "proj-4"), "Remove from resume");
  await analyzeDemoJd(page);

  const block = canvasBlock(page, "exp-1");
  const original = "Built React dashboards consumed by 40k monthly active analysts.";
  await expect(block).toContainText(original);
  await hoverClick(block, "Tailor bullet");
  await confirmTailor(page);

  const dialog = page.getByRole("dialog", { name: "Tailor bullet" });
  await expect(dialog.getByRole("button", { name: "Accept" })).toBeVisible();
  await expect(dialog.getByText(/Sample responses only/)).toBeVisible();
  await dialog.getByRole("radio", { name: /Conversational/ }).check();
  await dialog.getByRole("button", { name: "Accept" }).click();
  await expect(dialog).toHaveCount(0);

  await expect(block).toContainText("I built React dashboards");
  await expect(block).not.toContainText(original);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(block).toContainText(original);
});

test("rejecting a tailored bullet leaves the canvas unchanged", async ({
  page,
}) => {
  await analyzeDemoJd(page);
  const block = canvasBlock(page, "exp-1");
  await hoverClick(block, "Tailor bullet");
  await confirmTailor(page);
  const dialog = page.getByRole("dialog", { name: "Tailor bullet" });
  await dialog.getByRole("button", { name: "Reject" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(block).toContainText("Built React dashboards");
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
});


test("tailoring asks for confirmation before making a request", async ({ page }) => {
  const block = canvasBlock(page, "exp-1");
  const original = await block.locator("li").nth(1).innerText();
  let requests = 0;
  await page.route("**/api/blocks/tailor", async (route) => {
    requests++;
    await route.continue();
  });
  await hoverClick(block, "Tailor bullet", 1);
  const dialog = page.getByRole("dialog", { name: "Tailor bullet", exact: true });
  await expect(dialog.getByText(original.trim(), { exact: true })).toBeVisible();
  await expect(dialog.getByText(/AI request/)).toBeVisible();
  expect(requests).toBe(0);
  await confirmTailor(page);
  await expect(dialog.getByRole("radio")).toHaveCount(3);
  await expect(dialog.getByRole("radio", { name: /Job-focused/ })).toBeChecked();
  await expect(dialog.getByRole("radio", { name: /Technical/ })).toBeVisible();
  await expect(dialog.getByRole("radio", { name: /Conversational/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(block).toContainText(original.trim());
});


test("tailoring visibly fades in and fades out", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await hoverClick(canvasBlock(page, "exp-1"), "Tailor bullet");
  await confirmTailor(page);
  const dialog = page.getByRole("dialog", { name: "Tailor bullet", exact: true });
  await expect(dialog.getByRole("radio")).toHaveCount(3);
  const opening = await dialog.evaluate((element) => {
    const animation = element.getAnimations().find((entry) => (entry as CSSAnimation).animationName === "tailor-fade-in")!;
    animation.pause();
    animation.currentTime = 80;
    const opacity = Number(getComputedStyle(element).opacity);
    animation.finish();
    return opacity;
  });
  expect(opening).toBeGreaterThan(0);
  expect(opening).toBeLessThan(1);
  const closing = await dialog.evaluate((element) => {
    element.querySelector<HTMLButtonElement>('[aria-label="Close tailoring"]')!.click();
    return new Promise<number>((resolve) => requestAnimationFrame(() => {
      const animation = element.getAnimations().find((entry) => (entry as CSSAnimation).animationName === "tailor-fade-out")!;
      animation.pause();
      animation.currentTime = 120;
      resolve(Number(getComputedStyle(element).opacity));
      animation.play();
    }));
  });
  expect(closing).toBeGreaterThan(0);
  expect(closing).toBeLessThan(1);
  await expect(dialog).toHaveCount(0);
});

test("tailoring errors stay in the dialog and can be retried", async ({ page }) => {
  let attempt = 0;
  await page.route("**/api/blocks/tailor", async (route) => {
    attempt++;
    if (attempt === 1) await route.fulfill({ status: 429, json: { error: "Quota reached. Try again later." } });
    else await route.continue();
  });
  await hoverClick(canvasBlock(page, "exp-1"), "Tailor bullet");
  await confirmTailor(page);
  const dialog = page.getByRole("dialog", { name: "Tailor bullet", exact: true });
  await expect(dialog.getByRole("alert")).toContainText("Quota reached");
  await expect(dialog.getByRole("button", { name: "Accept", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(dialog.getByRole("radio")).toHaveCount(3);
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(dialog).toHaveCount(0);
});
