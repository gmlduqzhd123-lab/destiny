/**
 * [Compat] 궁합 — 일간 오행(30) + 일지·배우자 자리(20) + 띠(20) + MBTI(30) = 100점
 * 초대 링크: ?invite=<base64url(JSON)> 로 상대가 내 정보를 입력 없이 불러와 궁합을 봅니다.
 */
const Compat = (() => {
    const BRANCH_SCORE = { yukhap: 20, samhap: 18, same: 14, none: 13, wonjin: 8, chung: 6 };

    const DAYJI_TEXT = {
        yukhap: '일지(배우자 자리)가 육합(六合)을 이룹니다. 함께 생활할수록 편안해지는 조합입니다.',
        samhap: '일지가 삼합(三合)으로 이어져 같은 목표를 향해 힘을 모으기 좋습니다.',
        same: '일지가 같아 생활 리듬과 취향이 많이 닮았습니다.',
        none: '일지 사이에 특별한 충돌이 없어 무난하게 어울립니다.',
        wonjin: '일지가 원진(怨嗔) 관계라 이유 없이 서운함이 쌓일 수 있습니다. 작은 표현이 큰 차이를 만듭니다.',
        chung: '일지가 충(沖)하여 생활 방식이 크게 다를 수 있습니다. 대신 서로에게 새로운 자극이 됩니다.'
    };

    const TTI_TEXT = {
        yukhap: '육합(六合)의 띠 궁합으로, 서로를 편안하게 품어 주는 사이입니다.',
        samhap: '삼합(三合)의 띠 궁합으로, 함께 일을 도모하면 큰 힘이 됩니다.',
        same: '같은 띠라 친구처럼 통하는 면이 많습니다.',
        none: '무난한 띠 궁합으로, 두 사람이 만들어 가기 나름입니다.',
        wonjin: '원진(怨嗔)의 띠 궁합이라 사소한 오해를 조심해야 합니다. 말로 확인하는 습관이 약이 됩니다.',
        chung: '충(沖)의 띠 궁합이라 성향이 정반대일 수 있습니다. 차이를 인정하면 오히려 단단해집니다.'
    };

    const GRADES = [
        { min: 90, name: '천생연분', gentle: '하늘이 맺어 준 듯 잘 어울리는 두 사람입니다. 지금의 따뜻함을 오래 지켜 가세요.', direct: '보기 드문 조합입니다. 이 인연을 소홀히 하면 가장 크게 후회할 사람은 당신입니다.' },
        { min: 80, name: '찰떡궁합', gentle: '서로의 부족함을 자연스럽게 채워 주는 사이입니다. 함께할수록 더 좋아집니다.', direct: '잘 맞는 사이입니다. 익숙함에 기대 표현을 줄이지만 마십시오.' },
        { min: 70, name: '좋은 인연', gentle: '편안하게 어울리는 인연입니다. 작은 배려가 관계를 한층 깊게 만듭니다.', direct: '무난하게 좋은 사이입니다. 한 걸음 더 가까워지려면 먼저 마음을 여십시오.' },
        { min: 60, name: '노력하면 빛나는 인연', gentle: '다른 점이 많지만 그만큼 배울 것도 많은 사이입니다. 천천히 맞춰 가 보세요.', direct: '저절로 잘 맞는 사이는 아닙니다. 서로의 방식을 존중하는 규칙을 정하십시오.' },
        { min: 0, name: '서로를 비추는 거울', gentle: '서로 무척 다른 두 사람입니다. 차이를 이해하는 순간 가장 든든한 짝이 될 수 있습니다.', direct: '정반대에 가까운 조합입니다. 상대를 바꾸려 하지 말고 차이를 인정하는 것부터 시작하십시오.' }
    ];

    function stemPart(a, b) {
        const sa = a.profile.saju.day.stem, sb = b.profile.saju.day.stem;
        const ea = Saju.EL_HANJA[sa.el], eb = Saju.EL_HANJA[sb.el];
        let score, text;
        if (Saju.stemCombine(sa.i, sb.i)) {
            score = 30;
            text = `${sa.hanja}와 ${sb.hanja}는 천간합(天干合)을 이룹니다. 만나면 자연스럽게 끌리고 마음이 하나로 묶이는 인연입니다.`;
        } else {
            const rel = Saju.elementRelation(sa.el, sb.el);
            if (rel === 'iGenerate') { score = 26; text = `${a.name}님의 ${ea} 기운이 ${b.name}님의 ${eb} 기운을 살려 줍니다(상생). ${a.name}님이 아낌없이 주고, ${b.name}님이 그 안에서 자라는 관계입니다.`; }
            else if (rel === 'generatesMe') { score = 26; text = `${b.name}님의 ${eb} 기운이 ${a.name}님의 ${ea} 기운을 살려 줍니다(상생). ${b.name}님이 든든한 버팀목이 되어 주는 관계입니다.`; }
            else if (rel === 'same') { score = 21; text = `같은 ${ea} 기운의 두 사람입니다(비화). 친구처럼 통하지만, 부딪칠 때는 둘 다 물러서지 않을 수 있습니다.`; }
            else if (rel === 'iControl') { score = 15; text = `${a.name}님의 ${ea} 기운이 ${b.name}님의 ${eb} 기운을 다스립니다(상극). ${a.name}님이 이끄는 구조라, ${b.name}님의 뜻을 존중하는 것이 중요합니다.`; }
            else { score = 15; text = `${b.name}님의 ${eb} 기운이 ${a.name}님의 ${ea} 기운을 다스립니다(상극). ${b.name}님이 이끄는 구조라, ${a.name}님의 뜻을 존중하는 것이 중요합니다.`; }
        }
        // 오행 보완: 상대가 내게 부족한 기운을 넉넉히 가졌는지
        const fills = [];
        if (b.profile.counts[a.profile.weak] >= 2) fills.push(`${b.name}님은 ${a.name}님에게 부족한 ${Saju.EL_HANJA[a.profile.weak]} 기운을 채워 줍니다.`);
        if (a.profile.counts[b.profile.weak] >= 2) fills.push(`${a.name}님은 ${b.name}님에게 부족한 ${Saju.EL_HANJA[b.profile.weak]} 기운을 채워 줍니다.`);
        if (fills.length) {
            score = Math.min(30, score + 2 * fills.length);
            text += ' ' + fills.join(' ');
        }
        return { title: `일간 오행 · ${sa.hanja}${ea} × ${sb.hanja}${eb}`, score, max: 30, text };
    }

    function branchPart(a, b, which) {
        const pa = a.profile.saju[which].branch, pb = b.profile.saju[which].branch;
        const rel = Saju.branchRelation(pa.i, pb.i);
        if (which === 'day') {
            return { title: `배우자 자리(일지) · ${pa.hanja} × ${pb.hanja}`, score: BRANCH_SCORE[rel], max: 20, text: DAYJI_TEXT[rel] };
        }
        return { title: `띠 · ${pa.animal}띠 × ${pb.animal}띠`, score: BRANCH_SCORE[rel], max: 20, text: `${pa.animal}띠와 ${pb.animal}띠는 ` + TTI_TEXT[rel] };
    }

    function mbtiPart(a, b) {
        const x = a.mbti, y = b.mbti;
        let score = 0;
        const lines = [];
        if (x[0] !== y[0]) { score += 6; lines.push('외향과 내향이 만나 서로의 빈 곳을 채워 줍니다.'); }
        else { score += 4; lines.push(x[0] === 'E' ? '둘 다 외향형이라 함께하면 활기가 넘칩니다.' : '둘 다 내향형이라 서로의 조용한 시간을 존중해 줍니다.'); }
        if (x[1] === y[1]) { score += 9; lines.push('세상을 보는 방식(S/N)이 같아 대화가 잘 통합니다.'); }
        else { score += 3; lines.push('세상을 보는 방식(S/N)이 달라 설명이 필요할 때가 있지만, 서로의 시야를 넓혀 줍니다.'); }
        if (x[2] !== y[2]) { score += 6; lines.push('이성과 감성이 균형을 이룹니다. 다툴 때는 해결과 공감 중 무엇이 필요한지 먼저 물어보세요.'); }
        else { score += 5; lines.push('판단하는 방식이 같아 결정이 빠릅니다.'); }
        if (x[3] !== y[3]) { score += 7; lines.push('계획형과 즉흥형의 조합입니다. 계획은 한 사람이, 즉흥적인 재미는 다른 한 사람이 맡아 보세요.'); }
        else { score += 4; lines.push('생활 방식이 닮아 일상 속 마찰이 적습니다.'); }
        // 최소 16 ~ 최대 28 → 30점 만점으로 환산
        return { title: `MBTI · ${x} × ${y}`, score: Math.round(score / 28 * 30), max: 30, text: lines.join(' ') };
    }

    function compute(userA, userB) {
        const a = { ...userA, profile: Fortune.profile(userA) };
        const b = { ...userB, profile: Fortune.profile(userB) };
        const parts = [stemPart(a, b), branchPart(a, b, 'day'), branchPart(a, b, 'year'), mbtiPart(a, b)];
        const total = Engine.clamp(parts.reduce((s, p) => s + p.score, 0), 0, 100);
        const grade = GRADES.find(g => total >= g.min);
        return { a, b, parts, total, grade };
    }

    // ---------- 초대 링크 ----------
    function encode(obj) {
        const bytes = new TextEncoder().encode(JSON.stringify(obj));
        let bin = '';
        bytes.forEach(x => { bin += String.fromCharCode(x); });
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function decode(str) {
        try {
            const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
            const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
            return JSON.parse(new TextDecoder().decode(bytes));
        } catch (e) {
            return null;
        }
    }

    function inviteUrl(user, baseUrl) {
        return `${baseUrl}?invite=${encode({ n: user.name, b: user.birth, g: user.gender, m: user.mbti })}`;
    }

    function readInvite(search) {
        const raw = new URLSearchParams(search).get('invite');
        if (!raw) return null;
        const d = decode(raw);
        if (!d || typeof d.n !== 'string' || !/^\d{8}$/.test(d.b) || !['M', 'F'].includes(d.g) || !/^[EI][SN][TF][JP]$/.test(d.m)) return null;
        return { name: d.n.slice(0, 20), birth: d.b, time: '', gender: d.g, mbti: d.m };
    }

    return { compute, inviteUrl, readInvite };
})();
