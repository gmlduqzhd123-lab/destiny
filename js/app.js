/**
 * [App] 별빛 나침반 — 학생용 / 선생님용 테마 전환, 입력 → 결과 화면 전환, 탭, 풀이 어조, 공유
 */
const App = (() => {
    const $ = id => document.getElementById(id);
    const STORE_USER = 'myeongun_user_v3';
    const STORE_TONE = 'myeongun_tone';
    const STORE_MODE = 'starcompass_mode';
    const STORE_OMIKUJI = 'myeongun_omikuji';
    const MBTI_TYPES = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'];

    const SEALS = {
        student: [
            { ch: '夢', label: '꿈' },
            { ch: '友', label: '우정' },
            { ch: '智', label: '지혜' },
            { ch: '勇', label: '용기' },
            { ch: '誠', label: '성실' },
            { ch: '愛', label: '사랑' }
        ],
        teacher: [
            { ch: '福', label: '복' },
            { ch: '吉', label: '길' },
            { ch: '合', label: '화합' },
            { ch: '壽', label: '건강' },
            { ch: '慧', label: '지혜' },
            { ch: '愛', label: '사랑' }
        ]
    };

    const state = {
        mode: 'student',
        eduTab: 'lunar',
        user: null,
        tone: 'gentle',
        profile: null,
        today: null,
        tab: 'today',
        compat: null
    };

    // ---------- 저장소 (접근이 막힌 환경에서도 앱이 멈추지 않도록) ----------
    const store = {
        get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } },
        set(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 무시 */ } },
        remove(key) { try { localStorage.removeItem(key); } catch (e) { /* 무시 */ } }
    };

    function isTeacher() {
        return state.mode === 'teacher';
    }

    function mbtiNick(mbti) {
        if (!mbti) return '';
        return (isTeacher() && FortuneData.mbti.teacherNick ? FortuneData.mbti.teacherNick[mbti] : FortuneData.mbti.nick[mbti]) || '';
    }

    // ---------- 입력 검증 ----------
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
        if (!str) return { error: '생년월일을 알아볼 수 없어요. 예: 2015.05.05' };
        const y = +str.slice(0, 4), m = +str.slice(4, 6), d = +str.slice(6, 8);
        const date = new Date(y, m - 1, d);
        if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
            return { error: '존재하지 않는 날짜입니다. 다시 확인해 주세요.' };
        }
        if (y < 1900 || date > new Date()) return { error: '1900년 이후, 오늘 이전의 날짜를 입력해 주세요.' };
        return { y, m, d, ymd: str };
    }

    function resolveBirth(raw, cal) {
        if (cal !== 'lunar' && cal !== 'leap') return parseBirth(raw);
        const str = normalizeBirth(raw);
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
        const b = parseBirth(`${solar.year}${String(solar.month).padStart(2, '0')}${String(solar.day).padStart(2, '0')}`);
        if (b.error) return b;
        return { ...b, lunar: str, leap };
    }

    function formatBirth(ymd) {
        return `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
    }

    function birthLabel(u) {
        return u.cal === 'lunar' ? `음력 ${formatBirth(u.lunar)}${u.leap ? '(윤달)' : ''}` : formatBirth(u.birth);
    }

    function birthPreview(inputEl, noteEl, cal) {
        const raw = inputEl.value.trim();
        if (!raw) { noteEl.textContent = ''; noteEl.classList.remove('err'); return; }
        const b = resolveBirth(raw, cal);
        if (b.error) {
            noteEl.textContent = raw.replace(/\D/g, '').length >= 6 ? b.error : '';
            noteEl.classList.add('err');
            return;
        }
        const yp = Saju.calc({ y: b.y, m: b.m, d: b.d }).year;
        const tti = `${yp.stem.kor}${yp.branch.kor}년(${yp.stem.hanja}${yp.branch.hanja}) ${yp.branch.animal}띠`;
        if (b.lunar) {
            const ly = +b.lunar.slice(0, 4), lm = +b.lunar.slice(4, 6), ld = +b.lunar.slice(6, 8);
            noteEl.textContent = `✓ 음력 ${ly}년 ${b.leap ? '윤' : ''}${lm}월 ${ld}일 → 양력 ${b.y}년 ${b.m}월 ${b.d}일 · ${tti}`;
        } else {
            noteEl.textContent = `✓ 양력 ${b.y}년 ${b.m}월 ${b.d}일 · ${tti}`;
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
        const place = $('birthPlace').value;
        if (!name) return { error: '이름(또는 별명)을 입력해 주세요.' };
        const b = resolveBirth($('birthDate').value, mainCal());
        if (b.error) return b;
        if (!gender) return { error: '성별을 골라 주세요.' };
        if (!mbti) return { error: 'MBTI 네 칸을 모두 골라 주세요. 모르면 "4문항으로 찾아보기"를 눌러 보세요.' };
        const user = { name, birth: b.ymd, time, gender, mbti };
        if (time && place !== 'none') user.place = place;
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
        $('mbtiPreview').textContent = full ? `${full} · ${mbtiNick(full)}` : '';
    }

    function startMbtiQuiz() {
        const box = $('mbtiQuiz');
        const quizList = isTeacher() && ExtraData.teacherMbtiQuiz ? ExtraData.teacherMbtiQuiz : ExtraData.mbtiQuiz;
        const answers = [];
        const step = () => {
            const i = answers.length;
            if (i === quizList.length) {
                box.style.display = 'none';
                $('mbtiPick').style.display = '';
                setMbti(answers.join(''));
                $('mbtiPreview').textContent += ' (4문항으로 찾은 나의 유형이에요)';
                return;
            }
            const q = quizList[i];
            box.innerHTML = `<div class="qn">${i + 1} / ${quizList.length}</div>
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
        $('birthPlace').value = u.place || (u.time ? 'none' : 'seoul');
        $('timeMore').open = !!u.time;
        timePreview();
    }

    // ---------- 태어난 시간 · 지역 보정 ----------
    function fillPlaces() {
        $('birthPlace').innerHTML = Saju.PLACES.map(g =>
            `<optgroup label="${g.group}">${g.list.map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}</optgroup>`
        ).join('') + '<optgroup label="기타"><option value="none">해외·모름 (보정 안 함)</option></optgroup>';
        $('birthPlace').value = 'seoul';
    }

    function correctionText(c, placeName) {
        if (!c) return '';
        const signed = n => `${n > 0 ? '+' : '−'}${Math.abs(n)}분`;
        const parts = [];
        if (c.lmt) parts.push('1908년 이전이라 지역 시각 그대로');
        else if (c.lonMin) parts.push(`경도 ${signed(c.lonMin)}`);
        if (c.dst) parts.push('서머타임 −60분');
        if (c.eotMin) parts.push(`균시차 ${signed(c.eotMin)}`);
        const notes = [];
        if (c.offset === 510 || c.offset === 570) notes.push('당시 표준시 UTC+8:30 반영');
        if (c.dayShift < 0) notes.push('보정하면 전날 밤이에요');
        if (c.dayShift > 0) notes.push('보정하면 다음 날 새벽이에요');
        return `${placeName} 기준 진태양시 ${c.solar} (${parts.join(', ') || '보정 없음'})` + (notes.length ? ` · ${notes.join(' · ')}` : '');
    }

    function timePreview() {
        const note = $('timePreview');
        const time = $('birthTime').value, placeId = $('birthPlace').value;
        const b = resolveBirth($('birthDate').value, mainCal());
        if (!time || placeId === 'none' || b.error) {
            note.textContent = time && placeId === 'none' ? `입력한 ${time} 그대로 계산해요.` : '';
            return;
        }
        const place = Saju.PLACE_MAP[placeId];
        const [hh, mm] = time.split(':').map(Number);
        const r = Saju.calc({ y: b.y, m: b.m, d: b.d, hour: hh, minute: mm, lon: place.lon });
        note.textContent = '✓ ' + correctionText(r.correction, place.name);
    }

    // ---------- 테마 모드 전환 (🌱 학생용 / 🏫 선생님용) ----------
    function renderSealPalette() {
        const list = SEALS[state.mode] || SEALS.student;
        Keepsake.setSeal(null);
        $('sealPalette').innerHTML = list.map(s =>
            `<button type="button" class="seal-btn" data-seal="${s.ch}">${s.ch}<small>${s.label}</small></button>`
        ).join('');
        $('sealPalette').querySelectorAll('.seal-btn').forEach(b => b.addEventListener('click', () => {
            const on = !b.classList.contains('on');
            $('sealPalette').querySelectorAll('.seal-btn').forEach(x => x.classList.remove('on'));
            b.classList.toggle('on', on);
            Keepsake.setSeal(on ? b.dataset.seal : null);
            if (on) toast('카드 위를 눌러 도장을 찍어 보세요.');
        }));
    }

    function setMode(mode) {
        state.mode = mode === 'teacher' ? 'teacher' : 'student';
        const teacher = isTeacher();
        document.body.dataset.mode = state.mode;
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.setAttribute('content', teacher ? '#0f0d0b' : '#0b1120');

        document.querySelectorAll('#modeSwitch button').forEach(b => {
            const on = b.dataset.mode === state.mode;
            b.classList.toggle('on', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
        });

        $('brandSeal').textContent = teacher ? '師' : '星';
        $('brandDesc').textContent = teacher
            ? '오늘의 교실 기운 · 학생 기질 상담 코칭 · 선생님을 위한 교단 힐링'
            : '이름, 생년월일, 성별, MBTI로 찾는 나의 별빛 기질과 우정 나침반';

        $('labelUserName').textContent = teacher ? '이름 (선생님 또는 분석할 학생)' : '이름 (또는 별명)';
        $('userName').placeholder = teacher ? '예: 김선생 또는 학생 이름' : '예: 김별빛 (별명도 괜찮아요)';
        $('birthDate').placeholder = teacher ? '예: 1990.05.15 또는 2015.05.05' : '예: 2015.05.05 또는 20150505';
        $('btnGenderF').textContent = teacher ? '여성' : '여자';
        $('btnGenderM').textContent = teacher ? '남성' : '남자';
        $('optPGenderM').textContent = teacher ? '남성(남학생)' : '남자';
        $('optPGenderF').textContent = teacher ? '여성(여학생)' : '여자';

        $('btnQuick').textContent = teacher ? '오늘의 교단 나침반 바로 보기' : '오늘의 별빛 나침반 바로 보기';
        $('btnSubmit').textContent = teacher ? '나침반 열기 (교단 운세 · 학생 코칭)' : '나의 별빛 나침반 열기';

        $('btnToneGentle').textContent = teacher ? '다정한 풀이' : '다정한 말투';
        $('btnToneDirect').textContent = teacher ? '직설 풀이' : '솔직한 말투';

        $('omiTitleText').textContent = teacher ? '오늘의 교단 점괘' : '오늘의 별빛 뽑기';
        $('omiBodyChar').textContent = teacher ? '運' : '星';
        $('omiGuideText').textContent = teacher ? '점통을 눌러 오늘의 교실·교단 기운을 뽑아 보세요' : '별빛 통을 눌러 오늘의 기운을 뽑아 보세요';

        $('todaySummaryTitle').textContent = teacher ? '오늘의 교단 총평' : '오늘의 별빛 나침반';
        $('themeCardTitle').textContent = teacher ? '오늘의 교단·일상 3대 지수' : '오늘의 세 가지 별빛 지수';
        $('labelLove').textContent = teacher ? '소통 · 동료·학부모운' : '교우 · 우정운';
        $('labelMoney').textContent = teacher ? '활력 · 재충전운' : '탐구 · 창의운';
        $('labelWork').textContent = teacher ? '수업 · 학급경영운' : '배움 · 집중운';

        $('adviceCardTitle').textContent = teacher ? '선생님 성향 맞춤 조언' : 'MBTI 맞춤 조언과 오늘의 다짐';
        $('missionLabel').textContent = teacher ? '오늘의 교단 힐링 미션' : '오늘의 작은 실천';
        $('gaewunTitleText').textContent = teacher ? '오늘의 활력 충전소 (개운 요소)' : '행운을 부르는 별빛 아이템';
        $('keepsakeTitleText').textContent = teacher ? '별빛 나침반 카드 만들기' : '별빛 도감 카드 만들기';

        $('sajuTitleText').textContent = teacher ? '사주 원국(原局) · 기질 구조' : '나의 시간 암호 (네 기둥)';
        $('ilganCardTitle').textContent = teacher ? '타고난 일간(日干) 기질 캐릭터' : '나를 상징하는 자연물 캐릭터';
        $('ilganCautionLabel').textContent = teacher ? '코칭·보완 포인트' : '더 자라날 점';
        $('amuletTitleText').textContent = teacher ? '선생님을 위한 교단 응원 부적' : '나를 응원하는 별빛 부적';

        $('compatFormTitle').textContent = teacher ? '학생 모둠 · 관계 케미 분석' : '짝꿍 · 모둠 우정 케미 보기';
        $('compatFormSub').textContent = teacher ? '비교할 학생이나 상대 정보를 입력해 주세요' : '친구의 정보를 입력해 주세요';
        $('pName').placeholder = teacher ? '상대(또는 짝꿍 학생) 이름' : '친구(짝꿍) 이름';
        $('btnCompatSubmit').textContent = teacher ? '관계 · 모둠 케미 분석하기' : '우정 케미 확인하기';
        $('compatResultTitle').textContent = teacher ? '두 사람의 관계 · 협동 시너지' : '두 사람의 우정 케미';
        $('compatInviteTitle').textContent = '별빛 나침반 앱 초대';
        $('compatInviteDesc').textContent = '개인정보 없이 앱 주소만 보냅니다. 두 사람의 케미는 서로 동의한 정보를 이 기기에서 직접 입력해 확인해 주세요.';

        $('tarotTitleText').textContent = teacher ? '교단 힐링 타로' : '상징 이야기 · 마음 카드';
        $('tarotSubText').textContent = teacher ? '오늘의 영감과 마인드셋' : '이야기 짓기 · 고민 나누기';
        $('tarotQuestion').placeholder = teacher
            ? '마음속 질문이나 학급·일상의 고민을 적어 보세요 (선택)'
            : '고민이나 지어 보고 싶은 이야기 주제를 적어 보세요 (선택)';

        $('journalTitleText').textContent = teacher ? '교단 · 마음 일지' : '별빛 마음 달력';
        $('memoTitleText').textContent = teacher ? '오늘 교실에서의 하루는 어땠나요?' : '오늘 하루 나의 마음 날씨는?';
        $('memoText').placeholder = teacher
            ? '오늘 수업이나 학급에서 기억에 남는 순간을 한 줄로 남겨 보세요.'
            : '오늘 고마웠던 일이나 내일의 다짐을 한 줄로 남겨 보세요.';

        $('tabLabelToday').textContent = '오늘';
        $('tabLabelSaju').textContent = teacher ? '기질·코칭' : '기질';
        $('tabLabelCompat').textContent = teacher ? '관계·모둠' : '우정케미';
        $('tabLabelTarot').textContent = teacher ? '힐링타로' : '상징카드';
        $('tabLabelJournal').textContent = teacher ? '교단일지' : '마음일기';

        $('footerNoteText').textContent = teacher
            ? '별빛 나침반은 학생 기질 이해와 선생님의 교단 힐링을 돕는 교육 도구입니다.'
            : '별빛 나침반은 나와 친구의 강점을 찾는 자기이해 도구입니다. 가장 중요한 나침반은 나의 선택과 마음가짐이에요!';

        renderSealPalette();
        renderTeaser();
        syncMbti();
        Tarot.setMode(state.mode);
        Journal.setMode(state.mode);
        if (state.user && state.today) {
            renderAll();
        }
    }

    // ---------- 입력 전 첫 화면 ----------
    function renderTeaser() {
        const now = new Date();
        const d = Saju.todayPillars(now).day;
        $('teaserGz').innerHTML = `${d.stem.hanja}<br>${d.branch.hanja}`;
        $('teaserDate').textContent = `${now.getMonth() + 1}월 ${now.getDate()}일 ${isTeacher() ? '오늘의 교실 책력' : '오늘의 별빛 책력'} · ${d.stem.kor}${d.branch.kor}일(${d.stem.hanja}${d.branch.hanja})`;
        $('teaserText').textContent = ExtraData.dayEl[d.stem.el] + (isTeacher()
            ? '. 오늘 우리 반 교실과 선생님께는 어떤 기운이 흐를까요?'
            : '. 이 기운이 오늘 나에게는 어떤 별빛을 비춰 줄까요?');
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
    function genderLabel(g) {
        if (isTeacher()) return g === 'M' ? '남성' : '여성';
        return g === 'M' ? '남자' : '여자';
    }

    function dateLabel(d) {
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    }

    function renderHeader() {
        const u = state.user;
        $('whoName').textContent = `${u.name} ${isTeacher() ? '님' : '학생'}`;
        const y = state.profile.saju.year;
        const bl = u.cal === 'lunar' ? `${birthLabel(u)} (양력 ${formatBirth(u.birth)})` : formatBirth(u.birth);
        const placeInfo = u.time && Saju.PLACE_MAP[u.place];
        const pl = placeInfo ? ' ' + placeInfo.name.split('·')[0] : '';
        $('whoMeta').textContent = `${bl}${u.time ? ' ' + u.time + pl : ''} · ${y.stem.kor}${y.branch.kor}년 ${y.branch.animal}띠 · ${genderLabel(u.gender)} · ${u.mbti}`;
        document.querySelectorAll('#toneToggle button').forEach(b => b.classList.toggle('on', b.dataset.tone === state.tone));
    }

    function setScore(key, v) {
        const cap = key[0].toUpperCase() + key.slice(1);
        $('score' + cap).textContent = v + '점';
        $('bar' + cap).style.width = v + '%';
    }

    const EL_CLASS = el => 'el-' + el;

    function activeGodText(god) {
        return isTeacher() && god.teacher ? god.teacher : god;
    }

    function renderToday() {
        const t = state.today, tone = state.tone, u = state.user, g = t.god;
        const gt = activeGodText(g);
        const tp = t.tp.day;
        const plainMap = isTeacher() && ExtraData.teacherPlain ? ExtraData.teacherPlain : ExtraData.plain;

        $('todayDate').textContent = `${dateLabel(new Date())} · ${tp.stem.hanja}${tp.branch.hanja}일`;
        $('dayHanja').textContent = g.hanja;
        $('dayName').textContent = `오늘은 ${g.name}(${g.hanja})의 날`;
        $('dayKw').textContent = g.kw;
        $('dayPlain').textContent = `한 줄 요약 · ${plainMap[t.godKey]}`;
        $('todayText').textContent = gt.day[tone];

        const notes = [];
        if (t.rel) notes.push(`${t.rel.label} · ${t.rel[tone]}`);
        if (t.balance === 'boost') notes.push(`오늘의 ${Saju.EL_HANJA[t.todayEl]} 기운이 나에게 부족한 자연 기운을 든든히 채워 줍니다.`);
        if (t.balance === 'excess') notes.push(`이미 풍부한 ${Saju.EL_HANJA[t.todayEl]} 기운이 더해지니, 욕심을 조금만 덜어내면 균형이 잘 맞습니다.`);
        $('todayRelation').textContent = notes.join(' ');
        $('todayRelation').style.display = notes.length ? 'block' : 'none';

        setScore('love', t.scores.love);
        setScore('money', t.scores.money);
        setScore('work', t.scores.work);
        $('textLove').textContent = gt.love[tone];
        $('textMoney').textContent = gt.money[tone];
        $('textWork').textContent = gt.work[tone];
        $('mbtiBadge').textContent = u.mbti;

        const advMap = isTeacher() && FortuneData.mbti.teacherAdvice ? FortuneData.mbti.teacherAdvice : FortuneData.mbti.advice;
        $('mbtiAdvice').textContent = advMap[u.mbti][tone];
        $('missionText').textContent = gt.mission;

        // 언제든 긍정 리프레이밍(전화위복)을 볼 수 있도록 하되, 점수가 낮은 날에는 특히 강조합니다.
        $('reframeWrap').style.display = 'block';
        $('reframeText').textContent = gt.reframe;

        const q = todayQuote();
        $('quoteHanmun').textContent = q.hanmun;
        $('quoteSrc').textContent = q.src;
        $('quoteKor').textContent = q.kor;
        if (q.tip) {
            $('quoteTip').innerHTML = isTeacher()
                ? `<b>🏫 아침 조회 한마디 활용</b> · ${q.tip}`
                : `<b>🌱 생각 씨앗</b> · ${q.tip}`;
            $('quoteTip').style.display = 'block';
        } else {
            $('quoteTip').style.display = 'none';
        }

        const e = SajuData.elements[state.profile.weak];
        $('gaewunSub').textContent = `부족한 ${e.hanja}(${e.nature}) 기운 채우기`;
        const itemLabel = isTeacher() ? '행운의 소품' : '행운의 학용품·소품';
        const itemVal = isTeacher() ? e.item : (e.studentItem || e.item);
        $('gaewunGrid').innerHTML = `
            <div><b>행운의 색깔</b><span><i class="color-dot" style="background:${e.hex}"></i>${e.color}</span></div>
            <div><b>행운의 방향</b><span>${e.direction}</span></div>
            <div><b>행운의 숫자</b><span>${e.numbers}</span></div>
            <div><b>${itemLabel}</b><span>${itemVal}</span></div>
            <div style="grid-column: span 2;"><b>추천 간식·음식</b><span>${e.food}</span></div>`;
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
        const plainMap = isTeacher() && ExtraData.teacherPlain ? ExtraData.teacherPlain : ExtraData.plain;
        $('omiHanja').innerHTML = gr.hanja.split('').join('<br>');
        $('omiGrade').innerHTML = `${gr.name}(${gr.hanja})<small>${gr.desc}</small>`;
        $('omiPlain').textContent = `오늘은 ${plainMap[t.godKey]}이에요.` + (gr.name === '신중' ? ' 아래 전화위복 풀이도 꼭 읽어 보세요!' : '');
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
            line = bornRational === nowRational ? J.same : J.diff(bornRational ? '이성·원칙' : '감성·직관', nowRational ? '사고(T)' : '공감(F)');
        }
        $('crossJudge').textContent = `${u.mbti} · ${mbtiNick(u.mbti)}. ${line}`;
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
            text: `${god.dw}입니다. 핵심 키워드는 [${god.kw}]. ${ExtraData.periodRel[rel]}`.trim()
        };
    }

    function renderFlow() {
        const me = state.profile.saju.day.stem;
        const dw = Saju.daewoon(state.profile.saju, state.user.gender);
        const age = ageOn(new Date());
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

    function renderCoaching(stemIdx) {
        if (!SajuData.coaching || !SajuData.coaching[stemIdx]) return;
        const c = SajuData.coaching[stemIdx];
        $('coachList').innerHTML = `
            <div class="coach-item"><b>👀 교실 · 학습 태도 특징</b>${c.attitude}</div>
            <div class="coach-item"><b>👏 효과적인 칭찬 · 동기부여 처방</b>${c.praise}</div>
            <div class="coach-item"><b>🧭 생활지도 · 갈등 코칭 팁</b>${c.guide}</div>
            <div class="coach-item"><b>📝 학부모 상담 · 행동발달 기록 예시</b>${c.record}</div>`;
    }

    function renderEduTopic() {
        if (!ExtraData.eduTopics) return;
        const topic = ExtraData.eduTopics[state.eduTab] || ExtraData.eduTopics.lunar;
        document.querySelectorAll('#eduTabs button').forEach(b => b.classList.toggle('on', b.dataset.edu === state.eduTab));
        $('eduBody').innerHTML = `<h4>${topic.title}</h4>${topic.body}`;
    }

    function renderSaju() {
        const p = state.profile, sj = p.saju, me = sj.day.stem;
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
        const u = state.user;
        let note = '';
        if (!sj.hasTime) note = '태어난 시간을 입력하면 시주까지 계산해 여덟 글자를 모두 볼 수 있어요.';
        else if (sj.correction) note = `출생 ${sj.correction.wall} → ${correctionText(sj.correction, Saju.PLACE_MAP[u.place].name)}. 시주는 실제 태양 시각(진태양시)으로 정했습니다.`;
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

    function renderOhaeng() {
        const c = state.profile.counts;
        const order = Saju.EL;
        const max = Math.max(3, ...order.map(el => c[el]));
        const cx = 80, cy = 82, R = 62;
        const pt = (i, r) => {
            const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
            return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
        };
        const color = el => getComputedStyle(document.documentElement).getPropertyValue('--' + el).trim();
        const lineCol = getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#3a332b';
        const goldCol = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim() || '#ffd166';
        let svg = '';
        [1, 0.66, 0.33].forEach(f => {
            svg += `<polygon points="${order.map((_, i) => pt(i, R * f).join(',')).join(' ')}" fill="none" stroke="${lineCol}" stroke-width="1"/>`;
        });
        svg += `<polygon points="${order.map((el, i) => pt(i, Math.max(4, R * c[el] / max)).join(',')).join(' ')}" fill="rgba(255,209,102,0.22)" stroke="${goldCol}" stroke-width="1.5"/>`;
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

    // ---------- 우정 케미 / 궁합 ----------
    function readPartner() {
        const name = $('pName').value.trim();
        const birth = $('pBirth').value.trim();
        const gender = $('pGender').value;
        const mbti = $('pMbti').value;
        if (!name) return { error: '친구(상대) 이름을 입력해 주세요.' };
        const b = resolveBirth(birth, $('pCal').value);
        if (b.error) return b;
        if (!gender) return { error: '성별을 선택해 주세요.' };
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
        $('ghPair').innerHTML = person(c.a) + `<div class="amp">${isTeacher() ? '緣' : '友'}</div>` + person(c.b);
        $('ghTotal').textContent = c.total + '점';
        $('ghGrade').textContent = isTeacher() && c.grade.teacherName ? c.grade.teacherName : c.grade.name;
        $('ghSummary').textContent = c.grade[state.tone];
        if (c.teamTip) {
            $('compatTeamTip').innerHTML = isTeacher()
                ? `<b>🏫 모둠 편성 · 역할 코칭 팁</b>${escapeHtml(c.teamTip.teacherGuide)}`
                : `<b>🤝 우리 둘의 모둠 협동 약속</b>${escapeHtml(c.teamTip.studentPromise)}`;
            $('compatTeamTip').style.display = 'block';
        }
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
        const gt = activeGodText(t.god);
        return {
            mode: state.mode,
            pillars: [['時', sj.hour], ['日', sj.day], ['月', sj.month], ['年', sj.year]].map(([label, p], i) => ({
                label, stem: p && p.stem, branch: p && p.branch, me: i === 1
            })),
            ilganLine: `${sj.day.stem.hanja}${Saju.EL_HANJA[sj.day.stem.el]} · ${state.profile.ilgan.title}`,
            dayTitle: `${isOmikujiDrawn() ? `${todayGrade().hanja} · ` : ''}오늘은 ${t.god.name}(${t.god.hanja})의 날`,
            name: u.name,
            dateLabel: dateLabel(new Date()),
            subtitle: `${u.mbti} · ${mbtiNick(u.mbti)}`,
            text: gt.day[state.tone],
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
        switchTab('today');
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
        if (isTeacher()) {
            return `🧭 ${u.name}(${u.mbti}) 님의 별빛 나침반 · 점괘 ${gr.hanja}(${gr.name})\n${me.hanja}${Saju.EL_HANJA[me.el]} · ${state.profile.ilgan.title}\n오늘은 ${g.name}(${g.hanja})의 날\n\n소통운 ${s.love}점 · 활력운 ${s.money}점 · 수업운 ${s.work}점\n\n별빛 나침반에서 나의 기질과 오늘의 방향을 확인해 보세요.`;
        }
        return `🌟 ${u.name}(${u.mbti})의 별빛 나침반 · ${gr.hanja}(${gr.name})\n${me.hanja}${Saju.EL_HANJA[me.el]} · ${state.profile.ilgan.title}\n오늘은 ${g.name}(${g.hanja})의 날\n\n우정운 ${s.love}점 · 탐구운 ${s.money}점 · 배움운 ${s.work}점\n\n나의 자연물 캐릭터와 우정 케미도 확인해 보세요!`;
    }

    async function onShare() {
        const text = shareSummary();
        try {
            if (await Keepsake.share('별빛도감.png', text + '\n' + appUrl())) return;
            if (navigator.share) {
                await navigator.share({ title: '별빛 나침반', text, url: appUrl() });
                return;
            }
        } catch (e) {
            if (e.name === 'AbortError') return;
        }
        copyText(text + '\n' + appUrl(), '결과가 복사되었습니다. 원하는 곳에 붙여 넣어 주세요.');
    }

    // ---------- 초기화 ----------
    function bind() {
        document.querySelectorAll('#modeSwitch button').forEach(b => b.addEventListener('click', () => {
            const m = b.dataset.mode;
            store.set(STORE_MODE, m);
            setMode(m);
            toast(m === 'teacher' ? '🏫 선생님용 테마로 전환했습니다.' : '🌱 학생용 테마로 전환했습니다.');
        }));

        document.querySelectorAll('#eduTabs button').forEach(b => b.addEventListener('click', () => {
            state.eduTab = b.dataset.edu;
            renderEduTopic();
        }));

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
        document.querySelectorAll('.seg[data-for="calType"] button').forEach(b => b.addEventListener('click', () => { setCal(b.dataset.v); timePreview(); }));
        $('leapMonth').addEventListener('change', () => { birthPreview($('birthDate'), $('birthPreview'), mainCal()); timePreview(); });
        ['birthTime', 'birthPlace'].forEach(id => $(id).addEventListener('input', timePreview));
        $('birthPlace').addEventListener('change', timePreview);
        $('birthDate').addEventListener('input', timePreview);
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

        $('btnClearSeals').addEventListener('click', () => Keepsake.clearStamps());
        $('btnSaveCard').addEventListener('click', () => Keepsake.download(`별빛도감_${Engine.ymd(new Date())}.png`));
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
            shareOrCopy(
                '별빛 나침반 앱 초대',
                '별빛 나침반에서 기질 도감과 마음 카드를 만나 보세요. 이 초대에는 개인정보가 포함되지 않습니다.',
                Compat.inviteUrl(appUrl())
            );
        });
        $('btnShareCompat').addEventListener('click', () => {
            const c = state.compat;
            const gName = isTeacher() && c.grade.teacherName ? c.grade.teacherName : c.grade.name;
            shareOrCopy(
                '별빛 나침반 우정 케미',
                `✨ ${c.a.name} × ${c.b.name} 케미 ${c.total}점 · ${gName}\n\n우리 케미도 별빛 나침반에서 확인해 보세요!`,
                appUrl()
            );
        });
    }

    function init() {
        Keepsake.init($('keepsakeCanvas'));
        Tarot.init();
        Journal.init(ok => toast(ok ? '오늘의 일기를 저장했습니다.' : '이 환경에서는 기록을 저장할 수 없습니다.'));
        $('pMbti').innerHTML = '<option value="">MBTI 모름</option>' + MBTI_TYPES.map(t => `<option>${t}</option>`).join('');
        fillPlaces();

        const savedMode = store.get(STORE_MODE);
        setMode(savedMode === 'teacher' ? 'teacher' : 'student');

        if (window.destinyLegacyInvite) {
            $('inviteBanner').textContent = '개인정보 보호를 위해 이전 초대 링크의 정보는 불러오지 않습니다. 두 사람의 케미는 서로 동의한 정보를 직접 입력해 확인해 주세요.';
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

    return { state, store, toast, copyText, appUrl, switchTab, setMode };
})();
