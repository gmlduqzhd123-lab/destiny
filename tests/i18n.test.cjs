// 🌐 다국어 데이터 완결성과 🔊 읽어 주기 문장 나누기
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { load, CORE } = require('./helpers/load.cjs');

const c = load([...CORE, 'js/data/i18n-data.js', 'js/reader.js']);
const D = c.get('I18nData');
const E = c.get('ExtraData');
const S = c.get('SajuData');
const LANGS = ['en', 'zh', 'vi'];

test('화면 글자 번역은 세 언어가 모두 있고, 선택자가 index.html에 있다', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    D.ui.forEach(([sel, prop, tr]) => {
        assert.ok(['text', 'ph', 'tail', 'head', 'aria'].includes(prop), sel);
        LANGS.forEach(l => assert.ok(tr[l] && tr[l].trim(), `${sel} ${l}`));
        const id = sel.match(/#([\w-]+)/);
        if (id) assert.ok(html.includes(`id="${id[1]}"`), `index.html에 #${id[1]} 없음`);
    });
});

test('결과 요약 번역이 앱 데이터와 짝이 맞는다', () => {
    assert.equal(D.chars.length, S.ilgan.length);
    D.chars.forEach((ch, i) => LANGS.forEach(l => assert.equal(ch[l].length, 3, `char ${i} ${l}`)));
    E.grades.forEach(g => LANGS.forEach(l => assert.ok(D.grades[g.name] && D.grades[g.name][l], g.name)));
    Object.keys(E.plain).forEach(k => LANGS.forEach(l => assert.ok(D.plain[k][l], k)));
    Object.keys(E.dayEl).forEach(k => LANGS.forEach(l => assert.ok(D.dayEl[k][l], k)));
    Object.values(S.elements).forEach(e => assert.ok(D.directions[e.direction], e.direction));
    LANGS.forEach(l => ['title', 'character', 'luck', 'scores', 'note'].forEach(k => assert.ok(D.summary[l][k])));
});

test('읽어 주기: 문장 단위로 나누고 기호만 있는 조각은 버린다', () => {
    const R = c.get('Reader');
    const parts = JSON.parse(JSON.stringify(R.chunks('오늘은 맑아요. 친구와 놀아요!\n🌟\n☀️ Hello world. 你好。')));
    assert.deepEqual(parts, ['오늘은 맑아요.', '친구와 놀아요!', 'Hello world.', '你好。']);
});
