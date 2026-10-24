import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 900, height: 900 } });

test("narrow layouts toggle between the vault and the canvas", async ({
  page,
}) => {
  await page.goto("/");
  const search = page.getByPlaceholder("Search vault…");
  const canvas = page.locator("#resume-print-root");
  await expect(search).toBeVisible();
  await expect(canvas).toBeHidden();

  await page.getByRole("button", { name: "Canvas", exact: true }).click();
  await expect(canvas).toBeVisible();
  await expect(search).toBeHidden();
});
