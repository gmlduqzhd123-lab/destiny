// 공용 기기(교실 태블릿) 모드: 정보가 기기에 남지 않고, 다음 사람이 앞 사람 정보를 볼 수 없어야 합니다.
const { test, expect } = require('@playwright/test');
const { open, submitUser } = require('./helpers.cjs');

const storageDump = page => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))));

test('켜면 기억된 정보를 지우고, 결과를 봐도 이름·생일이 저장되지 않는다', async ({ page }) => {
    const errors = await open(page);
    await submitUser(page, { name: '앞친구', birth: '2014.03.03' });
    expect(await storageDump(page)).toContain('앞친구');

    await page.click('#btnReset');
    const dialogs = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
    await page.click('[data-kiosk-on]');
    await expect.poll(() => dialogs.length).toBe(2); // 켜기 확인 + 남은 일기 지우기 확인
    expect(dialogs[1]).toContain('1명분');
    await expect(page.locator('#kioskBar')).toBeVisible();
    await expect(page.locator('#rememberMe')).not.toBeVisible();
    expect(await storageDump(page)).not.toContain('앞친구');

    await submitUser(page, { name: '공용친구', birth: '2015.06.06' });
    await page.click('#omiCup');
    await expect(page.locator('#omiResult')).toBeVisible();
    await expect(page.locator('.tabbar button[data-tab=journal]')).toBeHidden();
    const dump = await storageDump(page);
    expect(dump).not.toContain('공용친구');
    expect(dump).not.toContain('20150606');

    await page.click('#btnNextPerson');
    await expect(page.locator('#inputView')).toBeVisible();
    await expect(page.locator('#userName')).toHaveValue('');
    await expect(page.locator('#birthDate')).toHaveValue('');
    await expect(page.locator('#mbti')).toHaveValue('');

    // 새로 고침해도 공용 모드는 유지되고 앞 사람 인사 카드는 뜨지 않는다
    await page.reload();
    await expect(page.locator('#kioskBar')).toBeVisible();
    await expect(page.locator('#welcomeCard')).toBeHidden();
    expect(errors).toEqual([]);
});

test('3분 동안 쓰지 않으면 처음 화면으로 돌아간다', async ({ page }) => {
    await page.clock.install();
    await open(page);
    await page.evaluate(() => localStorage.setItem('starcompass_kiosk', '1'));
    await page.reload();
    await submitUser(page, { name: '잠깐친구' });
    await page.clock.runFor(3 * 60 * 1000 + 15000);
    await expect(page.locator('#inputView')).toBeVisible();
    await expect(page.locator('#userName')).toHaveValue('');
});

test('해제 버튼은 짧게 누르면 꺼지지 않고, 2초 꾹 누르면 확인 후 꺼진다', async ({ page }) => {
    await page.clock.install();
    await open(page);
    await page.evaluate(() => localStorage.setItem('starcompass_kiosk', '1'));
    await page.reload();
    await page.click('#btnKioskOff');
    await expect(page.locator('#kioskBar')).toBeVisible();

    page.once('dialog', d => d.accept());
    await page.locator('#btnKioskOff').dispatchEvent('pointerdown');
    await page.clock.runFor(2100);
    await expect(page.locator('#kioskBar')).toBeHidden();
    await expect(page.locator('#rememberMe')).toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('starcompass_kiosk'))).toBeNull();
});
