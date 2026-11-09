// 💾 기록 내보내기·불러오기: 옮길 칸만 담고, 불러오면 지우지 않고 합친다
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load.cjs');

const c = load(['js/backup.js']);
const Backup = c.get('Backup');
const K = Backup.KEYS;
const plain = v => JSON.parse(JSON.stringify(v));

function sample() {
    return Backup.memoryStorage({
        [K.journal]: JSON.stringify({ 'u1': { '20261101': { god: 'a', rating: 'good', memo: '고마웠어' } } }),
        [K.dex]: JSON.stringify({ got: { 2: '20261101' }, mine: 2 }),
        [K.user]: JSON.stringify({ name: '김별빛', birth: '2015-05-05' }),
        [K.lang]: 'en',
        starcompass_kiosk: '1',
        other_app_key: 'x'
    });
}

test('내보내기는 이 앱의 칸만 담고 공용 기기 설정·다른 앱 기록은 뺀다', () => {
    const b = plain(Backup.build(sample(), new Date('2026-11-09T01:00:00Z')));
    assert.equal(b.app, 'starcompass');
    assert.equal(b.version, 1);
    assert.deepEqual(Object.keys(b.data).sort(), [K.journal, K.dex, K.user, K.lang].sort());
    assert.match(Backup.fileName(new Date(2026, 10, 9)), /20261109\.json$/);
});

test('내보낸 파일을 그대로 다시 읽을 수 있고 요약이 맞다', () => {
    const text = JSON.stringify(Backup.build(sample()));
    const p = plain(Backup.parse(text));
    assert.deepEqual(p.skipped, []);
    assert.deepEqual(plain(Backup.summarize(p.data)), { people: 1, days: 1, dex: 1, roster: false, user: '김별빛' });
});

test('앱 파일이 아니거나 깨진 값은 거절하거나 버린다', () => {
    assert.throws(() => Backup.parse(''), /빈 파일/);
    assert.throws(() => Backup.parse('not json'), /백업 파일이 아니/);
    assert.throws(() => Backup.parse(JSON.stringify({ app: 'other', version: 1, data: {} })), /백업 파일이 아니/);
    assert.throws(() => Backup.parse(JSON.stringify({ app: 'starcompass', version: 99, data: {} })), /새로운 버전/);
    const p = plain(Backup.parse(JSON.stringify({ app: 'starcompass', version: 1, data: {
        [K.dex]: '{broken', [K.lang]: '<script>', evil_key: '1', starcompass_kiosk: '1', [K.user]: { not: 'string' }, [K.tone]: '"direct"'
    } })));
    assert.deepEqual(Object.keys(p.data), [K.tone]);
    assert.deepEqual(p.skipped.sort(), [K.dex, K.lang, 'evil_key', 'starcompass_kiosk', K.user].sort());
});

test('불러오기는 합치기: 있던 기록은 그대로, 없는 날짜·캐릭터·설정만 더한다', () => {
    const local = Backup.memoryStorage({
        [K.journal]: JSON.stringify({ 'u1': { '20261101': { god: 'a', rating: 'bad' }, '20261105': { god: 'b' } } }),
        [K.dex]: JSON.stringify({ got: { 5: '20261103' }, mine: 5 }),
        [K.lang]: 'ko'
    });
    const incoming = Backup.parse(JSON.stringify(Backup.build(sample()))).data;
    const added = plain(Backup.merge(local, incoming));
    assert.deepEqual(added, { days: 0, dex: 1, settings: 1 }); // 사용자 정보만 새로 들어감, 언어는 기존 유지
    const j = JSON.parse(local.getItem(K.journal));
    assert.equal(j.u1['20261101'].rating, 'bad'); // 기존 마음 날씨 유지
    assert.equal(j.u1['20261101'].memo, '고마웠어'); // 비어 있던 메모만 채움
    assert.ok(j.u1['20261105']);
    const d = JSON.parse(local.getItem(K.dex));
    assert.deepEqual(Object.keys(d.got).sort(), ['2', '5']);
    assert.equal(d.mine, 5);
    assert.equal(local.getItem(K.lang), 'ko');
});

test('빈 새 기기에 불러오면 그대로 복원된다', () => {
    const fresh = Backup.memoryStorage();
    const src = sample();
    const added = plain(Backup.merge(fresh, Backup.parse(JSON.stringify(Backup.build(src))).data));
    assert.deepEqual(added, { days: 1, dex: 1, settings: 2 });
    for (const k of [K.journal, K.dex, K.user, K.lang]) assert.deepEqual(JSON.parse(JSON.stringify(fresh.getItem(k))), src.getItem(k));
    assert.equal(fresh.getItem('starcompass_kiosk'), null);
});

test('일기 날짜 형식이 아니거나 도감 번호가 잘못된 항목은 합치지 않는다', () => {
    const fresh = Backup.memoryStorage();
    Backup.merge(fresh, {
        [K.journal]: JSON.stringify({ u: { 'bad-date': { memo: 'x' }, '20261101': 'str' } }),
        [K.dex]: JSON.stringify({ got: { 12: 'x', a: 'y', 3: '20261101' }, mine: 42 })
    });
    assert.deepEqual(JSON.parse(fresh.getItem(K.journal)), { u: {} });
    const d = JSON.parse(fresh.getItem(K.dex));
    assert.deepEqual(Object.keys(d.got), ['3']);
    assert.equal(d.mine, null);
});
