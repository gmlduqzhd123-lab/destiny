/**
 * [Update] 🔄 새 버전 알림 — 설치형(홈 화면) 앱을 오래 열어 두어도 새 버전이 나오면 알려 줍니다.
 * 서비스 워커가 새로 바뀌면 화면 위에 '새로고침' 띠를 보여 줍니다. 앱으로 돌아올 때마다 새 버전을 확인합니다.
 */
const Update = (() => {
    const $ = id => document.getElementById(id);

    function show() {
        const bar = $('updateBar');
        if (!bar || !bar.hidden) return;
        bar.hidden = false;
    }

    function init() {
        if (!('serviceWorker' in navigator) || location.protocol.indexOf('http') !== 0) return;
        const hadController = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) show(); });
        $('btnUpdateReload').addEventListener('click', () => location.reload());
        $('btnUpdateLater').addEventListener('click', () => { $('updateBar').hidden = true; });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) return;
            navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => { /* 오프라인이면 다음에 */ });
        });
    }

    if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);

    return { show };
})();
