import { test, expect } from "@playwright/test";
const key = "lumix-s9:plan:v1";
test("production subpath: official search, all samples, S9 drag/persistence, local upload", async ({
  page,
}) => {
  const errors: string[] = [];
  const badRequests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) badRequests.push(`${r.status()} ${r.url()}`);
  });
  page.on("request", (r) => {
    if (r.method() !== "GET" || /\/(?:lut|__s9)\//.test(r.url()))
      badRequests.push(r.method() + " " + r.url());
  });
  await page.goto("./");
  await expect(
    page.getByText("Saved in this browser for planning only. No camera is connected."),
  ).toBeVisible();
  await page.locator("main > .frame-bar").getByRole("tab", {name: /^All /}).click();
  await expect(page.locator("main > .frame-bar .strip button")).toHaveCount(34);
  await page.getByRole("button", { name: "Official LUTs", exact: true }).click();
  await expect(page.locator("[data-lut-code]")).toHaveCount(199);
  await page.getByRole("searchbox").fill("Connor Clapton");
  await expect(page.locator("[data-lut-code]").first()).toBeVisible();
  const card = page.locator("[data-lut-code]").first();
  const code = await card.getAttribute("data-lut-code");
  await card.getByRole("button", { name: "Add to LUT List" }).click();
  await card.locator(".card-open").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("tab", {name: /^All /}).click();
  const sampleButtons = page.locator('dialog .strip button:not([title="Official sample"])');
  for (let i = 0; i < 33; i++) {
    await sampleButtons.nth(i).click();
    await expect
      .poll(() =>
        page
          .locator("dialog .wipe>img")
          .evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
      )
      .toBe(true);
  }
  await page.getByRole("slider").fill("0.25");
  await expect(page.locator(".wipe-clip")).toHaveAttribute("style", /25%/);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "LUT List", exact: true }).click();
  const row = page
    .locator(".s9-row")
    .filter({ has: page.locator(`[data-s9-key="${code}"]`) });
  void row;
  const handle = page.locator(`[data-s9-key="${code}"] .s9-handle`);
  await handle.scrollIntoViewIfNeeded();
  const h = (await handle.boundingBox())!;
  const list = (await page.locator(".s9-list").boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(list.x + list.width / 2, list.y + 12, { steps: 10 });
  await page.waitForFunction(
    () => document.querySelector(".s9-list")!.scrollTop === 0,
  );
  const slot = (await page.locator('[data-s9-key="slot-1"]').boundingBox())!;
  await page.mouse.move(slot.x + slot.width / 2, slot.y + slot.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).slots[1], key),
    )
    .toBe(code);
  await page.reload();
  await expect(page.locator('[data-s9-key="slot-1"]')).toContainText(
    "Connor Clapton",
  );
  await page.locator('[data-s9-key="slot-1"] .s9-remove').click();
  await expect
    .poll(() =>
      page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).slots[1], key),
    )
    .toBe(null);
  await page.getByRole("button", { name: "Your LUTs", exact: true }).click();
  const rows = [];
  for (let b = 0; b < 2; b++)
    for (let g = 0; g < 2; g++)
      for (let r = 0; r < 2; r++) rows.push(`${1 - r} ${1 - g} ${1 - b}`);
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "My inverse.cube",
      mimeType: "text/plain",
      buffer: Buffer.from(
        'TITLE "My inverse"\nLUT_3D_SIZE 2\n' + rows.join("\n"),
      ),
    });
  await expect(
    page.getByRole("button", { name: "Save LUT" }),
  ).toBeDisabled();
  await page
    .getByRole("combobox", { name: "Input Photo Style" })
    .selectOption("REC709");
  await page.getByRole("button", { name: "Save LUT" }).click();
  const own = page.locator('[data-lut-code^="upload:"]');
  await expect(own).toHaveCount(1);
  await expect
    .poll(() =>
      own
        .locator("img")
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBe(true);
  await own.getByRole("button", { name: "Add to LUT List" }).click();
  await own.locator(".card-open").click();
  await expect
    .poll(() => page.locator("dialog .wipe>img").getAttribute("src"))
    .toMatch(/^data:image\/webp/);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Your LUTs", exact: true }).click();
  await expect(page.locator('[data-lut-code^="upload:"]')).toHaveCount(1);
  await page.getByRole("button", { name: "LUT List", exact: true }).click();
  await expect(page.locator(".s9-list")).toContainText("My inverse");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile.png" });
  expect(errors).toEqual([]);
  expect(badRequests).toEqual([]);
});

test('mobile detail and unsupported upload input remain explicit',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('./');
 await page.getByRole('button',{name:'Your LUTs',exact:true}).click();
 await page.locator('input[type=file]').setInputFiles({name:'bad.cube',mimeType:'text/plain',buffer:Buffer.from('LUT_3D_SIZE 2\n0 0 0')});
 await expect(page.getByText(/found 1 row/)).toBeVisible();
 const rows=[];for(let b=0;b<2;b++)for(let g=0;g<2;g++)for(let r=0;r<2;r++)rows.push(`${r} ${g} ${b}`);
 await page.locator('input[type=file]').setInputFiles({name:'Standard.cube',mimeType:'text/plain',buffer:Buffer.from('#LUMIXPHOTOSTYLE STD\nLUT_3D_SIZE 2\n'+rows.join('\n'))});
 await expect(page.getByRole('combobox')).toHaveValue('STD');
 await page.getByRole('button',{name:'Save LUT'}).click();
 await page.locator('.card-open').click();
 await expect(page.getByRole('dialog').getByRole('alert')).toContainText('preview is not supported for this LUT');
 await expect(page.getByRole('dialog').locator('.wipe')).toHaveCount(0);
 expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'Official LUTs',exact:true}).click();await page.locator('.card-open').first().click();
 await expect.poll(()=>page.locator('dialog .wipe>img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.screenshot({path:'test-results/mobile-detail.png'});
});
