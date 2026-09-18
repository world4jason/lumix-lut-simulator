import { test, expect } from "@playwright/test";
import fs from "node:fs";
const catalog = JSON.parse(fs.readFileSync("src/data/catalog.json", "utf8"));
const trust = JSON.parse(
  fs.readFileSync("src/data/own-preview-trust.json", "utf8"),
);
for (const width of [1440, 390])
  test(`official/default/sample groups at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(r.url());
    });
    await page.goto("./");
    await expect(page).toHaveTitle("Lumix LUT Simulator");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lumix LUT Simulator");
    await expect(page.locator(".brand p")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Official LUTs", exact: true })
      .click();
    // Own must show every published official image, regardless of old trust flags.
    const expectedImages = Object.fromEntries(catalog.luts.map((lut: any) => [
      lut.code, `/lumix-lut-simulator${lut.thumb.after}`,
    ]));
    const cardImages = () => page.locator('[data-lut-code]').evaluateAll(cards =>
      Object.fromEntries(cards.map(card => [card.getAttribute('data-lut-code'),
        card.querySelector('.card-frame img')?.getAttribute('src')])));
    await expect.poll(cardImages).toEqual(expectedImages);
    await page.getByRole('button', { name: 'S9 street', exact: true }).click();
    await page.getByRole('button', { name: 'Own', exact: true }).click();
    await expect.poll(cardImages).toEqual(expectedImages);
    const trusted = catalog.luts.find((l: any) => trust[l.code]);
    await page.getByRole("searchbox").fill(trusted.code);
    const card = page.locator("[data-lut-code]").first();
    await expect(card.locator(".card-frame img")).toHaveAttribute(
      "src",
      `/lumix-lut-simulator${trusted.thumb.after}`,
    );
    await card.locator(".card-open").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator(".wipe>img")).toHaveAttribute(
      "src",
      `/lumix-lut-simulator${trusted.thumb.after}`,
    );
    await expect(dialog.locator(".wipe-clip img")).toHaveAttribute(
      "src",
      `/lumix-lut-simulator${trusted.thumb.before}`,
    );
    const previous = await dialog.locator(".wipe>img").getAttribute("src");
    for (const [name, count] of [
      ["People", 9],
      ["Street & buildings", 13],
      ["Landscape & nature", 8],
      ["Colour reference", 3],
    ] as const) {
      await dialog
        .getByRole("tab", { name: new RegExp(`^${name} ${count}$`) })
        .click();
      await expect(
        dialog.locator('.strip button:not([title="Official sample"])'),
      ).toHaveCount(count);
      await expect(dialog.locator(".wipe>img")).toHaveAttribute(
        "src",
        previous!,
      );
    }
    await dialog.getByRole("tab", { name: /^All / }).click();
    await expect(dialog.locator(".strip button")).toHaveCount(34);
    await dialog
      .getByRole("button", { name: "S9 street", exact: true })
      .click();
    await expect(dialog.locator(".wipe>img")).toHaveAttribute(
      "src",
      `/lumix-lut-simulator/sample/s9/${trusted.code}.webp`,
    );
    await dialog.getByRole("button", { name: "Official sample", exact: true }).click();
    await expect(dialog.locator(".wipe>img")).toHaveAttribute(
      "src",
      `/lumix-lut-simulator${trusted.thumb.after}`,
    );
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    const suspect = catalog.luts.find((l: any) => trust[l.code] === false);
    await page.getByRole("searchbox").fill(suspect.code);
    await expect(page.locator(".card-frame img")).toHaveAttribute(
      "src",
      `/lumix-lut-simulator${suspect.thumb.after}`,
    );
    await page.locator(".card-open").click();
    await expect(dialog.locator(".wipe>img")).toHaveAttribute(
      "src",
      `/lumix-lut-simulator${suspect.thumb.after}`,
    );
    await dialog.getByRole("tab", { name: /^All / }).click();
    await dialog.getByRole("button", { name: "Official sample", exact: true }).click();
    await expect(dialog.locator(".provenance")).toContainText("heuristic assessment");
    await expect(dialog.locator(".wipe>img")).toHaveAttribute(
      "src",
      `/lumix-lut-simulator${suspect.thumb.after}`,
    );
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    const log = catalog.luts.find((l: any) => l.photoStyle === "CNED2");
    await page.getByRole("searchbox").fill(log.code);
    await page.locator(".card-open").click();
    await dialog.getByRole("tab", { name: /^All / }).click();
    await dialog
      .getByRole("button", { name: "S9 street", exact: true })
      .click();
    await dialog.getByRole("checkbox").check();
    await expect(dialog.locator(".wipe-clip img")).toHaveAttribute(
      "src",
      "/lumix-lut-simulator/sample/_before/s9-cned2.webp",
    );
    await dialog.getByRole("checkbox").uncheck();
    await expect(dialog.locator(".wipe-clip img")).toHaveAttribute(
      "src",
      "/lumix-lut-simulator/sample/_before/s9-neutral-cned2.webp",
    );
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/groups-${width}.png` });
  });
