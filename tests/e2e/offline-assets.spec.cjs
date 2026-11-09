// 🌐 학교망에서 외부 사이트가 막혀도 그대로 보이도록: 첫 화면·결과 화면이 다른 주소로 요청하지 않아야 합니다.
const { test, expect } = require('@playwright/test');
const { submitUser } = require('./helpers.cjs');

test('외부 요청 없이 열리고 제목 글꼴(고운바탕)·본문 글꼴(Pretendard)이 적용된다', async ({ page, baseURL }) => {
    const outside = [];
    const origin = new URL(baseURL).origin;
    page.on('request', r => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) outside.push(u); });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await submitUser(page);
    await page.click('[data-tab=saju]');
    await page.evaluate(() => document.fonts.ready);
    const fonts = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')));
    expect(fonts).toContain('Gowun Batang');
    expect(fonts).toContain('Pretendard Variable');
    expect(outside).toEqual([]);
    expect(errors).toEqual([]);
});

test('QR 읽기 도구(jsQR)는 카메라를 열기 전에는 내려받지 않는다', async ({ page }) => {
    const scripts = [];
    page.on('request', r => { if (r.resourceType() === 'script') scripts.push(new URL(r.url()).pathname); });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(scripts.some(s => s.endsWith('/jsQR.js'))).toBe(false);
});
