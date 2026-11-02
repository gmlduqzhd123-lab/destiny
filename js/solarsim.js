/**
 * [SolarSim] ☀️ 24절기 태양 여행 — 지구가 태양 둘레를 도는 위치(태양 황경)로 절기·낮 길이·태양 고도를 보여 주는 과학 시뮬레이터
 * 계산은 Saju.sunLongitude(Meeus 근사식)를 씁니다. 기준 위치는 서울(북위 37.57°).
 */
const SolarSim = (() => {
    const $ = id => document.getElementById(id);
    const RAD = Math.PI / 180;
    const SEOUL_LAT = 37.5665;
    const MAJOR = [0, 3, 6, 9, 12, 15, 18, 21]; // 춘분·입하·하지·입추·추분·입동·동지·입춘
    const SEASON_OF = lon => ['봄', '여름', '가을', '겨울'][Math.floor(((lon - 315 + 360) % 360) / 90)];

    // ---------- 계산 (순수 함수 — 테스트 대상) ----------
    const jdOf = ms => ms / 86400000 + 2440587.5;
    const lonAt = ms => Saju.sunLongitude(jdOf(ms));
    const termIndex = lon => Math.floor(lon / 15) % 24;

    /** 해당 연도에 절기가 바뀌는 순간(한국 표준시 날짜)을 모두 찾습니다. */
    function termDates(year) {
        const out = [];
        const start = Date.UTC(year, 0, 1, -9), end = Date.UTC(year + 1, 0, 1, -9);
        let t = start, prev = termIndex(lonAt(t));
        for (t = start + 86400000; t <= end; t += 86400000) {
            const cur = termIndex(lonAt(t));
            if (cur !== prev) {
                let lo = t - 86400000, hi = t;
                while (hi - lo > 60000) {
                    const mid = (lo + hi) / 2;
                    if (termIndex(lonAt(mid)) === prev) lo = mid; else hi = mid;
                }
                const kst = new Date(hi + 9 * 3600000);
                out.push({ index: cur, name: ExtraData.solarTerms[cur], month: kst.getUTCMonth() + 1, day: kst.getUTCDate(), hour: kst.getUTCHours(), minute: kst.getUTCMinutes(), ms: hi });
                prev = cur;
            }
        }
        return out;
    }

    /** 날짜(한국 표준시 정오)의 태양 황경·적위·낮 길이·정오 고도 */
    function dayInfo(y, m, d, lat = SEOUL_LAT) {
        const ms = Date.UTC(y, m - 1, d, 3); // 12:00 KST
        const lon = lonAt(ms);
        const eps = 23.4393 * RAD;
        const decl = Math.asin(Math.sin(eps) * Math.sin(lon * RAD));
        const phi = lat * RAD;
        const cosH = (Math.sin(-0.833 * RAD) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl));
        const H = Math.acos(Math.max(-1, Math.min(1, cosH)));
        return {
            lon,
            decl: decl / RAD,
            dayMinutes: Math.round((2 * H / RAD / 15) * 60),
            noonAlt: 90 - lat + decl / RAD,
            term: ExtraData.solarTerms[termIndex(lon)],
            season: SEASON_OF(lon)
        };
    }

    // ---------- 화면 ----------
    const st = { year: 0, days: 365, doy: 0, terms: [], timer: null, curve: [] };

    function dateOfDoy(doy) {
        return new Date(st.year, 0, 1 + doy);
    }

    function polar(r, deg) {
        return [r * Math.cos(deg * RAD), -r * Math.sin(deg * RAD)];
    }

    function drawOrbit(lon) {
        const R = 118;
        let svg = `<circle cx="0" cy="0" r="${R}" fill="none" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="3 4"/>`;
        // 계절 배경 글자
        [['봄', 0], ['여름', 90], ['가을', 180], ['겨울', 270]].forEach(([nm, l]) => {
            const [x, y] = polar(62, l + 180); // 계절 한가운데(춘분·하지·추분·동지) 쪽에 표시
            svg += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="sim-season" text-anchor="middle">${nm}</text>`;
        });
        for (let k = 0; k < 24; k++) {
            const a = k * 15 + 180; // 지구 위치 = 태양 황경 + 180°
            const [x1, y1] = polar(R - 5, a), [x2, y2] = polar(R + 5, a);
            const major = MAJOR.includes(k);
            svg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${major ? 'var(--gold)' : 'var(--muted)'}" stroke-width="${major ? 2 : 1}"/>`;
            if (major) {
                const [tx, ty] = polar(R + 24, a);
                svg += `<text x="${tx.toFixed(1)}" y="${(ty + 4).toFixed(1)}" class="sim-term" text-anchor="middle">${ExtraData.solarTerms[k].split('(')[0]}</text>`;
            }
        }
        // 지금 절기 구간 강조
        const k = termIndex(lon);
        const a0 = k * 15 + 180, a1 = a0 + 15;
        const [sx, sy] = polar(R, a0), [ex, ey] = polar(R, a1);
        svg += `<path d="M${sx.toFixed(1)},${sy.toFixed(1)} A${R},${R} 0 0 0 ${ex.toFixed(1)},${ey.toFixed(1)}" fill="none" stroke="var(--gold)" stroke-width="5" stroke-linecap="round" opacity="0.7"/>`;
        // 태양
        svg += `<circle cx="0" cy="0" r="22" fill="#ffcf4d"/><circle cx="0" cy="0" r="30" fill="#ffcf4d" opacity="0.25"/>`;
        // 지구 (자전축은 우주에서 늘 같은 방향으로 23.4° 기울어 있음)
        const [ex2, ey2] = polar(R, lon + 180);
        svg += `<line x1="${ex2.toFixed(1)}" y1="${ey2.toFixed(1)}" x2="0" y2="0" stroke="#ffcf4d" stroke-width="1" opacity="0.35"/>`;
        svg += `<g transform="translate(${ex2.toFixed(1)},${ey2.toFixed(1)})"><line x1="${(-16 * Math.sin(23.4 * RAD)).toFixed(1)}" y1="${(16 * Math.cos(23.4 * RAD)).toFixed(1)}" x2="${(16 * Math.sin(23.4 * RAD)).toFixed(1)}" y2="${(-16 * Math.cos(23.4 * RAD)).toFixed(1)}" stroke="#e2e8f0" stroke-width="1.5"/>
            <circle r="11" fill="#4f8fe6"/><path d="M-4,-6 q5,2 3,7 q-3,3 -6,-1z" fill="#6ee7b7"/></g>`;
        $('simSvg').innerHTML = svg;
    }

    function drawCurve() {
        // 1년 낮 길이 그래프 (서울)
        const w = 366, h = 80;
        const min = Math.min(...st.curve), max = Math.max(...st.curve);
        const pts = st.curve.map((v, i) => `${(i / (st.curve.length - 1) * w).toFixed(1)},${(h - 8 - (v - min) / (max - min) * (h - 20)).toFixed(1)}`).join(' ');
        const x = st.doy / (st.days - 1) * w;
        const v = st.curve[st.doy];
        const y = h - 8 - (v - min) / (max - min) * (h - 20);
        $('simDayChart').innerHTML = `<polyline points="${pts}" fill="none" stroke="var(--gold)" stroke-width="2"/>
            <line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${h}" stroke="var(--muted)" stroke-dasharray="2 3"/>
            <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#ff8b7b"/>
            <text x="2" y="${h - 1}" class="sim-axis">1월</text><text x="${w / 2}" y="${h - 1}" class="sim-axis" text-anchor="middle">7월</text><text x="${w - 2}" y="${h - 1}" class="sim-axis" text-anchor="end">12월</text>`;
    }

    function render() {
        const d = dateOfDoy(st.doy);
        const info = dayInfo(d.getFullYear(), d.getMonth() + 1, d.getDate());
        drawOrbit(info.lon);
        drawCurve();
        const k = termIndex(info.lon);
        const nowMs = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 3);
        const cur = st.terms.filter(t => t.index === k && t.ms <= nowMs + 86400000).pop();
        // 다음 절기: 오늘 시작하는 절기도 '다음'으로 보고 날짜 단위로 D-day를 셉니다.
        const todayUtc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
        const next = st.terms.find(t => Date.UTC(st.year, t.month - 1, t.day) >= todayUtc && t.index !== k) || null;
        const dl = info.dayMinutes;
        const dday = next ? Math.round((Date.UTC(st.year, next.month - 1, next.day) - todayUtc) / 86400000) : null;
        $('simInfo').innerHTML = `
            <div><b>${d.getMonth() + 1}월 ${d.getDate()}일</b><span>${info.season}</span></div>
            <div><b>${info.term}</b><span>${cur ? `${cur.month}/${cur.day} 시작` : '지금 절기'}</span></div>
            <div><b>${next ? next.name.split('(')[0] : '-'}</b><span>${next ? (dday === 0 ? `오늘 ${String(next.hour).padStart(2, '0')}:${String(next.minute).padStart(2, '0')} 시작` : `다음 절기 D-${dday}`) : '올해 마지막 절기'}</span></div>
            <div><b>${info.lon.toFixed(1)}°</b><span>태양 황경</span></div>
            <div><b>${Math.floor(dl / 60)}시간 ${dl % 60}분</b><span>서울 낮 길이</span></div>
            <div><b>${info.noonAlt.toFixed(1)}°</b><span>정오 태양 높이</span></div>`;
        $('simRange').value = st.doy;
        $('simRange').setAttribute('aria-valuetext', `${d.getMonth() + 1}월 ${d.getDate()}일, ${info.term}`);
    }

    function open() {
        const now = new Date();
        st.year = now.getFullYear();
        st.days = (new Date(st.year + 1, 0, 1) - new Date(st.year, 0, 1)) / 86400000;
        st.doy = Math.round((new Date(st.year, now.getMonth(), now.getDate()) - new Date(st.year, 0, 1)) / 86400000);
        st.terms = termDates(st.year);
        st.curve = Array.from({ length: st.days }, (_, i) => {
            const d = dateOfDoy(i);
            return dayInfo(d.getFullYear(), d.getMonth() + 1, d.getDate()).dayMinutes;
        });
        $('simRange').max = st.days - 1;
        $('simYear').textContent = `${st.year}년`;
        $('simView').hidden = false;
        render();
        $('simClose').focus();
    }

    function stop() {
        clearInterval(st.timer);
        st.timer = null;
        $('simPlay').textContent = '▶ 1년 돌려 보기';
    }

    function close() {
        stop();
        $('simView').hidden = true;
    }

    function togglePlay() {
        if (st.timer) { stop(); return; }
        $('simPlay').textContent = '⏸ 멈추기';
        st.timer = setInterval(() => {
            st.doy = (st.doy + 2) % st.days;
            render();
        }, 90);
    }

    function init() {
        document.addEventListener('click', e => {
            if (e.target.closest('[data-open-sim]')) { e.preventDefault(); open(); }
        });
        $('simClose').addEventListener('click', close);
        $('simView').addEventListener('click', e => { if (e.target === $('simView')) close(); });
        $('simRange').addEventListener('input', e => { stop(); st.doy = +e.target.value; render(); });
        $('simPlay').addEventListener('click', togglePlay);
        $('simToday').addEventListener('click', () => {
            stop();
            const now = new Date();
            st.doy = Math.round((new Date(st.year, now.getMonth(), now.getDate()) - new Date(st.year, 0, 1)) / 86400000);
            render();
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('simView').hidden) close(); });
    }

    if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);

    return { termDates, dayInfo, open, close };
})();
