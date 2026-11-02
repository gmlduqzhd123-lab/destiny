/**
 * [Printer] 리포트·활동지·모둠표를 A4로 인쇄합니다.
 * 인쇄할 내용만 #printArea에 넣고, 인쇄하는 동안 나머지 화면을 숨깁니다. (PDF로 저장도 인쇄 창에서 가능)
 */
const Printer = (() => {
    let cleanupTimer = null;
    let prevTitle = '';

    function area() {
        let el = document.getElementById('printArea');
        if (!el) {
            el = document.createElement('div');
            el.id = 'printArea';
            el.setAttribute('aria-hidden', 'true');
            document.body.appendChild(el);
        }
        return el;
    }

    function cleanup() {
        clearTimeout(cleanupTimer);
        document.body.classList.remove('printing');
        area().innerHTML = '';
        if (prevTitle) document.title = prevTitle;
        prevTitle = '';
    }

    /**
     * @param {string} html 인쇄할 내용 (호출하는 쪽에서 사용자 입력을 이스케이프한 HTML)
     * @param {string} title 인쇄 창·PDF 파일 이름에 쓰일 제목
     */
    function print(html, title) {
        cleanup();
        area().innerHTML = html;
        prevTitle = document.title;
        if (title) document.title = title;
        document.body.classList.add('printing');
        window.addEventListener('afterprint', cleanup, { once: true });
        // 인쇄 창이 바로 닫히지 않는 브라우저(iOS 등)를 위해 넉넉히 기다린 뒤에도 정리합니다.
        cleanupTimer = setTimeout(cleanup, 60000);
        setTimeout(() => window.print(), 50);
    }

    return { print, cleanup };
})();
