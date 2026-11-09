/**
 * [Dex] 🌟 자연물 캐릭터 도감 모으기 — 친구의 QR을 찍거나 친구 코드를 넣어 10종 캐릭터를 모읍니다.
 * QR·코드에는 캐릭터 번호와 '오늘만 쓰는 숫자'만 담고, 이름·생일 같은 개인정보는 넣지 않습니다.
 * 모은 기록은 이 기기에만 저장되고, 공용 기기 모드에서는 저장하지 않습니다.
 */
const Dex = (() => {
    const $ = id => document.getElementById(id);
    const KEY = 'starcompass_dex_v1';
    const WORDS = ['큰나무', '풀꽃', '태양', '촛불', '큰산', '논밭', '바위', '보석', '바다', '이슬'];
    const BADGES = [
        [10, '👑 자연 도감 박사'], [7, '🌙 은하수 여행자'], [5, '⭐ 별빛 탐험가'], [3, '🌱 새싹 수집가'], [1, '🔭 첫 별 관측']
    ];

    // ---------- 코드 (순수 함수 — 테스트 대상) ----------
    function ymd(d) { return Engine.ymd(d); }

    /** 캐릭터 번호와 날짜로 '오늘만 쓰는 숫자'(10~99)를 만듭니다. */
    function dayNumber(idx, date) {
        return Engine.seedFromString(`dex-${ymd(date)}-${idx}`) % 90 + 10;
    }

    function codeFor(idx, date = new Date()) {
        return `${idx}-${dayNumber(idx, date)}`;
    }

    function wordCode(idx, date = new Date()) {
        return `${WORDS[idx]}-${dayNumber(idx, date)}`;
    }

    /**
     * '8-27'(QR) 또는 '바다-27'(입력)을 캐릭터 번호로. 오늘·어제 코드만 인정합니다.
     * @returns {number|null}
     */
    function parseCode(raw, date = new Date()) {
        const s = String(raw || '').replace(/\s+/g, '').trim();
        let m = s.match(/^(\d)-(\d{2})$/);
        let idx = m ? +m[1] : null;
        if (!m) {
            m = s.match(/^([가-힣]+)-?(\d{2})$/);
            if (m) idx = WORDS.indexOf(m[1]);
        }
        if (!m || idx === null || idx < 0 || idx > 9) return null;
        const num = +m[2];
        const yesterday = new Date(date.getTime() - 86400000);
        return num === dayNumber(idx, date) || num === dayNumber(idx, yesterday) ? idx : null;
    }

    /** 앱 안 카메라로 읽은 글자(도감 주소 또는 코드)에서 코드만 꺼냅니다. 다른 사이트 주소로 이동하지 않습니다. */
    function codeFromScan(text) {
        const s = String(text || '').trim();
        const m = s.match(/[?&]dex=([^&#\s]+)/);
        if (m) { try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } }
        return s.length <= 16 ? s : '';
    }

    function badgeFor(count) {
        const b = BADGES.find(([n]) => count >= n);
        return b ? b[1] : '';
    }

    // ---------- 저장 ----------
    function load() {
        try { return JSON.parse(localStorage.getItem(KEY)) || { got: {}, mine: null }; } catch (e) { return { got: {}, mine: null }; }
    }

    function save(d) {
        try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; }
    }

    const kiosk = () => typeof App !== 'undefined' && App.isKiosk && App.isKiosk();

    /** @returns {'new'|'dup'|'kiosk'} */
    function add(idx) {
        if (kiosk()) return 'kiosk';
        const d = load();
        if (d.got[idx]) return 'dup';
        d.got[idx] = ymd(new Date());
        save(d);
        return 'new';
    }

    function setMine(idx) {
        if (kiosk()) return;
        const d = load();
        d.mine = idx;
        if (!d.got[idx]) d.got[idx] = ymd(new Date());
        save(d);
        render();
    }

    // ---------- 화면 ----------
    function render() {
        if (!$('dexGrid')) return;
        const d = load();
        const count = Object.keys(d.got).length;
        $('dexProgress').textContent = `${count} / 10${badgeFor(count) ? ' · ' + badgeFor(count) : ''}`;
        $('dexBar').style.width = `${count * 10}%`;
        $('dexGrid').innerHTML = SajuData.ilgan.map((ch, i) => {
            const s = Saju.STEMS[i];
            if (!d.got[i]) return `<div class="dex-slot locked" title="아직 만나지 못한 캐릭터"><span class="q">?</span><small>${Saju.EL_HANJA[s.el]} 기운</small></div>`;
            return `<div class="dex-slot el-${s.el}${d.mine === i ? ' mine' : ''}"><span class="h">${s.hanja}</span><small>${ch.title}</small>${d.mine === i ? '<em>나</em>' : ''}</div>`;
        }).join('');
    }

    function celebrate(idx, result) {
        const title = SajuData.ilgan[idx].title;
        if (result === 'kiosk') App.toast('공용 기기 모드에서는 도감이 저장되지 않아요.');
        else if (result === 'dup') App.toast(`「${title}」 캐릭터는 이미 도감에 있어요!`);
        else {
            const count = Object.keys(load().got).length;
            App.toast(`🎉 새 친구 캐릭터 「${title}」 도감에 쏙! (${count}/10)`);
            render();
        }
    }

    function showQr() {
        const d = load();
        if (d.mine === null || d.mine === undefined) { App.toast('먼저 나의 별빛 나침반을 열어 내 캐릭터를 찾아 주세요.'); return; }
        const url = `${App.appUrl()}?dex=${codeFor(d.mine)}`;
        const qr = qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        $('dexQrImg').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true, alt: '내 자연물 캐릭터 도감 QR 코드' });
        $('dexQrTitle').textContent = `${Saju.STEMS[d.mine].hanja} · ${SajuData.ilgan[d.mine].title}`;
        $('dexQrCode').textContent = wordCode(d.mine);
        $('dexQrModal').hidden = false;
        $('dexQrClose').focus();
    }

    function submitCode() {
        const idx = parseCode($('dexCodeInput').value);
        if (idx === null) { App.toast('코드를 다시 확인해 주세요. 친구 화면의 오늘 코드를 넣어야 해요. (예: 바다-27)'); return; }
        $('dexCodeInput').value = '';
        celebrate(idx, add(idx));
    }

    function scan() {
        if (kiosk()) { App.toast('공용 기기 모드에서는 도감이 저장되지 않아요.'); return; }
        Scanner.open({
            title: '📷 친구 캐릭터 QR 찍기',
            hint: '친구 화면의 도감 QR을 네모 칸 안에 맞춰 주세요.',
            onText: text => {
                const idx = parseCode(codeFromScan(text));
                if (idx === null) { App.toast('도감 QR이 아니거나 날짜가 지났어요. 친구에게 오늘 QR을 다시 보여 달라고 해 주세요.'); return; }
                celebrate(idx, add(idx));
            },
            onFail: reason => {
                App.toast(Scanner.failMessage(reason));
                $('dexCodeRow').hidden = false;
                $('dexCodeInput').focus();
            }
        });
    }

    /** 친구 QR로 들어온 주소(?dex=8-27)를 읽고 바로 주소에서 지웁니다. */
    function intakeFromUrl() {
        const params = new URLSearchParams(location.search);
        if (!params.has('dex')) return;
        const raw = params.get('dex');
        try { history.replaceState(null, '', location.pathname); } catch (e) { /* 무시 */ }
        const idx = parseCode(raw);
        if (idx === null) { App.toast('이 도감 QR은 날짜가 지났어요. 친구에게 오늘 QR을 다시 보여 달라고 해 주세요.'); return; }
        celebrate(idx, add(idx));
    }

    function init() {
        render();
        $('btnDexQr').addEventListener('click', showQr);
        $('btnDexScan').addEventListener('click', scan);
        $('btnDexCode').addEventListener('click', () => {
            $('dexCodeRow').hidden = !$('dexCodeRow').hidden;
            if (!$('dexCodeRow').hidden) $('dexCodeInput').focus();
        });
        $('btnDexCodeOk').addEventListener('click', submitCode);
        $('dexCodeInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitCode(); } });
        $('dexQrClose').addEventListener('click', () => { $('dexQrModal').hidden = true; });
        $('dexQrModal').addEventListener('click', e => { if (e.target === $('dexQrModal')) $('dexQrModal').hidden = true; });
        intakeFromUrl();
    }

    if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);

    return { init, render, setMine, add, codeFor, wordCode, parseCode, codeFromScan, dayNumber, badgeFor, WORDS };
})();
