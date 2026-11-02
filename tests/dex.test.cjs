// 🌟 도감 코드: 개인정보 없이 캐릭터 번호 + 오늘만 쓰는 숫자
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, CORE } = require('./helpers/load.cjs');

const c = load([...CORE, 'js/dex.js']);
const Dex = c.get('Dex');
const day = (y, m, d) => new Date(y, m - 1, d, 10);

test('코드는 캐릭터 번호와 두 자리 숫자뿐이다', () => {
    for (let i = 0; i < 10; i++) {
        assert.match(Dex.codeFor(i, day(2026, 11, 2)), /^\d-\d{2}$/);
        assert.match(Dex.wordCode(i, day(2026, 11, 2)), /^[가-힣]+-\d{2}$/);
    }
});

test('오늘·어제 코드는 받아들이고, 그보다 오래된 코드와 틀린 숫자는 거절', () => {
    const today = day(2026, 11, 2);
    for (let i = 0; i < 10; i++) {
        assert.equal(Dex.parseCode(Dex.codeFor(i, today), today), i);
        assert.equal(Dex.parseCode(Dex.wordCode(i, today), today), i);
        assert.equal(Dex.parseCode(Dex.codeFor(i, day(2026, 11, 1)), today), i);
        const old = Dex.codeFor(i, day(2026, 10, 25));
        if (Dex.dayNumber(i, day(2026, 10, 25)) !== Dex.dayNumber(i, today) && Dex.dayNumber(i, day(2026, 10, 25)) !== Dex.dayNumber(i, day(2026, 11, 1))) {
            assert.equal(Dex.parseCode(old, today), null);
        }
    }
    assert.equal(Dex.parseCode('바다 - ' + Dex.dayNumber(8, today), today), 8); // 띄어쓰기 허용
    assert.equal(Dex.parseCode('없는말-27', today), null);
    assert.equal(Dex.parseCode('11-27', today), null);
    assert.equal(Dex.parseCode('<script>', today), null);
});

test('배지 단계', () => {
    assert.equal(Dex.badgeFor(0), '');
    assert.match(Dex.badgeFor(3), /새싹/);
    assert.match(Dex.badgeFor(10), /박사/);
});
