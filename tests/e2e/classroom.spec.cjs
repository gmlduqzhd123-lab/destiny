// 🏫 우리 반 도구: 명렬표 → 모둠 편성 → 기질 분포 → 생일 카드 → 리포트 인쇄
const { test, expect } = require('@playwright/test');
const { open, submitUser } = require('./helpers.cjs');

async function openClass(page) {
    await page.click('#modeSwitch [data-mode=teacher]');
    await page.click('#classEntry [data-open-class]');
    await expect(page.locator('#classView')).toBeVisible();
}

async function stubPrint(page) {
    await page.evaluate(() => { window.__printed = []; window.print = () => window.__printed.push(document.getElementById('printArea').innerText); });
}

test('명렬표 불러오기와 오류 줄 안내, 기본은 저장하지 않음', async ({ page }) => {
    const errors = await open(page);
    await expect(page.locator('#classEntry')).toBeHidden(); // 학생용에서는 보이지 않음
    await openClass(page);
    await page.fill('#rosterInput', '1 김하늘 2015.03.04 여 ENFP\n2 이바다 2015-07-21 남 ISTJ\n3 틀린날짜 2015.02.30 여\n4 문태양 음 2015.1.15 남');
    await page.click('#btnRosterLoad');
    await expect(page.locator('#rosterSummary')).toContainText('3명 불러옴');
    await expect(page.locator('#rosterErrors li')).toHaveCount(1);
    await expect(page.locator('.roster-table tbody tr')).toHaveCount(3);
    await expect(page.locator('.roster-table')).toContainText('문태양');
    expect(await page.evaluate(() => localStorage.getItem('starcompass_roster_v1'))).toBeNull();

    await page.check('#rosterSave');
    expect(await page.evaluate(() => localStorage.getItem('starcompass_roster_v1'))).toContain('김하늘');
    expect(errors).toEqual([]);
});

test('모둠 편성: 조건을 지키고 다시 섞기·인쇄가 된다', async ({ page }) => {
    const errors = await open(page);
    await openClass(page);
    await page.click('#btnRosterSample');
    await page.click('[data-ctab=groups]');
    await page.fill('#grpApart', '김하늘, 이바다');
    await page.click('#btnMakeGroups');
    await expect(page.locator('.group-card')).toHaveCount(2); // 8명 ÷ 4
    const groupOf = async name => page.locator('.group-card').evaluateAll((cards, n) => cards.findIndex(c => c.innerText.includes(n)), name);
    expect(await groupOf('김하늘')).not.toBe(await groupOf('이바다'));
    await expect(page.locator('#groupNote')).toBeEmpty();
    const first = await page.locator('#groupOut').innerText();
    await page.click('#btnShuffleGroups');
    await expect.poll(() => page.locator('#groupOut').innerText()).not.toBe(first);

    await stubPrint(page);
    await page.click('#btnPrintGroups');
    await expect.poll(() => page.evaluate(() => window.__printed.length)).toBe(1);
    expect(await page.evaluate(() => window.__printed[0])).toContain('모둠 편성표');
    expect(errors).toEqual([]);
});

test('기질 분포 보드: 학생 수 합계, 이름은 기본으로 숨김', async ({ page }) => {
    await open(page);
    await openClass(page);
    await page.click('#btnRosterSample');
    await page.click('[data-ctab=board]');
    await expect(page.locator('.board-hero h3')).toContainText('반');
    const total = await page.locator('.board-tile .n').evaluateAll(ns => ns.reduce((a, n) => a + parseInt(n.textContent, 10), 0));
    expect(total).toBe(8);
    await expect(page.locator('#boardOut')).not.toContainText('김하늘');
    await page.check('#boardShowNames');
    await expect(page.locator('#boardOut')).toContainText('김하늘');
});

test('생일 카드 만들기와 학생 리포트 인쇄', async ({ page }) => {
    const errors = await open(page);
    await openClass(page);
    // 오늘 생일인 학생을 넣어 맨 위에 오는지 확인
    const today = await page.evaluate(() => { const d = new Date(); return `2015.${d.getMonth() + 1}.${Math.min(d.getDate(), 28)}`; });
    await page.fill('#rosterInput', `1 생일친구 ${today} 여 ENFP\n2 이바다 2015.07.21 남 ISTJ`);
    await page.click('#btnRosterLoad');
    await page.click('[data-ctab=birthday]');
    await page.selectOption('#bdayRange', '366');
    await expect(page.locator('#bdayList li').first()).toContainText('생일친구');
    await page.locator('#bdayList [data-bday]').first().click();
    await expect(page.locator('#bdayCardWrap')).toBeVisible();
    const w = await page.locator('#bdayCanvas').evaluate(c => c.width);
    expect(w).toBe(1080);

    await page.click('[data-ctab=report]');
    await expect(page.locator('#reportPreview')).toContainText('학생 이해');
    await stubPrint(page);
    await page.click('#btnReportAll');
    await expect.poll(() => page.evaluate(() => window.__printed.length)).toBe(1);
    const printed = await page.evaluate(() => window.__printed[0]);
    expect(printed).toContain('생일친구');
    expect(printed).toContain('이바다');
    expect(printed).toContain('단정 짓거나');
    expect(errors).toEqual([]);
});

test('결과 화면(선생님용)에서 지금 학생의 리포트를 인쇄', async ({ page }) => {
    await open(page);
    await page.click('#modeSwitch [data-mode=teacher]');
    await submitUser(page, { name: '리포트학생' });
    await page.click('[data-tab=saju]');
    await stubPrint(page);
    await page.click('#btnReportCurrent');
    await expect.poll(() => page.evaluate(() => window.__printed.length)).toBe(1);
    expect(await page.evaluate(() => window.__printed[0])).toContain('리포트학생');
});

test('공용 기기 모드에서는 우리 반 도구 입구가 숨겨진다', async ({ page }) => {
    await open(page);
    await page.evaluate(() => localStorage.setItem('starcompass_kiosk', '1'));
    await page.reload();
    await page.click('#modeSwitch [data-mode=teacher]');
    await expect(page.locator('#classEntry')).toBeHidden();
});

test('학생: 오늘이 생일이면 축하 배너와 내 생일 카드', async ({ page }) => {
    await open(page);
    const today = await page.evaluate(() => { const d = new Date(); return `2015.${d.getMonth() + 1}.${d.getDate()}`; });
    await submitUser(page, { name: '오늘생일', birth: today });
    await expect(page.locator('#selfBday')).toBeVisible();
    await page.click('#btnSelfBday');
    await expect(page.locator('#bdayModal')).toBeVisible();
    await page.click('#btnSelfBdayClose');
    await expect(page.locator('#bdayModal')).toBeHidden();
});

test('학생: 생일이 아니면 배너가 없다', async ({ page }) => {
    await open(page);
    const notToday = await page.evaluate(() => { const d = new Date(Date.now() + 40 * 864e5); return `2015.${d.getMonth() + 1}.${Math.min(d.getDate(), 28)}`; });
    await submitUser(page, { name: '다른날', birth: notToday });
    await expect(page.locator('#selfBday')).toBeHidden();
});
