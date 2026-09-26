/**
 * [Saju] 만세력 계산 엔진
 * - 일주: 1900-01-01(甲戌일) 기준 60갑자 순환
 * - 년주·월주: 태양 황경(절기)으로 계산 — 입춘(315°)에 해가 바뀌고, 절입(315°+30°×n)마다 달이 바뀝니다.
 * - 시주: 일간 기준 시두법. 23시 이후 출생은 다음 날 자시(子時)로 봅니다.
 * - 입력 시각은 한국 표준시(UTC+9)로 간주합니다.
 */
const Saju = (() => {
    const EL = ['wood', 'fire', 'earth', 'metal', 'water'];
    const EL_KOR = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
    const EL_HANJA = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };

    const STEMS = '甲乙丙丁戊己庚辛壬癸'.split('').map((hanja, i) => ({
        i, hanja, kor: '갑을병정무기경신임계'[i], el: EL[Math.floor(i / 2)], yang: i % 2 === 0
    }));

    const B_EL = ['water', 'earth', 'wood', 'wood', 'earth', 'fire', 'fire', 'earth', 'metal', 'metal', 'earth', 'water'];
    const B_HIDDEN = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8]; // 지장간 본기 (십신 판정용)
    const ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
    const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'.split('').map((hanja, i) => ({
        i, hanja, kor: '자축인묘진사오미신유술해'[i], el: B_EL[i], yang: i % 2 === 0,
        hidden: B_HIDDEN[i], animal: ANIMALS[i]
    }));

    const TEN_GODS = [
        ['bigyeon', 'geopjae'],       // 같은 오행
        ['siksin', 'sanggwan'],       // 내가 생하는 오행
        ['pyeonjae', 'jeongjae'],     // 내가 극하는 오행
        ['pyeongwan', 'jeonggwan'],   // 나를 극하는 오행
        ['pyeonin', 'jeongin']        // 나를 생하는 오행
    ];

    // ---------- 천문 계산 ----------
    function julianDay(y, m, d, hour = 12, minute = 0) {
        // 한국 표준시 → UTC
        return Date.UTC(y, m - 1, d, hour - 9, minute) / 86400000 + 2440587.5;
    }

    function sunLongitude(jd) {
        const T = (jd - 2451545.0) / 36525;
        const rad = Math.PI / 180;
        const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
        const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * rad;
        const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
            + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
            + 0.000289 * Math.sin(3 * M);
        const omega = (125.04 - 1934.136 * T) * rad;
        const lon = L0 + C - 0.00569 - 0.00478 * Math.sin(omega);
        return ((lon % 360) + 360) % 360;
    }

    // 0 = 寅월(입춘~경칩), 1 = 卯월, ... 10 = 子월, 11 = 丑월
    function solarMonthIndex(jd) {
        return Math.floor((((sunLongitude(jd) - 315) % 360) + 360) % 360 / 30);
    }

    // ---------- 간지 ----------
    function sexagenary(stem, branch) {
        return (((6 * stem - 5 * branch) % 60) + 60) % 60;
    }

    function pillarOf(n) {
        n = ((n % 60) + 60) % 60;
        return { stem: STEMS[n % 10], branch: BRANCHES[n % 12], n };
    }

    function dayIndex(y, m, d) {
        const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 1)) / 86400000);
        return (((10 + days) % 60) + 60) % 60; // 1900-01-01 = 甲戌(10)
    }

    /**
     * @param {{y:number,m:number,d:number,hour?:number|null,minute?:number}} b
     */
    function calc(b) {
        const hasTime = b.hour !== null && b.hour !== undefined;
        const hour = hasTime ? b.hour : 12;
        const minute = hasTime ? (b.minute || 0) : 0;
        const jd = julianDay(b.y, b.m, b.d, hour, minute);

        const mIdx = solarMonthIndex(jd);
        let year = b.y;
        if (b.m <= 2 && mIdx >= 10) year -= 1; // 입춘 전이면 전년도
        const yStem = (((year - 4) % 10) + 10) % 10;
        const yBranch = (((year - 4) % 12) + 12) % 12;

        const mStem = (yStem * 2 + 2 + mIdx) % 10;
        const mBranch = (mIdx + 2) % 12;

        // 23시 이후 출생은 다음 날의 일주를 씁니다.
        let dDate = new Date(Date.UTC(b.y, b.m - 1, b.d));
        if (hasTime && hour >= 23) dDate = new Date(dDate.getTime() + 86400000);
        const dN = dayIndex(dDate.getUTCFullYear(), dDate.getUTCMonth() + 1, dDate.getUTCDate());
        const day = pillarOf(dN);

        let hourP = null;
        if (hasTime) {
            const hBranch = Math.floor(((hour + 1) % 24) / 2);
            const hStem = (day.stem.i * 2 + hBranch) % 10;
            hourP = pillarOf(sexagenary(hStem, hBranch));
        }

        return {
            year: pillarOf(sexagenary(yStem, yBranch)),
            month: pillarOf(sexagenary(mStem, mBranch)),
            day,
            hour: hourP,
            pillarYear: year,
            jd,
            hasTime
        };
    }

    // ---------- 관계 ----------
    function tenGod(meStem, otherStemIdx) {
        const me = STEMS[meStem.i !== undefined ? meStem.i : meStem];
        const other = STEMS[otherStemIdx];
        const rel = (EL.indexOf(other.el) - EL.indexOf(me.el) + 5) % 5;
        return TEN_GODS[rel][me.yang === other.yang ? 0 : 1];
    }

    function tenGodOfBranch(meStem, branchIdx) {
        return tenGod(meStem, BRANCHES[branchIdx].hidden);
    }

    // 오행 관계: 'same' | 'iGenerate' | 'iControl' | 'controlsMe' | 'generatesMe'
    function elementRelation(elA, elB) {
        return ['same', 'iGenerate', 'iControl', 'controlsMe', 'generatesMe'][(EL.indexOf(elB) - EL.indexOf(elA) + 5) % 5];
    }

    function stemCombine(a, b) {
        return Math.abs(a - b) === 5;
    }

    const SAMHAP = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];
    const WONJIN = [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]];

    function branchRelation(a, b) {
        if (a === b) return 'same';
        if ((a + b) % 12 === 1) return 'yukhap';   // 子丑, 寅亥, 卯戌, 辰酉, 巳申, 午未
        if (Math.abs(a - b) === 6) return 'chung';
        if (SAMHAP.some(g => g.includes(a) && g.includes(b))) return 'samhap';
        if (WONJIN.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return 'wonjin';
        return 'none';
    }

    // ---------- 분석 ----------
    function pillarsList(saju) {
        return [saju.hour, saju.day, saju.month, saju.year];
    }

    function elementCounts(saju) {
        const c = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
        pillarsList(saju).forEach(p => {
            if (!p) return;
            c[p.stem.el]++;
            c[p.branch.el]++;
        });
        return c;
    }

    // 가장 부족한 오행 (동률이면 일간을 생해 주는 오행 → 일간과 같은 오행 → 나머지 순)
    function weakestElement(saju) {
        const c = elementCounts(saju);
        const me = EL.indexOf(saju.day.stem.el);
        const pref = [(me + 4) % 5, me, (me + 1) % 5, (me + 2) % 5, (me + 3) % 5].map(i => EL[i]);
        return pref.reduce((best, el) => (c[el] < c[best] ? el : best), pref[0]);
    }

    function strongestElement(saju) {
        const c = elementCounts(saju);
        return EL.reduce((best, el) => (c[el] > c[best] ? el : best), EL[0]);
    }

    // ---------- 대운 ----------
    function findBoundary(jd, forward) {
        const start = solarMonthIndex(jd);
        const step = forward ? 1 : -1;
        let lo = jd, hi = jd;
        for (let i = 0; i < 40; i++) {
            hi = jd + step * (i + 1);
            if (solarMonthIndex(hi) !== start) break;
            lo = hi;
        }
        for (let i = 0; i < 30; i++) {
            const mid = (lo + hi) / 2;
            if (solarMonthIndex(mid) === start) lo = mid; else hi = mid;
        }
        return (lo + hi) / 2;
    }

    function daewoon(saju, gender) {
        const forward = (saju.year.stem.yang && gender === 'M') || (!saju.year.stem.yang && gender === 'F');
        const boundary = findBoundary(saju.jd, forward);
        const days = Math.abs(boundary - saju.jd);
        const startAge = Math.max(1, Math.round(days / 3)); // 3일 = 1년
        const list = [];
        for (let k = 1; k <= 10; k++) {
            const p = pillarOf(saju.month.n + (forward ? k : -k));
            list.push({ ...p, age: startAge + (k - 1) * 10 });
        }
        return { forward, startAge, list };
    }

    function todayPillars(date) {
        return calc({ y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate(), hour: 12, minute: 0 });
    }

    return {
        EL, EL_KOR, EL_HANJA, STEMS, BRANCHES,
        calc, pillarOf, sexagenary, dayIndex, sunLongitude, julianDay,
        tenGod, tenGodOfBranch, elementRelation, stemCombine, branchRelation,
        elementCounts, weakestElement, strongestElement, daewoon, todayPillars
    };
})();

if (typeof module !== 'undefined') module.exports = Saju;
