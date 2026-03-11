import { expect, test } from "@playwright/test";
import { promises as fs } from "node:fs";

test("core workflow: register, login, project, search, lead detail, exports", async ({
  page,
}, testInfo) => {
  const runId = Date.now();
  const email = `e2e.${runId}@example.com`;
  const password = "Start1234!";
  const projectName = `E2E Projekt ${runId}`;

  await test.step("register", async () => {
    await page.goto("/register");
    await page.getByLabel("Name (optional)", { exact: true }).fill("E2E Smoke");
    await page.getByLabel("E-Mail", { exact: true }).fill(email);
    await page.getByLabel(/Passwort/).fill(password);
    await page.getByRole("button", { name: /Konto erstellen/i }).click();
    await expect(page).toHaveURL(/\/login\?registered=1$/);
  });

  await test.step("login", async () => {
    await page.getByLabel("E-Mail", { exact: true }).fill(email);
    await page.getByLabel("Passwort", { exact: true }).fill(password);
    await page.getByRole("button", { name: /^Anmelden$/ }).click();
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(
      page.getByRole("heading", { name: "Lead Dashboard" })
    ).toBeVisible();
  });

  await test.step("create project", async () => {
    await page.getByRole("link", { name: "Projekte" }).click();
    await expect(page).toHaveURL("http://localhost:3000/projects");
    await page.getByRole("button", { name: /Neues Projekt/ }).click();
    await page.getByLabel("Projektname", { exact: true }).fill(projectName);
    await page.getByRole("button", { name: /^Erstellen$/ }).click();
    await expect(page.getByRole("link", { name: projectName })).toBeVisible();
  });

  await test.step("start search", async () => {
    await page.getByRole("link", { name: projectName }).click();
    await expect(page).toHaveURL(/\/projects\//);
    await page.locator('a[href^="/search?projectId="]').click();
    await expect(page).toHaveURL(/\/search\?projectId=/);

    await page
      .getByLabel("Branche / Stichwort", { exact: true })
      .fill("restaurant");
    await page.getByLabel("Ort", { exact: true }).fill("Berlin");
    await page.getByLabel("Radius (km)", { exact: true }).fill("1");
    await page.getByRole("button", { name: /Suche starten/i }).click();
    await expect(page).toHaveURL(/\/\?jobId=/);
  });

  let firstLeadName = "";

  await test.step("wait for leads and open detail", async () => {
    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 120_000 });

    const firstLeadLink = firstRow.locator("a").first();
    firstLeadName = ((await firstLeadLink.textContent()) ?? "").trim();
    expect(firstLeadName).not.toBe("");

    await firstLeadLink.click();
    await expect(page).toHaveURL(/\/leads\//);
    await expect(
      page.getByRole("heading", { name: firstLeadName })
    ).toBeVisible();
  });

  await test.step("update lead status and filter dashboard", async () => {
    await page.getByRole("button", { name: /Als kontaktiert markieren/i }).click();
    await page.waitForFunction(() => {
      const select = document.querySelector("select");
      return !!select && select.value === "CONTACTED";
    });

    await page.getByRole("link", { name: /Zum Suchlauf/i }).click();
    await expect(page).toHaveURL(/\/\?jobId=/);
    await page.getByRole("button", { name: /^Kontaktiert$/ }).click();
    await expect(page).toHaveURL(/status=CONTACTED/);
    await expect(page.locator("table tbody tr").first()).toBeVisible();
  });

  await test.step("export csv and xlsx", async () => {
    const [csvDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: /^CSV$/ }).click(),
    ]);
    const csvPath = testInfo.outputPath("leads.csv");
    await csvDownload.saveAs(csvPath);
    const csvStats = await fs.stat(csvPath);
    expect(csvStats.size).toBeGreaterThan(0);

    const [xlsxDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: /^XLSX$/ }).click(),
    ]);
    const xlsxPath = testInfo.outputPath("leads.xlsx");
    await xlsxDownload.saveAs(xlsxPath);
    const xlsxStats = await fs.stat(xlsxPath);
    expect(xlsxStats.size).toBeGreaterThan(0);
  });
});
