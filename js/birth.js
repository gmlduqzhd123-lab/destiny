/**
 * [Birth] 생년월일 해석 — 19980101, 1998.1.1, 1998-01-01, 1998년 1월 1일, 980101과 음력·윤달을 양력 YYYYMMDD로 맞춥니다.
 * 앱 입력·친구 입력·우리 반 명렬표가 함께 씁니다.
 */
const Birth = (() => {
    function normalize(raw) {
        const str = String(raw || '').trim();
        const cur = new Date().getFullYear() % 100;
        const full = yy => (+yy <= cur ? '20' : '19') + yy;
        if (/^\d{8}$/.test(str)) return str;
        if (/^\d{6}$/.test(str)) return full(str.slice(0, 2)) + str.slice(2);
        const m = str.match(/^(\d{4}|\d{2})\D+(\d{1,2})\D+(\d{1,2})\D*$/);
        if (m) return (m[1].length === 2 ? full(m[1]) : m[1]) + m[2].padStart(2, '0') + m[3].padStart(2, '0');
        return null;
    }

    function parse(raw) {
        const str = normalize(raw);
        if (!str) return { error: '생년월일을 알아볼 수 없어요. 예: 2015.05.05' };
        const y = +str.slice(0, 4), m = +str.slice(4, 6), d = +str.slice(6, 8);
        const date = new Date(y, m - 1, d);
        if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
            return { error: '존재하지 않는 날짜입니다. 다시 확인해 주세요.' };
        }
        if (y < 1000 || date > new Date()) return { error: '1000년 이후, 오늘 이전의 날짜를 입력해 주세요.' };
        return { y, m, d, ymd: str };
    }

    /** @param {'solar'|'lunar'|'leap'} cal */
    function resolve(raw, cal) {
        if (cal !== 'lunar' && cal !== 'leap') return parse(raw);
        const str = normalize(raw);
        if (!str) return { error: '생년월일을 알아볼 수 없어요. 예: 2015.05.05' };
        const ly = +str.slice(0, 4), lm = +str.slice(4, 6), ld = +str.slice(6, 8);
        if (ly < 1900 || lm < 1 || lm > 12 || ld < 1 || ld > 30) return { error: '음력 날짜를 다시 확인해 주세요. (1900년 이후, 1~12월, 1~30일)' };
        const leap = cal === 'leap';
        let solar = null;
        try {
            const conv = new KoreanLunarCalendar();
            if (conv.setLunarDate(ly, lm, ld, leap)) solar = conv.getSolarCalendar();
        } catch (e) { /* 아래에서 오류로 처리 */ }
        if (!solar) {
            return { error: leap ? `${ly}년에는 윤${lm}월 ${ld}일이 없어요. 윤달 여부와 날짜를 확인해 주세요.` : '음력에 없는 날짜예요. 날짜를 다시 확인해 주세요.' };
        }
        const b = parse(`${solar.year}${String(solar.month).padStart(2, '0')}${String(solar.day).padStart(2, '0')}`);
        if (b.error) return b;
        return { ...b, lunar: str, leap };
    }

    function format(ymd) {
        return `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
    }

    return { normalize, parse, resolve, format };
})();
