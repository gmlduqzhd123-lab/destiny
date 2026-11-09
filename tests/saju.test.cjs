// 만세력·음력·출생 시각 보정 계산 회귀 테스트 (알려진 날짜와 천문력 값 기준)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load.cjs');

const c = load();
const Saju = c.get('Saju');
const gz = p => (p ? p.stem.hanja + p.branch.hanja : '--');
const pillars = b => { const r = Saju.calc(b); return [gz(r.year), gz(r.month), gz(r.day), gz(r.hour)]; };

test('일주: 알려진 날짜의 일진', () => {
    assert.equal(gz(Saju.pillarOf(Saju.dayIndex(2024, 1, 1))), '甲子');
    assert.equal(gz(Saju.pillarOf(Saju.dayIndex(1900, 1, 1))), '甲戌');
    assert.deepEqual(pillars({ y: 2000, m: 1, d: 1 }).slice(0, 3), ['己卯', '丙子', '戊午']);
});

test('년주·월주는 입춘 절입 시각에 바뀐다 (2024-02-04 17:27 KST)', () => {
    assert.deepEqual(pillars({ y: 2024, m: 2, d: 4, hour: 17, minute: 0 }).slice(0, 2), ['癸卯', '乙丑']);
    assert.deepEqual(pillars({ y: 2024, m: 2, d: 4, hour: 18, minute: 0 }).slice(0, 2), ['甲辰', '丙寅']);
});

test('시주는 일간 기준 시두법으로 정해진다', () => {
    assert.equal(pillars({ y: 2024, m: 2, d: 4, hour: 18, minute: 0 })[3], '辛酉');
    // 23시 이후는 다음 날 자시
    assert.deepEqual(pillars({ y: 1990, m: 5, d: 15, hour: 23, minute: 20 }).slice(2), ['辛巳', '戊子']);
});

test('지역을 고르지 않으면 입력 시각을 그대로 쓴다 (예전 결과 유지)', () => {
    assert.equal(Saju.calc({ y: 1990, m: 5, d: 15, hour: 8, minute: 0 }).correction, null);
    assert.deepEqual(pillars({ y: 1990, m: 5, d: 15, hour: 8, minute: 0 }), ['庚午', '辛巳', '庚辰', '庚辰']);
});

test('경도·서머타임·균시차 보정', () => {
    const seoul = 126.98;
    const feb = Saju.calc({ y: 1990, m: 2, d: 11, hour: 8, minute: 0, lon: seoul }).correction;
    assert.equal(feb.lonMin, -32);
    assert.equal(feb.eotMin, -14);
    assert.equal(feb.solar, '07:14');

    const dst = Saju.calc({ y: 1988, m: 7, d: 1, hour: 8, minute: 0, lon: seoul }).correction;
    assert.equal(dst.dst, true);
    assert.equal(dst.solar, '06:24');

    const old = Saju.calc({ y: 1958, m: 7, d: 1, hour: 8, minute: 0, lon: seoul }).correction;
    assert.equal(old.offset, 570); // UTC+8:30 시기의 서머타임

    const lmt = Saju.calc({ y: 1905, m: 3, d: 3, hour: 10, minute: 0, lon: seoul }).correction;
    assert.equal(lmt.lmt, true);
    assert.equal(lmt.lonMin, 0);

    // 00:10 출생이 보정 후 전날 밤이 되어도 자시 규칙으로 같은 날 일주
    const mid = Saju.calc({ y: 1990, m: 5, d: 15, hour: 0, minute: 10, lon: seoul });
    assert.equal(mid.correction.dayShift, -1);
    assert.equal(gz(mid.day), '庚辰');
    assert.equal(gz(mid.hour), '丙子');
});

test('균시차는 천문력 값과 1분 이내로 맞는다', () => {
    const jd = (y, m, d) => Date.UTC(y, m - 1, d, 3) / 864e5 + 2440587.5;
    for (const [m, d, want] of [[2, 11, -14.2], [4, 15, 0.0], [7, 26, -6.5], [11, 3, 16.4]]) {
        assert.ok(Math.abs(Saju.equationOfTime(jd(2024, m, d)) - want) < 1, `${m}/${d}`);
    }
});

test('음력 → 양력 변환 (한국천문연구원 기준)', () => {
    const K = c.get('KoreanLunarCalendar');
    const solar = (y, m, d, leap) => {
        const k = new K();
        if (!k.setLunarDate(y, m, d, leap)) return null;
        const s = k.getSolarCalendar();
        return `${s.year}-${s.month}-${s.day}`;
    };
    assert.equal(solar(2000, 1, 1, false), '2000-2-5');
    assert.equal(solar(2024, 1, 1, false), '2024-2-10');
    assert.equal(solar(2023, 2, 1, true), '2023-3-22');
    assert.equal(solar(1988, 8, 15, false), '1988-9-25');
    assert.equal(solar(2023, 2, 30, true), null);
});

test('대운은 10개이고 10년 간격', () => {
    const r = Saju.calc({ y: 1990, m: 5, d: 15, hour: 8, minute: 0 });
    const dw = Saju.daewoon(r, 'M');
    assert.equal(dw.list.length, 10);
    assert.equal(dw.list[1].age - dw.list[0].age, 10);
    assert.equal(dw.forward, true); // 庚(양간)년 남성 순행
});

test('만 나이: 생일이 지나지 않았으면 한 살 적다 (기질 탭 10년 흐름 기준)', () => {
    const { load: loadMore, CORE: core } = require('./helpers/load.cjs');
    const SajuView = loadMore([...core, 'js/saju-view.js']).get('SajuView');
    assert.equal(SajuView.ageOn('20150505', new Date(2026, 4, 4)), 10);
    assert.equal(SajuView.ageOn('20150505', new Date(2026, 4, 5)), 11);
    assert.equal(SajuView.ageOn('20151231', new Date(2026, 0, 1)), 10);
});
