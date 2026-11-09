// 🤝 우정 케미: 점수 구성(오행 30 + 일지 20 + 띠 20 + MBTI 30), 대칭성, 등급, 모둠 역할 팁
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load.cjs');

const c = load();
const Compat = c.get('Compat');
const people = [
    { name: '가', birth: '20150505', time: '', gender: 'F', mbti: 'ENFP' },
    { name: '나', birth: '20150901', time: '', gender: 'M', mbti: 'ISTJ' },
    { name: '다', birth: '20160214', time: '', gender: 'F', mbti: 'INFJ' },
    { name: '라', birth: '20141120', time: '', gender: 'M', mbti: '' },
    { name: '마', birth: '19880701', time: '', gender: 'F', mbti: 'ESTP' }
];

test('네 부분 점수의 만점 합은 100이고, 총점은 부분 점수의 합(0~100)', () => {
    for (const a of people) for (const b of people) {
        const r = Compat.compute(a, b);
        assert.equal(r.parts.length, 4);
        assert.deepEqual([...r.parts.map(p => p.max)], [30, 20, 20, 30]);
        r.parts.forEach(p => assert.ok(p.score >= 0 && p.score <= p.max, `${p.title} ${p.score}/${p.max}`));
        const sum = r.parts.reduce((s, p) => s + p.score, 0);
        assert.equal(r.total, Math.min(100, Math.max(0, sum)));
        assert.ok(r.grade && r.total >= r.grade.min, '총점에 맞는 등급');
    }
});

test('두 사람의 순서를 바꿔도 총점이 같다', () => {
    for (let i = 0; i < people.length; i++) for (let j = i + 1; j < people.length; j++) {
        assert.equal(Compat.compute(people[i], people[j]).total, Compat.compute(people[j], people[i]).total, `${people[i].name}×${people[j].name}`);
    }
});

test('같은 입력이면 언제나 같은 결과 (날짜와 무관)', () => {
    const a = Compat.compute(people[0], people[1]);
    const b = Compat.compute(people[0], people[1]);
    assert.equal(JSON.stringify(a.parts), JSON.stringify(b.parts));
});

test('MBTI를 모르는 친구가 있으면 기본 점수로 계산하고 안내한다', () => {
    const r = Compat.compute(people[0], people[3]);
    const m = r.parts[3];
    assert.equal(m.score, 22);
    assert.match(m.text, /기본 점수/);
});

test('모둠 역할 팁은 두 사람의 자연물 기운에 맞는 역할을 담는다', () => {
    const r = Compat.compute(people[0], people[1]);
    const ea = r.a.profile.saju.day.stem.el, eb = r.b.profile.saju.day.stem.el;
    assert.ok(r.teamTip.studentPromise.includes(Compat.ROLE_MAP[ea]));
    assert.ok(r.teamTip.studentPromise.includes(Compat.ROLE_MAP[eb]));
    assert.ok(r.teamTip.teacherGuide.includes('가') && r.teamTip.teacherGuide.includes('나'));
    for (const el of ['wood', 'fire', 'earth', 'metal', 'water']) assert.ok(Compat.ROLE_MAP[el], el);
});
