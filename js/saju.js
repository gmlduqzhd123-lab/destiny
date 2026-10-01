/**
 * [Saju] 만세력 계산 엔진
 * - 일주: 1900-01-01(甲戌일) 기준 60갑자 순환
 * - 년주·월주: 태양 황경(절기)으로 계산 — 입춘(315°)에 해가 바뀌고, 절입(315°+30°×n)마다 달이 바뀝니다.
 * - 시주: 일간 기준 시두법. 23시 이후 출생은 다음 날 자시(子時)로 봅니다.
 * - 태어난 지역(경도)을 주면, 당시 한국 표준시·서머타임 이력을 반영해 실제 순간(UTC)을 구하고
 *   그 지역의 평균태양시로 시주·일주를 정합니다. 지역이 없으면 입력 시각을 그대로 씁니다.
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

    /**
     * 균시차(분): 진태양시 − 평균태양시. 2월 중순 약 −14분, 11월 초 약 +16분.
     * NOAA/Meeus 근사식 (오차 수십 초 이내)
     */
    function equationOfTime(jd) {
        const T = (jd - 2451545.0) / 36525;
        const rad = Math.PI / 180;
        const L0 = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) * rad;
        const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * rad;
        const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
        const eps = (23.439291 - 0.0130042 * T) * rad;
        const y = Math.tan(eps / 2) ** 2;
        const E = y * Math.sin(2 * L0) - 2 * e * Math.sin(M) + 4 * e * y * Math.sin(M) * Math.cos(2 * L0)
            - 0.5 * y * y * Math.sin(4 * L0) - 1.25 * e * e * Math.sin(2 * M);
        return E / rad * 4;
    }

    // 0 = 寅월(입춘~경칩), 1 = 卯월, ... 10 = 子월, 11 = 丑월
    function solarMonthIndex(jd) {
        return Math.floor((((sunLongitude(jd) - 315) % 360) + 360) % 360 / 30);
    }

    // ---------- 출생 시각 보정 ----------
    // 한국 표준시·서머타임 이력 (tzdb Asia/Seoul): [바뀐 순간(UTC), UTC와의 차이(분), 서머타임 여부]
    // 1908-04-01 이전은 지역마다 평균태양시를 썼습니다.
    const KR_TZ = [
        [Date.UTC(1908, 2, 31, 15, 33), 510, false],
        [Date.UTC(1911, 11, 31, 15, 30), 540, false],
        [Date.UTC(1948, 4, 31, 15, 0), 600, true],
        [Date.UTC(1948, 8, 12, 14, 0), 540, false],
        [Date.UTC(1949, 3, 2, 15, 0), 600, true],
        [Date.UTC(1949, 8, 10, 14, 0), 540, false],
        [Date.UTC(1950, 2, 31, 15, 0), 600, true],
        [Date.UTC(1950, 8, 9, 14, 0), 540, false],
        [Date.UTC(1951, 4, 5, 15, 0), 600, true],
        [Date.UTC(1951, 8, 8, 14, 0), 540, false],
        [Date.UTC(1954, 2, 20, 15, 0), 510, false],
        [Date.UTC(1955, 4, 4, 15, 30), 570, true],
        [Date.UTC(1955, 8, 8, 14, 30), 510, false],
        [Date.UTC(1956, 4, 19, 15, 30), 570, true],
        [Date.UTC(1956, 8, 29, 14, 30), 510, false],
        [Date.UTC(1957, 4, 4, 15, 30), 570, true],
        [Date.UTC(1957, 8, 21, 14, 30), 510, false],
        [Date.UTC(1958, 4, 3, 15, 30), 570, true],
        [Date.UTC(1958, 8, 20, 14, 30), 510, false],
        [Date.UTC(1959, 4, 2, 15, 30), 570, true],
        [Date.UTC(1959, 8, 19, 14, 30), 510, false],
        [Date.UTC(1960, 3, 30, 15, 30), 570, true],
        [Date.UTC(1960, 8, 17, 14, 30), 510, false],
        [Date.UTC(1961, 7, 9, 15, 30), 540, false],
        [Date.UTC(1987, 4, 9, 17, 0), 600, true],
        [Date.UTC(1987, 9, 10, 17, 0), 540, false],
        [Date.UTC(1988, 4, 7, 17, 0), 600, true],
        [Date.UTC(1988, 9, 8, 17, 0), 540, false]
    ];

    // 태어난 지역 (경도, 동경 °)
    const PLACES = [
        { group: '서울·경기·인천', list: [['seoul', '서울', 126.98], ['incheon', '인천', 126.71], ['suwon', '수원·경기 남부', 127.03], ['uijeongbu', '의정부·경기 북부', 127.05]] },
        { group: '강원', list: [['chuncheon', '춘천', 127.73], ['wonju', '원주', 127.95], ['gangneung', '강릉·동해', 128.88]] },
        { group: '충청', list: [['daejeon', '대전', 127.38], ['sejong', '세종', 127.29], ['cheongju', '청주', 127.49], ['chungju', '충주', 127.93], ['cheonan', '천안·아산', 127.15], ['hongseong', '홍성·서산', 126.66]] },
        { group: '전라', list: [['jeonju', '전주', 127.15], ['gunsan', '군산·익산', 126.74], ['gwangju', '광주', 126.85], ['mokpo', '목포', 126.39], ['suncheon', '순천·여수', 127.56]] },
        { group: '경상', list: [['daegu', '대구', 128.60], ['andong', '안동', 128.73], ['pohang', '포항·경주', 129.36], ['busan', '부산', 129.08], ['ulsan', '울산', 129.31], ['changwon', '창원·마산', 128.68], ['jinju', '진주', 128.11], ['ulleung', '울릉도', 130.90]] },
        { group: '제주', list: [['jeju', '제주·서귀포', 126.53]] },
        { group: '북한', list: [['pyongyang', '평양', 125.75], ['hamhung', '함흥', 127.54], ['sinuiju', '신의주', 124.40]] }
    ];
    const PLACE_MAP = {};
    PLACES.forEach(g => g.list.forEach(([id, name, lon]) => { PLACE_MAP[id] = { id, name, lon }; }));

    function koreaZoneAt(utcMs) {
        let cur = null;
        for (const [t, off, dst] of KR_TZ) {
            if (utcMs >= t) cur = { off, dst }; else break;
        }
        return cur;
    }

    // 벽시계 시각 → 실제 순간(UTC ms). 1908년 이전은 그 지역 평균태양시로 봅니다.
    function wallToUtc(wallMs, lon) {
        let utc = wallMs - 540 * 60000;
        for (let i = 0; i < 3; i++) {
            const z = koreaZoneAt(utc);
            utc = wallMs - (z ? z.off : lon * 4) * 60000;
        }
        const z = koreaZoneAt(utc);
        return { utc, offset: z ? z.off : null, dst: !!(z && z.dst), lmt: !z };
    }

    function hhmm(ms) {
        const d = new Date(Math.round(ms / 60000) * 60000);
        return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
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
     * @param {{y:number,m:number,d:number,hour?:number|null,minute?:number,lon?:number|null}} b
     *        lon: 태어난 지역의 경도. 있으면 표준시·서머타임 이력과 경도로 시각을 보정합니다.
     */
    function calc(b) {
        const hasTime = b.hour !== null && b.hour !== undefined;
        const wallMs = Date.UTC(b.y, b.m - 1, b.d, hasTime ? b.hour : 12, hasTime ? (b.minute || 0) : 0);
        let utcMs = wallMs - 540 * 60000;
        let localMs = wallMs; // 시주·일주를 정하는 시각
        let correction = null;
        if (hasTime && typeof b.lon === 'number') {
            const w = wallToUtc(wallMs, b.lon);
            utcMs = w.utc;
            // 표준 자오선과의 경도 차이 (15°마다 1시간). 서머타임 1시간은 따로 셉니다.
            const lonMin = w.lmt ? 0 : b.lon * 4 - (w.offset - (w.dst ? 60 : 0));
            const eotMin = equationOfTime(utcMs / 86400000 + 2440587.5);
            // 진태양시 = UTC + 경도 시차 + 균시차
            localMs = utcMs + (b.lon * 4 + eotMin) * 60000;
            correction = {
                wall: hhmm(wallMs),
                solar: hhmm(localMs),
                diffMin: Math.round((localMs - wallMs) / 60000),
                lonMin: Math.round(lonMin),
                eotMin: Math.round(eotMin),
                dst: w.dst,
                offset: w.offset,
                lmt: w.lmt,
                dayShift: Math.floor(localMs / 86400000) - Math.floor(wallMs / 86400000)
            };
        }
        const jd = utcMs / 86400000 + 2440587.5;
        const local = new Date(localMs);
        const hour = local.getUTCHours();

        const mIdx = solarMonthIndex(jd);
        let year = b.y;
        if (b.m <= 2 && mIdx >= 10) year -= 1; // 입춘 전이면 전년도
        const yStem = (((year - 4) % 10) + 10) % 10;
        const yBranch = (((year - 4) % 12) + 12) % 12;

        const mStem = (yStem * 2 + 2 + mIdx) % 10;
        const mBranch = (mIdx + 2) % 12;

        // 23시 이후 출생은 다음 날의 일주를 씁니다. (보정한 시각 기준)
        let dDate = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
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
            hasTime,
            correction
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
        PLACES, PLACE_MAP, calc, equationOfTime, pillarOf, sexagenary, dayIndex, sunLongitude, julianDay,
        tenGod, tenGodOfBranch, elementRelation, stemCombine, branchRelation,
        elementCounts, weakestElement, strongestElement, daewoon, todayPillars
    };
})();

if (typeof module !== 'undefined') module.exports = Saju;
