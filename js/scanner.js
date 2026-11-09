/**
 * [Scanner] 📷 앱 안에서 QR 찍기 — 교실 태블릿·크롬북처럼 기본 카메라 앱으로 QR을 읽기 어려운 기기를 위해.
 * - 브라우저에 QR 읽기 기능(BarcodeDetector)이 있으면 그것을 쓰고, 없으면 jsQR(Apache-2.0)을 처음 쓸 때만 불러옵니다.
 * - 카메라 화면은 기기 안에서만 처리하고 어디에도 보내거나 저장하지 않습니다. 창을 닫으면 카메라를 바로 끕니다.
 */
const Scanner = (() => {
    const $ = id => document.getElementById(id);
    const JSQR_SRC = 'js/vendor/jsQR.js';
    let stream = null;
    let timer = null;
    let onText = null;
    let detector = null;
    let canvas = null;
    let busy = false;

    function supported() {
        return typeof navigator !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    function status(msg) { $('scanStatus').textContent = msg; }

    function loadJsQR() {
        if (typeof jsQR === 'function') return Promise.resolve();
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = JSQR_SRC;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('jsQR'));
            document.head.appendChild(s);
        });
    }

    async function makeDetector() {
        if (typeof BarcodeDetector !== 'undefined') {
            try {
                const formats = BarcodeDetector.getSupportedFormats ? await BarcodeDetector.getSupportedFormats() : ['qr_code'];
                if (formats.includes('qr_code')) {
                    const d = new BarcodeDetector({ formats: ['qr_code'] });
                    return async video => { const r = await d.detect(video); return r.length ? r[0].rawValue : null; };
                }
            } catch (e) { /* jsQR로 */ }
        }
        await loadJsQR();
        canvas = canvas || document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        return async video => {
            const w = video.videoWidth, h = video.videoHeight;
            if (!w || !h) return null;
            // 큰 화면은 줄여서 읽어야 저사양 태블릿에서도 빠릅니다.
            const scale = Math.min(1, 640 / Math.max(w, h));
            canvas.width = Math.round(w * scale);
            canvas.height = Math.round(h * scale);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
            return code ? code.data : null;
        };
    }

    function stop() {
        clearInterval(timer);
        timer = null;
        if (stream) stream.getTracks().forEach(t => t.stop());
        stream = null;
        const v = $('scanVideo');
        if (v) v.srcObject = null;
    }

    function close() {
        stop();
        onText = null;
        if ($('scanModal')) $('scanModal').hidden = true;
    }

    async function tick() {
        if (busy || !stream || !detector) return;
        busy = true;
        try {
            const text = await detector($('scanVideo'));
            if (text && onText) {
                const handler = onText;
                if (navigator.vibrate) { try { navigator.vibrate(60); } catch (e) { /* 무시 */ } }
                close();
                handler(text);
            }
        } catch (e) { /* 다음 장면에서 다시 */ }
        busy = false;
    }

    /**
     * 카메라를 열어 QR을 찾습니다. 찾으면 창을 닫고 handler(글자)를 부릅니다.
     * @param {{ title?: string, hint?: string, onText: (text: string) => void, onFail?: (reason: string) => void }} opts
     */
    async function open(opts) {
        const fail = reason => { close(); if (opts.onFail) opts.onFail(reason); };
        if (!supported() || !window.isSecureContext) { fail('unsupported'); return; }
        onText = opts.onText;
        $('scanTitle').textContent = opts.title || '📷 QR 찍기';
        $('scanHint').textContent = opts.hint || 'QR을 네모 칸 안에 맞춰 주세요.';
        status('카메라를 켜는 중이에요…');
        $('scanModal').hidden = false;
        $('scanClose').focus();
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        } catch (e) {
            fail(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'denied' : 'nocamera');
            return;
        }
        if (!onText) { stop(); return; } // 켜는 사이에 닫힘
        const v = $('scanVideo');
        v.srcObject = stream;
        try { await v.play(); } catch (e) { /* 자동 재생은 muted·playsinline으로 허용 */ }
        try { detector = await makeDetector(); } catch (e) { fail('nolib'); return; }
        status('QR을 찾고 있어요…');
        timer = setInterval(tick, 250);
    }

    function failMessage(reason) {
        return {
            unsupported: '이 브라우저에서는 앱 안 카메라를 쓸 수 없어요. 친구 코드를 넣어 주세요.',
            denied: '카메라 사용이 허용되지 않았어요. 브라우저 주소창의 카메라 권한을 허용하거나 친구 코드를 넣어 주세요.',
            nocamera: '카메라를 찾지 못했어요. 친구 코드를 넣어 주세요.',
            nolib: 'QR 읽기 도구를 불러오지 못했어요. 인터넷 연결을 확인하거나 친구 코드를 넣어 주세요.'
        }[reason] || '카메라를 쓸 수 없어요. 친구 코드를 넣어 주세요.';
    }

    function init() {
        if (!$('scanModal')) return;
        $('scanClose').addEventListener('click', close);
        $('scanModal').addEventListener('click', e => { if (e.target === $('scanModal')) close(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('scanModal').hidden) close(); });
        document.addEventListener('visibilitychange', () => { if (document.hidden) close(); });
        document.addEventListener('starcompass:reset', close);
        window.addEventListener('pagehide', close);
    }

    if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);

    return { open, close, supported, failMessage };
})();
