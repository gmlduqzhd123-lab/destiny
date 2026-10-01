/**
 * [Fortune] 사주 원국과 오늘의 일진으로 운세를 산출합니다.
 * 점수와 문장에는 모두 근거(십신·지지 관계·오행 균형)가 있고, 같은 날 같은 입력이면 결과가 같습니다.
 */
const Fortune = (() => {
    function birthOf(user) {
        const [hh, mm] = user.time ? user.time.split(':').map(Number) : [null, 0];
        // 태어난 지역이 있으면 경도로 출생 시각을 보정합니다 (지역 없이 저장된 예전 기록은 보정하지 않음).
        const place = user.time && user.place ? Saju.PLACE_MAP[user.place] : null;
        return { y: +user.birth.slice(0, 4), m: +user.birth.slice(4, 6), d: +user.birth.slice(6, 8), hour: hh, minute: mm, lon: place ? place.lon : null };
    }

    function profile(user) {
        const saju = Saju.calc(birthOf(user));
        return {
            saju,
            counts: Saju.elementCounts(saju),
            weak: Saju.weakestElement(saju),
            strong: Saju.strongestElement(saju),
            ilgan: SajuData.ilgan[saju.day.stem.i]
        };
    }

    function userKey(user) {
        // 지역은 시간을 넣었을 때만 결과에 영향을 주므로 그때만 키에 넣습니다 (예전 기록과 키 호환).
        const place = user.time && user.place ? '-' + user.place : '';
        return `${user.name}-${user.birth}-${user.time || ''}-${user.gender}-${user.mbti}${place}`;
    }

    const WEALTH = ['pyeonjae', 'jeongjae'];
    const OFFICER = ['pyeongwan', 'jeonggwan'];

    function today(user, prof, date) {
        const rnd = Engine.prng(`${userKey(user)}-${Engine.ymd(date)}`);
        const tp = Saju.todayPillars(date);
        const me = prof.saju.day.stem;
        const godKey = Saju.tenGod(me, tp.day.stem.i);
        const god = SajuData.sipsin[godKey];
        const relKey = Saju.branchRelation(prof.saju.day.branch.i, tp.day.branch.i);
        const rel = SajuData.branchMod[relKey];

        const s = { ...god.base };
        // 전통 명리에서 남성은 재성, 여성은 관성을 인연의 별로 봅니다.
        if ((user.gender === 'M' && WEALTH.includes(godKey)) || (user.gender === 'F' && OFFICER.includes(godKey))) s.love += 8;
        if (rel) Object.keys(s).forEach(k => { s[k] += rel.score[k]; });

        const todayEl = tp.day.stem.el;
        let balance = null;
        if (todayEl === prof.weak) {
            balance = 'boost';
            Object.keys(s).forEach(k => { s[k] += 5; });
        } else if (todayEl === prof.strong && prof.counts[prof.strong] >= 3) {
            balance = 'excess';
            Object.keys(s).forEach(k => { s[k] -= 3; });
        }
        Object.keys(s).forEach(k => { s[k] = Engine.clamp(Math.round(s[k] + rnd() * 12 - 6), 35, 98); });

        return { tp, godKey, god, relKey, rel, balance, todayEl, scores: s, rnd };
    }

    function average(scores) {
        return Math.round((scores.love + scores.money + scores.work) / 3);
    }

    return { birthOf, profile, today, userKey, average };
})();
