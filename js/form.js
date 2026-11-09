/**
 * [Form] 입력 화면 — 이름·생년월일(양력/음력/윤달)·태어난 시간과 지역·성별·MBTI 버튼과 4문항 찾기,
 * 친구(상대) 정보 입력. 계산은 js/birth.js, js/saju.js가 하고 여기서는 화면 입력만 다룹니다.
 */
const Form = (() => {
    const $ = id => document.getElementById(id);
    const HISTORICAL_FIGURES = [
        { name: '세종대왕', birth: '1397.05.15' },
        { name: '이순신 장군', birth: '1545.04.28' },
        { name: '신사임당', birth: '1504.10.29' },
        { name: '정약용', birth: '1762.08.05' },
        { name: '유관순 열사', birth: '1902.12.16' }
    ];
    const isTeacher = () => App.isTeacher();

    function figureOfDay(offset = 0) {
        return HISTORICAL_FIGURES[(new Date().getDate() + offset) % HISTORICAL_FIGURES.length];
    }

    function birthLabel(u) {
        return u.cal === 'lunar' ? `음력 ${Birth.format(u.lunar)}${u.leap ? '(윤달)' : ''}` : Birth.format(u.birth);
    }

    function birthPreview(inputEl, noteEl, cal) {
        const raw = inputEl.value.trim();
        if (!raw) {
            if (inputEl === $('birthDate')) {
                const f1 = figureOfDay(), f2 = figureOfDay(1);
                noteEl.textContent = isTeacher()
                    ? `💡 수업 활용 팁: 역사 인물(예: ${f1.name} ${f1.birth}, ${f2.name} ${f2.birth})도 분석할 수 있어요.`
                    : `💡 내 생일이나 역사 인물(예: ${f1.name} ${f1.birth}, ${f2.name} ${f2.birth})도 넣어 보세요!`;
            } else {
                noteEl.textContent = '';
            }
            noteEl.classList.remove('err');
            return;
        }
        const b = Birth.resolve(raw, cal);
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

    function refreshBirthPreview() {
        birthPreview($('birthDate'), $('birthPreview'), mainCal());
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
        refreshBirthPreview();
    }

    function read() {
        const name = $('userName').value.trim();
        const gender = $('gender').value;
        const mbti = $('mbti').value;
        const time = $('birthTime').value;
        const place = $('birthPlace').value;
        if (!name) return { error: '이름(또는 별명)을 입력해 주세요.' };
        const b = Birth.resolve($('birthDate').value, mainCal());
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
        $('mbtiPreview').textContent = full ? `${full} · ${App.mbtiNick(full)}` : '';
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
            box.innerHTML = `<div class="qn">${i + 1} / ${quizList.length}${q.tip ? ' · ' + q.tip : ''}</div>
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

    function fill(u) {
        $('userName').value = u.name || '';
        const lunar = u.cal === 'lunar' && u.lunar;
        $('birthDate').value = lunar ? Birth.format(u.lunar) : (u.birth ? Birth.format(u.birth) : '');
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
        const b = Birth.resolve($('birthDate').value, mainCal());
        if (!time || placeId === 'none' || b.error) {
            note.textContent = time && placeId === 'none' ? `입력한 ${time} 그대로 계산해요.` : '';
            return;
        }
        const place = Saju.PLACE_MAP[placeId];
        const [hh, mm] = time.split(':').map(Number);
        const r = Saju.calc({ y: b.y, m: b.m, d: b.d, hour: hh, minute: mm, lon: place.lon });
        note.textContent = '✓ ' + correctionText(r.correction, place.name);
    }

    // ---------- 친구(상대) 정보 ----------
    function readPartner() {
        const name = $('pName').value.trim();
        const birth = $('pBirth').value.trim();
        const gender = $('pGender').value;
        const mbti = $('pMbti').value;
        if (!name) return { error: '친구(상대) 이름을 입력해 주세요.' };
        const b = Birth.resolve(birth, $('pCal').value);
        if (b.error) return b;
        if (!gender) return { error: '성별을 선택해 주세요.' };
        return { partner: { name, birth: b.ymd, time: '', gender, mbti } };
    }

    /** 다음 사람이 앞 사람의 입력을 볼 수 없도록 입력 칸을 모두 비웁니다. */
    function reset(remember) {
        $('fortuneForm').reset();
        $('rememberMe').checked = remember;
        setCal('solar');
        setGender('');
        setMbti('');
        $('mbtiQuiz').style.display = 'none';
        $('mbtiPick').style.display = '';
        $('birthPlace').value = 'seoul';
        $('timeMore').open = false;
        $('timePreview').textContent = '';
        $('formError').textContent = '';
        $('compatForm').reset();
        $('pBirthPreview').textContent = '';
        $('compatError').textContent = '';
    }

    function bind() {
        const tidy = e => {
            const n = Birth.normalize(e.target.value);
            if (n) e.target.value = Birth.format(n);
        };
        $('birthDate').addEventListener('input', refreshBirthPreview);
        $('birthDate').addEventListener('blur', tidy);
        document.querySelectorAll('.seg[data-for="calType"] button').forEach(b => b.addEventListener('click', () => { setCal(b.dataset.v); timePreview(); }));
        $('leapMonth').addEventListener('change', () => { refreshBirthPreview(); timePreview(); });
        ['birthTime', 'birthPlace'].forEach(id => $(id).addEventListener('input', timePreview));
        $('birthPlace').addEventListener('change', timePreview);
        $('birthDate').addEventListener('input', timePreview);
        document.querySelectorAll('.seg[data-for="gender"] button').forEach(b => b.addEventListener('click', () => setGender(b.dataset.v)));
        document.querySelectorAll('#mbtiPick .seg button').forEach(b => b.addEventListener('click', () => {
            b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
            syncMbti();
        }));
        $('btnMbtiQuiz').addEventListener('click', startMbtiQuiz);

        $('pBirth').addEventListener('blur', tidy);
        const pPreview = () => birthPreview($('pBirth'), $('pBirthPreview'), $('pCal').value);
        $('pBirth').addEventListener('input', pPreview);
        $('pCal').addEventListener('change', pPreview);
    }

    return {
        figureOfDay, birthLabel, refreshBirthPreview, read, readPartner, fill, fillPlaces, correctionText,
        setCal, setGender, setMbti, syncMbti, reset, bind
    };
})();
