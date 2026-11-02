// 기존 핵심 흐름: 입력 → 결과 → 탭 → 케미 → 상징 카드 → 일기
const { test, expect } = require('@playwright/test');
const { open, submitUser } = require('./helpers.cjs');

test('학생용: 입력부터 다섯 탭까지 오류 없이 동작', async ({ page }) => {
    const errors = await open(page);
    await expect(page.locator('#teaserText')).not.toBeEmpty();
    await submitUser(page);
    await expect(page.locator('#whoName')).toContainText('김별빛');

    await page.click('#omiCup');
    await expect(page.locator('#omiResult')).toBeVisible();

    await page.click('[data-tab=saju]');
    await expect(page.locator('#ilganTitle')).not.toBeEmpty();
    await expect(page.locator('#pillarGrid .pillar-cell')).toHaveCount(8);

    await page.click('[data-tab=compat]');
    await page.fill('#pName', '이친구');
    await page.fill('#pBirth', '2015.09.01');
    await page.selectOption('#pGender', 'M');
    await page.click('#btnCompatSubmit');
    await expect(page.locator('#ghTotal')).toContainText('점');

    await page.click('[data-tab=tarot]');
    for (const i of [2, 9, 16]) await page.locator(`.deck-card[data-i="${i}"]`).dispatchEvent('click');
    await page.locator('.card-wrapper').first().waitFor();
    for (const w of await page.locator('.card-wrapper').all()) await w.click();
    await expect(page.locator('#tarotReading .tarot-item')).toHaveCount(4);

    await page.click('[data-tab=journal]');
    await page.click('#ratingBtns [data-rating=good]');
    await page.fill('#memoText', '<b>테스트</b>');
    await page.click('#btnMemoSave');
    await expect(page.locator('#jTotal')).toContainText('1');

    expect(errors).toEqual([]);
});

test('선생님용: 테마 전환과 코칭 카드', async ({ page }) => {
    const errors = await open(page);
    await page.click('#modeSwitch [data-mode=teacher]');
    await expect(page.locator('body')).toHaveAttribute('data-mode', 'teacher');
    await submitUser(page, { name: '김선생', birth: '1988.07.01' });
    await page.click('[data-tab=saju]');
    await expect(page.locator('#teacherCoachCard')).toBeVisible();
    await expect(page.locator('#coachList .coach-item')).toHaveCount(4);
    expect(errors).toEqual([]);
});

test('음력 생일과 잘못된 날짜 안내', async ({ page }) => {
    await open(page);
    await page.click('.seg[data-for=calType] [data-v=lunar]');
    await page.fill('#birthDate', '1990.04.21');
    await expect(page.locator('#birthPreview')).toContainText('양력 1990년 5월 15일');
    await page.check('#leapMonth');
    await expect(page.locator('#birthPreview')).toContainText('없어요');
});
