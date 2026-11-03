/**
 * [Reader] 🔊 읽어 주기 — 저학년·읽기가 어려운 학생을 위해 카드 내용을 소리로 읽어 줍니다.
 * 브라우저에 들어 있는 음성 합성(Web Speech API)을 쓰므로 추가 비용·네트워크가 필요 없습니다.
 * 한글이 섞인 문장은 한국어 목소리로, 그 밖의 문장은 선택한 화면 언어의 목소리로 읽습니다.
 */
const Reader = (() => {
    const SKIP = 'button, select, input, textarea, svg, canvas, .qm, .copy-hint, .tts-btn, [hidden], script, style';
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    let activeBtn = null;
    let queue = 0;

    function lang() {
        return typeof I18n !== 'undefined' ? I18n.lang() : 'ko';
    }

    function label(key) {
        const l = (typeof I18nData !== 'undefined' && I18nData.reader[lang()]) || { play: '소리로 읽어 주기', stop: '읽기 멈추기' };
        return l[key];
    }

    /** 보이는 글자만 모읍니다 (버튼·숨긴 요소 제외). */
    function textOf(root) {
        const parts = [];
        const walk = el => {
            for (const node of el.childNodes) {
                if (node.nodeType === 3) {
                    const t = node.textContent.replace(/\s+/g, ' ').trim();
                    if (t) parts.push(t);
                } else if (node.nodeType === 1) {
                    if (node.matches(SKIP)) continue;
                    if (getComputedStyle(node).display === 'none') continue;
                    const block = /^(DIV|P|H\d|LI|SECTION|DL|DT|DD|TR)$/.test(node.tagName);
                    walk(node);
                    if (block) parts.push('\n');
                }
            }
        };
        walk(root);
        return parts.join(' ').replace(/ *\n */g, '\n').replace(/\n+/g, '\n').trim();
    }

    /** 문장 단위로 나누고, 너무 긴 문장은 쉼표에서 한 번 더 나눕니다. */
    function chunks(text) {
        // 그림 문자(이모지)는 '지구본' 같은 이름으로 읽히므로 빼고 읽습니다.
        return text.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
            .replace(/([.!?。！？…])\s+/g, '$1\n').split(/\n+/).map(s => s.trim()).filter(Boolean)
            .flatMap(s => s.length > 160 ? s.split(/(?:,|·)\s*/) : [s]).map(s => s.trim()).filter(s => /[\p{L}\p{N}]/u.test(s));
    }

    function voiceFor(code) {
        const voices = window.speechSynthesis.getVoices();
        return voices.find(v => v.lang.replace('_', '-') === code) || voices.find(v => v.lang.slice(0, 2) === code.slice(0, 2)) || null;
    }

    function stop() {
        if (!supported) return;
        window.speechSynthesis.cancel();
        queue = 0;
        if (activeBtn) {
            activeBtn.classList.remove('on');
            activeBtn.textContent = '🔊';
            activeBtn.setAttribute('aria-label', label('play'));
        }
        activeBtn = null;
    }

    function speak(text, btn) {
        stop();
        const list = chunks(text);
        if (!list.length) return;
        activeBtn = btn || null;
        if (btn) {
            btn.classList.add('on');
            btn.textContent = '⏹';
            btn.setAttribute('aria-label', label('stop'));
        }
        const target = (typeof I18nData !== 'undefined' && I18nData.speech[lang()]) || 'ko-KR';
        queue = list.length;
        list.forEach(part => {
            const u = new SpeechSynthesisUtterance(part);
            u.lang = /[가-힣]/.test(part) ? 'ko-KR' : target;
            const v = voiceFor(u.lang);
            if (v) u.voice = v;
            u.rate = 0.95;
            u.onend = u.onerror = () => { queue--; if (queue <= 0 && activeBtn === btn) stop(); };
            window.speechSynthesis.speak(u);
        });
    }

    function attach() {
        document.querySelectorAll('[data-read]').forEach(card => {
            const title = card.querySelector('.card-title');
            if (!title || title.querySelector('.tts-btn')) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tts-btn';
            btn.textContent = '🔊';
            btn.setAttribute('aria-label', label('play'));
            btn.addEventListener('click', e => {
                e.stopPropagation();
                if (activeBtn === btn) { stop(); return; }
                speak(textOf(card), btn);
            });
            title.appendChild(btn);
        });
    }

    function relabel() {
        document.querySelectorAll('.tts-btn').forEach(b => { if (b !== activeBtn) b.setAttribute('aria-label', label('play')); });
    }

    function init() {
        if (!supported) { document.body.classList.add('no-tts'); return; }
        attach();
        // 탭을 옮기거나 다음 친구로 넘어가면 읽기를 멈춥니다.
        document.addEventListener('click', e => { if (e.target.closest('#tabbar button, #btnReset, #btnNextPerson')) stop(); });
        document.addEventListener('starcompass:reset', stop);
        window.addEventListener('pagehide', stop);
        if (window.speechSynthesis.getVoices().length === 0) window.speechSynthesis.addEventListener?.('voiceschanged', () => {}, { once: true });
    }

    if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);

    return { speak, stop, textOf, chunks, relabel, supported: () => supported };
})();
