// 📷 앱 안 QR 찍기(가짜 카메라)와 💾 기록 내보내기·불러오기
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { open, submitUser } = require('./helpers.cjs');

/** 화면에 그린 QR을 카메라처럼 흘려보내는 가짜 카메라 */
async function fakeCamera(page, text) {
    await page.evaluate(async t => {
        const qr = qrcode(0, 'M');
        qr.addData(t);
        qr.make();
        const img = new Image();
        img.src = qr.createDataURL(8, 4);
        await img.decode();
        const c = document.createElement('canvas');
        c.width = c.height = 480;
        const ctx = c.getContext('2d');
        const draw = () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 480, 480); ctx.drawImage(img, 60, 60, 360, 360); };
        draw();
        setInterval(draw, 100);
        window.__camStopped = 0;
        navigator.mediaDevices.getUserMedia = async () => {
            const s = c.captureStream(10);
            s.getTracks().forEach(tr => { const stop = tr.stop.bind(tr); tr.stop = () => { window.__camStopped++; stop(); }; });
            return s;
        };
    }, text);
}

test('앱 안 카메라로 친구 도감 QR을 찍으면 도감에 들어가고 카메라가 꺼진다', async ({ page }) => {
    const errors = await open(page);
    await submitUser(page, { name: '찍는친구', birth: '2015.05.05' });
    await page.click('[data-tab=saju]');
    const code = await page.evaluate(() => Dex.codeFor(8));
    await fakeCamera(page, `https://gmlduqzhd123-lab.github.io/destiny/?dex=${code}`);
    await page.click('#btnDexScan');
    await expect(page.locator('#scanModal')).toBeVisible();
    await expect(page.locator('#toast')).toContainText('도감에 쏙', { timeout: 10000 });
    await expect(page.locator('#scanModal')).toBeHidden();
    await expect(page.locator('#dexProgress')).toContainText('2 / 10');
    expect(await page.evaluate(() => window.__camStopped)).toBeGreaterThan(0);
    expect(errors).toEqual([]);
});

test('도감 QR이 아닌 것을 찍으면 안내하고, 카메라가 없으면 코드 입력으로 안내', async ({ page }) => {
    await open(page);
    await submitUser(page, { name: '찍는친구', birth: '2015.05.05' });
    await page.click('[data-tab=saju]');
    await fakeCamera(page, 'https://example.com/other');
    await page.click('#btnDexScan');
    await expect(page.locator('#toast')).toContainText('도감 QR이 아니거나', { timeout: 10000 });
    await expect(page.locator('#dexProgress')).toContainText('1 / 10');

    await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { const e = new Error('no'); e.name = 'NotAllowedError'; throw e; }; });
    await page.click('#btnDexScan');
    await expect(page.locator('#toast')).toContainText('카메라 사용이 허용되지 않았어요');
    await expect(page.locator('#scanModal')).toBeHidden();
    await expect(page.locator('#dexCodeRow')).toBeVisible();
});

test('기록을 파일로 내보내 새 기기에서 불러오면 일기·도감이 합쳐진다', async ({ page, browser }) => {
    const errors = await open(page);
    await submitUser(page, { name: '옮기는친구', birth: '2015.05.05' });
    await page.click('[data-tab=journal]');
    await page.click('#ratingBtns [data-rating=good]');
    await page.fill('#memoText', '새 기기로 옮겨요');
    await page.click('#btnMemoSave');
    await page.locator('.tab-panel[data-panel=journal] [data-backup]').click();
    await expect(page.locator('#backupNow')).toContainText('마음 일기 1일');
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btnBackupExport')]);
    expect(download.suggestedFilename()).toMatch(/^starcompass-backup-\d{8}\.json$/);
    const file = await download.path();
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(json.app).toBe('starcompass');
    expect(Object.keys(json.data)).not.toContain('starcompass_kiosk');
    expect(errors).toEqual([]);

    // 새 기기(빈 저장소)에서 불러오기
    const ctx = await browser.newContext({ ...test.info().project.use, serviceWorkers: 'block' });
    const p2 = await ctx.newPage();
    await open(p2);
    const dialogs = [];
    p2.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
    await p2.locator('footer [data-backup]').click();
    await expect(p2.locator('#backupNow')).toContainText('아직 저장된 기록이 없어요');
    await p2.setInputFiles('#backupFile', file);
    await expect(p2.locator('#backupResult')).toContainText('새 일기 1일');
    expect(dialogs[0]).toContain('이름 옮기는친구');
    await p2.waitForEvent('load');
    await expect(p2.locator('#welcomeName')).toHaveText('옮기는친구'); // 기억한 사용자 복원
    await p2.click('#btnQuick');
    await expect(p2.locator('#resultView')).toBeVisible();
    await p2.click('[data-tab=journal]');
    await expect(p2.locator('#jTotal')).toContainText('1');
    const dex = await p2.evaluate(() => JSON.parse(localStorage.getItem('starcompass_dex_v1')));
    expect(Object.keys(dex.got).length).toBeGreaterThan(0);
    await ctx.close();
});

test('앱 파일이 아니면 불러오지 않고, 공용 기기 모드에서는 쓸 수 없다', async ({ page }) => {
    await open(page);
    await page.locator('footer [data-backup]').click();
    // 한글이 든 경로는 일부 브라우저 환경에서 파일을 못 읽으므로 영문 임시 경로를 씁니다.
    const bad = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sc-')), 'bad.json');
    fs.writeFileSync(bad, JSON.stringify({ hello: 'world' }));
    await page.setInputFiles('#backupFile', bad);
    await expect(page.locator('#backupResult')).toContainText('백업 파일이 아니에요');
    await page.click('#backupClose');
    page.on('dialog', d => d.accept());
    await page.locator('.kiosk-link [data-kiosk-on]').click();
    await expect(page.locator('body')).toHaveClass(/kiosk/);
    await expect(page.locator('footer [data-backup]')).toBeHidden();
    await page.evaluate(() => Backup.open());
    await expect(page.locator('#toast')).toContainText('공용 기기 모드에서는');
    await expect(page.locator('#backupModal')).toBeHidden();
});
