/**
 * [Journal] 운세 일지 — 방문한 날의 운세를 기기에 쌓아 달력·연속 방문 도장·한 줄 기록으로 보여 줍니다.
 * 저장 구조: { [사용자 키]: { YYYYMMDD: { god, hanja, avg, rating, memo } } }
 */
const Journal = (() => {
    const KEY = 'myeongun_journal_v1';
    const $ = id => document.getElementById(id);
    const RATINGS = { good: '좋았어요', soso: '보통이었어요', bad: '아쉬웠어요' };
    const view = { userKey: '', year: 0, month: 0, selected: null };

    function loadAll() {
        try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
    }

    function saveAll(all) {
        try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch (e) { return false; }
    }

    function entries(userKey) {
        return loadAll()[userKey] || {};
    }

    function update(userKey, ymd, patch) {
        const all = loadAll();
        all[userKey] = all[userKey] || {};
        all[userKey][ymd] = { ...(all[userKey][ymd] || {}), ...patch };
        return saveAll(all);
    }

    function toYmd(d) { return Engine.ymd(d); }

    function stats(userKey, today) {
        const e = entries(userKey);
        let streak = 0;
        const d = new Date(today);
        while (e[toYmd(d)]) {
            streak++;
            d.setDate(d.getDate() - 1);
        }
        const list = Object.values(e);
        return { streak, total: list.length, good: list.filter(x => x.rating === 'good').length };
    }

    function renderStats() {
        const s = stats(view.userKey, new Date());
        $('jStreak').textContent = s.streak + '일';
        $('jTotal').textContent = s.total + '일';
        $('jGood').textContent = s.good + '일';
    }

    function renderCalendar() {
        const e = entries(view.userKey);
        const first = new Date(view.year, view.month, 1);
        const days = new Date(view.year, view.month + 1, 0).getDate();
        const todayYmd = toYmd(new Date());
        $('calYm').textContent = `${view.year}년 ${view.month + 1}월`;
        let html = '일월화수목금토'.split('').map(d => `<div class="dow">${d}</div>`).join('');
        for (let i = 0; i < first.getDay(); i++) html += '<div class="d blank"></div>';
        for (let day = 1; day <= days; day++) {
            const ymd = toYmd(new Date(view.year, view.month, day));
            const rec = e[ymd];
            const cls = ['d', rec ? 'has' : '', ymd === todayYmd ? 'today' : '', ymd === view.selected ? 'sel' : ''].join(' ');
            html += `<div class="${cls}" data-ymd="${ymd}"><span class="dn">${day}</span>${rec ? `<span class="stamp">${rec.hanja[0]}</span>` : ''}</div>`;
        }
        $('calGrid').innerHTML = html;
        $('calGrid').querySelectorAll('.d.has').forEach(el => el.addEventListener('click', () => {
            view.selected = el.dataset.ymd;
            renderCalendar();
            renderDetail();
        }));
    }

    function renderDetail() {
        const rec = view.selected && entries(view.userKey)[view.selected];
        if (!rec) {
            $('logDetail').style.display = 'none';
            return;
        }
        const y = view.selected;
        const memo = rec.memo ? rec.memo.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) : '';
        $('logDetail').innerHTML = `<b>${y.slice(0, 4)}.${y.slice(4, 6)}.${y.slice(6)}</b> · ${rec.god}(${rec.hanja})의 날 · 평균 ${rec.avg}점`
            + (rec.rating ? `<br>실제로는 <b style="color:var(--gold)">${RATINGS[rec.rating]}</b>` : '')
            + (memo ? `<br>“${memo}”` : '');
        $('logDetail').style.display = 'block';
    }

    function renderToday() {
        const rec = entries(view.userKey)[toYmd(new Date())] || {};
        $('memoText').value = rec.memo || '';
        document.querySelectorAll('#ratingBtns button').forEach(b => b.classList.toggle('on', b.dataset.rating === rec.rating));
    }

    function render() {
        renderStats();
        renderCalendar();
        renderDetail();
        renderToday();
    }

    // 결과를 볼 때마다 오늘의 기록을 남깁니다 (메모·평가는 유지).
    function recordVisit(userKey, godName, godHanja, avg) {
        view.userKey = userKey;
        const now = new Date();
        view.year = now.getFullYear();
        view.month = now.getMonth();
        view.selected = toYmd(now);
        update(userKey, toYmd(now), { god: godName, hanja: godHanja, avg });
        render();
    }

    function init(onSaved) {
        $('calPrev').addEventListener('click', () => {
            view.month--;
            if (view.month < 0) { view.month = 11; view.year--; }
            renderCalendar();
        });
        $('calNext').addEventListener('click', () => {
            view.month++;
            if (view.month > 11) { view.month = 0; view.year++; }
            renderCalendar();
        });
        document.querySelectorAll('#ratingBtns button').forEach(b => b.addEventListener('click', () => {
            document.querySelectorAll('#ratingBtns button').forEach(x => x.classList.toggle('on', x === b));
        }));
        $('btnMemoSave').addEventListener('click', () => {
            const on = document.querySelector('#ratingBtns button.on');
            const ok = update(view.userKey, toYmd(new Date()), { memo: $('memoText').value.trim().slice(0, 200), rating: on ? on.dataset.rating : null });
            view.selected = toYmd(new Date());
            render();
            onSaved(ok);
        });
    }

    return { init, recordVisit, stats };
})();
