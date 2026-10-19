/**
 * [Compat] 우정 케미 · 관계 조화 — 대표 자연물 오행(30) + 속마음 자리·일지(20) + 띠(20) + MBTI(30) = 100점
 * 초대 링크: ?invite=<base64url(JSON)> 로 상대가 내 정보를 입력 없이 불러와 케미를 봅니다.
 */
const Compat = (() => {
    const BRANCH_SCORE = { yukhap: 20, samhap: 18, same: 14, none: 13, wonjin: 8, chung: 6 };

    const DAYJI_TEXT = {
        yukhap: '속마음 자리(일지)가 육합(六合)을 이룹니다. 함께 이야기하고 활동할수록 마음이 편안해지는 단짝 조합입니다.',
        samhap: '속마음 자리가 삼합(三合)으로 이어져 모둠 과제나 같은 목표를 향해 힘을 모으기 아주 좋습니다.',
        same: '속마음 자리가 같아 좋아하는 것과 생활 리듬이 많이 닮았습니다.',
        none: '속마음 자리 사이에 부딪힘이 없어 편안하고 무난하게 잘 어울립니다.',
        wonjin: '속마음 자리가 예민하게 닿아 있어 작은 말에도 서운함이 생길 수 있어요. “고마워, 미안해”를 먼저 말하면 금세 가까워집니다.',
        chung: '속마음 자리가 정반대 에너지를 가져 생각 방식이 다를 수 있어요. 하지만 내가 못 본 것을 친구가 발견해 주는 멋진 자극이 됩니다.'
    };

    const TTI_TEXT = {
        yukhap: '육합(六合)의 띠 조화로, 서로를 따뜻하게 감싸 주고 응원해 주는 사이입니다.',
        samhap: '삼합(三合)의 띠 조화로, 함께 모둠 활동을 하거나 힘을 합치면 큰 시너지가 납니다.',
        same: '같은 해·같은 띠라 말하지 않아도 친구처럼 통하는 면이 많습니다.',
        none: '편안한 띠 조합으로, 서로 배려하는 만큼 우정이 깊어집니다.',
        wonjin: '작은 오해가 생길 수 있는 띠 조합이라, 추측하기보다 다정한 말로 먼저 확인하는 습관이 큰 도움이 됩니다.',
        chung: '성향이 정반대일 수 있는 띠 조합입니다. 서로 다름을 인정하면 누구보다 든든한 보완 관계가 됩니다.'
    };

    const GRADES = [
        {
            min: 90,
            name: '환상의 단짝',
            teacherName: '최상의 시너지',
            gentle: '별빛이 하나로 이어진 듯 호흡이 척척 맞는 두 사람이에요! 지금의 따뜻한 우정과 배려를 오래오래 지켜 가세요.',
            direct: '보기 드문 환상의 호흡입니다. 친할수록 예의와 고마운 표현을 잊지 않으면 평생 든든한 단짝이 됩니다.'
        },
        {
            min: 80,
            name: '찰떡 짝꿍',
            teacherName: '찰떡 호흡',
            gentle: '서로의 부족한 점을 자연스럽게 채워 주는 멋진 사이예요. 함께 공부하고 활동할수록 시너지가 커집니다.',
            direct: '호흡이 아주 잘 맞는 사이입니다. 익숙하다고 당연하게 여기지 말고 칭찬을 자주 나누어 보세요.'
        },
        {
            min: 70,
            name: '든든한 친구',
            teacherName: '안정적인 조화',
            gentle: '편안하게 웃으며 어울릴 수 있는 좋은 사이예요. 작은 배려 한 스푼이 두 사람을 더욱 가깝게 만들어 줍니다.',
            direct: '무난하고 안정적인 관계입니다. 한 걸음 더 가까워지려면 내가 먼저 다정하게 손을 내밀어 보세요.'
        },
        {
            min: 60,
            name: '서로 배우는 친구',
            teacherName: '상호 보완 관계',
            gentle: '성격이 다른 점이 있지만, 그만큼 서로에게 배울 점도 많은 사이예요. 천천히 발맞추어 걸어 보세요.',
            direct: '생각하는 방식이 조금 다릅니다. 서로의 차례와 규칙을 존중하면 훌륭한 협동 파트너가 됩니다.'
        },
        {
            min: 0,
            name: '다름이 빛나는 짝꿍',
            teacherName: '배려로 자라는 관계',
            gentle: '서로 아주 다른 매력을 가진 두 사람이에요! 나와 다른 친구의 장점을 이해하는 순간 가장 특별한 팀이 될 수 있답니다.',
            direct: '정반대 성향에 가까운 조합입니다. 친구를 내 방식대로 바꾸려 하지 말고 다른 점을 인정하는 것부터 시작해 보세요.'
        }
    ];

    const ROLE_MAP = {
        wood: '아이디어 제안 · 시작 열기',
        fire: '발표 · 분위기 띄우기',
        earth: '의견 조율 · 평화 지키기',
        metal: '규칙 정리 · 시간 체크',
        water: '자료 조사 · 꼼꼼한 기록'
    };

    function stemPart(a, b) {
        const sa = a.profile.saju.day.stem, sb = b.profile.saju.day.stem;
        const ea = Saju.EL_HANJA[sa.el], eb = Saju.EL_HANJA[sb.el];
        let score, text;
        if (Saju.stemCombine(sa.i, sb.i)) {
            score = 30;
            text = `${sa.hanja}와 ${sb.hanja}는 천간합(天干合)을 이룹니다. 함께 있으면 자연스럽게 마음이 통하고 힘을 모으기 좋은 단짝 기운입니다.`;
        } else {
            const rel = Saju.elementRelation(sa.el, sb.el);
            if (rel === 'iGenerate') {
                score = 26;
                text = `${a.name} 님의 ${ea} 기운이 ${b.name} 님의 ${eb} 기운을 북돋아 줍니다(상생). ${a.name} 님이 따뜻하게 응원해 주고 ${b.name} 님이 자신감을 얻는 관계예요.`;
            } else if (rel === 'generatesMe') {
                score = 26;
                text = `${b.name} 님의 ${eb} 기운이 ${a.name} 님의 ${ea} 기운을 북돋아 줍니다(상생). ${b.name} 님이 든든한 응원군이 되어 주는 관계예요.`;
            } else if (rel === 'same') {
                score = 22;
                text = `같은 ${ea} 기운을 가진 두 사람입니다(비화). 생각하는 것이 비슷해 금방 친해지지만, 의견이 다를 때는 가위바위보나 양보 규칙을 정하면 좋아요.`;
            } else if (rel === 'iControl') {
                score = 16;
                text = `${a.name} 님의 ${ea} 기운이 ${b.name} 님의 ${eb} 기운을 이끄는 흐름입니다(상극). ${a.name} 님이 ${b.name} 님의 이야기를 먼저 끝까지 들어주면 훨씬 좋아집니다.`;
            } else {
                score = 16;
                text = `${b.name} 님의 ${eb} 기운이 ${a.name} 님의 ${ea} 기운을 이끄는 흐름입니다(상극). ${b.name} 님이 ${a.name} 님의 속도와 생각을 배려해 주면 멋진 팀이 됩니다.`;
            }
        }
        const fills = [];
        if (b.profile.counts[a.profile.weak] >= 2) fills.push(`${b.name} 님은 ${a.name} 님에게 부족한 ${Saju.EL_HANJA[a.profile.weak]} 기운을 든든히 채워 줍니다.`);
        if (a.profile.counts[b.profile.weak] >= 2) fills.push(`${a.name} 님은 ${b.name} 님에게 부족한 ${Saju.EL_HANJA[b.profile.weak]} 기운을 든든히 채워 줍니다.`);
        if (fills.length) {
            score = Math.min(30, score + 2 * fills.length);
            text += ' ' + fills.join(' ');
        }
        return { title: `자연물 오행 · ${sa.hanja}${ea} × ${sb.hanja}${eb}`, score, max: 30, text };
    }

    function branchPart(a, b, which) {
        const pa = a.profile.saju[which].branch, pb = b.profile.saju[which].branch;
        const rel = Saju.branchRelation(pa.i, pb.i);
        if (which === 'day') {
            return { title: `속마음 자리(일지) · ${pa.hanja} × ${pb.hanja}`, score: BRANCH_SCORE[rel], max: 20, text: DAYJI_TEXT[rel] };
        }
        return { title: `동물 띠 · ${pa.animal}띠 × ${pb.animal}띠`, score: BRANCH_SCORE[rel], max: 20, text: `${pa.animal}띠와 ${pb.animal}띠는 ` + TTI_TEXT[rel] };
    }

    function mbtiPart(a, b) {
        const x = a.mbti, y = b.mbti;
        if (!x || !y) {
            return { title: 'MBTI 성향 · 미입력', score: 22, max: 30, text: 'MBTI를 아직 선택하지 않은 사람이 있어 기본 점수로 계산했어요. 친구의 MBTI를 알게 되면 다시 맞춰 보세요!' };
        }
        let score = 0;
        const lines = [];
        if (x[0] !== y[0]) { score += 6; lines.push('활발한 외향(E)과 차분한 내향(I)이 만나 발표와 경청의 균형이 잘 맞습니다.'); }
        else { score += 4; lines.push(x[0] === 'E' ? '둘 다 외향형(E)이라 함께하면 교실에 활기가 넘칩니다.' : '둘 다 내향형(I)이라 조용하고 편안하게 깊은 대화를 나누기 좋습니다.'); }
        if (x[1] === y[1]) { score += 9; lines.push('생각하는 방식(S/N)이 닮아 설명이 길지 않아도 척척 통합니다.'); }
        else { score += 4; lines.push('꼼꼼한 감각(S)과 상상력 풍부한 직관(N)이 만나 아이디어와 실현을 함께 챙길 수 있습니다.'); }
        if (x[2] !== y[2]) { score += 6; lines.push('논리(T)와 공감(F)이 어우러진 조합입니다. 대화할 때 공감 한마디와 해결책을 함께 나누어 보세요.'); }
        else { score += 5; lines.push('마음을 나누고 판단하는 기준이 비슷해 의견 모으기가 빠릅니다.'); }
        if (x[3] !== y[3]) { score += 7; lines.push('계획형(J)과 유연형(P)의 만남입니다! 한 명은 순서를 정하고 한 명은 재미있는 아이디어를 더해 보세요.'); }
        else { score += 4; lines.push('과제를 해 나가는 리듬이 비슷해 모둠 활동에서 발맞추기 편합니다.'); }
        return { title: `MBTI 성향 · ${x} × ${y}`, score: Math.round(score / 28 * 30), max: 30, text: lines.join(' ') };
    }

    function buildTeamTip(a, b) {
        const sa = a.profile.saju.day.stem, sb = b.profile.saju.day.stem;
        const roleA = ROLE_MAP[sa.el], roleB = ROLE_MAP[sb.el];
        return {
            studentPromise: `모둠 활동에서 ${a.name} 님은 [${roleA}], ${b.name} 님은 [${roleB}] 역할을 맡으면 멋진 시너지가 나요! 서로의 차례를 기다려 주고 고운 말로 의견을 나누기로 약속해요.`,
            teacherGuide: `짝·모둠 편성 시 ${a.name}(${sa.hanja}·${ROLE_MAP[sa.el].split(' · ')[0]}) 학생과 ${b.name}(${sb.hanja}·${ROLE_MAP[sb.el].split(' · ')[0]}) 학생에게 명확한 역할을 나누어 주면 갈등 없이 협동 시너지가 극대화됩니다.`
        };
    }

    function compute(userA, userB) {
        const a = { ...userA, profile: Fortune.profile(userA) };
        const b = { ...userB, profile: Fortune.profile(userB) };
        const parts = [stemPart(a, b), branchPart(a, b, 'day'), branchPart(a, b, 'year'), mbtiPart(a, b)];
        const total = Engine.clamp(parts.reduce((s, p) => s + p.score, 0), 0, 100);
        const grade = GRADES.find(g => total >= g.min);
        const teamTip = buildTeamTip(a, b);
        return { a, b, parts, total, grade, teamTip };
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
