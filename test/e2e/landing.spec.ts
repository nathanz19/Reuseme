import { expect, test } from "./test";

test.use({ reducedMotion: "no-preference" });

test("headline fades near the top and returns when scrolling back", async ({ page }) => {
  await page.goto("/");
  const headline = page.locator("[data-scroll-fade]");
  const scroller = page.locator("[data-landing-scroll]");
  await expect(headline).toHaveCSS("opacity", "1");
  const position = await headline.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.bottom - Math.min(bounds.height * 0.3, 80);
  });
  await scroller.evaluate((element, top) => element.scrollTo({ top, behavior: "instant" }), position);
  await expect.poll(() => headline.evaluate((element) => Number(getComputedStyle(element).opacity))).toBeLessThan(0.8);
  await scroller.evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }));
  await expect(headline).toHaveCSS("opacity", "1");
});

test("browser Back restores the landing page after the editor fade", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "How it works", exact: true }).click();
  await page.getByRole("link", { name: "Open editor", exact: true }).click();
  await expect(page).toHaveURL(/\/editor$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/#how-it-works$/);
  const landing = page.locator("[data-landing-scroll]");
  await expect(landing).toHaveCSS("opacity", "1");
  await expect(landing).not.toHaveAttribute("data-exiting", "true");
  await page.goForward();
  await expect(page).toHaveURL(/\/editor$/);
  await page.goBack();
  await expect(landing).toHaveCSS("opacity", "1");
  await page.getByRole("link", { name: "Open editor", exact: true }).click();
  await expect(page).toHaveURL(/\/editor$/);
});

test("Open editor visibly fades before navigating and the editor fades in", async ({ page }) => {
  await page.goto("/");
  const landing = page.locator("[data-landing-scroll]");
  await expect(landing).toHaveCSS("opacity", "1");
  await page.getByRole("link", { name: "Open editor", exact: true }).click();
  await expect.poll(() => landing.evaluate((element) => Number(getComputedStyle(element).opacity))).toBeLessThan(0.8);
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page).toHaveURL(/\/editor$/);
  const editor = page.locator(".editor-page");
  await expect.poll(() => editor.evaluate((element) => element.getAnimations().some((animation) => animation.playState === "running"))).toBe(true);
  await expect(editor).toHaveCSS("opacity", "1");
});

test("How it works scrolls gradually to its section", async ({ page }) => {
  await page.goto("/");
  const scroller = page.locator("[data-landing-scroll]");
  await scroller.evaluate((element) => {
    element.setAttribute("data-saw-scroll-step", "false");
    element.addEventListener("scroll", () => {
      const max = element.scrollHeight - element.clientHeight;
      if (element.scrollTop > 0 && element.scrollTop < max * 0.8) element.setAttribute("data-saw-scroll-step", "true");
    }, { passive: true });
  });
  await page.getByRole("link", { name: "How it works", exact: true }).click();
  await expect.poll(() => scroller.evaluate((element) => Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop))).toBeLessThan(2);
  await expect(scroller).toHaveAttribute("data-saw-scroll-step", "true");
});

test("green circle grows with scrolling and returns at the top", async ({ page }) => {
  await page.goto("/");
  const bubble = page.locator("[data-scroll-bubble]");
  const scroller = page.locator("[data-landing-scroll]");
  await expect(page.locator(".landing-reveal").first()).toHaveAttribute("data-reveal", "visible");
  await scroller.evaluate((element) => element.scrollTo(0, 200));
  await expect.poll(() => bubble.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a)).toBeGreaterThan(1.1);
  await scroller.evaluate((element) => element.scrollTo(0, 0));
  await expect.poll(async () => Math.abs(await bubble.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a) - 1)).toBeLessThan(0.002);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await scroller.evaluate((element) => element.scrollTo(0, 200));
  await expect(bubble).toHaveCSS("transform", "none");
});

test("features fade in when scrolled into view", async ({ page }) => {
  await page.goto("/");
  const feature = page.locator(".landing-reveal").filter({ has: page.getByRole("heading", { name: "Keep your story", exact: true }) });
  await expect(feature).toHaveAttribute("data-reveal", "pending");
  await expect(feature).toHaveCSS("opacity", "0");
  await feature.scrollIntoViewIfNeeded();
  await expect(feature).toHaveAttribute("data-reveal", "visible");
  await expect.poll(() => feature.evaluate((element) => element.getAnimations().some((animation) => animation.playState === "running"))).toBe(true);
  await expect(feature).toHaveCSS("opacity", "1");
  await page.locator("[data-landing-scroll]").evaluate((element) => element.scrollTo(0, 0));
  await expect(feature).toHaveAttribute("data-reveal", "leaving");
  await expect(feature).toHaveCSS("opacity", "0");
  await feature.scrollIntoViewIfNeeded();
  await expect(feature).toHaveAttribute("data-reveal", "visible");
  await expect(feature).toHaveCSS("opacity", "1");
});
