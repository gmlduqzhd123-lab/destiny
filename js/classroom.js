/**
 * [Classroom] 🏫 우리 반 도구 화면 — 명렬표 · 모둠 편성 · 기질 분포 보드 · 생일 · 학생 리포트
 * 계산은 ClassroomLogic이 맡고, 여기서는 화면과 인쇄만 다룹니다.
 * 명렬표는 기본적으로 저장하지 않으며, 선생님이 고를 때만 이 기기에 저장합니다.
 */
const Classroom = (() => {
    const $ = id => document.getElementById(id);
    const STORE_ROSTER = 'starcompass_roster_v1';
    const SAMPLE = [
        '번호\t이름\t생년월일\t성별\tMBTI',
        '1\t김하늘\t2015.03.04\t여\tENFP',
        '2\t이바다\t2015.07.21\t남\tISTJ',
        '3\t박나무\t2015.09.12\t남\tINFP',
        '4\t최햇살\t2015.11.02\t여\tESTJ',
        '5\t정이슬\t음 2015.01.15\t여\t',
        '6\t오바위\t2015.06.06\t남\tINTJ',
        '7\t강산\t2014.12.25\t남\tESFP',
        '8\t서풀꽃\t2015.08.08\t여\tISFJ'
    ].join('\n');
    const ROLE_ICON = { wood: '💡', fire: '🎤', earth: '🤝', metal: '⏱️', water: '📚' };
    const EL_KOR = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' };

    const st = { people: [], errors: [], seed: 1, groups: null, from: 'input', bday: null };
    const esc = s => App.escapeHtml(s == null ? '' : s);

    function readSaved() {
        try { return JSON.parse(localStorage.getItem(STORE_ROSTER)); } catch (e) { return null; }
    }

    function writeSaved(text) {
        try {
            if (text) localStorage.setItem(STORE_ROSTER, JSON.stringify({ text })); else localStorage.removeItem(STORE_ROSTER);
        } catch (e) { /* 저장이 막힌 기기 */ }
    }

    // ---------- 화면 열기·닫기 ----------
    function open() {
        if (App.isKiosk()) { App.toast('공용 기기 모드에서는 우리 반 도구를 열 수 없어요.'); return; }
        st.from = $('resultView').style.display === 'block' ? 'result' : 'input';
        ['inputView', 'resultView'].forEach(id => { $(id).style.display = 'none'; });
        $('tabbar').style.display = 'none';
        $('classView').style.display = 'block';
        document.body.classList.add('class-mode');
        const saved = readSaved();
        if (saved && saved.text && !$('rosterInput').value) {
            $('rosterInput').value = saved.text;
            $('rosterSave').checked = true;
            loadRoster(true);
        }
        switchTab(st.people.length ? 'groups' : 'roster');
        window.scrollTo({ top: 0 });
    }

    function close() {
        $('classView').style.display = 'none';
        document.body.classList.remove('class-mode');
        if (st.from === 'result' && App.state.user) {
            $('resultView').style.display = 'block';
            $('tabbar').style.display = 'flex';
        } else {
            $('inputView').style.display = 'block';
        }
        window.scrollTo({ top: 0 });
    }

    function switchTab(tab) {
        document.querySelectorAll('#classTabs button').forEach(b => b.classList.toggle('on', b.dataset.ctab === tab));
        document.querySelectorAll('.class-panel').forEach(p => { p.hidden = p.dataset.cpanel !== tab; });
        if (tab !== 'roster' && !st.people.length) {
            document.querySelector(`.class-panel[data-cpanel="${tab}"] .class-empty`)?.removeAttribute('hidden');
        }
        if (tab === 'board') renderBoard();
        if (tab === 'birthday') renderBirthdays();
        if (tab === 'report') renderReportSelect();
    }

    // ---------- 명렬표 ----------
    function loadRoster(silent) {
        const text = $('rosterInput').value;
        const r = ClassroomLogic.parseRoster(text, App.resolveBirth);
        st.people = ClassroomLogic.withProfiles(r.students);
        st.errors = r.errors;
        st.groups = null;
        $('groupOut').innerHTML = '';
        if ($('rosterSave').checked && st.people.length) writeSaved(text); else if (!$('rosterSave').checked) writeSaved(null);
        renderRoster();
        document.querySelectorAll('.class-empty').forEach(el => { el.hidden = st.people.length > 0; });
        if (!silent) App.toast(st.people.length ? `👩‍🏫 ${st.people.length}명을 불러왔어요.` : '불러온 학생이 없어요. 형식을 확인해 주세요.');
    }

    function renderRoster() {
        $('rosterSummary').textContent = st.people.length
            ? `${st.people.length}명 불러옴${st.errors.length ? ` · 확인이 필요한 줄 ${st.errors.length}개` : ''}`
            : '';
        $('rosterErrors').innerHTML = st.errors.map(e => `<li>${e.line}번째 줄 「${esc(e.text)}」 — ${esc(e.msg)}</li>`).join('');
        $('rosterTable').innerHTML = st.people.length ? `
            <table class="roster-table">
                <thead><tr><th>번호</th><th>이름</th><th>생일</th><th>자연물 캐릭터</th><th>MBTI</th></tr></thead>
                <tbody>${st.people.map(p => {
                    const s = p.profile.saju.day.stem;
                    const bd = p.cal === 'lunar' ? `음 ${App.formatBirth(p.lunar).slice(5)}` : App.formatBirth(p.birth).slice(5);
                    return `<tr><td>${p.no}</td><td>${esc(p.name)}${p.gender ? ` <small>${p.gender === 'M' ? '남' : '여'}</small>` : ''}</td>
                        <td>${bd}</td><td><span class="mini-hanja el-${s.el}">${s.hanja}</span> ${esc(p.profile.ilgan.title)}</td><td>${p.mbti || '-'}</td></tr>`;
                }).join('')}</tbody>
            </table>` : '';
    }

    function clearRoster() {
        if (!window.confirm('명렬표와 이 기기에 저장한 명단을 지울까요?')) return;
        $('rosterInput').value = '';
        $('rosterSave').checked = false;
        writeSaved(null);
        st.people = [];
        st.errors = [];
        st.groups = null;
        $('groupOut').innerHTML = '';
        renderRoster();
        App.toast('명단을 지웠어요.');
    }

    // ---------- 모둠 편성 ----------
    function makeGroups(reshuffle) {
        if (!st.people.length) { App.toast('먼저 명렬표를 불러와 주세요.'); switchTab('roster'); return; }
        if (reshuffle) st.seed++;
        const apart = ClassroomLogic.parsePairs($('grpApart').value, st.people);
        const together = ClassroomLogic.parsePairs($('grpTogether').value, st.people);
        st.groups = ClassroomLogic.makeGroups(st.people, {
            size: +$('grpSize').value,
            seed: st.seed,
            apart: apart.pairs,
            together: together.pairs,
            balanceGender: $('grpGender').checked
        });
        const notes = [];
        if (apart.unknown.length || together.unknown.length) notes.push(`명단에서 찾지 못한 줄: ${[...apart.unknown, ...together.unknown].map(esc).join(' / ')}`);
        if (st.groups.violations.length) notes.push(`⚠️ 조건을 모두 지키지 못했어요: ${st.groups.violations.map(esc).join(', ')} — 모둠 인원이나 조건을 조정해 보세요.`);
        $('groupNote').innerHTML = notes.join('<br>');
        renderGroups();
    }

    function groupCardHtml(g, forPrint) {
        const ei = g.ei.E + g.ei.I ? ` · E${g.ei.E}/I${g.ei.I}` : '';
        return `<div class="group-card">
            <div class="group-head"><b>${g.no}모둠</b><span>${g.elements.map(el => Saju.EL_HANJA[el]).join('')}${ei} · 평균 케미 ${g.avgCompat}점</span></div>
            <ul>${g.members.map(m => {
                const s = m.profile.saju.day.stem;
                return `<li><span class="mini-hanja el-${s.el}">${s.hanja}</span><b>${esc(m.name)}</b><small>${m.mbti || ''}</small><em>${ROLE_ICON[Object.keys(Compat.ROLE_MAP).find(k => Compat.ROLE_MAP[k] === m.role)] || '⭐'} ${esc(m.role)}</em></li>`;
            }).join('')}</ul>
            ${forPrint ? '<div class="print-lines"><p>우리 모둠 이름: ____________________</p><p>우리 모둠 약속: ________________________________________</p></div>' : ''}
        </div>`;
    }

    function renderGroups() {
        if (!st.groups) return;
        $('groupOut').innerHTML = `<div class="group-grid">${st.groups.groups.map(g => groupCardHtml(g)).join('')}</div>`;
    }

    function groupsText() {
        return st.groups.groups.map(g => `[${g.no}모둠] ` + g.members.map(m => `${m.name}(${m.role.split(' · ')[0]})`).join(', ')).join('\n');
    }

    function printGroups() {
        if (!st.groups) { App.toast('먼저 모둠을 편성해 주세요.'); return; }
        Printer.print(`<div class="print-sheet"><h1>우리 반 모둠 편성표</h1>
            <p class="print-meta">${new Date().toLocaleDateString('ko-KR')} · ${st.people.length}명 · ${st.groups.groups.length}모둠 · 별빛 나침반</p>
            <div class="group-grid print">${st.groups.groups.map(g => groupCardHtml(g, true)).join('')}</div>
            <p class="print-foot">역할은 각자의 자연물 기운에서 고른 추천이에요. 모둠에서 함께 이야기해 바꿔도 좋아요.</p></div>`, '모둠 편성표');
    }

    // ---------- 기질 분포 보드 ----------
    function renderBoard() {
        if (!st.people.length) { $('boardOut').innerHTML = ''; return; }
        const d = ClassroomLogic.distribution(st.people);
        const showNames = $('boardShowNames').checked;
        const max = Math.max(1, ...d.stems);
        const tiles = SajuData.ilgan.map((ch, i) => {
            const stem = Saju.STEMS[i];
            const names = showNames ? st.people.filter(p => p.profile.saju.day.stem.i === i).map(p => esc(p.name)).join(', ') : '';
            return `<div class="board-tile${d.stems[i] === max ? ' top' : ''}">
                <span class="mini-hanja el-${stem.el}">${stem.hanja}</span>
                <div class="t">${esc(ch.title)}</div>
                <div class="n">${d.stems[i]}<small>명</small></div>
                ${names ? `<div class="names">${names}</div>` : ''}
            </div>`;
        }).join('');
        const elMax = Math.max(1, ...Object.values(d.els));
        const elBars = Saju.EL.map(el => `<div class="board-bar"><span class="el-${el} lbl">${Saju.EL_HANJA[el]} ${EL_KOR[el]}</span>
            <span class="track"><i class="fill-${el}" style="width:${d.els[el] / elMax * 100}%"></i></span><b>${d.els[el]}</b></div>`).join('');
        const pair = (a, b, la, lb) => {
            const t = d.letters[a] + d.letters[b];
            const pa = t ? Math.round(d.letters[a] / t * 100) : 50;
            return `<div class="board-pair"><span>${a} ${la} ${d.letters[a]}</span><span class="split"><i style="width:${pa}%"></i></span><span>${d.letters[b]} ${lb} ${b}</span></div>`;
        };
        const seasons = Object.entries(d.seasons).map(([k, v]) => `<div class="season"><b>${{ 봄: '🌸', 여름: '🌞', 가을: '🍁', 겨울: '⛄' }[k]} ${k}</b><span>${v}명</span></div>`).join('');
        const animals = Object.entries(d.animals).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span class="chip">${k}띠 ${v}</span>`).join('');
        $('boardOut').innerHTML = `
            <div class="board-hero"><small>우리 반 ${d.total}명의 별빛 기질</small><h3>우리 반은 「${esc(d.title)}」</h3>
                <p>가장 많은 기운은 <b>${Saju.EL_HANJA[d.top]}(${EL_KOR[d.top]})</b>, 함께 채우면 좋은 기운은 <b>${Saju.EL_HANJA[d.low]}(${EL_KOR[d.low]})</b> — 추천 활동: ${esc(d.boost)}</p></div>
            <h4>자연물 캐릭터 10종</h4><div class="board-tiles">${tiles}</div>
            <h4>다섯 가지 자연 기운</h4><div class="board-bars">${elBars}</div>
            <h4>MBTI 성향</h4><div class="board-pairs">${pair('E', 'I', '외향', '내향')}${pair('S', 'N', '감각', '직관')}${pair('T', 'F', '사고', '공감')}${pair('J', 'P', '계획', '유연')}</div>
            <h4>태어난 계절 (절기 기준)</h4><div class="board-seasons">${seasons}</div>
            <h4>띠</h4><div class="board-chips">${animals}</div>`;
    }

    function boardFullscreen() {
        const el = $('boardWrap');
        if (document.fullscreenElement) { document.exitFullscreen(); return; }
        if (el.requestFullscreen) el.requestFullscreen().catch(() => App.toast('이 브라우저는 전체 화면을 지원하지 않아요.'));
        else App.toast('이 브라우저는 전체 화면을 지원하지 않아요.');
    }

    // ---------- 생일 ----------
    function renderBirthdays() {
        if (!st.people.length) { $('bdayList').innerHTML = ''; return; }
        const list = ClassroomLogic.upcomingBirthdays(st.people, new Date(), +$('bdayRange').value);
        $('bdayList').innerHTML = list.length ? list.map(x => {
            const s = x.student.profile.saju.day.stem;
            const dd = x.days === 0 ? '<b class="today">오늘! 🎉</b>' : `D-${x.days}`;
            return `<li><span class="mini-hanja el-${s.el}">${s.hanja}</span><b>${esc(x.student.name)}</b>
                <span>${x.date.getMonth() + 1}월 ${x.date.getDate()}일${x.student.cal === 'lunar' ? ' (음력 생일)' : ''}</span><span class="dd">${dd}</span>
                <button type="button" class="btn btn-ghost btn-sm" data-bday="${x.student.id}">🎂 카드</button></li>`;
        }).join('') : '<li class="muted">이 기간에는 생일인 친구가 없어요.</li>';
    }

    function bdayData(p) {
        const s = p.profile.saju.day.stem;
        const birthLabel = p.cal === 'lunar' ? `음력 ${+p.lunar.slice(4, 6)}월 ${+p.lunar.slice(6, 8)}일` : `${+p.birth.slice(4, 6)}월 ${+p.birth.slice(6, 8)}일`;
        return {
            name: p.name, hanja: s.hanja, el: s.el, title: p.profile.ilgan.title,
            strength: p.profile.ilgan.strength, term: ClassroomLogic.birthTermName(p.birth), dateLabel: birthLabel,
            message: $('bdayMsg').value.trim() || `${p.name}! 너의 ${p.profile.ilgan.strength.split(' · ')[0]} 덕분에 우리 반이 더 반짝여. 새로운 한 해도 멋지게 빛나길 응원할게!`
        };
    }

    async function showBdayCard(id) {
        const p = st.people.find(x => x.id === id);
        if (!p) return;
        st.bday = p;
        $('bdayCardWrap').hidden = false;
        await BirthdayCard.draw($('bdayCanvas'), bdayData(p));
        $('bdayCardWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ---------- 학생 리포트 ----------
    function reportHtml(person) {
        const p = person.profile, s = p.saju.day.stem;
        const c = (SajuData.coaching && SajuData.coaching[s.i]) || {};
        const nick = person.mbti ? (FortuneData.mbti.nick[person.mbti] || '') : '';
        const total = Saju.EL.reduce((a, el) => a + p.counts[el], 0) || 1;
        const y = p.saju.year;
        const birth = person.cal === 'lunar'
            ? `음력 ${App.formatBirth(person.lunar)}${person.leap ? '(윤달)' : ''} (양력 ${App.formatBirth(person.birth)})`
            : `양력 ${App.formatBirth(person.birth)}`;
        const row = (k, v) => `<tr><th>${k}</th><td>${v}</td></tr>`;
        return `<section class="print-sheet report">
            <h1>학생 이해 · 상담 참고 리포트</h1>
            <p class="print-meta">${new Date().toLocaleDateString('ko-KR')} · 교사용 · 외부 공유 금지 · 별빛 나침반</p>
            <table class="report-info">
                ${row('이름', esc(person.name))}
                ${row('생년월일', `${birth} · ${y.stem.kor}${y.branch.kor}년 ${y.branch.animal}띠`)}
                ${row('MBTI', person.mbti ? `${person.mbti} · ${esc(nick)}` : '미입력')}
                ${row('자연물 캐릭터', `${s.hanja}${Saju.EL_HANJA[s.el]} · ${esc(p.ilgan.title)}`)}
            </table>
            <h2>타고난 기질</h2><p>${esc(p.ilgan.trait)}</p>
            <p><b>강점</b> · ${esc(p.ilgan.strength)}<br><b>더 자라날 점</b> · ${esc(p.ilgan.caution)}</p>
            <h2>다섯 가지 자연 기운</h2>
            <table class="report-el"><tr>${Saju.EL.map(el => `<th>${Saju.EL_HANJA[el]} ${EL_KOR[el]}</th>`).join('')}</tr>
                <tr>${Saju.EL.map(el => `<td><span class="bar" style="width:${p.counts[el] / total * 100}%"></span>${p.counts[el]}</td>`).join('')}</tr></table>
            <h2>학급·상담 코칭</h2>
            <dl>
                ${c.attitude ? `<dt>교실 · 학습 태도 특징</dt><dd>${esc(c.attitude)}</dd>` : ''}
                ${c.praise ? `<dt>효과적인 칭찬 · 동기부여</dt><dd>${esc(c.praise)}</dd>` : ''}
                ${c.guide ? `<dt>생활지도 · 갈등 코칭</dt><dd>${esc(c.guide)}</dd>` : ''}
                ${c.record ? `<dt>행동발달 기록 예시</dt><dd>${esc(c.record)}</dd>` : ''}
                <dt>추천 모둠 역할</dt><dd>${esc(Compat.ROLE_MAP[s.el])}</dd>
            </dl>
            <h2>상담 메모</h2>
            <div class="memo-lines"><p></p><p></p><p></p><p></p><p></p></div>
            <p class="print-foot">자기이해와 대화의 실마리를 위한 참고 자료입니다. 학생을 단정 짓거나 평가의 근거로 쓰지 마세요.</p>
        </section>`;
    }

    function renderReportSelect() {
        const sel = $('reportSelect');
        const cur = sel.value;
        sel.innerHTML = st.people.map(p => `<option value="${p.id}">${p.no}. ${esc(p.name)}</option>`).join('');
        if (cur && st.people.some(p => String(p.id) === cur)) sel.value = cur;
        renderReportPreview();
    }

    function renderReportPreview() {
        const p = st.people.find(x => String(x.id) === $('reportSelect').value);
        $('reportPreview').innerHTML = p ? reportHtml(p) : '';
    }

    function printReport(all) {
        if (!st.people.length) { App.toast('먼저 명렬표를 불러와 주세요.'); return; }
        const list = all ? st.people : st.people.filter(x => String(x.id) === $('reportSelect').value);
        if (!list.length) return;
        Printer.print(list.map(reportHtml).join(''), all ? '우리 반 학생 리포트' : `${list[0].name} 학생 리포트`);
    }

    /** 결과 화면(선생님용)에서 지금 보고 있는 사람의 리포트를 인쇄합니다. */
    function printCurrent(user) {
        if (!user) return;
        const person = { ...user, profile: Fortune.profile(user) };
        Printer.print(reportHtml(person), `${user.name} 학생 리포트`);
    }

    // ---------- 연결 ----------
    function init() {
        document.querySelectorAll('[data-open-class]').forEach(b => b.addEventListener('click', open));
        $('btnCloseClass').addEventListener('click', close);
        document.querySelectorAll('#classTabs button').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.ctab)));
        $('btnRosterSample').addEventListener('click', () => { $('rosterInput').value = SAMPLE; loadRoster(); });
        $('btnRosterLoad').addEventListener('click', () => loadRoster());
        $('btnRosterClear').addEventListener('click', clearRoster);
        $('rosterSave').addEventListener('change', e => {
            if (e.target.checked && st.people.length) { writeSaved($('rosterInput').value); App.toast('이 기기에 명단을 저장했어요. 공용 기기에서는 저장하지 마세요.'); }
            if (!e.target.checked) writeSaved(null);
        });
        $('btnMakeGroups').addEventListener('click', () => makeGroups(false));
        $('btnShuffleGroups').addEventListener('click', () => makeGroups(true));
        $('btnCopyGroups').addEventListener('click', () => {
            if (st.groups) App.copyText(groupsText(), '📋 모둠 편성표가 복사되었어요. 알림장·게시판에 붙여 넣어 보세요.');
        });
        $('btnPrintGroups').addEventListener('click', printGroups);
        $('boardShowNames').addEventListener('change', renderBoard);
        $('btnBoardFull').addEventListener('click', boardFullscreen);
        $('bdayRange').addEventListener('change', renderBirthdays);
        $('bdayList').addEventListener('click', e => {
            const b = e.target.closest('[data-bday]');
            if (b) showBdayCard(+b.dataset.bday);
        });
        $('bdayMsg').addEventListener('change', () => { if (st.bday) showBdayCard(st.bday.id); });
        $('btnBdaySave').addEventListener('click', () => { if (st.bday) BirthdayCard.download($('bdayCanvas'), `생일카드_${st.bday.name}.png`); });
        $('btnBdayPrint').addEventListener('click', () => {
            if (!st.bday) return;
            Printer.print(`<div class="print-sheet center"><img class="print-card" src="${$('bdayCanvas').toDataURL('image/png')}" alt="생일 카드"></div>`, `생일카드_${st.bday.name}`);
        });
        $('reportSelect').addEventListener('change', renderReportPreview);
        $('btnReportOne').addEventListener('click', () => printReport(false));
        $('btnReportAll').addEventListener('click', () => printReport(true));
        // 공용 기기에서 '다음 친구'를 누르면 우리 반 도구 화면도 닫습니다.
        document.addEventListener('starcompass:reset', () => {
            if ($('classView').style.display === 'block') close();
        });
    }

    return { init, open, close, printCurrent, reportHtml };
})();

document.addEventListener('DOMContentLoaded', Classroom.init);
