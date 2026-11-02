// 우리 반 도구 계산: 명렬표 해석, 모둠 편성 제약, 기질 분포, 다가오는 생일
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, CORE } = require('./helpers/load.cjs');

const c = load([...CORE, 'js/birth.js', 'js/classroom-logic.js']);
const L = c.get('ClassroomLogic');
const Birth = c.get('Birth');
const plain = v => JSON.parse(JSON.stringify(v)); // vm 안에서 만든 배열·객체를 비교 가능한 값으로

const ROSTER = `번호\t이름\t생년월일\t성별\tMBTI
1\t김하늘\t2015.03.04\t여\tENFP
2\t이바다\t2015-07-21\t남\tISTJ
3, 박나무, 20150912, 남, INFP
4 최햇살 2015년 11월 2일 여 ESTJ
5 정이슬 음 2015.1.15 여
6 오바위 150606 남 INTJ
7 윤보석 2015.02.30 여
8 한별님
9 강산 2014.12.25 남 ESFP
10 서풀꽃 2015.08.08 여 ISFJ
11 문태양 2015.04.10 남 ENTP
12 배촛불 2015.10.10 여 INFJ`;

test('명렬표: 탭·쉼표·공백, 여러 날짜 형식, 음력, 머리글을 처리한다', () => {
    const { students, errors } = L.parseRoster(ROSTER, Birth.resolve);
    assert.equal(students.length, 10);
    assert.deepEqual(plain(students.slice(0, 4).map(s => [s.no, s.name, s.birth, s.gender, s.mbti])), [
        [1, '김하늘', '20150304', 'F', 'ENFP'],
        [2, '이바다', '20150721', 'M', 'ISTJ'],
        [3, '박나무', '20150912', 'M', 'INFP'],
        [4, '최햇살', '20151102', 'F', 'ESTJ']
    ]);
    const lunar = students.find(s => s.name === '정이슬');
    assert.equal(lunar.cal, 'lunar');
    assert.equal(lunar.lunar, '20150115');
    assert.equal(lunar.birth, '20150305'); // 음력 2015-01-15 = 양력 2015-03-05
    assert.equal(students.find(s => s.no === 11).name, '문태양'); // 이름 끝 '양'을 양력 표시로 읽지 않음
    assert.equal(students.find(s => s.name === '오바위').birth, '20150606');
    assert.deepEqual(plain(errors.map(e => e.line)), [8, 9]); // 2월 30일, 생일 없음
});

const people = () => L.withProfiles(L.parseRoster(ROSTER, Birth.resolve).students);

test('모둠 편성: 인원이 고르고 모든 학생이 정확히 한 번 들어간다', () => {
    const ps = people();
    const r = L.makeGroups(ps, { size: 4, seed: 1 });
    assert.equal(r.groups.length, 3); // 10명 ÷ 4 ≈ 3모둠
    const sizes = r.groups.map(g => g.members.length).sort();
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `sizes ${sizes}`);
    const ids = r.groups.flatMap(g => g.members.map(m => m.id)).sort((a, b) => a - b);
    assert.deepEqual(plain(ids), plain(ps.map(p => p.id)));
    r.groups.forEach(g => g.members.forEach(m => assert.ok(m.role)));
});

test('모둠 편성: 같은 섞기 번호면 같은 결과, 다른 번호면 다른 결과', () => {
    const ps = people();
    const key = r => JSON.stringify(r.groups.map(g => g.members.map(m => m.id).sort()));
    assert.equal(key(L.makeGroups(ps, { seed: 3 })), key(L.makeGroups(ps, { seed: 3 })));
    const keys = new Set([1, 2, 3, 4, 5].map(seed => key(L.makeGroups(ps, { seed }))));
    assert.ok(keys.size > 1);
});

test('모둠 편성: 떨어뜨릴 친구는 다른 모둠, 함께할 친구는 같은 모둠', () => {
    const ps = people();
    const apart = L.parsePairs('김하늘, 이바다\n박나무 최햇살', ps);
    const together = L.parsePairs('정이슬-오바위\n없는친구, 김하늘', ps);
    assert.equal(apart.pairs.length, 2);
    assert.deepEqual(plain(together.unknown), ['없는친구, 김하늘']);
    for (const seed of [1, 2, 3, 4]) {
        const r = L.makeGroups(ps, { seed, apart: apart.pairs, together: together.pairs });
        const groupOf = name => r.groups.findIndex(g => g.members.some(m => m.name === name));
        assert.notEqual(groupOf('김하늘'), groupOf('이바다'));
        assert.notEqual(groupOf('박나무'), groupOf('최햇살'));
        assert.equal(groupOf('정이슬'), groupOf('오바위'));
        assert.deepEqual(plain(r.violations), []);
    }
});

test('기질 분포: 합계가 학생 수와 같고 반 이름과 활동 제안을 만든다', () => {
    const ps = people();
    const d = L.distribution(ps);
    assert.equal(d.total, 10);
    assert.equal(d.stems.reduce((a, b) => a + b, 0), 10);
    assert.equal(Object.values(d.els).reduce((a, b) => a + b, 0), 10);
    assert.equal(Object.values(d.seasons).reduce((a, b) => a + b, 0), 10);
    assert.equal(d.letters.E + d.letters.I, 9); // MBTI가 빈 정이슬 제외
    assert.ok(d.title.endsWith('반'));
    assert.ok(d.boost.length > 0);
});

test('다가오는 생일: 가까운 순서, 음력 생일은 그해 양력 날짜로', () => {
    const ps = L.parseRoster(ROSTER, Birth.resolve).students;
    const list = L.upcomingBirthdays(ps, new Date(2026, 2, 1), 31); // 2026-03-01부터 31일
    assert.deepEqual(plain(list.map(x => [x.student.name, x.days])), [['정이슬', 2], ['김하늘', 3]]);
    // 음력 1월 15일은 2026년 양력 3월 3일
    assert.equal(list[0].date.getMonth(), 2);
    assert.equal(list[0].date.getDate(), 3);
    assert.equal(list[1].age, 11);
});

test('생일 절기 이름', () => {
    assert.equal(L.birthTermName('20150505'), '곡우(穀雨)'); // 2015년 입하는 5월 6일
    assert.equal(L.birthTermName('20150510'), '입하(立夏)');
    assert.equal(L.birthTermName('20151222'), '대설(大雪)'); // 2015년 동지는 12월 22일 13시 47분
    assert.equal(L.birthTermName('20151223'), '동지(冬至)');
});
