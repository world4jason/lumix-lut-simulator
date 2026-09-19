import { expect, test, type Locator, type Page } from "@playwright/test";

const appUrl = process.env.RESPONSIVE_BASE_URL ?? "./";

async function expectMinSize(locator: Locator, width: number, height: number) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(width);
  expect(box!.height).toBeGreaterThanOrEqual(height);
}

async function openKnownDetail(page: Page) {
  await page.getByRole("button", { name: "Official LUTs", exact: true }).click();
  await page.getByRole("searchbox").fill("Connor Clapton");
  const card = page.locator("[data-lut-code]").first();
  await expect(card).toBeVisible();
  await card.locator(".card-open").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".wipe")).toHaveCount(1);
  return { card, dialog };
}

for (const viewport of [
  { name: "mobile 390", width: 390, height: 844 },
  { name: "narrow 360", width: 360, height: 800 },
]) {
  test.describe(viewport.name, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: true,
      hasTouch: true,
    });

    test("uses phone-specific navigation and interaction surfaces", async ({
      page,
    }) => {
      await page.goto(appUrl);

      const frameBar = page.locator("main>.frame-bar");
      const groupRail = frameBar.locator(".frame-groups");
      await expect(groupRail).toBeVisible();
      await expect
        .poll(() =>
          groupRail.evaluate(
            (element) => getComputedStyle(element).flexWrap,
          ),
        )
        .toBe("nowrap");
      await expectMinSize(
        groupRail.getByRole("tab", { name: /^People 9$/ }),
        44,
        44,
      );
      await expectMinSize(
        page.getByRole("button", { name: "LUT List", exact: true }),
        44,
        44,
      );

      await page
        .getByRole("button", { name: "Official LUTs", exact: true })
        .click();
      const firstCard = page.locator("[data-lut-code]").first();
      await firstCard.getByRole("button", { name: "Add to LUT List" }).click();

      await page.getByRole("button", { name: "LUT List", exact: true }).click();

      const mode = page.locator(".s9-mobile-mode");
      const preview = page.locator(".s9-previews");
      const arranger = page.locator(".s9-list");
      await expect(mode).toBeVisible();
      await expect(
        mode.getByRole("tab", { name: "Preview" }),
      ).toHaveAttribute("aria-selected", "true");
      await expect(preview).toBeVisible();
      await expect(arranger).toBeHidden();
      await expect(
        preview.locator(".s9-tile-empty:visible"),
      ).toHaveCount(0);
      await expect(preview.locator(".s9-empty-summary")).toContainText(
        "empty slots available",
      );

      await mode.getByRole("tab", { name: "Arrange" }).click();
      await expect(arranger).toBeVisible();
      await expect(preview).toBeHidden();

      const candidateHandle = arranger.locator(".s9-handle").last();
      await candidateHandle.scrollIntoViewIfNeeded();
      await expectMinSize(candidateHandle, 44, 44);
      const candidateRemove = arranger.locator(".s9-remove").last();
      await expectMinSize(candidateRemove, 44, 44);

      const { dialog } = await openKnownDetail(page);
      const dialogBox = await dialog.boundingBox();
      expect(dialogBox).not.toBeNull();
      expect(dialogBox!.width).toBeGreaterThanOrEqual(viewport.width - 1);
      expect(dialogBox!.height).toBeGreaterThanOrEqual(viewport.height - 1);

      const mobileAction = dialog.locator(".detail-mobile-action");
      await expect(mobileAction).toBeVisible();
      await expectMinSize(
        mobileAction.locator(".detail-mobile-primary"),
        44,
        44,
      );
      await expectMinSize(
        dialog.getByRole("button", { name: "Close" }),
        44,
        44,
      );

      const wipe = dialog.locator(".wipe");
      await expect
        .poll(() =>
          wipe.evaluate((element) => getComputedStyle(element).touchAction),
        )
        .toBe("pan-y");
      await expectMinSize(wipe.locator(".wipe-handle-zone"), 44, 1);

      const detailGroups = dialog.locator(".frame-groups");
      await expect
        .poll(() =>
          detailGroups.evaluate(
            (element) => getComputedStyle(element).flexWrap,
          ),
        )
        .toBe("nowrap");

      await page.getByRole("button", { name: "Close", exact: true }).click();
      await expect(dialog).toHaveCount(0);
    });
  });
}

test.describe("desktop 1440", () => {
  test.use({
    viewport: { width: 1440, height: 1000 },
    isMobile: false,
    hasTouch: false,
  });

  test("keeps the desktop split planner and two-column detail", async ({
    page,
  }) => {
    await page.goto(appUrl);
    await page.getByRole("button", { name: "LUT List", exact: true }).click();

    await expect(page.locator(".s9-mobile-mode")).toBeHidden();
    await expect(page.locator(".s9-previews")).toBeVisible();
    await expect(page.locator(".s9-list")).toBeVisible();
    await expect(page.locator(".s9-previews .s9-tile-empty").first()).toBeVisible();

    const { dialog } = await openKnownDetail(page);
    await expect(dialog.locator(".detail-mobile-action")).toBeHidden();
    await expect(dialog.locator(".detail-primary")).toBeVisible();

    const columns = await dialog
      .locator(".detail-body")
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    expect(columns.trim().split(/\s+/).length).toBeGreaterThanOrEqual(2);

    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThan(1440);
  });
});
