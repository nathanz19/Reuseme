import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 900, height: 900 } });

test("narrow layouts toggle between the vault and the canvas", async ({
  page,
}) => {
  await page.goto("/editor");
  const search = page.getByPlaceholder("Search vault…");
  const canvas = page.locator("#resume-print-root");
  await expect(search).toBeVisible();
  await expect(canvas).toBeHidden();

  await page.getByRole("button", { name: "Canvas", exact: true }).click();
  await expect(canvas).toBeVisible();
  await expect(search).toBeHidden();
});

test("landing page opens the editor on desktop and mobile", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("link", { name: "Get started" }).click();
    await expect(page).toHaveURL(/\/editor$/);
    // Mobile shows the vault first; the editor itself is still loaded.
    await expect(page.getByRole("navigation", { name: "Documents" })).toBeVisible();
  }
});

test("wide sidebar slides closed and reopens without losing the job description", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/editor");
  await page.getByRole("button", { name: "Job Description", exact: true }).click();
  const jd = page.getByPlaceholder("Paste job description…");
  await jd.fill("My saved job description draft");
  const main = page.locator("main");
  const before = (await main.boundingBox())!.width;
  const sidebar = (await page.locator("#vault-jd-sidebar").boundingBox())!;
  const document = (await page.locator("#resume-print-root").boundingBox())!;
  expect(sidebar.width).toBeLessThanOrEqual(480);
  expect(document.x).toBeGreaterThan(sidebar.x + sidebar.width);
  expect(Math.abs(sidebar.y - (await main.boundingBox())!.y)).toBeLessThan(1);
  await expect(page.locator(".workspace-layout")).toHaveCSS("flex-direction", "row");
  await expect(page.getByRole("button", { name: "Canvas", exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Hide Vault and job description", exact: true }).click();
  await expect(page.locator("#vault-jd-sidebar")).toHaveCSS("width", "0px");
  expect((await main.boundingBox())!.width).toBeGreaterThan(before);
  await expect(page.locator("#vault-jd-sidebar")).toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Show Vault and job description", exact: true }).click();
  await expect(jd).toBeVisible();
  await expect(jd).toHaveValue("My saved job description draft");
  await expect(page.getByRole("button", { name: "Hide Vault and job description", exact: true })).toHaveAttribute("aria-expanded", "true");
});

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference", viewport: { width: 1440, height: 900 } });

  test("sidebar handle fades in place on edge hover and hides again after reopening", async ({ page }) => {
    await page.goto("/editor");
    const sidebar = page.locator("#vault-jd-sidebar");
    const handle = page.locator(".workspace-sidebar-toggle");
    await expect(sidebar).toHaveCSS("width", "480px");
    await page.mouse.move(1200, 200);
    await expect(handle).toHaveCSS("opacity", "0");

    // The whole edge column, not just the handle, reveals it.
    const edge = (await page.locator(".workspace-sidebar-toggle-hitzone").boundingBox())!;
    await page.mouse.move(edge.x + edge.width / 2, edge.y + edge.height / 2);
    await expect(handle).toHaveCSS("opacity", "1");
    await page.mouse.move(1200, 200);
    await expect(handle).toHaveCSS("opacity", "0");

    await sidebar.hover({ position: { x: 20, y: 200 } });
    await expect(handle).toHaveCSS("transition-property", "opacity");
    const fade = await handle.evaluate((element) => {
      const animation = element.getAnimations().find((entry) => (entry as CSSTransition).transitionProperty === "opacity")!;
      animation.pause();
      animation.currentTime = 0;
      const start = element.getBoundingClientRect().x;
      animation.currentTime = 125;
      const opacity = Number(getComputedStyle(element).opacity);
      animation.finish();
      return { start, end: element.getBoundingClientRect().x, opacity };
    });
    expect(fade.end).toBe(fade.start);
    expect(fade.opacity).toBeGreaterThan(0);
    expect(fade.opacity).toBeLessThan(1);

    await page.getByRole("button", { name: "Hide Vault and job description", exact: true }).click();
    await expect(sidebar).toHaveCSS("width", "0px");
    await page.getByRole("button", { name: "Show Vault and job description", exact: true }).click();
    await expect(sidebar).toHaveCSS("width", "480px");
    await page.mouse.move(1200, 200);
    await expect(handle).toHaveCSS("opacity", "0");
  });
});
