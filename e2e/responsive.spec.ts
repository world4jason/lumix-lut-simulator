import { expect, test, type Locator, type Page } from "@playwright/test";

const planKey = "lumix-s9:plan:v1";
const appUrl = process.env.RESPONSIVE_BASE_URL ?? "./";

const viewports = [
  { name: "desktop 1440", width: 1440, height: 1000, touch: false },
  { name: "mobile 390", width: 390, height: 844, touch: true },
  { name: "narrow 360", width: 360, height: 800, touch: true },
] as const;

type Plan = {
  slots: (string | null)[];
  candidates: string[];
};

async function readPlan(page: Page): Promise<Plan | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Plan) : null;
  }, planKey);
}

async function expectImageLoaded(image: Locator) {
  await expect
    .poll(() =>
      image.evaluate(
        (element) =>
          (element as HTMLImageElement).complete &&
          (element as HTMLImageElement).naturalWidth > 0,
      ),
    )
    .toBe(true);
}

async function expectNoPageOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
}

async function expectInsideViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
}

async function dispatchTouch(
  client: Awaited<
    ReturnType<ReturnType<Page["context"]>["newCDPSession"]>
  >,
  type: "touchStart" | "touchMove" | "touchEnd",
  point?: { x: number; y: number },
) {
  await client.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: point ? [{ id: 1, x: point.x, y: point.y, force: 1 }] : [],
  });
}

async function dragToSlot(
  page: Page,
  source: Locator,
  slotIndex: number,
  touch: boolean,
) {
  const list = page.locator(".s9-list");
  await source.scrollIntoViewIfNeeded();
  const start = await source.boundingBox();
  const listBox = await list.boundingBox();
  expect(start).not.toBeNull();
  expect(listBox).not.toBeNull();
  const startPoint = {
    x: start!.x + start!.width / 2,
    y: start!.y + start!.height / 2,
  };

  const client = touch ? await page.context().newCDPSession(page) : null;
  if (touch) {
    await dispatchTouch(client!, "touchStart", startPoint);
    await page.waitForTimeout(80);
    const edgePoint = {
      x: listBox!.x + listBox!.width / 2,
      y: listBox!.y + 10,
    };
    await dispatchTouch(client!, "touchMove", edgePoint);
    await expect
      .poll(() => list.evaluate((element) => element.scrollTop))
      .toBe(0);
  } else {
    await page.mouse.move(startPoint.x, startPoint.y);
    await page.mouse.down();
    await page.mouse.move(
      listBox!.x + listBox!.width / 2,
      listBox!.y + 10,
      { steps: 10 },
    );
    await expect
      .poll(() => list.evaluate((element) => element.scrollTop))
      .toBe(0);
  }

  const target = page.locator(`[data-s9-key="slot-${slotIndex}"]`);
  const targetBox = await target.boundingBox();
  expect(targetBox).not.toBeNull();
  const targetPoint = {
    x: targetBox!.x + targetBox!.width / 2,
    y: targetBox!.y + targetBox!.height / 2,
  };

  if (touch) {
    await dispatchTouch(client!, "touchMove", targetPoint);
    await page.waitForTimeout(80);
    await dispatchTouch(client!, "touchEnd");
    await client!.detach();
  } else {
    await page.mouse.move(targetPoint.x, targetPoint.y, { steps: 8 });
    await page.mouse.up();
  }
  await page.waitForTimeout(120);
}

