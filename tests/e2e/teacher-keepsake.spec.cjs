// 🎴 별빛 도감 카드(Canvas)와 🏫 선생님용 화면의 세부 동작
const { test, expect } = require('@playwright/test');
const { open, submitUser } = require('./helpers.cjs');

/** 캔버스에서 서로 다른 색이 몇 가지인지 대략 셉니다 (빈 캔버스면 1). */
const canvasColors = page => page.evaluate(() => {
    const c = document.getElementById('keepsakeCanvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const set = new Set();
    for (let i = 0; i < d.length; i += 4 * 97) set.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
    return { colors: set.size, w: c.width, h: c.height, sum: d.reduce((s, v, i) => (i % 4029 === 0 ? s + v : s), 0) };
});

test('도감 카드가 그려지고, 도장을 찍고 지울 수 있고, 이미지로 저장된다', async ({ page }) => {
    const errors = await open(page);
    await submitUser(page);
    await page.locator('#keepsakeCanvas').scrollIntoViewIfNeeded();
    await expect.poll(async () => (await canvasColors(page)).colors).toBeGreaterThan(5);
    const before = await canvasColors(page);
    expect(before.w).toBeGreaterThan(300);

    await page.click('#sealPalette [data-seal="友"]');
    await expect(page.locator('#toast')).toContainText('도장을 찍어');
    const box = await page.locator('#keepsakeCanvas').boundingBox();
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3);
    await expect.poll(async () => (await canvasColors(page)).sum).not.toBe(before.sum);
    await page.click('#btnClearSeals');
    await expect.poll(async () => (await canvasColors(page)).sum).toBe(before.sum);

    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveCard')]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const ch of stream) chunks.push(ch);
    const png = Buffer.concat(chunks);
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.length).toBeGreaterThan(10000);
    expect(errors).toEqual([]);
});

test('점괘를 뽑으면 도감 카드 제목에 점괘가 들어간다', async ({ page }) => {
    await open(page);
    await submitUser(page);
    await expect.poll(async () => (await canvasColors(page)).colors).toBeGreaterThan(5);
    const before = (await canvasColors(page)).sum;
    await page.click('#omiCup');
    await expect(page.locator('#omiResult')).toBeVisible();
    await expect.poll(async () => (await canvasColors(page)).sum).not.toBe(before);
});

test('선생님용: 모드는 다시 열어도 유지되고, 풀이 어조·수업 자료·코칭 복사가 동작한다', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const errors = await open(page);
    await page.click('#modeSwitch [data-mode=teacher]');
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-mode', 'teacher');
    await expect(page.locator('#brandSeal')).toHaveText('師');
    await submitUser(page, { name: '김선생', birth: '1988.07.01' });
    await expect(page.locator('#whoName')).toHaveText('김선생 님');
    await expect(page.locator('#tabLabelSaju')).toHaveText('기질·코칭');

    const gentle = await page.locator('#todayText').textContent();
    await page.click('#toneToggle [data-tone=direct]');
    await expect(page.locator('#toneToggle [data-tone=direct]')).toHaveClass(/on/);
    expect(await page.locator('#todayText').textContent()).not.toBe(gentle);

    await page.click('[data-tab=saju]');
    await expect(page.locator('#pillarGrid .pillar-cap').nth(1)).toHaveText('일주(日)');
    for (const t of ['gapja', 'solar', 'lunar']) {
        await page.click(`#eduTabs [data-edu=${t}]`);
        await expect(page.locator(`#eduTabs [data-edu=${t}]`)).toHaveClass(/on/);
        await expect(page.locator('#eduBody h4')).not.toBeEmpty();
    }
    await page.locator('#coachList .coach-item').first().click();
    await expect(page.locator('#toast')).toContainText('코칭·행발 문구가 복사');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied.length).toBeGreaterThan(10);

    // 학생용으로 돌아가면 같은 사람의 화면이 학생 말투로 바뀝니다.
    await page.click('#modeSwitch [data-mode=student]');
    await expect(page.locator('#whoName')).toHaveText('김선생 학생');
    await expect(page.locator('#pillarGrid .pillar-cap').nth(1)).toHaveText('나(태어난 날)');
    await expect(page.locator('#teacherCoachCard')).toBeHidden();
    expect(errors).toEqual([]);
});

test('선생님용: 태어난 시간·지역을 넣으면 8글자와 진태양시 보정 안내가 나온다', async ({ page }) => {
    await open(page);
    await page.click('#modeSwitch [data-mode=teacher]');
    await page.fill('#userName', '김선생');
    await page.fill('#birthDate', '1988.07.01');
    await page.locator('#timeMore summary').click();
    await page.fill('#birthTime', '08:30');
    await page.selectOption('#birthPlace', 'busan');
    await expect(page.locator('#timePreview')).toContainText('진태양시');
    await expect(page.locator('#timePreview')).toContainText('서머타임'); // 1988년 서머타임
    await page.click('.seg[data-for=gender] [data-v=F]');
    for (const L of 'INFJ') await page.click(`#mbtiPick [data-v=${L}]`);
    await page.click('#btnSubmit');
    await page.click('[data-tab=saju]');
    await expect(page.locator('#sajuSub')).toHaveText('8글자');
    await expect(page.locator('#sajuNote')).toContainText('진태양시');
    await expect(page.locator('#pillarGrid .pillar-cell.empty')).toHaveCount(0);
});
