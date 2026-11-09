/**
 * [Kiosk] 🔒 공용 기기(교실 태블릿) 모드와 저장소
 * - Store: 기기 저장소(localStorage) 읽기·쓰기. 저장이 막힌 환경에서도 멈추지 않고,
 *   공용 기기 모드에서는 이름·생일·점괘처럼 개인 정보가 담기는 칸을 기기에 쓰지 않고 메모리에만 둡니다.
 * - Kiosk: 켜기·끄기(2초 길게 누르기), '다음 친구'로 화면 비우기, 3분 동안 쓰지 않으면 자동으로 처음 화면.
 */
const Store = (() => {
    const KEYS = {
        user: 'myeongun_user_v3',
        tone: 'myeongun_tone',
        mode: 'starcompass_mode',
        omikuji: 'myeongun_omikuji',
        kiosk: 'starcompass_kiosk'
    };
    const MEMORY_KEYS = [KEYS.user, KEYS.omikuji];
    let kiosk = false;
    let memory = {};

    const inMemory = key => kiosk && MEMORY_KEYS.includes(key);

    function get(key) {
        if (inMemory(key)) return key in memory ? memory[key] : null;
        try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
    }

    function set(key, v) {
        if (inMemory(key)) { memory[key] = v; return; }
        try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 무시 */ }
    }

    function remove(key) {
        if (inMemory(key)) { delete memory[key]; return; }
        try { localStorage.removeItem(key); } catch (e) { /* 무시 */ }
    }

    // 공용 기기 모드 여부는 기기 설정이므로 메모리 규칙과 상관없이 실제 저장소에 둡니다.
    function readKioskFlag() {
        try { return localStorage.getItem(KEYS.kiosk) === '1'; } catch (e) { return false; }
    }

    function setKiosk(on, persist) {
        kiosk = !!on;
        memory = {};
        if (!persist) return;
        try {
            if (on) localStorage.setItem(KEYS.kiosk, '1'); else localStorage.removeItem(KEYS.kiosk);
        } catch (e) { /* 저장이 막힌 기기에서는 이번 접속 동안만 유지 */ }
    }

    /** 기기에 남은 개인 정보(기억한 사용자·오늘 점괘)를 지웁니다. */
    function forgetPerson() {
        try { localStorage.removeItem(KEYS.user); localStorage.removeItem(KEYS.omikuji); } catch (e) { /* 무시 */ }
    }

    return { KEYS, get, set, remove, readKioskFlag, setKiosk, forgetPerson, clearMemory: () => { memory = {}; }, isKiosk: () => kiosk };
})();

const Kiosk = (() => {
    const $ = id => document.getElementById(id);
    const IDLE_MS = 3 * 60 * 1000;

    function apply() {
        const on = Store.isKiosk();
        document.body.classList.toggle('kiosk', on);
        $('kioskBar').hidden = !on;
        if (on) {
            $('rememberMe').checked = false;
            $('welcomeCard').style.display = 'none';
            if ($('inputView').style.display !== 'none') App.showForm();
            if (App.state.tab === 'journal') App.switchTab('today');
        }
    }

    function enable() {
        if (Store.isKiosk()) return;
        const ok = window.confirm('공용 기기 모드를 켤까요?\n\n· 이름·생일 같은 정보가 이 기기에 저장되지 않아요.\n· "다음 친구" 버튼이나 3분 동안 쓰지 않으면 처음 화면으로 돌아가요.\n· 이 기기에 기억된 정보는 지금 지워져요.');
        if (!ok) return;
        Store.forgetPerson();
        // 마음 일기 기록에는 이름·생일이 들어 있어 다음 사람이 볼 수 있으므로 지울지 한 번 더 묻습니다.
        const diaryPeople = Journal.peopleCount();
        if (diaryPeople > 0 && window.confirm(`이 기기에 마음 일기·교단 일지 기록이 ${diaryPeople}명분 남아 있어요.\n공용 기기에서는 다른 사람이 볼 수 있으니 지울까요?\n(지우면 되돌릴 수 없어요)`)) {
            Journal.clearAll();
        }
        Store.setKiosk(true, true);
        apply();
        nextPerson();
        UI.toast('🔒 공용 기기 모드를 켰어요. 정보가 저장되지 않아요.');
    }

    function disable() {
        if (!window.confirm('공용 기기 모드를 끌까요? 끄면 다시 정보를 기기에 기억할 수 있어요.')) return;
        Store.setKiosk(false, true);
        apply();
        $('rememberMe').checked = true;
        UI.toast('공용 기기 모드를 껐어요.');
    }

    // 다음 사람이 앞 사람의 정보를 볼 수 없도록 화면과 입력값을 모두 비웁니다.
    function nextPerson(reason) {
        Store.clearMemory();
        App.clearPerson();
        Form.reset(!Store.isKiosk());
        $('memoText').value = '';
        const q = $('tarotQuestion');
        if (q.value) { q.value = ''; q.dispatchEvent(new Event('change')); }
        Keepsake.clearStamps();
        document.dispatchEvent(new CustomEvent('starcompass:reset'));
        App.showInput();
        Form.setCal('solar');
        if (reason === 'idle') UI.toast('3분 동안 쓰지 않아 처음 화면으로 돌아왔어요.');
        else if (Store.isKiosk()) UI.toast('다음 친구 차례예요! 🌟');
    }

    function startIdleWatch() {
        let last = Date.now();
        const touch = () => { last = Date.now(); };
        ['pointerdown', 'keydown', 'input', 'wheel'].forEach(ev => document.addEventListener(ev, touch, { passive: true, capture: true }));
        setInterval(() => {
            if (!Store.isKiosk() || Date.now() - last < IDLE_MS) return;
            const inUse = $('resultView').style.display === 'block' || $('userName').value || $('birthDate').value;
            last = Date.now();
            if (inUse) nextPerson('idle');
        }, 10000);
    }

    function bind() {
        document.addEventListener('click', e => {
            if (e.target.closest('[data-kiosk-on]')) { e.preventDefault(); enable(); }
        });
        $('btnNextPerson').addEventListener('click', () => nextPerson());
        // 학생이 실수로 끄지 않도록 2초 동안 꾹 눌러야 해제합니다.
        const off = $('btnKioskOff');
        let pressTimer = null, fired = false;
        const cancel = () => { clearTimeout(pressTimer); pressTimer = null; off.classList.remove('pressing'); };
        off.addEventListener('pointerdown', () => {
            fired = false;
            off.classList.add('pressing');
            pressTimer = setTimeout(() => { fired = true; cancel(); disable(); }, 2000);
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => off.addEventListener(ev, cancel));
        off.addEventListener('click', () => { if (!fired) UI.toast('끄려면 [해제] 버튼을 2초 동안 꾹 눌러 주세요.'); });
        off.addEventListener('keydown', e => { if (e.key === 'Enter' && e.shiftKey) disable(); });
        startIdleWatch();
    }

    /** 앱 시작 때 한 번: 기기 설정을 읽어 공용 기기 모드를 적용합니다. */
    function init() {
        Store.setKiosk(Store.readKioskFlag(), false);
        apply();
        bind();
    }

    return { init, apply, enable, disable, nextPerson, isOn: Store.isKiosk };
})();
