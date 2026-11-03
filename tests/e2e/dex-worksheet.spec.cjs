// 🌟 도감 모으기(QR 주소·친구 코드)와 ✏️ 상징 카드 활동지
const { test, expect } = require('@playwright/test');
const { open, submitUser } = require('./helpers.cjs');

test('내 캐릭터가 도감에 들어가고 QR에는 개인정보가 없다', async ({ page }) => {
    const errors = await open(page);
    await submitUser(page, { name: '도감친구', birth: '2015.05.05' });
    await page.click('[data-tab=saju]');
    await expect(page.locator('#dexProgress')).toContainText('1 / 10');
    await expect(page.locator('.dex-slot.mine')).toHaveCount(1);
    await page.click('#btnDexQr');
    await expect(page.locator('#dexQrModal')).toBeVisible();
    await expect(page.locator('#dexQrImg svg')).toHaveCount(1);
    const store = await page.evaluate(() => localStorage.getItem('starcompass_dex_v1'));
    expect(store).not.toContain('도감친구');
    expect(errors).toEqual([]);
});

test('친구 QR 주소로 들어오면 도감에 추가되고 주소에서 코드가 지워진다', async ({ page }) => {
    await open(page);
    const code = await page.evaluate(() => Dex.codeFor(8)); // 바다
    await page.goto(`/?dex=${code}`);
    await expect(page.locator('#toast')).toContainText('도감에 쏙');
    expect(new URL(page.url()).search).toBe('');
    const got = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('starcompass_dex_v1')).got));
    expect(got).toContain('8');
    // 오래된 코드는 거절
    await page.goto('/?dex=8-00');
    await expect(page.locator('#toast')).toContainText('날짜가 지났');
});

test('친구 코드 입력으로 모으고, 같은 캐릭터는 중복 안내', async ({ page }) => {
    await open(page);
    await submitUser(page, { name: '코드친구', birth: '2015.05.05' });
    await page.click('[data-tab=saju]');
    const word = await page.evaluate(() => Dex.wordCode(3)); // 촛불
    await page.click('#btnDexCode');
    await page.fill('#dexCodeInput', word);
    await page.click('#btnDexCodeOk');
    await expect(page.locator('#dexProgress')).toContainText('2 / 10');
    await page.fill('#dexCodeInput', word);
    await page.press('#dexCodeInput', 'Enter');
    await expect(page.locator('#toast')).toContainText('이미');
});

test('공용 기기 모드에서는 도감을 저장하지 않는다', async ({ page }) => {
    await open(page);
    await page.evaluate(() => localStorage.setItem('starcompass_kiosk', '1'));
    const code = await page.evaluate(() => Dex.codeFor(2));
    await page.goto(`/?dex=${code}`);
    await expect(page.locator('#toast')).toContainText('저장되지 않아요');
    expect(await page.evaluate(() => localStorage.getItem('starcompass_dex_v1'))).toBeNull();
});

async function drawAll(page, picks) {
    for (const i of picks) await page.locator(`.deck-card[data-i="${i}"]`).dispatchEvent('click');
    await page.locator('.card-wrapper').first().waitFor();
    for (const w of await page.locator('.card-wrapper').all()) await w.click();
}

test('이야기 3장을 모두 뒤집으면 이야기 짓기 활동지를 인쇄한다', async ({ page }) => {
    const errors = await open(page);
    await submitUser(page);
    await page.click('[data-tab=tarot]');
    await page.fill('#tarotQuestion', '<b>우리 반</b> 이야기');
    await page.press('#tarotQuestion', 'Tab');
    await expect(page.locator('#sheetBtnWrap')).toBeHidden();
    await drawAll(page, [1, 5, 9]);
    await expect(page.locator('#btnStorySheet')).toContainText('이야기 짓기');
    await page.evaluate(() => { window.__printed = []; window.print = () => window.__printed.push(document.getElementById('printArea').innerHTML); });
    await page.click('#btnStorySheet');
    await expect.poll(() => page.evaluate(() => window.__printed.length)).toBe(1);
    const html = await page.evaluate(() => window.__printed[0]);
    expect(html).toContain('이야기의 시작');
    expect(html).toContain('&lt;b&gt;우리 반&lt;/b&gt;'); // 주제는 이스케이프
    expect(errors).toEqual([]);
});

test('한 장·우정 스프레드는 각각 생각 씨앗·마음 편지 활동지', async ({ page }) => {
    await open(page);
    await submitUser(page);
    await page.click('[data-tab=tarot]');
    await page.click('#spreadSelect [data-spread=one]');
    await drawAll(page, [4]);
    await expect(page.locator('#btnStorySheet')).toContainText('생각 씨앗');
    await page.click('#spreadSelect [data-spread=love]');
    await expect(page.locator('#sheetBtnWrap')).toBeHidden();
    await drawAll(page, [2, 7, 12]);
    await expect(page.locator('#btnStorySheet')).toContainText('마음 편지');
});
