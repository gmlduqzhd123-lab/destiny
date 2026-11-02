/**
 * [ClassroomLogic] 우리 반 도구의 계산 부분 (화면과 분리 — 단위 테스트 대상)
 * - 명렬표 해석: 엑셀·한글에서 복사한 표(탭·쉼표·공백 구분)를 학생 목록으로
 * - 모둠 편성: 자연물 기운·E/I·성별이 고르게 섞이고 서로 케미가 좋은 모둠을 찾음 (같은 입력·같은 섞기 번호면 같은 결과)
 * - 기질 분포, 다가오는 생일
 * 학생 정보는 이 기기 안에서만 계산하며 어디로도 보내지 않습니다.
 */
const ClassroomLogic = (() => {
    // 날짜 부분만 찾고, 앞뒤의 '음력·양력·윤달' 표시는 띄어 쓴 별도 단어일 때만 인정합니다 (이름 끝 '양'과 구별).
    const DATE_RE = /(\d{4}|\d{2})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})\s*일?|(?:^|[\s,\t])(\d{8}|\d{6})(?=$|[\s,\t])/;
    const MARK_BEFORE = /(^|[\s,\t])\(?(음력|양력|음|양)\)?\s*$/;
    const MARK_AFTER = /^\s*\(?(음력|음|윤달|윤)\)?(?=$|[\s,\t])/;
    const GENDER = { 남: 'M', 남자: 'M', 남학생: 'M', M: 'M', m: 'M', 여: 'F', 여자: 'F', 여학생: 'F', F: 'F', f: 'F' };

    /**
     * @param {string} text 붙여 넣은 명렬표
     * @param {(raw:string, cal:string)=>object} resolve 생일 문자열 → { ymd, lunar?, leap?, error? } (App.resolveBirth)
     */
    function parseRoster(text, resolve) {
        const students = [];
        const errors = [];
        String(text || '').split(/\r?\n/).forEach((rawLine, i) => {
            const line = rawLine.trim();
            if (!line) return;
            if (/이름/.test(line) && /(생일|생년월일)/.test(line)) return; // 머리글 줄
            const lineNo = i + 1;

            const m = line.match(DATE_RE);
            if (!m) { errors.push({ line: lineNo, text: line, msg: '생년월일을 찾지 못했어요' }); return; }
            let before = line.slice(0, m.index), after = line.slice(m.index + m[0].length);
            let marker = '';
            const mb = before.match(MARK_BEFORE);
            if (mb) { marker += mb[2]; before = before.slice(0, mb.index + mb[1].length); }
            let ma;
            while ((ma = after.match(MARK_AFTER))) { marker += ma[1]; after = after.slice(ma[0].length); }
            const lunar = /음|윤/.test(marker);
            const leap = /윤/.test(marker);
            const dateRaw = m[4] ? m[4] : `${m[1]}.${m[2]}.${m[3]}`;
            const b = resolve(dateRaw, lunar ? (leap ? 'leap' : 'lunar') : 'solar');
            if (b.error) { errors.push({ line: lineNo, text: line, msg: b.error }); return; }

            const rest = (before + ' ' + after)
                .split(/[\t,]+|\s+/).map(t => t.trim()).filter(Boolean)
                .filter(t => !/^(윤달|윤|\(윤\)|\(음\)|\(음력\)|음력|양력)$/.test(t));
            let no = null, gender = '', mbti = '';
            const nameParts = [];
            rest.forEach((t, k) => {
                if (k === 0 && /^\d{1,3}\.?$/.test(t)) { no = parseInt(t, 10); return; }
                if (!gender && GENDER[t]) { gender = GENDER[t]; return; }
                if (!mbti && /^[EIei][SNsn][TFtf][JPjp]$/.test(t)) { mbti = t.toUpperCase(); return; }
                nameParts.push(t);
            });
            const name = nameParts.join(' ').slice(0, 20);
            if (!name) { errors.push({ line: lineNo, text: line, msg: '이름을 찾지 못했어요' }); return; }
            const st = { no, name, birth: b.ymd, gender, mbti, time: '' };
            if (b.lunar) Object.assign(st, { cal: 'lunar', lunar: b.lunar, leap: !!b.leap });
            students.push(st);
        });
        students.forEach((s, i) => { s.id = i; if (s.no == null) s.no = i + 1; });
        return { students, errors };
    }

    function withProfiles(students) {
        return students.map(s => ({ ...s, profile: Fortune.profile(s) }));
    }

    // ---------- 모둠 편성 ----------
    function pairKey(a, b) { return a < b ? `${a}-${b}` : `${b}-${a}`; }

    /** "김철수, 이영희" 같은 줄을 학생 id 쌍으로 바꿉니다. 이름을 못 찾은 줄은 unknown에 담습니다. */
    function parsePairs(text, students) {
        const pairs = [], unknown = [];
        const byName = new Map();
        students.forEach(s => { if (!byName.has(s.name)) byName.set(s.name, s.id); });
        String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(l => {
            const names = l.split(/[,\t\/·\-–]+|\s+/).map(t => t.trim()).filter(Boolean);
            const ids = names.map(n => byName.get(n));
            if (names.length < 2 || ids.some(x => x === undefined)) { unknown.push(l); return; }
            for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]]);
        });
        return { pairs, unknown };
    }

    /**
     * @param {Array} people withProfiles() 결과
     * @param {{size?:number, seed?:number, apart?:Array, together?:Array, balanceGender?:boolean}} opt
     */
    function makeGroups(people, opt = {}) {
        const n = people.length;
        if (!n) return { groups: [], score: 0, violations: [] };
        const size = Math.max(2, Math.min(8, opt.size || 4));
        const count = Math.max(1, Math.round(n / size));
        const apart = new Set((opt.apart || []).map(([a, b]) => pairKey(a, b)));
        const together = (opt.together || []).map(([a, b]) => [a, b]);
        const balanceGender = opt.balanceGender !== false;

        // 쌍마다 케미 점수를 한 번만 계산해 둡니다.
        const compat = Array.from({ length: n }, () => new Array(n).fill(0));
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            compat[i][j] = compat[j][i] = Compat.scoreProfiles(people[i], people[j]).total;
        }
        const idx = new Map(people.map((p, i) => [p.id, i]));

        function groupScore(members) {
            if (!members.length) return 0;
            const els = new Set(members.map(i => people[i].profile.saju.day.stem.el));
            let s = els.size * 3;
            const ei = members.map(i => people[i].mbti && people[i].mbti[0]).filter(Boolean);
            if (ei.includes('E') && ei.includes('I')) s += 2;
            if (balanceGender) {
                const m = members.filter(i => people[i].gender === 'M').length;
                const f = members.filter(i => people[i].gender === 'F').length;
                if (m + f >= 2) s += 2 - Math.abs(m - f) * 0.75;
            }
            let pairSum = 0, pairs = 0;
            for (let a = 0; a < members.length; a++) for (let b = a + 1; b < members.length; b++) {
                pairSum += compat[members[a]][members[b]]; pairs++;
                if (apart.has(pairKey(people[members[a]].id, people[members[b]].id))) s -= 60;
            }
            if (pairs) s += (pairSum / pairs) / 100 * 4;
            return s;
        }

        function totalScore(groups, where) {
            let s = groups.reduce((acc, g) => acc + groupScore(g), 0);
            together.forEach(([a, b]) => {
                const ia = idx.get(a), ib = idx.get(b);
                if (ia !== undefined && ib !== undefined && where[ia] !== where[ib]) s -= 60;
            });
            return s;
        }

        const rnd = Engine.prng(`groups-${opt.seed || 0}-${n}-${size}`);
        let best = null;
        for (let restart = 0; restart < 6; restart++) {
            const order = Engine.shuffle(people.map((_, i) => i), rnd);
            const groups = Array.from({ length: count }, () => []);
            order.forEach((p, k) => groups[k % count].push(p));
            const where = new Array(n);
            groups.forEach((g, gi) => g.forEach(p => { where[p] = gi; }));
            let cur = totalScore(groups, where);
            for (let it = 0; it < 2500; it++) {
                const a = Math.floor(rnd() * n), b = Math.floor(rnd() * n);
                const ga = where[a], gb = where[b];
                if (ga === gb) continue;
                const ia = groups[ga].indexOf(a), ib = groups[gb].indexOf(b);
                groups[ga][ia] = b; groups[gb][ib] = a; where[a] = gb; where[b] = ga;
                const next = totalScore(groups, where);
                if (next >= cur) cur = next;
                else { groups[ga][ia] = a; groups[gb][ib] = b; where[a] = ga; where[b] = gb; }
            }
            if (!best || cur > best.score) best = { score: cur, groups: groups.map(g => g.slice()), where: where.slice() };
        }

        const roles = Object.values(Compat.ROLE_MAP);
        const groups = best.groups.map((g, gi) => {
            const members = g.map(i => people[i]);
            // 기운에 맞는 역할을 먼저 주고, 겹치면 남은 역할을 나눕니다.
            const used = new Set();
            const assigned = members.map(p => {
                const want = Compat.ROLE_MAP[p.profile.saju.day.stem.el];
                if (!used.has(want)) { used.add(want); return want; }
                return null;
            });
            assigned.forEach((r, k) => {
                if (r) return;
                const free = roles.find(x => !used.has(x));
                assigned[k] = free || Compat.ROLE_MAP[members[k].profile.saju.day.stem.el];
                if (free) used.add(free);
            });
            let pairSum = 0, pairs = 0;
            for (let a = 0; a < g.length; a++) for (let b = a + 1; b < g.length; b++) { pairSum += compat[g[a]][g[b]]; pairs++; }
            const els = Saju.EL.filter(el => members.some(p => p.profile.saju.day.stem.el === el));
            return {
                no: gi + 1,
                members: members.map((p, k) => ({ ...p, role: assigned[k] })),
                elements: els,
                ei: { E: members.filter(p => p.mbti && p.mbti[0] === 'E').length, I: members.filter(p => p.mbti && p.mbti[0] === 'I').length },
                gender: { M: members.filter(p => p.gender === 'M').length, F: members.filter(p => p.gender === 'F').length },
                avgCompat: pairs ? Math.round(pairSum / pairs) : 0
            };
        });

        const violations = [];
        groups.forEach(g => {
            for (let a = 0; a < g.members.length; a++) for (let b = a + 1; b < g.members.length; b++) {
                if (apart.has(pairKey(g.members[a].id, g.members[b].id))) violations.push(`${g.members[a].name}·${g.members[b].name} 같은 모둠`);
            }
        });
        together.forEach(([a, b]) => {
            const ia = idx.get(a), ib = idx.get(b);
            if (ia !== undefined && ib !== undefined && best.where[ia] !== best.where[ib]) violations.push(`${people[ia].name}·${people[ib].name} 다른 모둠`);
        });
        return { groups, score: best.score, violations };
    }

    // ---------- 기질 분포 ----------
    const CLASS_TITLE = {
        wood: '쑥쑥 자라는 숲 같은 반', fire: '에너지 넘치는 태양 같은 반', earth: '서로 품어 주는 산 같은 반',
        metal: '약속을 잘 지키는 보석 같은 반', water: '생각이 깊은 바다 같은 반'
    };
    const CLASS_BOOST = {
        wood: '새로운 아이디어 내기 · 꿈 발표 활동', fire: '칭찬 릴레이 · 신나는 발표 시간', earth: '우리 반 약속 함께 만들기 · 협동 놀이',
        metal: '정리 정돈 챌린지 · 시간 지키기 약속', water: '책 읽기 · 질문 탐구 시간'
    };

    function sunLon(ymd) {
        return Saju.sunLongitude(Saju.julianDay(+ymd.slice(0, 4), +ymd.slice(4, 6), +ymd.slice(6, 8), 12, 0));
    }

    function distribution(people) {
        const stems = new Array(10).fill(0);
        const els = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
        const letters = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
        const seasons = { 봄: 0, 여름: 0, 가을: 0, 겨울: 0 };
        const terms = new Array(24).fill(0);
        const animals = {};
        people.forEach(p => {
            const st = p.profile.saju.day.stem;
            stems[st.i]++;
            els[st.el]++;
            (p.mbti || '').split('').forEach(l => { if (l in letters) letters[l]++; });
            const t = Math.floor(sunLon(p.birth) / 15) % 24; // 0 = 춘분
            terms[t]++;
            // 입춘(315°)~입하 전 = 봄 … 절기 기준 계절
            const season = ['봄', '여름', '가을', '겨울'][Math.floor(((sunLon(p.birth) - 315 + 360) % 360) / 90)];
            seasons[season]++;
            const animal = p.profile.saju.year.branch.animal;
            animals[animal] = (animals[animal] || 0) + 1;
        });
        const order = Saju.EL.slice().sort((a, b) => els[b] - els[a]);
        const top = order[0];
        const low = order[order.length - 1];
        return {
            total: people.length, stems, els, letters, seasons, terms, animals,
            top, low,
            title: people.length ? CLASS_TITLE[top] : '',
            boost: people.length ? CLASS_BOOST[low] : ''
        };
    }

    // ---------- 다가오는 생일 ----------
    function solarOfLunar(year, lm, ld) {
        const K = typeof KoreanLunarCalendar !== 'undefined' ? KoreanLunarCalendar : null;
        if (!K) return null;
        for (const d of [ld, ld - 1]) { // 그해 그 달에 30일이 없으면 29일로
            const k = new K();
            if (d >= 1 && k.setLunarDate(year, lm, d, false)) {
                const s = k.getSolarCalendar();
                return new Date(s.year, s.month - 1, s.day);
            }
        }
        return null;
    }

    function birthdayIn(year, s) {
        if (s.cal === 'lunar' && s.lunar) {
            const d = solarOfLunar(year, +s.lunar.slice(4, 6), +s.lunar.slice(6, 8));
            if (d) return d;
        }
        const m = +s.birth.slice(4, 6), d = +s.birth.slice(6, 8);
        const dt = new Date(year, m - 1, d);
        if (dt.getMonth() !== m - 1) return new Date(year, m - 1, 28); // 2월 29일생 → 평년에는 28일
        return dt;
    }

    function upcomingBirthdays(students, today = new Date(), withinDays = 366) {
        const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return students.map(s => {
            let d = birthdayIn(base.getFullYear(), s);
            if (d < base) d = birthdayIn(base.getFullYear() + 1, s);
            const days = Math.round((d - base) / 86400000);
            const age = d.getFullYear() - +s.birth.slice(0, 4);
            return { student: s, date: d, days, age };
        }).filter(x => x.days <= withinDays).sort((a, b) => a.days - b.days || a.student.name.localeCompare(b.student.name, 'ko'));
    }

    function birthTermName(ymd) {
        const t = Math.floor(sunLon(ymd) / 15) % 24;
        return ExtraData.solarTerms ? ExtraData.solarTerms[t] : '';
    }

    return { parseRoster, withProfiles, parsePairs, makeGroups, distribution, upcomingBirthdays, birthdayIn, birthTermName, CLASS_TITLE, CLASS_BOOST };
})();

if (typeof module !== 'undefined') module.exports = ClassroomLogic;
