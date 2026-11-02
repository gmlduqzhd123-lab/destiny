/**
 * [Worksheet] ✏️ 상징 카드 활동지 (A4 인쇄) — 뽑은 카드로 국어·창체 수업 활동지를 만듭니다.
 * - 이야기 3장(시작·전개·결말) → 이야기 짓기 활동지
 * - 우정·교실(나·친구·우리) / 관계·소통 → 마음 편지 활동지
 * - 한 장 → 생각 씨앗 활동지
 */
const Worksheet = (() => {
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lines = n => `<div class="ws-lines">${'<p></p>'.repeat(n)}</div>`;

    function head(title, guide, question) {
        return `<div class="ws-head"><h1>${title}</h1>
            <div class="ws-who"><span>날짜: ________</span><span>이름: ______________</span></div></div>
            <p class="ws-guide">${guide}</p>
            ${question ? `<p class="ws-topic">주제 · ${esc(question)}</p>` : ''}`;
    }

    function cardBox(c) {
        return `<div class="ws-card"><div class="ws-pos">${esc(c.pos)}</div>
            <div class="ws-sym">${c.sym || '✦'}</div>
            <div class="ws-name">${esc(c.roman)}. ${esc(c.title)}${c.rev ? ' <small>(거꾸로)</small>' : ''}</div>
            <div class="ws-kw">${esc(c.kw)}</div></div>`;
    }

    function story(cards, q) {
        return `<section class="print-sheet ws">${head('✏️ 상징 카드 이야기 짓기', '세 장의 카드 키워드를 이어서 나만의 짧은 이야기를 지어 보세요. 그림으로 먼저 그려도 좋아요.', q)}
            <p class="ws-label">이야기 제목: ____________________________________</p>
            <div class="ws-three">${cards.map(c => `<div class="ws-col">${cardBox(c)}<div class="ws-draw">그림</div>${lines(5)}</div>`).join('')}</div>
            <p class="ws-label">이 이야기에서 내가 배운 점이나 느낀 점</p>${lines(2)}
            <p class="print-foot">별빛 나침반 상징 카드 활동지 · 카드는 정답이 아니라 상상력을 여는 열쇠예요.</p></section>`;
    }

    function letter(cards, q) {
        return `<section class="print-sheet ws">${head('💌 상징 카드 마음 편지', '카드가 전하는 키워드를 떠올리며 친구(또는 소중한 사람)에게 마음을 전하는 편지를 써 보세요.', q)}
            <div class="ws-three small">${cards.map(cardBox).join('')}</div>
            <p class="ws-label">To. ______________ 에게</p>${lines(9)}
            <p class="ws-label right">From. ______________</p>
            <p class="print-foot">별빛 나침반 상징 카드 활동지 · 고마운 점과 응원하는 마음을 구체적으로 적어 보세요.</p></section>`;
    }

    function seed(cards, q) {
        const c = cards[0];
        return `<section class="print-sheet ws">${head('🌱 오늘의 생각 씨앗', '뽑은 카드를 보며 질문에 답해 보세요. 정답은 없어요. 내 생각이 곧 정답이에요.', q)}
            <div class="ws-one">${cardBox(c)}<div class="ws-draw big">카드를 보고 떠오르는 장면을 그려 보세요</div></div>
            <p class="ws-label">1. 「${esc(c.title)}」 카드와 「${esc(c.kw)}」 키워드를 보면 무엇이 떠오르나요?</p>${lines(3)}
            <p class="ws-label">2. 이 카드는 오늘의 나에게 어떤 이야기를 해 주는 것 같나요?</p>${lines(3)}
            <p class="ws-label">3. 내일 실천해 보고 싶은 작은 다짐 한 가지</p>${lines(2)}
            <p class="print-foot">별빛 나침반 상징 카드 활동지</p></section>`;
    }

    /**
     * @param {{spread:string, cards:Array<{pos,title,roman,kw,sym,rev}>, question:string}} d
     */
    function build(d) {
        if (d.cards.length === 1) return { html: seed(d.cards, d.question), title: '생각 씨앗 활동지' };
        if (d.spread === 'love') return { html: letter(d.cards, d.question), title: '마음 편지 활동지' };
        return { html: story(d.cards, d.question), title: '이야기 짓기 활동지' };
    }

    function label(spread, count) {
        if (count === 1) return '🌱 생각 씨앗 활동지 인쇄';
        return spread === 'love' ? '💌 마음 편지 활동지 인쇄' : '✏️ 이야기 짓기 활동지 인쇄';
    }

    return { build, label };
})();
