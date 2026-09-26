/**
 * [App] 입력 → 결과 화면 전환, 탭, 풀이 어조, 공유
 */
const App = (() => {
    const $ = id => document.getElementById(id);
    const STORE_USER = 'myeongun_user_v3';
    const STORE_TONE = 'myeongun_tone';

    const state = { user: null, tone: 'gentle', today: null, tab: 'today' };

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
        if (!name) return { error: '이름을 입력해 주세요.' };
        const b = parseBirth(birth);
        if (b.error) return b;
        if (!gender) return { error: '성별을 선택해 주세요.' };
        if (!mbti) return { error: 'MBTI를 선택해 주세요.' };
        return { user: { name, birth, gender, mbti } };
    }

    function fillForm(u) {
        $('userName').value = u.name || '';
        $('birthDate').value = u.birth || '';
        $('gender').value = u.gender || '';
        $('mbti').value = u.mbti || '';
    }

    // ---------- 오늘의 운세 산출 ----------
    function computeToday(user, date) {
        const rnd = Engine.prng(`${user.name}-${user.birth}-${user.gender}-${user.mbti}-${Engine.ymd(date)}`);
        // 문장은 '번호'로 고르고, 어조(다정/직설)는 같은 번호의 다른 버전을 보여줍니다.
        return {
            dailyIdx: Math.floor(rnd() * FortuneData.daily.gentle.length),
            scores: {
                love: Math.floor(rnd() * 46) + 55,
                money: Math.floor(rnd() * 46) + 55,
                work: Math.floor(rnd() * 46) + 55
            },
            loveIdx: Math.floor(rnd() * FortuneData.love.gentle.length),
            moneyIdx: Math.floor(rnd() * FortuneData.money.gentle.length),
            workIdx: Math.floor(rnd() * FortuneData.work.gentle.length),
            mission: Engine.pick(FortuneData.missions, rnd),
            tarot: Engine.shuffle(TarotData, rnd).slice(0, 3)
        };
    }

    // ---------- 렌더링 ----------
    function genderLabel(g) { return g === 'M' ? '남성' : '여성'; }

    function dateLabel(d) {
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    }

    function renderHeader() {
        const u = state.user;
        $('whoName').textContent = `${u.name} 님`;
        $('whoMeta').textContent = `${u.birth.slice(0, 4)}.${u.birth.slice(4, 6)}.${u.birth.slice(6)} · ${genderLabel(u.gender)} · ${u.mbti}`;
        document.querySelectorAll('#toneToggle button').forEach(b => b.classList.toggle('on', b.dataset.tone === state.tone));
    }

    function setScore(key, v) {
        const cap = key[0].toUpperCase() + key.slice(1);
        $('score' + cap).textContent = v + '점';
        $('bar' + cap).style.width = v + '%';
    }

    function renderToday() {
        const t = state.today, tone = state.tone, u = state.user;
        $('todayDate').textContent = dateLabel(new Date());
        $('todayText').textContent = FortuneData.daily[tone][t.dailyIdx];
        setScore('love', t.scores.love);
        setScore('money', t.scores.money);
        setScore('work', t.scores.work);
        $('textLove').textContent = FortuneData.love[tone][t.loveIdx];
        $('textMoney').textContent = FortuneData.money[tone][t.moneyIdx];
        $('textWork').textContent = FortuneData.work[tone][t.workIdx];
        $('mbtiBadge').textContent = u.mbti;
        $('mbtiAdvice').textContent = FortuneData.mbti.advice[u.mbti][tone];
        $('missionText').textContent = t.mission;
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
        const u = state.user, t = state.today;
        return {
            name: u.name,
            dateLabel: dateLabel(new Date()),
            subtitle: `${u.mbti} · ${FortuneData.mbti.nick[u.mbti]}`,
            text: FortuneData.daily[state.tone][t.dailyIdx],
            scores: t.scores
        };
    }

    function renderKeepsake() {
        Keepsake.render(keepsakeData());
    }

    function renderAll() {
        renderHeader();
        renderToday();
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
        return `📜 ${u.name}(${u.mbti}) 님의 오늘 명운\n\n연애운 ${s.love}점 · 금전운 ${s.money}점 · 직장운 ${s.work}점\n\n나의 사주와 타로도 확인해 보세요.`;
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
