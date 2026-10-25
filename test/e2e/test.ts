import { test as base, expect } from "@playwright/test";
import { RESUME_STORAGE_KEY, seedStorageValue } from "../support/seedWorkspace";

// Browser tests load the sample workspace themselves. The app starts blank.
export const test = base.extend({
  page: async ({ page }, run) => {
    const value = seedStorageValue();
    await page.addInitScript(({ key, stored }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, stored);
    }, { key: RESUME_STORAGE_KEY, stored: value });
    await run(page);
  },
});

export { expect };
