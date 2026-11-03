// 🌐 다국어 화면과 🔊 읽어 주기
const { test, expect } = require('@playwright/test');
const { open, submitUser } = require('./helpers.cjs');

test('언어를 바꾸면 화면과 결과 요약이 바뀌고, 한국어로 돌아오면 원래대로', async ({ page }) => {
    const errors = await open(page);
    const koSubmit = await page.locator('#btnSubmit').innerText();
    await page.selectOption('#langSelect', 'en');
    await expect(page.locator('#btnSubmit')).toHaveText('Open my Star Compass');
    await expect(page.locator('#userName')).toHaveAttribute('placeholder', /nickname/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    // 모든 번역 선택자가 실제 화면 요소를 찾는지
    const missing = await page.evaluate(() => I18nData.ui.filter(([sel]) => !document.querySelector(sel)).map(x => x[0]));
    expect(missing).toEqual([]);

    await submitUser(page);
    await expect(page.locator('#i18nCard')).toBeVisible();
    await expect(page.locator('#i18nCardTitle')).toContainText('Summary in English');
    await expect(page.locator('#i18nBody')).toContainText('Tap the star box');
    await page.click('#omiCup');
    await expect(page.locator('#i18nBody')).not.toContainText('Tap the star box');
    await expect(page.locator('#tabLabelSaju')).toHaveText('Nature');

    await page.selectOption('#langSelect', 'vi');
    await expect(page.locator('#i18nCardTitle')).toContainText('Tóm tắt');

    // 선생님용 전환 후 한국어로 돌아오면 선생님용 한국어 글자로
    await page.click('#modeSwitch [data-mode=teacher]');
    await expect(page.locator('#tabLabelSaju')).toHaveText('Tính cách');
    await page.selectOption('#langSelect', 'ko');
    await expect(page.locator('#tabLabelSaju')).toHaveText('기질·코칭');
    await expect(page.locator('#i18nCard')).toBeHidden();
    await page.click('#modeSwitch [data-mode=student]');
    await page.click('#btnReset');
    await expect(page.locator('#btnSubmit')).toHaveText(koSubmit);
    expect(errors).toEqual([]);
});

test('선택한 언어는 다음 방문에도 유지된다', async ({ page }) => {
    await open(page);
    await page.selectOption('#langSelect', 'zh');
    await page.reload();
    await expect(page.locator('#langSelect')).toHaveValue('zh');
    await expect(page.locator('#btnSubmit')).toHaveText('打开我的星光罗盘');
});

test('읽어 주기: 카드 글자를 문장마다 알맞은 목소리로 읽고, 다시 누르면 멈춘다', async ({ page }) => {
    await page.addInitScript(() => {
        window.__spoken = [];
        window.speechSynthesis.speak = u => window.__spoken.push({ text: u.text, lang: u.lang });
        window.speechSynthesis.cancel = () => { window.__cancelled = (window.__cancelled || 0) + 1; };
    });
    await open(page);
    await page.selectOption('#langSelect', 'en');
    await submitUser(page);
    const btn = page.locator('#i18nCard .tts-btn');
    await btn.click();
    await expect(btn).toHaveClass(/on/);
    const spoken = await page.evaluate(() => window.__spoken);
    expect(spoken.length).toBeGreaterThan(2);
    expect(spoken.some(s => s.lang === 'en-US')).toBe(true);
    expect(spoken[0].text).toBe('Summary in English'); // 이모지·버튼 글자는 읽지 않음
    expect(spoken.every(s => !/🔊|🌐|✨/.test(s.text))).toBe(true);
    await btn.click();
    await expect(btn).not.toHaveClass(/on/);

    await page.locator('[data-panel=today] .card[data-read] .tts-btn').nth(2).click();
    const ko = await page.evaluate(() => window.__spoken.filter(s => s.lang === 'ko-KR').length);
    expect(ko).toBeGreaterThan(0);
});
