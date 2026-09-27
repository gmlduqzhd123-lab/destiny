/**
 * [App] 입력 → 결과 화면 전환, 탭, 풀이 어조, 공유
 */
const App = (() => {
    const $ = id => document.getElementById(id);
    const STORE_USER = 'myeongun_user_v3';
    const STORE_TONE = 'myeongun_tone';
    const STORE_OMIKUJI = 'myeongun_omikuji';
    const MBTI_TYPES = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'];

    const state = { user: null, tone: 'gentle', profile: null, today: null, tab: 'today', invite: null, compat: null };

    // ---------- 저장소 (접근이 막힌 환경에서도 앱이 멈추지 않도록) ----------
    const store = {
        get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } },
        set(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 무시 */ } },
        remove(key) { try { localStorage.removeItem(key); } catch (e) { /* 무시 */ } }
    };

    // ---------- 입력 검증 ----------
    // 19980101, 1998.1.1, 1998-01-01, 1998년 1월 1일, 980101 을 모두 받아 YYYYMMDD로 맞춥니다.
    function normalizeBirth(raw) {
        const str = String(raw || '').trim();
        const cur = new Date().getFullYear() % 100;
        const full = yy => (+yy <= cur ? '20' : '19') + yy;
        if (/^\d{8}$/.test(str)) return str;
        if (/^\d{6}$/.test(str)) return full(str.slice(0, 2)) + str.slice(2);
        const m = str.match(/^(\d{4}|\d{2})\D+(\d{1,2})\D+(\d{1,2})\D*$/);
        if (m) return (m[1].length === 2 ? full(m[1]) : m[1]) + m[2].padStart(2, '0') + m[3].padStart(2, '0');
        return null;
    }

    function parseBirth(raw) {
        const str = normalizeBirth(raw);
        if (!str) return { error: '생년월일을 알아볼 수 없어요. 예: 1998.01.01' };
        const y = +str.slice(0, 4), m = +str.slice(4, 6), d = +str.slice(6, 8);
        const date = new Date(y, m - 1, d);
        if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
            return { error: '존재하지 않는 날짜입니다. 다시 확인해 주세요.' };
        }
        if (y < 1900 || date > new Date()) return { error: '1900년 이후, 오늘 이전의 날짜를 입력해 주세요.' };
        return { y, m, d, ymd: str };
    }

    /**
     * 양력·음력 생일을 모두 양력 YYYYMMDD로 맞춥니다. 사주 계산은 항상 양력 기준입니다.
     * 음력 변환은 한국천문연구원 기준 음력표(korean-lunar-calendar)를 씁니다.
     * @param {'solar'|'lunar'|'leap'} cal  leap = 음력 윤달
     */
    function resolveBirth(raw, cal) {
        if (cal !== 'lunar' && cal !== 'leap') return parseBirth(raw);
        const str = normalizeBirth(raw);
        if (!str) return { error: '생년월일을 알아볼 수 없어요. 예: 1998.01.01' };
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
        const b = parseBirth(`${solar.year}${String(solar.month).padStart(2, '0')}${String(solar.day).padStart(2, '0')}`);
        if (b.error) return b;
        return { ...b, lunar: str, leap };
    }

    function formatBirth(ymd) {
        return `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
    }

    // 음력으로 입력한 사람은 음력 생일을 먼저 보여 줍니다.
    function birthLabel(u) {
        return u.cal === 'lunar' ? `음력 ${formatBirth(u.lunar)}${u.leap ? '(윤달)' : ''}` : formatBirth(u.birth);
    }

    function birthPreview(inputEl, noteEl, cal) {
        const raw = inputEl.value.trim();
        if (!raw) { noteEl.textContent = ''; noteEl.classList.remove('err'); return; }
        const b = resolveBirth(raw, cal);
        if (b.error) {
            // 아직 입력 중일 수 있으니 6자 이상일 때만 알려 줍니다.
            noteEl.textContent = raw.replace(/\D/g, '').length >= 6 ? b.error : '';
            noteEl.classList.add('err');
            return;
        }
        const yp = Saju.calc({ y: b.y, m: b.m, d: b.d }).year;
        const tti = `${yp.stem.kor}${yp.branch.kor}년 ${yp.branch.animal}띠`;
        if (b.lunar) {
            const ly = +b.lunar.slice(0, 4), lm = +b.lunar.slice(4, 6), ld = +b.lunar.slice(6, 8);
            noteEl.textContent = `✓ 음력 ${ly}년 ${b.leap ? '윤' : ''}${lm}월 ${ld}일 → 양력 ${b.y}년 ${b.m}월 ${b.d}일 · ${tti}`;
        } else {
            noteEl.textContent = `✓ ${b.y}년 ${b.m}월 ${b.d}일 · ${tti}`;
        }
        noteEl.classList.remove('err');
    }

    function mainCal() {
        if ($('calType').value !== 'lunar') return 'solar';
        return $('leapMonth').checked ? 'leap' : 'lunar';
    }

    function setCal(v) {
        $('calType').value = v;
        document.querySelectorAll('.seg[data-for="calType"] button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
        $('leapWrap').style.display = v === 'lunar' ? 'flex' : 'none';
        if (v !== 'lunar') $('leapMonth').checked = false;
        birthPreview($('birthDate'), $('birthPreview'), mainCal());
    }

    function readForm() {
        const name = $('userName').value.trim();
        const gender = $('gender').value;
        const mbti = $('mbti').value;
        const time = $('birthTime').value;
        if (!name) return { error: '이름을 입력해 주세요.' };
        const b = resolveBirth($('birthDate').value, mainCal());
        if (b.error) return b;
        if (!gender) return { error: '성별을 골라 주세요.' };
        if (!mbti) return { error: 'MBTI 네 칸을 모두 골라 주세요. 모르면 "잘 모르겠어요"를 눌러 보세요.' };
        const user = { name, birth: b.ymd, time, gender, mbti };
        if (b.lunar) Object.assign(user, { cal: 'lunar', lunar: b.lunar, leap: b.leap });
        return { user };
    }

    // ---------- 버튼형 입력 (성별 · MBTI) ----------
    function setGender(v) {
        $('gender').value = v || '';
        document.querySelectorAll('.seg[data-for="gender"] button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    }

    function setMbti(v) {
        const letters = (v || '').split('');
        document.querySelectorAll('#mbtiPick .seg').forEach(seg => {
            const want = letters[+seg.dataset.axis];
            seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === want));
        });
        syncMbti();
    }

    function syncMbti() {
        const letters = [...document.querySelectorAll('#mbtiPick .seg')].map(seg => {
            const on = seg.querySelector('button.on');
            return on ? on.dataset.v : '';
        });
        const full = letters.every(Boolean) ? letters.join('') : '';
        $('mbti').value = full;
        $('mbtiPreview').textContent = full ? `${full} · ${FortuneData.mbti.nick[full]}` : '';
    }

    function startMbtiQuiz() {
        const box = $('mbtiQuiz');
        const answers = [];
        const step = () => {
            const i = answers.length;
            if (i === ExtraData.mbtiQuiz.length) {
                box.style.display = 'none';
                $('mbtiPick').style.display = '';
                setMbti(answers.join(''));
                $('mbtiPreview').textContent += ' (간이 문항으로 추정한 유형이에요)';
                return;
            }
            const q = ExtraData.mbtiQuiz[i];
            box.innerHTML = `<div class="qn">${i + 1} / ${ExtraData.mbtiQuiz.length}</div>
                <div class="qq">${q.q}</div>
                <div class="qa">
                    <button type="button" data-v="${q.a[1]}">${q.a[0]}</button>
                    <button type="button" data-v="${q.b[1]}">${q.b[0]}</button>
                </div>`;
            box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
                answers.push(b.dataset.v);
                step();
            }));
        };
        $('mbtiPick').style.display = 'none';
        box.style.display = 'block';
        step();
    }

    function fillForm(u) {
        $('userName').value = u.name || '';
        const lunar = u.cal === 'lunar' && u.lunar;
        $('birthDate').value = lunar ? formatBirth(u.lunar) : (u.birth ? formatBirth(u.birth) : '');
        $('leapMonth').checked = !!(lunar && u.leap);
        setCal(lunar ? 'lunar' : 'solar');
        setGender(u.gender);
        setMbti(u.mbti);
        $('birthTime').value = u.time || '';
        $('timeMore').open = !!u.time;
    }

    // ---------- 입력 전 첫 화면 ----------
    function renderTeaser() {
        const now = new Date();
        const d = Saju.todayPillars(now).day;
        $('teaserGz').innerHTML = `${d.stem.hanja}<br>${d.branch.hanja}`;
        $('teaserDate').textContent = `${now.getMonth() + 1}월 ${now.getDate()}일 오늘의 일진 · ${d.stem.kor}${d.branch.kor}일`;
        $('teaserText').textContent = ExtraData.dayEl[d.stem.el] + '. 이 기운이 나에게는 어떻게 작용할까요?';
    }

    function showWelcome(u) {
        $('welcomeName').textContent = u.name;
        $('welcomeMeta').textContent = `${birthLabel(u)} · ${u.mbti}`;
        $('welcomeCard').style.display = 'block';
        $('fortuneForm').style.display = 'none';
    }

    function showForm() {
        $('welcomeCard').style.display = 'none';
        $('fortuneForm').style.display = 'block';
    }

    // ---------- 오늘의 운세 산출 ----------
    function computeToday(user, date) {
        state.profile = Fortune.profile(user);
        return Fortune.today(user, state.profile, date);
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
        const bl = u.cal === 'lunar' ? `${birthLabel(u)} (양력 ${formatBirth(u.birth)})` : formatBirth(u.birth);
        $('whoMeta').textContent = `${bl}${u.time ? ' ' + u.time : ''} · ${y.stem.kor}${y.branch.kor}년 ${y.branch.animal}띠 · ${genderLabel(u.gender)} · ${u.mbti}`;
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
        $('dayPlain').textContent = `쉽게 말해, ${ExtraData.plain[t.godKey]}`;
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

        // 점수가 낮은 날에만 '전화위복 풀이'를 보여 줍니다.
        const low = Fortune.average(t.scores) < 66 || Math.min(t.scores.love, t.scores.money, t.scores.work) < 55;
        $('reframeWrap').style.display = low ? 'block' : 'none';
        $('reframeText').textContent = g.reframe;

        const q = todayQuote();
        $('quoteHanmun').textContent = q.hanmun;
        $('quoteSrc').textContent = q.src;
        $('quoteKor').textContent = q.kor;

        const e = SajuData.elements[state.profile.weak];
        $('gaewunSub').textContent = `부족한 ${e.hanja} 기운 채우기`;
        $('gaewunGrid').innerHTML = `
            <div><b>행운의 색</b><span><i class="color-dot" style="background:${e.hex}"></i>${e.color}</span></div>
            <div><b>행운의 방향</b><span>${e.direction}</span></div>
            <div><b>행운의 숫자</b><span>${e.numbers}</span></div>
            <div><b>행운의 물건</b><span>${e.item}</span></div>
            <div style="grid-column: span 2;"><b>개운 음식</b><span>${e.food}</span></div>`;
    }

    function todayGrade() {
        const avg = Fortune.average(state.today.scores);
        return ExtraData.grades.find(gr => avg >= gr.min);
    }

    function omikujiKey() {
        return `${Fortune.userKey(state.user)}-${Engine.ymd(new Date())}`;
    }

    function renderOmikuji() {
        const drawn = (store.get(STORE_OMIKUJI) || {})[omikujiKey()];
        $('omiStage').style.display = drawn ? 'none' : 'block';
        $('omiResult').style.display = drawn ? 'block' : 'none';
        if (!drawn) return;
        const gr = todayGrade(), t = state.today, e = SajuData.elements[state.profile.weak];
        $('omiHanja').innerHTML = gr.hanja.split('').join('<br>');
        $('omiGrade').innerHTML = `${gr.name}(${gr.hanja})<small>${gr.desc}</small>`;
        $('omiPlain').textContent = `오늘은 ${ExtraData.plain[t.godKey]}이에요.` + (gr.name === '신중' ? ' 아래 전화위복 풀이도 꼭 읽어 보세요.' : '');
        $('omiChips').innerHTML = [
            `<i class="color-dot" style="background:${e.hex}"></i>행운의 색 ${e.color.split(' · ')[0]}`,
            `행운의 숫자 ${e.numbers.split(', ')[0]}`,
            `행운의 방향 ${e.direction}`
        ].map(x => `<span>${x}</span>`).join('');
    }

    function drawOmikuji() {
        const cup = $('omiCup');
        if (cup.classList.contains('shake')) return;
        cup.classList.add('shake');
        if (navigator.vibrate) navigator.vibrate([30, 60, 30]);
        setTimeout(() => {
            cup.classList.remove('shake');
            const all = store.get(STORE_OMIKUJI) || {};
            // 오래된 기록은 정리하고 오늘 것만 남깁니다.
            const today = Engine.ymd(new Date());
            Object.keys(all).forEach(k => { if (!k.endsWith(today)) delete all[k]; });
            all[omikujiKey()] = true;
            store.set(STORE_OMIKUJI, all);
            renderOmikuji();
            renderKeepsake();
        }, 900);
    }

    function openSheet(term) {
        const g = ExtraData.glossary[term];
        if (!g) return;
        $('sheetTitle').textContent = g.title;
        $('sheetText').textContent = g.text;
        $('sheet').classList.add('show');
        $('sheetDim').classList.add('show');
    }

    function closeSheet() {
        $('sheet').classList.remove('show');
        $('sheetDim').classList.remove('show');
    }

    function todayQuote() {
        // 고전 구절은 날짜마다 바뀌고, 같은 날에는 모두에게 같습니다.
        return Engine.pick(ExtraData.quotes, Engine.prng('quote-' + Engine.ymd(new Date())));
    }

    function renderCross() {
        const u = state.user, me = state.profile.saju.day.stem;
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
            line = bornRational === nowRational ? J.same : J.diff(bornRational ? '이성·원칙' : '감성·직관', nowRational ? '이성(T)' : '감성(F)');
        }
        $('crossJudge').textContent = `${u.mbti} · ${FortuneData.mbti.nick[u.mbti]}. ${line}`;
    }

    function ageOn(date) {
        const u = state.user;
        const y = +u.birth.slice(0, 4), m = +u.birth.slice(4, 6), d = +u.birth.slice(6, 8);
        let age = date.getFullYear() - y;
        if (date.getMonth() + 1 < m || (date.getMonth() + 1 === m && date.getDate() < d)) age--;
        return age;
    }

    function periodText(pillar, unit) {
        const me = state.profile.saju.day.stem;
        const god = SajuData.sipsin[Saju.tenGod(me, pillar.stem.i)];
        const rel = Saju.branchRelation(state.profile.saju.day.branch.i, pillar.branch.i);
        return {
            title: `${pillar.stem.hanja}${pillar.branch.hanja}${unit} · ${god.name}(${god.hanja})의 ${unit === '년' ? '해' : '달'}`,
            text: `${god.dw}입니다. 키워드는 ${god.kw}. ${ExtraData.periodRel[rel]}`.trim()
        };
    }

    function renderFlow() {
        const me = state.profile.saju.day.stem;
        const dw = Saju.daewoon(state.profile.saju, state.user.gender);
        const age = ageOn(new Date());
        let cur = null;
        dw.list.forEach(p => { if (age >= p.age) cur = p; });
        $('dwSub').textContent = `대운 ${dw.forward ? '순행' : '역행'} · ${dw.startAge}세 시작`;
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
            $('dwNow').textContent = `지금은 ${cur.age}세부터 이어지는 ${cur.stem.hanja}${cur.branch.hanja} 대운, ${god.name}(${god.hanja})의 10년입니다. ${god.dw}이며, 삶의 중심 주제는 ${god.kw}입니다.`;
        } else {
            $('dwNow').textContent = `첫 대운은 ${dw.startAge}세에 시작됩니다. 그전까지는 타고난 원국의 기운이 그대로 흐릅니다.`;
        }
        const now = state.today.tp;
        const se = periodText(now.year, '년');
        const wo = periodText(now.month, '월');
        $('seunTitle').textContent = '올해 · ' + se.title;
        $('seunText').textContent = se.text;
        $('wolunTitle').textContent = '이달 · ' + wo.title;
        $('wolunText').textContent = wo.text;
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
        renderCross();
        renderFlow();

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

    // ---------- 궁합 ----------
    function readPartner() {
        const name = $('pName').value.trim();
        const birth = $('pBirth').value.trim();
        const gender = $('pGender').value;
        const mbti = $('pMbti').value;
        if (!name) return { error: '상대 이름을 입력해 주세요.' };
        const b = resolveBirth(birth, $('pCal').value);
        if (b.error) return b;
        if (!gender) return { error: '상대 성별을 선택해 주세요.' };
        return { partner: { name, birth: b.ymd, time: '', gender, mbti } };
    }

    function fillPartner(p) {
        $('pName').value = p.name;
        $('pCal').value = 'solar';
        $('pBirth').value = formatBirth(p.birth);
        birthPreview($('pBirth'), $('pBirthPreview'), 'solar');
        $('pGender').value = p.gender;
        $('pMbti').value = p.mbti;
    }

    function runCompat(partner) {
        state.compat = Compat.compute(state.user, partner);
        renderCompat();
        $('compatResult').style.display = 'block';
    }

    function renderCompat() {
        const c = state.compat;
        if (!c) return;
        const person = x => {
            const st = x.profile.saju.day.stem;
            return `<div class="p"><div class="ilgan-hanja ${EL_CLASS(st.el)}">${st.hanja}</div><div class="nm">${escapeHtml(x.name)} · ${x.mbti || 'MBTI ?'}</div></div>`;
        };
        $('ghPair').innerHTML = person(c.a) + '<div class="amp">緣</div>' + person(c.b);
        $('ghTotal').textContent = c.total;
        $('ghGrade').textContent = c.grade.name;
        $('ghSummary').textContent = c.grade[state.tone];
        $('ghParts').innerHTML = c.parts.map(p => `
            <div class="gh-item">
                <div class="hd"><span>${p.title}</span><span style="color:var(--gold)">${p.score} / ${p.max}</span></div>
                <div class="tx">${escapeHtml(p.text)}</div>
            </div>`).join('');
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    async function shareOrCopy(title, text, url) {
        if (navigator.share) {
            try {
                await navigator.share({ title, text, url });
                return;
            } catch (e) {
                if (e.name === 'AbortError') return;
            }
        }
        copyText(`${text}\n${url}`, '링크가 복사되었습니다. 원하는 곳에 붙여 넣어 주세요.');
    }

    function keepsakeData() {
        const u = state.user, t = state.today, sj = state.profile.saju;
        return {
            pillars: [['時', sj.hour], ['日', sj.day], ['月', sj.month], ['年', sj.year]].map(([label, p], i) => ({
                label, stem: p && p.stem, branch: p && p.branch, me: i === 1
            })),
            ilganLine: `${sj.day.stem.hanja}${Saju.EL_HANJA[sj.day.stem.el]} · ${state.profile.ilgan.title}`,
            dayTitle: `${isOmikujiDrawn() ? `점괘 ${todayGrade().hanja} · ` : ''}오늘은 ${t.god.name}(${t.god.hanja})의 날`,
            name: u.name,
            dateLabel: dateLabel(new Date()),
            subtitle: `${u.mbti} · ${FortuneData.mbti.nick[u.mbti]}`,
            text: t.god.day[state.tone],
            scores: t.scores,
            quote: todayQuote()
        };
    }

    function isOmikujiDrawn() {
        return !!(store.get(STORE_OMIKUJI) || {})[omikujiKey()];
    }

    function renderKeepsake() {
        Keepsake.render(keepsakeData());
    }

    function renderAll() {
        renderHeader();
        renderToday();
        renderOmikuji();
        renderSaju();
        renderCompat();
        renderKeepsake();
    }

    // ---------- 탭 ----------
    function switchTab(tab) {
        state.tab = tab;
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('on', p.dataset.panel === tab));
        document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (tab === 'saju') {
            // 현재 대운이 보이도록 가로 스크롤을 맞춥니다.
            const list = $('dwList'), nowEl = list.querySelector('.now');
            if (nowEl) list.scrollLeft = nowEl.offsetLeft - list.offsetLeft - (list.clientWidth - nowEl.clientWidth) / 2;
        }
    }

    // ---------- 화면 전환 ----------
    function showResult() {
        state.today = computeToday(state.user, new Date());
        $('inputView').style.display = 'none';
        $('resultView').style.display = 'block';
        document.body.classList.add('result-mode');
        $('tabbar').style.display = 'flex';
        Tarot.setUser(Fortune.userKey(state.user), Engine.ymd(new Date()));
        Journal.recordVisit(Fortune.userKey(state.user), state.today.god.name, state.today.god.hanja, Fortune.average(state.today.scores));
        state.compat = null;
        $('compatResult').style.display = 'none';
        $('reframeText').style.display = 'none';
        $('btnReframe').style.display = '';
        renderAll();
        if (state.invite) {
            fillPartner(state.invite);
            runCompat(state.invite);
            state.invite = null;
            $('inviteBanner').style.display = 'none';
            history.replaceState(null, '', appUrl());
            switchTab('compat');
        } else {
            switchTab('today');
        }
    }

    function showInput() {
        $('resultView').style.display = 'none';
        $('tabbar').style.display = 'none';
        $('inputView').style.display = 'block';
        document.body.classList.remove('result-mode');
        showForm();
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
        const g = state.today.god, me = state.profile.saju.day.stem, gr = todayGrade();
        return `📜 ${u.name}(${u.mbti}) 님의 오늘 명운 · 점괘 ${gr.hanja}(${gr.name})\n${me.hanja}${Saju.EL_HANJA[me.el]} · ${state.profile.ilgan.title}\n오늘은 ${g.name}(${g.hanja})의 날\n\n연애운 ${s.love}점 · 금전운 ${s.money}점 · 직장운 ${s.work}점\n\n나의 사주와 타로도 확인해 보세요.`;
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

        $('birthDate').addEventListener('input', () => birthPreview($('birthDate'), $('birthPreview'), mainCal()));
        $('birthDate').addEventListener('blur', e => {
            const n = normalizeBirth(e.target.value);
            if (n) e.target.value = formatBirth(n);
        });
        document.querySelectorAll('.seg[data-for="calType"] button').forEach(b => b.addEventListener('click', () => setCal(b.dataset.v)));
        $('leapMonth').addEventListener('change', () => birthPreview($('birthDate'), $('birthPreview'), mainCal()));
        document.querySelectorAll('.seg[data-for="gender"] button').forEach(b => b.addEventListener('click', () => setGender(b.dataset.v)));
        document.querySelectorAll('#mbtiPick .seg button').forEach(b => b.addEventListener('click', () => {
            b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
            syncMbti();
        }));
        $('btnMbtiQuiz').addEventListener('click', startMbtiQuiz);
        $('btnQuick').addEventListener('click', () => {
            state.user = store.get(STORE_USER);
            if (state.user) showResult(); else showForm();
        });
        $('btnEditInfo').addEventListener('click', showForm);

        $('omiCup').addEventListener('click', drawOmikuji);
        document.addEventListener('click', e => {
            const q = e.target.closest('.qm');
            if (q) openSheet(q.dataset.term);
        });
        $('sheetDim').addEventListener('click', closeSheet);
        $('sheetClose').addEventListener('click', closeSheet);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

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
        $('btnReframe').addEventListener('click', () => {
            $('reframeText').style.display = 'block';
            $('btnReframe').style.display = 'none';
        });

        $('compatForm').addEventListener('submit', e => {
            e.preventDefault();
            const r = readPartner();
            $('compatError').textContent = r.error || '';
            if (r.error) return;
            runCompat(r.partner);
            $('compatResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        $('pBirth').addEventListener('blur', e => {
            const n = normalizeBirth(e.target.value);
            if (n) e.target.value = formatBirth(n);
        });
        const pPreview = () => birthPreview($('pBirth'), $('pBirthPreview'), $('pCal').value);
        $('pBirth').addEventListener('input', pPreview);
        $('pCal').addEventListener('change', pPreview);
        $('btnInvite').addEventListener('click', () => {
            const u = state.user;
            shareOrCopy('명운 궁합 초대', `${u.name} 님이 명운에서 궁합을 보자고 초대했습니다. 내 정보만 입력하면 두 사람의 궁합이 바로 나옵니다.`, Compat.inviteUrl(u, appUrl()));
        });
        $('btnShareCompat').addEventListener('click', () => {
            const c = state.compat;
            shareOrCopy('명운 궁합', `💞 ${c.a.name} × ${c.b.name} 궁합 ${c.total}점 · ${c.grade.name}\n\n우리 궁합도 명운에서 확인해 보세요.`, appUrl());
        });
    }

    function init() {
        Keepsake.init($('keepsakeCanvas'));
        Tarot.init();
        Journal.init(ok => toast(ok ? '오늘의 기록을 저장했습니다.' : '이 환경에서는 기록을 저장할 수 없습니다.'));
        $('pMbti').innerHTML = '<option value="">MBTI 모름</option>' + MBTI_TYPES.map(t => `<option>${t}</option>`).join('');
        renderTeaser();

        const inv = Compat.readInvite(location.search);
        if (inv && !parseBirth(inv.birth).error) {
            state.invite = inv;
            $('inviteBanner').innerHTML = `<b>${escapeHtml(inv.name)}</b> 님이 궁합을 보자고 초대했습니다.<br>내 정보를 입력하면 두 사람의 궁합을 바로 볼 수 있습니다.`;
            $('inviteBanner').style.display = 'block';
        }
        const saved = store.get(STORE_USER);
        if (saved && saved.name && saved.birth && saved.gender && saved.mbti) {
            fillForm(saved);
            showWelcome(saved);
        }
        state.tone = store.get(STORE_TONE) === 'direct' ? 'direct' : 'gentle';
        bind();
    }

    document.addEventListener('DOMContentLoaded', init);

    return { state, store, toast, copyText, appUrl, switchTab };
})();
