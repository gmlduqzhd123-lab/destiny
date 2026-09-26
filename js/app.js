/**
 * [App] 입력 → 결과 화면 전환, 탭, 풀이 어조, 공유
 */
const App = (() => {
    const $ = id => document.getElementById(id);
    const STORE_USER = 'myeongun_user_v3';
    const STORE_TONE = 'myeongun_tone';

    const state = { user: null, tone: 'gentle', profile: null, today: null, tab: 'today' };

    // ---------- 저장소 (접근이 막힌 환경에서도 앱이 멈추지 않도록) ----------
    const store = {
        get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } },
        set(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 무시 */ } },
        remove(key) { try { localStorage.removeItem(key); } catch (e) { /* 무시 */ } }
    };

    // ---------- 입력 검증 ----------
    function parseBirth(str) {
        if (!/^\d{8}$/.test(str)) return { error: '생년월일을 8자리 숫자로 입력해 주세요. (예: 19980101)' };
        const y = +str.slice(0, 4), m = +str.slice(4, 6), d = +str.slice(6, 8);
        const date = new Date(y, m - 1, d);
        if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
            return { error: '존재하지 않는 날짜입니다. 다시 확인해 주세요.' };
        }
        if (y < 1900 || date > new Date()) return { error: '1900년 이후, 오늘 이전의 날짜를 입력해 주세요.' };
        return { y, m, d };
    }

    function readForm() {
        const name = $('userName').value.trim();
        const birth = $('birthDate').value.trim();
        const gender = $('gender').value;
        const mbti = $('mbti').value;
        const time = $('timeUnknown').checked ? '' : $('birthTime').value;
        if (!name) return { error: '이름을 입력해 주세요.' };
        const b = parseBirth(birth);
        if (b.error) return b;
        if (!gender) return { error: '성별을 선택해 주세요.' };
        if (!mbti) return { error: 'MBTI를 선택해 주세요.' };
        return { user: { name, birth, time, gender, mbti } };
    }

    function fillForm(u) {
        $('userName').value = u.name || '';
        $('birthDate').value = u.birth || '';
        $('gender').value = u.gender || '';
        $('mbti').value = u.mbti || '';
        $('birthTime').value = u.time || '';
        $('timeUnknown').checked = !u.time;
        $('birthTime').disabled = !u.time;
    }

    // ---------- 오늘의 운세 산출 ----------
    function computeToday(user, date) {
        state.profile = Fortune.profile(user);
        const t = Fortune.today(user, state.profile, date);
        t.tarot = Engine.shuffle(TarotData, t.rnd).slice(0, 3);
        return t;
    }

    // ---------- 렌더링 ----------
    function genderLabel(g) { return g === 'M' ? '남성' : '여성'; }

    function dateLabel(d) {
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    }

    function renderHeader() {
        const u = state.user;
        $('whoName').textContent = `${u.name} 님`;
        const y = state.profile.saju.year;
        $('whoMeta').textContent = `${u.birth.slice(0, 4)}.${u.birth.slice(4, 6)}.${u.birth.slice(6)}${u.time ? ' ' + u.time : ''} · ${y.stem.kor}${y.branch.kor}년 ${y.branch.animal}띠 · ${genderLabel(u.gender)} · ${u.mbti}`;
        document.querySelectorAll('#toneToggle button').forEach(b => b.classList.toggle('on', b.dataset.tone === state.tone));
    }

    function setScore(key, v) {
        const cap = key[0].toUpperCase() + key.slice(1);
        $('score' + cap).textContent = v + '점';
        $('bar' + cap).style.width = v + '%';
    }

    const EL_CLASS = el => 'el-' + el;

    function renderToday() {
        const t = state.today, tone = state.tone, u = state.user, g = t.god;
        const tp = t.tp.day;
        $('todayDate').textContent = `${dateLabel(new Date())} · ${tp.stem.hanja}${tp.branch.hanja}일`;
        $('dayHanja').textContent = g.hanja;
        $('dayName').textContent = `오늘은 ${g.name}(${g.hanja})의 날`;
        $('dayKw').textContent = g.kw;
        $('todayText').textContent = g.day[tone];

        const notes = [];
        if (t.rel) notes.push(`${t.rel.label} · ${t.rel[tone]}`);
        if (t.balance === 'boost') notes.push(`오늘의 ${Saju.EL_HANJA[t.todayEl]} 기운이 원국에 부족한 기운을 채워 줍니다.`);
        if (t.balance === 'excess') notes.push(`이미 강한 ${Saju.EL_HANJA[t.todayEl]} 기운이 더해지니 과유불급을 기억하세요.`);
        $('todayRelation').textContent = notes.join(' ');
        $('todayRelation').style.display = notes.length ? 'block' : 'none';

        setScore('love', t.scores.love);
        setScore('money', t.scores.money);
        setScore('work', t.scores.work);
        $('textLove').textContent = g.love[tone];
        $('textMoney').textContent = g.money[tone];
        $('textWork').textContent = g.work[tone];
        $('mbtiBadge').textContent = u.mbti;
        $('mbtiAdvice').textContent = FortuneData.mbti.advice[u.mbti][tone];
        $('missionText').textContent = g.mission;

        const e = SajuData.elements[state.profile.weak];
        $('gaewunSub').textContent = `부족한 ${e.hanja} 기운 채우기`;
        $('gaewunGrid').innerHTML = `
            <div><b>행운의 색</b><span><i class="color-dot" style="background:${e.hex}"></i>${e.color}</span></div>
            <div><b>행운의 방향</b><span>${e.direction}</span></div>
            <div><b>행운의 숫자</b><span>${e.numbers}</span></div>
            <div><b>행운의 물건</b><span>${e.item}</span></div>
            <div style="grid-column: span 2;"><b>개운 음식</b><span>${e.food}</span></div>`;
    }

    function pillarCell(g, isMe) {
        if (!g) return `<div class="pillar-cell empty">?<small>시간 모름</small></div>`;
        return `<div class="pillar-cell ${EL_CLASS(g.el)}${isMe ? ' me' : ''}">${g.hanja}<small>${g.kor} · ${Saju.EL_HANJA[g.el]}</small></div>`;
    }

    function renderSaju() {
        const p = state.profile, sj = p.saju, me = sj.day.stem;
        const cols = [['시주', sj.hour], ['일주', sj.day], ['월주', sj.month], ['년주', sj.year]];
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
        $('sajuNote').textContent = sj.hasTime ? '' : '태어난 시간을 입력하면 시주까지 계산해 8글자를 모두 볼 수 있습니다.';
        $('sajuNote').style.display = sj.hasTime ? 'none' : 'block';

        $('ilganHanja').className = 'ilgan-hanja ' + EL_CLASS(me.el);
        $('ilganHanja').textContent = me.hanja;
        $('ilganTitle').textContent = `${me.hanja}${Saju.EL_HANJA[me.el]} · ${p.ilgan.title}`;
        $('ilganSub').textContent = `${me.kor}${SajuData.elements[me.el].kor} · ${me.yang ? '양(陽)' : '음(陰)'}의 ${SajuData.elements[me.el].nature}`;
        $('ilganTrait').textContent = p.ilgan.trait;
        $('ilganStrength').textContent = p.ilgan.strength;
        $('ilganCaution').textContent = p.ilgan.caution;

        renderOhaeng();

        const e = SajuData.elements[p.weak];
        $('amuletBox').innerHTML = `<div class="big">${e.hanja}</div><div class="line">${e.amulet.name}</div><div class="desc">${e.amulet.desc}</div>`;
        $('amuletNote').textContent = `원국에 부족한 ${e.hanja}(${e.kor}) 기운을 채워 주는 부적입니다.`;
    }

    function renderOhaeng() {
        const c = state.profile.counts;
        const order = Saju.EL; // 목 → 화 → 토 → 금 → 수 (상생 순서, 시계 방향)
        const max = Math.max(3, ...order.map(el => c[el]));
        const cx = 80, cy = 82, R = 62;
        const pt = (i, r) => {
            const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
            return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
        };
        const color = el => getComputedStyle(document.documentElement).getPropertyValue('--' + el).trim();
        let svg = '';
        [1, 0.66, 0.33].forEach(f => {
            svg += `<polygon points="${order.map((_, i) => pt(i, R * f).join(',')).join(' ')}" fill="none" stroke="#3a332b" stroke-width="1"/>`;
        });
        svg += `<polygon points="${order.map((el, i) => pt(i, Math.max(4, R * c[el] / max)).join(',')).join(' ')}" fill="rgba(212,175,55,0.22)" stroke="#d4af37" stroke-width="1.5"/>`;
        order.forEach((el, i) => {
            const [x, y] = pt(i, R + 12);
            svg += `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="13" font-weight="700" fill="${color(el)}" font-family="Gowun Batang, serif">${Saju.EL_HANJA[el]}</text>`;
        });
        $('ohaengSvg').innerHTML = svg;

        const total = order.reduce((a, el) => a + c[el], 0);
        $('ohaengBars').innerHTML = order.map(el => `
            <div class="oh-row">
                <span class="nm" style="color:${color(el)}">${Saju.EL_HANJA[el]}</span>
                <span class="track"><i style="width:${(c[el] / total) * 100}%; background:${color(el)}"></i></span>
                <span class="ct">${c[el]}</span>
            </div>`).join('');

        const p = state.profile;
        const lines = [SajuData.balance.strong(p.strong)];
        lines.push(c[p.weak] === 0 ? SajuData.balance.missing(p.weak) : SajuData.balance.weak(p.weak));
        $('ohaengText').textContent = lines.join(' ');
    }

    function renderTarot() {
        const labels = ['과거', '현재', '미래'];
        $('tarotSlots').innerHTML = state.today.tarot.map((c, i) => `
            <div class="card-wrapper" onclick="this.classList.toggle('flipped')">
                <div class="card-inner">
                    <div class="card-front">${labels[i]}</div>
                    <div class="card-back">
                        <div class="nm" style="color:var(--gold);">${c.name}</div>
                        <div class="small muted" style="font-size:0.62rem; margin:4px 0;">[${c.keyword}]</div>
                        <div style="font-size:0.6rem; line-height:1.45; color:#ddd;">${c.meaning}</div>
                    </div>
                </div>
            </div>`).join('');
    }

    function keepsakeData() {
        const u = state.user, t = state.today, sj = state.profile.saju;
        return {
            pillars: [['時', sj.hour], ['日', sj.day], ['月', sj.month], ['年', sj.year]].map(([label, p], i) => ({
                label, stem: p && p.stem, branch: p && p.branch, me: i === 1
            })),
            ilganLine: `${sj.day.stem.hanja}${Saju.EL_HANJA[sj.day.stem.el]} · ${state.profile.ilgan.title}`,
            dayTitle: `오늘은 ${t.god.name}(${t.god.hanja})의 날`,
            name: u.name,
            dateLabel: dateLabel(new Date()),
            subtitle: `${u.mbti} · ${FortuneData.mbti.nick[u.mbti]}`,
            text: t.god.day[state.tone],
            scores: t.scores
        };
    }

    function renderKeepsake() {
        Keepsake.render(keepsakeData());
    }

    function renderAll() {
        renderHeader();
        renderToday();
        renderSaju();
        renderTarot();
        renderKeepsake();
    }

    // ---------- 탭 ----------
    function switchTab(tab) {
        state.tab = tab;
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('on', p.dataset.panel === tab));
        document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ---------- 화면 전환 ----------
    function showResult() {
        state.today = computeToday(state.user, new Date());
        $('inputView').style.display = 'none';
        $('resultView').style.display = 'block';
        $('tabbar').style.display = 'flex';
        renderAll();
        switchTab('today');
    }

    function showInput() {
        $('resultView').style.display = 'none';
        $('tabbar').style.display = 'none';
        $('inputView').style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ---------- 공유 ----------
    function toast(msg) {
        const el = $('toast');
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => el.classList.remove('show'), 2200);
    }

    function appUrl() {
        return location.origin + location.pathname;
    }

    async function copyText(text, okMsg) {
        try {
            await navigator.clipboard.writeText(text);
            toast(okMsg);
        } catch (e) {
            toast('이 환경에서는 복사가 지원되지 않습니다.');
        }
    }

    function shareSummary() {
        const u = state.user, s = state.today.scores;
        const g = state.today.god, me = state.profile.saju.day.stem;
        return `📜 ${u.name}(${u.mbti}) 님의 오늘 명운\n${me.hanja}${Saju.EL_HANJA[me.el]} · ${state.profile.ilgan.title}\n오늘은 ${g.name}(${g.hanja})의 날\n\n연애운 ${s.love}점 · 금전운 ${s.money}점 · 직장운 ${s.work}점\n\n나의 사주와 타로도 확인해 보세요.`;
    }

    async function onShare() {
        const text = shareSummary();
        try {
            if (await Keepsake.share('명운첩.png', text + '\n' + appUrl())) return;
            if (navigator.share) {
                await navigator.share({ title: '명운 (命運)', text, url: appUrl() });
                return;
            }
        } catch (e) {
            if (e.name === 'AbortError') return;
        }
        copyText(text + '\n' + appUrl(), '결과가 복사되었습니다. 원하는 곳에 붙여 넣어 주세요.');
    }

    // ---------- 초기화 ----------
    function bind() {
        $('fortuneForm').addEventListener('submit', e => {
            e.preventDefault();
            const r = readForm();
            $('formError').textContent = r.error || '';
            if (r.error) return;
            state.user = r.user;
            if ($('rememberMe').checked) store.set(STORE_USER, r.user);
            else store.remove(STORE_USER);
            showResult();
        });

        $('timeUnknown').addEventListener('change', e => {
            $('birthTime').disabled = e.target.checked;
            if (e.target.checked) $('birthTime').value = '';
        });

        $('birthDate').addEventListener('input', e => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
        });

        document.querySelectorAll('#tabbar button').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

        document.querySelectorAll('#toneToggle button').forEach(b => b.addEventListener('click', () => {
            state.tone = b.dataset.tone;
            store.set(STORE_TONE, state.tone);
            renderAll();
        }));

        document.querySelectorAll('.seal-btn').forEach(b => b.addEventListener('click', () => {
            const on = !b.classList.contains('on');
            document.querySelectorAll('.seal-btn').forEach(x => x.classList.remove('on'));
            b.classList.toggle('on', on);
            Keepsake.setSeal(on ? b.dataset.seal : null);
            if (on) toast('카드 위를 눌러 도장을 찍어 보세요.');
        }));
        $('btnClearSeals').addEventListener('click', () => Keepsake.clearStamps());
        $('btnSaveCard').addEventListener('click', () => Keepsake.download(`명운첩_${Engine.ymd(new Date())}.png`));
        $('btnShare').addEventListener('click', onShare);
        $('btnReset').addEventListener('click', showInput);
    }

    function init() {
        Keepsake.init($('keepsakeCanvas'));
        const saved = store.get(STORE_USER);
        if (saved) {
            fillForm(saved);
            $('rememberMe').checked = true;
        }
        state.tone = store.get(STORE_TONE) === 'direct' ? 'direct' : 'gentle';
        bind();
    }

    document.addEventListener('DOMContentLoaded', init);

    return { state, store, toast, copyText, appUrl, switchTab };
})();
