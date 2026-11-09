// 📝 마음 일기: 방문 기록·연속 방문·배지·사람 수·모두 지우기 (기기 저장소만 사용)
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { load, CORE } = require('./helpers/load.cjs');

function memoryStorage() {
    const m = new Map();
    return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m };
}
const storage = memoryStorage();
// 화면 요소가 없으므로 render는 아무것도 하지 않는 가짜 document를 줍니다.
const fakeEl = new Proxy({}, { get: (t, p) => (p === 'classList' ? { toggle() {}, add() {}, remove() {} } : p === 'style' ? {} : p === 'querySelectorAll' ? () => [] : p === 'addEventListener' ? () => {} : '') , set: () => true });
const document = { getElementById: () => fakeEl, querySelectorAll: () => [], addEventListener() {}, createElement: () => fakeEl };
const c = load([...CORE, 'js/journal.js'], { localStorage: storage, document });
const Journal = c.get('Journal');
const KEY = 'myeongun_journal_v1';
const ymd = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

function seed(userKey, daysAgo) {
    const all = JSON.parse(storage.getItem(KEY) || '{}');
    all[userKey] = all[userKey] || {};
    const now = new Date();
    for (const n of daysAgo) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, 12);
        all[userKey][ymd(d)] = { god: '식신', hanja: '食神', avg: 70, rating: n % 2 ? 'good' : 'soso' };
    }
    storage.setItem(KEY, JSON.stringify(all));
}

beforeEach(() => storage.m.clear());

test('오늘 방문을 기록하면 오늘 날짜 칸에 기운이 저장된다', () => {
    Journal.recordVisit('u1', '정관', '正官', 66);
    const all = JSON.parse(storage.getItem(KEY));
    assert.deepEqual(Object.keys(all), ['u1']);
    assert.deepEqual(all.u1[ymd(new Date())], { god: '정관', hanja: '正官', avg: 66 });
});

test('연속 방문은 오늘부터 끊기지 않은 날만 센다', () => {
    seed('u1', [0, 1, 2, 4, 5]);
    const s = Journal.stats('u1', new Date());
    assert.equal(s.streak, 3);
    assert.equal(s.total, 5);
    assert.equal(s.good, 2); // 1일 전, 5일 전
    assert.equal(Journal.stats('nobody', new Date()).streak, 0);
});

test('사람 수를 세고, 모두 지우면 기록이 사라진다', () => {
    seed('u1', [0]);
    seed('u2', [0, 1]);
    assert.equal(Journal.peopleCount(), 2);
    Journal.clearAll();
    assert.equal(Journal.peopleCount(), 0);
    assert.equal(storage.getItem(KEY), null);
});

test('저장소가 깨져 있어도 멈추지 않는다', () => {
    storage.setItem(KEY, '{broken');
    assert.equal(Journal.peopleCount(), 0);
    assert.equal(Journal.stats('u1', new Date()).total, 0);
});
