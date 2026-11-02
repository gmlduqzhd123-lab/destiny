// ☀️ 24절기 태양 여행 시뮬레이터
const { test, expect } = require('@playwright/test');
const { open } = require('./helpers.cjs');

test('첫 화면에서 열고, 날짜를 옮기면 절기·낮 길이가 바뀐다', async ({ page }) => {
    const errors = await open(page);
    await page.click('#teaser [data-open-sim]');
    await expect(page.locator('#simView')).toBeVisible();
    await expect(page.locator('#simSvg circle')).not.toHaveCount(0);
    await page.locator('#simRange').fill('171'); // 6월 하순 (하지 무렵)
    await expect(page.locator('#simInfo')).toContainText('하지');
    const summer = await page.locator('#simInfo').innerText();
    expect(summer).toMatch(/14시간/);
    await page.locator('#simRange').fill('354'); // 12월 하순 (동지 무렵)
    await expect(page.locator('#simInfo')).toContainText('동지');
    await expect(page.locator('#simInfo')).toContainText('9시간');
    await page.click('#simPlay');
    await expect(page.locator('#simPlay')).toContainText('멈추기');
    await page.keyboard.press('Escape');
    await expect(page.locator('#simView')).toBeHidden();
    expect(errors).toEqual([]);
});
