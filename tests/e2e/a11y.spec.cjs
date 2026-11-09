// ♿ 접근성 점검(axe-core): 주요 화면에서 심각(serious)·치명(critical) 위반이 없어야 합니다.
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { open, submitUser } = require('./helpers.cjs');

const AXE = path.join(path.dirname(require.resolve('axe-core')), 'axe.min.js');

async function audit(page, label) {
    // 잠깐 떴다 사라지는 알림(토스트)은 사라지는 도중에 재면 흐리게 잡히므로 먼저 닫고,
    // 화면이 나타나는 짧은 애니메이션(투명도)이 끝난 뒤 색 대비를 잽니다.
    await page.evaluate(() => document.getElementById('toast').classList.remove('show'));
    await page.evaluate(() => Promise.all(document.getAnimations()
        .filter(a => a.effect && Number.isFinite(a.effect.getComputedTiming().endTime)).map(a => a.finished.catch(() => {}))));
    if (!(await page.evaluate(() => typeof window.axe !== 'undefined'))) await page.addScriptTag({ path: AXE });
    const result = await page.evaluate(async () => {
        // eslint-disable-next-line no-undef
        const r = await axe.run(document, { resultTypes: ['violations'] });
        return r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
            .map(v => `${v.id} (${v.impact}): ${v.help}\n    ` + v.nodes.slice(0, 5).map(n => n.target.join(' ')).join('\n    '));
    });
    expect(result, `${label}\n${result.join('\n')}`).toEqual([]);
}

test('학생용 첫 화면·결과 다섯 탭', async ({ page }) => {
    await open(page);
    await audit(page, '첫 화면');
    await submitUser(page);
    await audit(page, '오늘 탭');
    for (const tab of ['saju', 'compat', 'tarot', 'journal']) {
        await page.click(`[data-tab=${tab}]`);
        await audit(page, `${tab} 탭`);
    }
});

test('선생님용 화면과 우리 반 도구', async ({ page }) => {
    await open(page);
    await page.click('#modeSwitch [data-mode=teacher]');
    await audit(page, '선생님 첫 화면');
    await page.click('#classEntry [data-open-class]');
    await expect(page.locator('#classView')).toBeVisible();
    await audit(page, '우리 반 도구');
    await page.click('#btnRosterSample');
    for (const tab of ['groups', 'board', 'birthday', 'report']) {
        await page.click(`#classTabs [data-ctab=${tab}]`);
        await audit(page, `우리 반 도구 ${tab}`);
    }
    await page.click('#btnCloseClass');
    await submitUser(page, { name: '김선생', birth: '1988.07.01' });
    await audit(page, '선생님 결과 오늘 탭');
    for (const tab of ['saju', 'compat', 'tarot', 'journal']) {
        await page.click(`[data-tab=${tab}]`);
        await audit(page, `선생님 ${tab} 탭`);
    }
});

test('도감 QR·기록 옮기기·24절기 창', async ({ page }) => {
    await open(page);
    await submitUser(page);
    await page.click('[data-tab=saju]');
    await page.click('#btnDexQr');
    await audit(page, '도감 QR 창');
    await page.click('#dexQrClose');
    await page.locator('footer [data-backup]').click();
    await audit(page, '기록 옮기기 창');
    await page.click('#backupClose');
    await page.locator('#simCard [data-open-sim], [data-open-sim]:visible').first().click();
    await expect(page.locator('#simView')).toBeVisible();
    await audit(page, '24절기 태양 여행');
});

test('다른 언어 화면과 공용 기기 모드', async ({ page }) => {
    await open(page);
    await page.selectOption('#langSelect', 'en');
    await submitUser(page);
    await audit(page, 'English 결과 화면');
    await page.selectOption('#langSelect', 'ko');
    page.on('dialog', d => d.accept());
    await page.locator('.kiosk-link [data-kiosk-on]').click();
    await expect(page.locator('body')).toHaveClass(/kiosk/);
    await audit(page, '공용 기기 모드');
});
