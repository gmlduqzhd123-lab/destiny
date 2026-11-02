// ☀️ 24절기 시뮬레이터 계산: 한국천문연구원 절기 날짜, 서울 낮 길이·정오 태양 고도
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, CORE } = require('./helpers/load.cjs');

const c = load([...CORE, 'js/solarsim.js']);
const Sim = c.get('SolarSim');

test('2024년 절기 날짜가 한국천문연구원 발표와 같다', () => {
    const terms = Sim.termDates(2024);
    assert.equal(terms.length, 24);
    const at = name => { const t = terms.find(x => x.name.startsWith(name)); return `${t.month}/${t.day}`; };
    assert.equal(at('입춘'), '2/4');
    assert.equal(at('춘분'), '3/20');
    assert.equal(at('하지'), '6/21');
    assert.equal(at('추분'), '9/22');
    assert.equal(at('동지'), '12/21');
    const ipchun = terms.find(x => x.name.startsWith('입춘'));
    assert.ok(Math.abs(ipchun.hour * 60 + ipchun.minute - (17 * 60 + 27)) <= 10, '입춘 17:27 KST ±10분');
});

test('서울 낮 길이와 정오 태양 고도', () => {
    const summer = Sim.dayInfo(2024, 6, 21);
    const winter = Sim.dayInfo(2024, 12, 21);
    assert.ok(Math.abs(summer.dayMinutes - (14 * 60 + 46)) <= 8, `하지 ${summer.dayMinutes}분`);
    assert.ok(Math.abs(winter.dayMinutes - (9 * 60 + 34)) <= 8, `동지 ${winter.dayMinutes}분`);
    assert.ok(Math.abs(summer.noonAlt - 75.9) < 0.3);
    assert.ok(Math.abs(winter.noonAlt - 29.0) < 0.3);
    assert.equal(summer.season, '여름');
    assert.equal(Sim.dayInfo(2024, 3, 21).term, '춘분(春分)');
});