function cubeRows(inverse = false) {
  const rows: string[] = [];
  for (let blue = 0; blue < 2; blue += 1) {
    for (let green = 0; green < 2; green += 1) {
      for (let red = 0; red < 2; red += 1) {
        const values = inverse
          ? [1 - red, 1 - green, 1 - blue]
          : [red, green, blue];
        rows.push(values.join(" "));
      }
    }
  }
  return rows.join("\n");
}

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.touch,
      hasTouch: viewport.touch,
    });

    test("responsive acceptance keeps the complete LUT planning flow usable", async ({
      page,
    }) => {
      const errors: string[] = [];
      const badResponses: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("response", (response) => {
        if (response.status() >= 400) {
          badResponses.push(`${response.status()} ${response.url()}`);
        }
      });

      await page.goto(appUrl);
      await expect(
        page.getByText("Saved in this browser for planning only. No camera is connected."),
      ).toBeVisible();
      const frameBar = page.locator("main>.frame-bar");
      const sampleStrip = frameBar.locator('.strip[aria-label="Sample selection"]');
      await expect(frameBar).toBeVisible();
      await expect(frameBar.getByRole("tab")).toHaveCount(5);
      await expect(frameBar.getByRole("tab", { name: /^People 9$/ })).toBeVisible();
      await expect(frameBar.getByRole("tab", { name: /^Street & buildings 13$/ })).toBeVisible();
      await expect(frameBar.getByRole("tab", { name: /^Landscape & nature 8$/ })).toBeVisible();
      await expect(frameBar.getByRole("tab", { name: /^Colour reference 3$/ })).toBeVisible();
      const selectedFrame = sampleStrip.locator('button[aria-pressed="true"]');
      const selectedFrameTitle = await selectedFrame.getAttribute("title");
      await expect(sampleStrip.locator("img")).toHaveCount(13);
      await frameBar.getByRole("tab", { name: /^People 9$/ }).click();
      await expect(sampleStrip.locator("img")).toHaveCount(9);
      await expect(selectedFrame).toHaveAttribute("aria-pressed", "true");
      await expect(selectedFrame).toHaveAttribute("title", selectedFrameTitle!);
      await frameBar.getByRole("tab", { name: /^All 33$/ }).click();
      await expect(sampleStrip.locator("img")).toHaveCount(33);
      await expect(selectedFrame).toHaveAttribute("aria-pressed", "true");
      await expectNoPageOverflow(page);
      await expectInsideViewport(page, page.locator(".masthead"));
      await expectInsideViewport(page, page.locator(".tabs"));

      await page.getByRole("button", { name: "Official LUTs", exact: true }).click();
      await expect(page.locator("[data-lut-code]")).toHaveCount(199);
      await page.getByRole("searchbox").fill("Connor Clapton");
      const firstCard = page.locator("[data-lut-code]").first();
      await expect(firstCard).toBeVisible();
      const firstCode = await firstCard.getAttribute("data-lut-code");
      expect(firstCode).toMatch(/^lut_/);
      await firstCard.getByRole("button", { name: "Add to LUT List" }).click();

      await page.getByRole("searchbox").fill("");
      const secondCard = page.locator("[data-lut-code]").nth(1);
      const secondCode = await secondCard.getAttribute("data-lut-code");
      expect(secondCode).toMatch(/^lut_/);
      await secondCard.getByRole("button", { name: "Add to LUT List" }).click();
      await expect
        .poll(async () => {
          const plan = await readPlan(page);
          return plan?.candidates ?? [];
        })
        .toEqual([firstCode, secondCode]);

      await firstCard.locator(".card-open").click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expectInsideViewport(page, dialog);
      await expectInsideViewport(page, dialog.getByRole("button", { name: "Close" }));
      const detailFrameBar = dialog.locator(".frame-bar");
      const detailStrip = detailFrameBar.locator('.strip[aria-label="Sample selection"]');
      await expect(detailFrameBar.getByRole("tab", { name: /^All 33$/ })).toBeVisible();
      await detailFrameBar.getByRole("tab", { name: /^All 33$/ }).click();
      const sharedDetailSamples = detailStrip.locator(
        'button:not(:has(img[alt="Official sample"]))',
      );
      await expect(sharedDetailSamples).toHaveCount(33);
      await expect(dialog.locator(".wipe")).toHaveCount(1);
      await expectImageLoaded(dialog.locator(".wipe > img").first());
      await expectImageLoaded(dialog.locator(".wipe-clip img"));
      const firstAfter = await dialog.locator(".wipe > img").first().getAttribute("src");
      await sharedDetailSamples.nth(32).click();
      await expect(sharedDetailSamples.nth(32)).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect
        .poll(() => dialog.locator(".wipe > img").first().getAttribute("src"))
        .not.toBe(firstAfter);
      await expectImageLoaded(dialog.locator(".wipe > img").first());
      await dialog.getByRole("slider").fill("0.25");
      await expect(dialog.locator(".wipe-clip")).toHaveAttribute("style", /25%/);
      const detailAdd = dialog.getByRole("button", { name: /LUT List|Candidate/ });
      await detailAdd.scrollIntoViewIfNeeded();
      await expectInsideViewport(page, detailAdd);
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(selectedFrame).toHaveAttribute("aria-pressed", "true");
      await expect(selectedFrame).toHaveAttribute("title", selectedFrameTitle!);

      const vlogCard = page
        .locator("[data-lut-code]")
        .filter({ has: page.locator(".badge", { hasText: "V-Log" }) })
        .first();
      await expect(vlogCard).toBeVisible();
      await vlogCard.locator(".card-open").click();
      const vlogDialog = page.getByRole("dialog");
      const vlogFrameBar = vlogDialog.locator(".frame-bar");
      const vlogStrip = vlogFrameBar.locator('.strip[aria-label="Sample selection"]');
      await vlogFrameBar
        .getByRole("tab", { name: /^Street & buildings 13$/ })
        .click();
      const vlogSharedSample = vlogStrip.locator(
        'button:not(:has(img[alt="Official sample"]))',
      );
      await expect(vlogSharedSample).toHaveCount(13);
      await vlogSharedSample.first().click();
      const rawLog = vlogDialog.locator('.before-mode input[type="checkbox"]');
      await expect(rawLog).toBeVisible();
      const displayBefore = await vlogDialog
        .locator(".wipe-clip img")
        .getAttribute("src");
      await rawLog.check();
      await expect
        .poll(() => vlogDialog.locator(".wipe-clip img").getAttribute("src"))
        .not.toBe(displayBefore);
      await expect(vlogDialog.locator(".wipe-clip img")).toHaveAttribute(
        "src",
        /-log\.webp/,
      );
      await page.getByRole("button", { name: "Close", exact: true }).click();

      await page.getByRole("button", { name: "LUT List", exact: true }).click();
      const s9List = page.locator(".s9-list");
      await expect(s9List).toBeVisible();
      await expectInsideViewport(page, s9List);
      await expect
        .poll(() => page.locator(`[data-s9-key="${firstCode}"] .s9-handle`).count())
        .toBe(1);

      await dragToSlot(
        page,
        page.locator(`[data-s9-key="${firstCode}"] .s9-handle`),
        1,
        viewport.touch,
      );
      await expect
        .poll(async () => (await readPlan(page))?.slots[1] ?? null)
        .toBe(firstCode);

      await dragToSlot(
        page,
        page.locator(`[data-s9-key="${secondCode}"] .s9-handle`),
        2,
        viewport.touch,
      );
      await expect
        .poll(async () => {
          const plan = await readPlan(page);
          return [plan?.slots[1], plan?.slots[2]];
        })
        .toEqual([firstCode, secondCode]);

      await dragToSlot(
        page,
        page.locator(`[data-s9-key="slot-1"] .s9-handle`),
        2,
        viewport.touch,
      );
      await expect
        .poll(async () => {
          const plan = await readPlan(page);
          return [plan?.slots[1], plan?.slots[2]];
        })
        .toEqual([secondCode, firstCode]);

      await page.locator('[data-s9-key="slot-2"] .s9-remove').click();
      await expect
        .poll(async () => (await readPlan(page))?.slots[2] ?? null)
        .toBe(null);
      await page.locator('[data-s9-key="slot-1"] .s9-remove').click();
      await expect
        .poll(async () => (await readPlan(page))?.slots[1] ?? null)
        .toBe(null);

      await page.getByRole("button", { name: "Your LUTs", exact: true }).click();
      const upload = page.locator('input[type="file"]');
      await expect(upload).toBeEnabled();
      await expectInsideViewport(page, page.locator(".upload-panel"));
      await expectInsideViewport(page, upload);
      await upload.setInputFiles({
        name: "Responsive inverse.cube",
        mimeType: "text/plain",
        buffer: Buffer.from(
          'TITLE "Responsive inverse"\nLUT_3D_SIZE 2\n' + cubeRows(true),
        ),
      });
      const save = page.getByRole("button", { name: "Save LUT" });
      await expect(save).toBeDisabled();
      await page.getByRole("combobox", { name: "Input Photo Style" }).selectOption("REC709");
      await expect(save).toBeEnabled();
      await save.click();
      const own = page.locator('[data-lut-code^="upload:"]');
      await expect(own).toHaveCount(1);
      await expectImageLoaded(own.locator("img"));
      const ownCode = await own.getAttribute("data-lut-code");
      expect(ownCode).toMatch(/^upload:/);
      await own.getByRole("button", { name: "Add to LUT List" }).click();
      await expect
        .poll(async () => (await readPlan(page))?.candidates ?? [])
        .toContain(ownCode);
      await page.reload();
      await page.getByRole("button", { name: "Your LUTs", exact: true }).click();
      await expect(page.locator(`[data-lut-code="${ownCode}"]`)).toHaveCount(1);
      await expect
        .poll(async () => (await readPlan(page))?.candidates ?? [])
        .toContain(ownCode);
      await expectNoPageOverflow(page);
      await expectInsideViewport(page, page.locator(".upload-panel"));

      expect(errors).toEqual([]);
      expect(badResponses).toEqual([]);
    });
  });
}
