/**
 * [Backup] 💾 내 기록 내보내기·불러오기 — 이 기기에만 있는 마음 일기·도감·명렬표 등을 파일 하나로 옮깁니다.
 * - 서버로 보내지 않습니다. 파일은 사용자가 직접 저장하고, 다른 기기에서 직접 불러옵니다.
 * - 불러오기는 '합치기'입니다. 이 기기에 이미 있는 기록은 지우지 않고, 없는 날짜·캐릭터·설정만 더합니다.
 * - 공용 기기 모드에서는 쓸 수 없습니다(다른 사람의 기록이 섞이지 않도록).
 */
const Backup = (() => {
    const APP = 'starcompass';
    const VERSION = 1;
    const MAX_BYTES = 3 * 1024 * 1024;
    // 옮길 수 있는 저장 칸 (공용 기기 모드 설정은 기기마다 다르므로 옮기지 않습니다)
    const KEYS = {
        journal: 'myeongun_journal_v1',
        dex: 'starcompass_dex_v1',
        omikuji: 'myeongun_omikuji',
        user: 'myeongun_user_v3',
        roster: 'starcompass_roster_v1',
        mode: 'starcompass_mode',
        tone: 'myeongun_tone',
        lang: 'starcompass_lang'
    };
    const RAW_KEYS = new Set([KEYS.lang]); // JSON이 아닌 글자 그대로 저장되는 칸
    const LANGS = ['ko', 'en', 'zh', 'vi'];
    const ALLOWED = new Set(Object.values(KEYS));
    const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

    function memoryStorage(init = {}) {
        const m = new Map(Object.entries(init));
        return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), dump: () => Object.fromEntries(m) };
    }

    function ymdStamp(d) {
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    }

    /** 저장소에서 옮길 칸만 모아 백업 객체를 만듭니다. */
    function build(storage, now = new Date()) {
        const data = {};
        for (const key of ALLOWED) {
            const v = storage.getItem(key);
            if (v !== null && v !== undefined && v !== '') data[key] = v;
        }
        return { app: APP, version: VERSION, exportedAt: now.toISOString(), data };
    }

    function fileName(now = new Date()) {
        return `starcompass-backup-${ymdStamp(now)}.json`;
    }

    /**
     * 파일 글자를 검사합니다. 모르는 칸·깨진 값은 버리고, 앱 파일이 아니면 오류를 던집니다.
     * @returns {{ data: Object<string,string>, exportedAt: string, skipped: string[] }}
     */
    function parse(text) {
        if (typeof text !== 'string' || !text.trim()) throw new Error('빈 파일이에요.');
        if (text.length > MAX_BYTES) throw new Error('파일이 너무 커요. 별빛 나침반 백업 파일이 맞는지 확인해 주세요.');
        let obj;
        try { obj = JSON.parse(text); } catch (e) { throw new Error('별빛 나침반 백업 파일이 아니에요.'); }
        if (!isObj(obj) || obj.app !== APP || !isObj(obj.data)) throw new Error('별빛 나침반 백업 파일이 아니에요.');
        if (typeof obj.version !== 'number' || obj.version > VERSION) throw new Error('더 새로운 버전에서 만든 파일이에요. 앱을 새로고침해 업데이트한 뒤 다시 불러와 주세요.');
        const data = {};
        const skipped = [];
        for (const [key, value] of Object.entries(obj.data)) {
            if (!ALLOWED.has(key) || typeof value !== 'string') { skipped.push(key); continue; }
            if (RAW_KEYS.has(key)) {
                if (key === KEYS.lang && !LANGS.includes(value)) { skipped.push(key); continue; }
                data[key] = value;
                continue;
            }
            try { JSON.parse(value); data[key] = value; } catch (e) { skipped.push(key); }
        }
        return { data, exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '', skipped };
    }

    function readJson(storage, key) {
        try { return JSON.parse(storage.getItem(key)); } catch (e) { return null; }
    }

    /** 백업 안에 무엇이 들었는지 사람이 읽을 수 있게 셉니다. */
    function summarize(data) {
        const get = key => { try { return JSON.parse(data[key]); } catch (e) { return null; } };
        const journal = get(KEYS.journal);
        const dex = get(KEYS.dex);
        const people = isObj(journal) ? Object.keys(journal).length : 0;
        const days = isObj(journal) ? Object.values(journal).reduce((n, e) => n + (isObj(e) ? Object.keys(e).length : 0), 0) : 0;
        const dexCount = isObj(dex) && isObj(dex.got) ? Object.keys(dex.got).length : 0;
        const user = get(KEYS.user);
        return {
            people, days, dex: dexCount,
            roster: !!data[KEYS.roster],
            user: isObj(user) && typeof user.name === 'string' ? user.name : ''
        };
    }

    /**
     * 불러온 기록을 이 기기 기록에 합칩니다. 이미 있는 값은 그대로 둡니다.
     * @returns {{ days: number, dex: number, settings: number }}
     */
    function merge(storage, data) {
        const added = { days: 0, dex: 0, settings: 0 };
        for (const [key, value] of Object.entries(data)) {
            if (!ALLOWED.has(key)) continue;
            if (key === KEYS.journal) {
                const local = readJson(storage, key);
                const base = isObj(local) ? local : {};
                const incoming = JSON.parse(value);
                if (!isObj(incoming)) continue;
                for (const [person, days] of Object.entries(incoming)) {
                    if (!isObj(days)) continue;
                    base[person] = isObj(base[person]) ? base[person] : {};
                    for (const [ymd, entry] of Object.entries(days)) {
                        if (!/^\d{8}$/.test(ymd) || !isObj(entry)) continue;
                        if (!base[person][ymd]) { base[person][ymd] = entry; added.days++; }
                        else {
                            // 같은 날 기록이 있으면 비어 있는 칸(메모·마음 날씨)만 채웁니다.
                            const cur = base[person][ymd];
                            for (const f of ['memo', 'rating']) if (!cur[f] && entry[f]) cur[f] = entry[f];
                        }
                    }
                }
                storage.setItem(key, JSON.stringify(base));
            } else if (key === KEYS.dex) {
                const local = readJson(storage, key);
                const base = isObj(local) && isObj(local.got) ? local : { got: {}, mine: null };
                const incoming = JSON.parse(value);
                if (!isObj(incoming) || !isObj(incoming.got)) continue;
                for (const [idx, day] of Object.entries(incoming.got)) {
                    if (!/^\d$/.test(idx)) continue;
                    if (!base.got[idx]) { base.got[idx] = day; added.dex++; }
                }
                if ((base.mine === null || base.mine === undefined) && Number.isInteger(incoming.mine) && incoming.mine >= 0 && incoming.mine <= 9) base.mine = incoming.mine;
                storage.setItem(key, JSON.stringify(base));
            } else if (key === KEYS.omikuji) {
                const local = readJson(storage, key);
                const incoming = JSON.parse(value);
                if (!isObj(incoming)) continue;
                storage.setItem(key, JSON.stringify({ ...incoming, ...(isObj(local) ? local : {}) }));
            } else if (storage.getItem(key) === null) {
                storage.setItem(key, value);
                added.settings++;
            }
        }
        return added;
    }

    // ---------- 화면 ----------
    const $ = id => document.getElementById(id);
    const kiosk = () => typeof App !== 'undefined' && App.isKiosk && App.isKiosk();

    function describe(s) {
        const parts = [];
        if (s.user) parts.push(`이름 ${s.user}`);
        if (s.days) parts.push(`마음 일기 ${s.days}일${s.people > 1 ? ` (${s.people}명)` : ''}`);
        if (s.dex) parts.push(`도감 캐릭터 ${s.dex}종`);
        if (s.roster) parts.push('우리 반 명렬표');
        return parts.length ? parts.join(' · ') : '아직 저장된 기록이 없어요';
    }

    function open() {
        if (kiosk()) { App.toast('공용 기기 모드에서는 기록을 내보내거나 불러올 수 없어요.'); return; }
        $('backupNow').textContent = describe(summarize(build(localStorage).data));
        $('backupResult').hidden = true;
        $('backupModal').hidden = false;
        $('btnBackupExport').focus();
    }

    function close() { $('backupModal').hidden = true; }

    function exportFile() {
        const now = new Date();
        const json = JSON.stringify(build(localStorage, now), null, 1);
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName(now);
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        App.toast('💾 백업 파일을 저장했어요. 이름·생일·일기가 담겨 있으니 나만 볼 수 있는 곳에 두세요.');
    }

    function showResult(msg, ok) {
        const el = $('backupResult');
        el.hidden = false;
        el.className = 'backup-result ' + (ok ? 'ok' : 'bad');
        el.textContent = msg;
    }

    function importFile(file) {
        if (!file) return;
        if (file.size > MAX_BYTES) { showResult('파일이 너무 커요. 별빛 나침반 백업 파일이 맞는지 확인해 주세요.', false); return; }
        const reader = new FileReader();
        reader.onload = () => {
            let parsed;
            try { parsed = parse(String(reader.result)); } catch (e) { showResult(e.message, false); return; }
            const s = summarize(parsed.data);
            if (!confirm(`이 파일의 기록을 이 기기에 합칠까요?\n\n${describe(s)}\n\n이 기기에 이미 있는 기록은 지워지지 않아요.`)) return;
            const added = merge(localStorage, parsed.data);
            showResult(`✅ 불러왔어요: 새 일기 ${added.days}일 · 새 도감 캐릭터 ${added.dex}종 · 설정 ${added.settings}개. 잠시 후 화면을 새로 열어요.`, true);
            setTimeout(() => location.reload(), 1600);
        };
        reader.onerror = () => showResult('파일을 읽지 못했어요. 다시 골라 주세요.', false);
        reader.readAsText(file);
    }

    function init() {
        if (!$('backupModal')) return;
        document.querySelectorAll('[data-backup]').forEach(b => b.addEventListener('click', open));
        $('btnBackupExport').addEventListener('click', exportFile);
        $('btnBackupImport').addEventListener('click', () => $('backupFile').click());
        $('backupFile').addEventListener('change', e => { importFile(e.target.files[0]); e.target.value = ''; });
        $('backupClose').addEventListener('click', close);
        $('backupModal').addEventListener('click', e => { if (e.target === $('backupModal')) close(); });
    }

    if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);

    return { build, parse, merge, summarize, fileName, memoryStorage, KEYS, open };
})();
