/**
 * [SajuView] 星/命 기질 탭 — 네 기둥(원국), 자연물 캐릭터, 오행 밸런스, 기질×MBTI 교차 풀이,
 * 10년 흐름(대운)·올해·이달, 응원 부적, 선생님용 코칭 처방전과 수업용 책력 원리.
 */
const SajuView = (() => {
    const $ = id => document.getElementById(id);
    const EL_CLASS = el => 'el-' + el;
    const isTeacher = () => App.isTeacher();
    const st = () => App.state;

    function pillarCell(g, isMe) {
        if (!g) return `<div class="pillar-cell empty">?<small>시간 모름</small></div>`;
        return `<div class="pillar-cell ${EL_CLASS(g.el)}${isMe ? ' me' : ''}">${g.hanja}<small>${g.kor} · ${Saju.EL_HANJA[g.el]}</small></div>`;
    }

    function renderCoaching(stemIdx) {
        if (!SajuData.coaching || !SajuData.coaching[stemIdx]) return;
        const c = SajuData.coaching[stemIdx];
        const item = (icon, label, text) => `<div class="coach-item" role="button" tabindex="0" data-copy="${UI.escapeHtml(text)}" title="터치하면 복사됩니다"><b><span>${icon} ${label}</span><small class="copy-hint">📋 터치하여 복사</small></b>${text}</div>`;
        $('coachList').innerHTML = [
            item('👀', '교실 · 학습 태도 특징', c.attitude),
            item('👏', '효과적인 칭찬 · 동기부여 처방', c.praise),
            item('🧭', '생활지도 · 갈등 코칭 팁', c.guide),
            item('📝', '학부모 상담 · 행동발달 기록 예시', c.record)
        ].join('');
    }

    function currentEduTopic() {
        return ExtraData.eduTopics && (ExtraData.eduTopics[st().eduTab] || ExtraData.eduTopics.lunar);
    }

    function renderEduTopic() {
        const topic = currentEduTopic();
        if (!topic) return;
        document.querySelectorAll('#eduTabs button').forEach(b => b.classList.toggle('on', b.dataset.edu === st().eduTab));
        $('eduBody').innerHTML = `<h4><span>${topic.title}</span><small class="copy-hint" style="float:right;font-weight:500;font-size:0.72rem;color:var(--muted);">📋 터치하여 판서 요약 복사</small></h4>${topic.body}`;
    }

    function renderCross() {
        const u = st().user, me = st().profile.saju.day.stem;
        const c = ExtraData.cross[me.el][u.mbti[0]];
        $('crossName').textContent = `${Saju.EL_HANJA[me.el]} × ${u.mbti[0] === 'E' ? '외향(E)' : '내향(I)'} · ${c.name}`;
        $('crossText').textContent = c.text;
        const J = ExtraData.judge;
        let line;
        if (me.el === 'wood') {
            line = J.wood[u.mbti[3]];
        } else {
            const bornRational = J.rational.includes(me.el);
            const nowRational = u.mbti[2] === 'T';
            line = bornRational === nowRational ? J.same : J.diff(bornRational ? '이성·원칙' : '감성·직관', nowRational ? '사고(T)' : '공감(F)');
        }
        $('crossJudge').textContent = `${u.mbti} · ${App.mbtiNick(u.mbti)}. ${line}`;
    }

    /** 만 나이 (생일이 지나지 않았으면 한 살 적게) */
    function ageOn(birth, date) {
        const y = +birth.slice(0, 4), m = +birth.slice(4, 6), d = +birth.slice(6, 8);
        let age = date.getFullYear() - y;
        if (date.getMonth() + 1 < m || (date.getMonth() + 1 === m && date.getDate() < d)) age--;
        return age;
    }

    function periodText(pillar, unit) {
        const me = st().profile.saju.day.stem;
        const god = SajuData.sipsin[Saju.tenGod(me, pillar.stem.i)];
        const rel = Saju.branchRelation(st().profile.saju.day.branch.i, pillar.branch.i);
        return {
            title: `${pillar.stem.hanja}${pillar.branch.hanja}${unit} · ${god.name}(${god.hanja})의 ${unit === '년' ? '해' : '달'}`,
            text: `${god.dw}입니다. 핵심 키워드는 [${god.kw}]. ${ExtraData.periodRel[rel]}`.trim()
        };
    }

    function renderFlow() {
        const me = st().profile.saju.day.stem;
        const dw = Saju.daewoon(st().profile.saju, st().user.gender);
        const age = ageOn(st().user.birth, new Date());
        let cur = null;
        dw.list.forEach(p => { if (age >= p.age) cur = p; });
        $('dwSub').textContent = `10년 주기 · ${dw.startAge}세 시작`;
        $('dwList').innerHTML = dw.list.map(p => {
            const god = SajuData.sipsin[Saju.tenGod(me, p.stem.i)];
            return `<div class="dw${p === cur ? ' now' : ''}">
                ${p === cur ? '<div class="dw-now-label">지금</div>' : ''}
                <div class="age">${p.age}세~</div>
                <div class="gz"><span class="${EL_CLASS(p.stem.el)}" style="background:none">${p.stem.hanja}</span><br><span class="${EL_CLASS(p.branch.el)}" style="background:none">${p.branch.hanja}</span></div>
                <div class="god">${god.name}</div>
            </div>`;
        }).join('');
        if (cur) {
            const god = SajuData.sipsin[Saju.tenGod(me, cur.stem.i)];
            $('dwNow').textContent = `지금은 ${cur.age}세부터 이어지는 ${cur.stem.hanja}${cur.branch.hanja} 대운, ${god.name}(${god.hanja})의 10년 계절입니다. ${god.dw}이며, 중심 주제는 [${god.kw}]입니다.`;
        } else {
            $('dwNow').textContent = `첫 10년 대운은 ${dw.startAge}세에 시작됩니다. 그전까지는 타고난 자연물 기운이 순수하게 흐릅니다.`;
        }
        const now = st().today.tp;
        const se = periodText(now.year, '년');
        const wo = periodText(now.month, '월');
        $('seunTitle').textContent = '올해 · ' + se.title;
        $('seunText').textContent = se.text;
        $('wolunTitle').textContent = '이달 · ' + wo.title;
        $('wolunText').textContent = wo.text;
    }

    /** 지금 대운 칸이 가운데 오도록 옆으로 넘깁니다 (탭을 열 때). */
    function centerFlow() {
        const list = $('dwList'), nowEl = list.querySelector('.now');
        if (nowEl) list.scrollLeft = nowEl.offsetLeft - list.offsetLeft - (list.clientWidth - nowEl.clientWidth) / 2;
    }

    function renderOhaeng() {
        const c = st().profile.counts;
        const order = Saju.EL;
        const max = Math.max(3, ...order.map(el => c[el]));
        const cx = 80, cy = 82, R = 62;
        const pt = (i, r) => {
            const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
            return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
        };
        const css = name => getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();
        const lineCol = css('line') || '#3a332b';
        const goldCol = css('gold') || '#ffd166';
        let svg = '';
        [1, 0.66, 0.33].forEach(f => {
            svg += `<polygon points="${order.map((_, i) => pt(i, R * f).join(',')).join(' ')}" fill="none" stroke="${lineCol}" stroke-width="1"/>`;
        });
        svg += `<polygon points="${order.map((el, i) => pt(i, Math.max(4, R * c[el] / max)).join(',')).join(' ')}" fill="rgba(255,209,102,0.22)" stroke="${goldCol}" stroke-width="1.5"/>`;
        order.forEach((el, i) => {
            const [x, y] = pt(i, R + 12);
            svg += `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="13" font-weight="700" fill="${css(el)}" font-family="Gowun Batang, serif">${Saju.EL_HANJA[el]}</text>`;
        });
        $('ohaengSvg').innerHTML = svg;

        const total = order.reduce((a, el) => a + c[el], 0);
        $('ohaengBars').innerHTML = order.map(el => `
            <div class="oh-row">
                <span class="nm" style="color:${css(el)}">${Saju.EL_HANJA[el]}</span>
                <span class="track"><i style="width:${(c[el] / total) * 100}%; background:${css(el)}"></i></span>
                <span class="ct">${c[el]}</span>
            </div>`).join('');

        const p = st().profile;
        const lines = [SajuData.balance.strong(p.strong)];
        lines.push(c[p.weak] === 0 ? SajuData.balance.missing(p.weak) : SajuData.balance.weak(p.weak));
        $('ohaengText').textContent = lines.join(' ');
    }

    function render() {
        const p = st().profile, sj = p.saju, me = sj.day.stem;
        const cols = isTeacher()
            ? [['시주(時)', sj.hour], ['일주(日)', sj.day], ['월주(月)', sj.month], ['년주(年)', sj.year]]
            : [['태어난 시', sj.hour], ['나(태어난 날)', sj.day], ['태어난 달', sj.month], ['태어난 해(띠)', sj.year]];
        $('pillarGrid').innerHTML = cols.map(([label, pl], i) => {
            const stemGod = pl ? (i === 1 ? '나(일간)' : SajuData.sipsin[Saju.tenGod(me, pl.stem.i)].name) : '';
            const branchGod = pl ? SajuData.sipsin[Saju.tenGodOfBranch(me, pl.branch.i)].name : '';
            return `<div>
                <div class="pillar-cap">${label}</div>
                <div class="pillar-god">${stemGod}</div>
                ${pillarCell(pl && pl.stem, i === 1)}
                ${pillarCell(pl && pl.branch, false)}
                <div class="pillar-god">${branchGod}</div>
            </div>`;
        }).join('');
        $('sajuSub').textContent = sj.hasTime ? '8글자' : '6글자 (시간 모름)';
        const u = st().user;
        let note = '';
        if (!sj.hasTime) note = '태어난 시간을 입력하면 시주까지 계산해 여덟 글자를 모두 볼 수 있어요.';
        else if (sj.correction) note = `출생 ${sj.correction.wall} → ${Form.correctionText(sj.correction, Saju.PLACE_MAP[u.place].name)}. 시주는 실제 태양 시각(진태양시)으로 정했습니다.`;
        else note = `출생 ${u.time}을 그대로 계산했습니다. 태어난 지역을 고르면 실제 태양 시각으로 보정할 수 있어요.`;
        $('sajuNote').textContent = note;
        $('sajuNote').style.display = note ? 'block' : 'none';

        $('ilganHanja').className = 'ilgan-hanja ' + EL_CLASS(me.el);
        $('ilganHanja').textContent = me.hanja;
        $('ilganTitle').textContent = `${me.hanja}${Saju.EL_HANJA[me.el]} · ${p.ilgan.title}`;
        $('ilganSub').textContent = `${me.kor}${SajuData.elements[me.el].kor} · ${me.yang ? '양(陽·활발한)' : '음(陰·차분한)'} ${SajuData.elements[me.el].nature}의 기운`;
        $('ilganTrait').textContent = p.ilgan.trait;
        $('ilganStrength').textContent = p.ilgan.strength;
        $('ilganCaution').textContent = p.ilgan.caution;

        renderCoaching(me.i);
        renderEduTopic();
        renderOhaeng();
        renderCross();
        renderFlow();

        const e = SajuData.elements[p.weak];
        const am = isTeacher() ? (e.teacherAmulet || e.amulet) : (e.studentAmulet || e.amulet);
        $('amuletBox').innerHTML = `<div class="big">${e.hanja}</div><div class="line">${am.name}</div><div class="desc">${am.desc}</div>`;
        $('amuletNote').textContent = `나에게 조금 부족한 ${e.hanja}(${e.nature}) 기운을 따뜻하게 채워 주는 응원 부적입니다.`;
    }

    function bind() {
        document.querySelectorAll('#eduTabs button').forEach(b => b.addEventListener('click', () => {
            st().eduTab = b.dataset.edu;
            renderEduTopic();
        }));
        $('coachList').addEventListener('click', e => {
            const item = e.target.closest('.coach-item[data-copy]');
            if (item) UI.copyText(item.dataset.copy, '📋 코칭·행발 문구가 복사되었습니다. 상담·행발 기록에 붙여 넣어 보세요.');
        });
        $('eduBody').addEventListener('click', () => {
            const topic = currentEduTopic();
            if (topic && topic.copyText) {
                UI.copyText(topic.copyText, '📋 수업 판서·발문 요약이 복사되었습니다. 수업안·학급 게시판에 붙여 넣어 보세요.');
            }
        });
    }

    return { render, renderEduTopic, centerFlow, bind, ageOn, pillarCell };
})();
