/**
 * [UI] 화면 공용 도우미 — 알림(토스트), 복사, 공유, 앱 주소, HTML 이스케이프.
 * 다른 화면 모듈이 서로를 몰라도 쓸 수 있도록 상태 없이 둡니다.
 */
const UI = (() => {
    const $ = id => document.getElementById(id);
    let toastTimer = null;

    function toast(msg) {
        const el = $('toast');
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
    }

    function appUrl() {
        return location.origin + location.pathname;
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    async function copyText(text, okMsg) {
        try {
            await navigator.clipboard.writeText(text);
            toast(okMsg);
        } catch (e) {
            toast('이 환경에서는 복사가 지원되지 않습니다.');
        }
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

    function dateLabel(d) {
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    }

    return { $, toast, appUrl, escapeHtml, copyText, shareOrCopy, dateLabel };
})();
