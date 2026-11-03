/**
 * [I18n] 🌐 화면 언어 바꾸기 (한국어 · English · 中文 · Tiếng Việt)
 * - 화면 글자(버튼·제목·입력 안내)를 바꾸고, 결과 화면 맨 위에 핵심 결과 요약 카드를 보여 줍니다.
 * - 자세한 풀이는 한국어 원문을 유지합니다. 한국어로 돌아오면 원래 글자로 되돌립니다.
 */
const I18n = (() => {
    const $ = id => document.getElementById(id);
    const KEY = 'starcompass_lang';
    let current = 'ko';
    const original = new Map(); // 요소 → { 바꿀 곳: 한국어 원문 }
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function lang() { return current; }

    function textNode(el, which) {
        const nodes = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
        return which === 'head' ? nodes[0] : nodes[nodes.length - 1];
    }

    function read(el, prop) {
        if (prop === 'ph') return el.getAttribute('placeholder');
        if (prop === 'aria') return el.getAttribute('aria-label');
        if (prop === 'tail' || prop === 'head') { const n = textNode(el, prop); return n ? n.textContent : ''; }
        return el.textContent;
    }

    function write(el, prop, value) {
        if (prop === 'ph') el.setAttribute('placeholder', value);
        else if (prop === 'aria') el.setAttribute('aria-label', value);
        else if (prop === 'tail' || prop === 'head') {
            const n = textNode(el, prop);
            if (n) n.textContent = value; else el.appendChild(document.createTextNode(value));
        } else el.textContent = value;
    }

    function remember(el, prop) {
        if (!original.has(el)) original.set(el, {});
        const o = original.get(el);
        if (!(prop in o)) o[prop] = read(el, prop);
    }

    function applyStatic() {
        if (current === 'ko') return;
        I18nData.ui.forEach(([sel, prop, tr]) => {
            document.querySelectorAll(sel).forEach(el => {
                remember(el, prop);
                write(el, prop, tr[current]);
            });
        });
    }

    function restoreStatic() {
        original.forEach((o, el) => Object.entries(o).forEach(([prop, v]) => write(el, prop, v)));
        original.clear();
    }

    // ---------- 결과 요약 카드 ----------
    function renderSummary() {
        const card = $('i18nCard');
        const st = typeof App !== 'undefined' ? App.state : null;
        if (current === 'ko' || !st || !st.user || !st.profile || !st.today) { card.hidden = true; return; }
        const L = I18nData.summary[current];
        const s = st.profile.saju.day.stem;
        const [title, trait, strength] = I18nData.chars[s.i][current];
        const avg = Fortune.average(st.today.scores);
        const grade = ExtraData.grades.find(g => avg >= g.min);
        const drawn = App.isOmikujiDrawn ? App.isOmikujiDrawn() : false;
        const g = I18nData.grades[grade.name] && I18nData.grades[grade.name][current];
        const plain = I18nData.plain[st.today.godKey] && I18nData.plain[st.today.godKey][current];
        const weak = st.profile.weak, e = SajuData.elements[weak];
        const ui = key => (I18nData.ui.find(x => x[0] === key) || [, , {}])[2][current] || '';
        card.hidden = false;
        $('i18nCardTitle').textContent = L.title;
        $('i18nBody').innerHTML = `
            <div class="i18n-char"><span class="mini-hanja el-${s.el}">${s.hanja}</span>
                <div><b>${esc(L.character)} · ${esc(title)}</b><p>${esc(trait)}</p><p><b>${esc(L.strengths)}</b> · ${esc(strength)}</p></div></div>
            <div class="i18n-row"><b>${esc(L.luck)}</b> ${drawn && g ? `${grade.hanja} ${esc(g[0])} — ${esc(g[1])}` : esc(L.drawFirst)}</div>
            ${plain ? `<div class="i18n-row">✨ ${esc(plain)}</div>` : ''}
            <div class="i18n-row"><b>${esc(L.scores)}</b> ${esc(ui('#labelLove'))} ${st.today.scores.love} · ${esc(ui('#labelMoney'))} ${st.today.scores.money} · ${esc(ui('#labelWork'))} ${st.today.scores.work}</div>
            <div class="i18n-row"><b>${esc(L.lucky)}</b> ${esc(L.element)}: ${esc(I18nData.elements[weak][current])} · ${esc(L.color)}: ${esc(I18nData.colors[weak][current])} · ${esc(L.number)}: ${esc(e.numbers)} · ${esc(L.direction)}: ${esc((I18nData.directions[e.direction] || {})[current] || e.direction)}</div>`;
        $('i18nNote').textContent = L.note;
    }

    function renderTeaser() {
        if (current === 'ko') return;
        const d = Saju.todayPillars(new Date()).day;
        const t = I18nData.dayEl[d.stem.el];
        if (t) $('teaserText').textContent = t[current];
    }

    /** 앱이 화면을 다시 그린 뒤 부릅니다 (모드 전환·결과 그리기·점괘 뽑기). */
    function refresh() {
        applyStatic();
        renderTeaser();
        renderSummary();
        if (typeof Reader !== 'undefined') Reader.relabel();
    }

    function setLang(next, persist = true) {
        if (!I18nData.langs[next]) next = 'ko';
        const prev = current;
        current = next;
        document.documentElement.lang = I18nData.htmlLang[next];
        $('langSelect').value = next;
        if (persist) { try { localStorage.setItem(KEY, next); } catch (e) { /* 무시 */ } }
        if (typeof Reader !== 'undefined') Reader.stop();
        if (next === 'ko' && prev !== 'ko') {
            restoreStatic();
            // 학생용/선생님용에 따라 달라지는 글자는 앱이 다시 채웁니다.
            if (typeof App !== 'undefined') App.setMode(App.state.mode);
        }
        refresh();
    }

    function init() {
        let saved = 'ko';
        try { saved = localStorage.getItem(KEY) || 'ko'; } catch (e) { /* 무시 */ }
        $('langSelect').addEventListener('change', e => setLang(e.target.value));
        if (saved !== 'ko') setLang(saved, false);
    }

    if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);

    return { lang, setLang, refresh };
})();
