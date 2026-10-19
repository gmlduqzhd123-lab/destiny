/**
 * [Tarot] 스프레드 선택 → 질문 입력 → 부채꼴 덱에서 직접 뽑기 → 뒤집어 해석
 * 학생용 모드에서는 '상징·이야기 카드'로, 선생님용 모드에서는 '힐링 타로'로 동작합니다.
 */
const Tarot = (() => {
    const $ = id => document.getElementById(id);
    const ctx = { key: '', date: '', mode: 'student', spread: 'three', question: '', deck: [], picks: [], flipped: new Set() };

    function spreadsMap() {
        return ctx.mode === 'student' && TarotData.studentSpreads ? TarotData.studentSpreads : TarotData.spreads;
    }

    function spread() {
        const map = spreadsMap();
        return map[ctx.spread] || map.three;
    }

    function cardTitle(card) {
        return ctx.mode === 'student' && card.studentKo ? card.studentKo : card.ko;
    }

    function buildDeck() {
        const rnd = Engine.prng(`${ctx.key}-${ctx.date}-${ctx.spread}-${ctx.question.trim()}`);
        ctx.deck = Engine.shuffle(TarotData.cards, rnd).map(card => ({ card, rev: rnd() < 0.3 }));
        ctx.picks = [];
        ctx.flipped = new Set();
    }

    function renderSpreadButtons() {
        const map = spreadsMap();
        $('spreadSelect').innerHTML = Object.entries(map).map(([k, v]) =>
            `<button type="button" data-spread="${k}" class="${k === ctx.spread ? 'on' : ''}">${v.label}<br><span style="font-weight:400;font-size:0.7rem;">${v.desc}</span></button>`).join('');
        $('spreadSelect').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
            ctx.spread = b.dataset.spread;
            $('spreadSelect').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
            reset();
        }));
    }

    function renderFan() {
        const n = ctx.deck.length, spanDeg = 110;
        $('deckFan').innerHTML = ctx.deck.map((_, i) => {
            const ang = -spanDeg / 2 + (spanDeg * i) / (n - 1);
            return `<div class="deck-card" data-i="${i}" role="button" aria-label="${i + 1}번째 카드 뽑기" style="transform: rotate(${ang}deg)"></div>`;
        }).join('');
        $('deckFan').querySelectorAll('.deck-card').forEach(el => el.addEventListener('click', () => pick(+el.dataset.i, el)));
        $('deckFan').style.display = 'block';
        $('tarotSlots').innerHTML = '';
        $('tarotReading').innerHTML = '';
        updateGuide();
    }

    function updateGuide() {
        const need = spread().positions.length - ctx.picks.length;
        $('deckGuide').textContent = need > 0
            ? `마음을 가라앉히고 카드 ${need}장을 골라 주세요. (${spread().positions[ctx.picks.length]})`
            : '뽑은 카드를 눌러 뒤집어 보세요.';
    }

    function pick(i, el) {
        if (ctx.picks.length >= spread().positions.length || ctx.picks.includes(i)) return;
        ctx.picks.push(i);
        el.classList.add('picked');
        updateGuide();
        if (ctx.picks.length === spread().positions.length) {
            setTimeout(() => {
                $('deckFan').style.display = 'none';
                renderSlots();
            }, 350);
        }
    }

    function renderSlots() {
        const pos = spread().positions;
        $('tarotSlots').innerHTML = ctx.picks.map((di, k) => {
            const { card, rev } = ctx.deck[di];
            return `<div class="card-wrapper${ctx.flipped.has(k) ? ' flipped' : ''}" data-k="${k}">
                <div class="card-inner">
                    <div class="card-front">${pos[k]}<small>눌러서 뒤집기</small></div>
                    <div class="card-back${rev ? ' reversed' : ''}">
                        <div class="sym">${card.sym}</div>
                        <div class="num">${card.roman}</div>
                        <div class="nm">${cardTitle(card)}</div>
                        ${rev ? `<div class="rev">${ctx.mode === 'student' ? '거꾸로 방향' : '역방향'}</div>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
        $('tarotSlots').querySelectorAll('.card-wrapper').forEach(w => w.addEventListener('click', () => {
            w.classList.add('flipped');
            ctx.flipped.add(+w.dataset.k);
            renderReading();
        }));
    }

    function renderReading() {
        const pos = spread().positions;
        const revLabel = ctx.mode === 'student' ? '거꾸로 방향(새로운 시선)' : '역방향';
        const items = [...ctx.flipped].sort().map(k => {
            const { card, rev } = ctx.deck[ctx.picks[k]];
            return `<div class="tarot-item">
                <div class="hd"><span class="pos">${pos[k]}</span>${card.roman}. ${cardTitle(card)} (${card.en})${rev ? ' · ' + revLabel : ''}</div>
                <div class="kw">${card.kw}</div>
                <div class="tx">${rev ? card.rev : card.up}</div>
            </div>`;
        });
        if (ctx.flipped.size === pos.length && pos.length > 1) {
            items.push(`<div class="tarot-item"><div class="hd"><span class="pos">${ctx.mode === 'student' ? '별빛 종합 메시지' : '종합 리딩'}</span></div><div class="tx">${summary()}</div></div>`);
        }
        $('tarotReading').innerHTML = (ctx.question.trim() ? `<p class="small muted" style="margin:0 0 8px;">주제·질문 · ${escapeHtml(ctx.question.trim())}</p>` : '') + items.join('');
        $('deckGuide').textContent = ctx.flipped.size === pos.length ? '카드가 전하는 이야기를 읽어 보세요.' : '남은 카드도 뒤집어 보세요.';
    }

    function summary() {
        const cards = ctx.picks.map(i => ctx.deck[i]);
        const revCount = cards.filter(c => c.rev).length;
        const last = cards[cards.length - 1];
        const lastName = cardTitle(last.card);
        if (ctx.mode === 'student') {
            let s = revCount === 0
                ? '모든 카드가 바른 방향으로 나왔어요! 자신감을 가지고 밝은 마음으로 나아가 보세요. '
                : revCount === cards.length
                ? '카드가 모두 거꾸로 방향이에요. 서두르기보다 잠시 멈춰서 내 마음과 계획을 차분히 돌아보면 좋은 해답을 찾게 됩니다. '
                : '바른 방향과 거꾸로 방향 카드가 함께 나왔어요. 잘하고 있는 점은 이어 가고, 조심할 점은 한 번 더 챙겨 보세요. ';
            if (ctx.spread === 'three') {
                const names = cards.map(c => `[${cardTitle(c.card)}]`).join(' → ');
                s += `오늘 뽑은 ${names} 세 장의 상징 키워드를 이어서 나만의 짧은 동화나 오늘의 다짐을 만들어 볼까요?`;
            } else {
                s += `마지막 [${lastName}] 카드가 전하는 '${last.card.kw}'의 메시지가 오늘의 열쇠입니다.`;
            }
            return s;
        }
        let s = revCount === 0 ? '모든 카드가 정방향으로 나왔습니다. 흐름이 순조로우니 믿고 나아가세요. '
            : revCount === cards.length ? '모든 카드가 역방향입니다. 지금은 밀어붙이기보다 멈춰서 점검할 때입니다. '
            : '순방향과 역방향이 섞여 있습니다. 좋은 흐름 속에 짚고 넘어갈 부분이 있습니다. ';
        s += ctx.spread === 'love'
            ? `관계의 흐름을 보여 주는 [${lastName}] 카드는 '${last.card.kw}'의 메시지를 전합니다.`
            : `마지막 [${lastName}] 카드가 전하는 '${last.card.kw}'의 메시지가 앞으로의 열쇠입니다.`;
        return s;
    }

    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function reset() {
        buildDeck();
        renderFan();
    }

    function setUser(key, date) {
        ctx.key = key;
        ctx.date = date;
        reset();
    }

    function setMode(mode) {
        ctx.mode = mode;
        renderSpreadButtons();
        if (ctx.picks.length === spread().positions.length) {
            renderSlots();
            if (ctx.flipped.size > 0) renderReading();
        } else {
            updateGuide();
        }
    }

    function init() {
        renderSpreadButtons();
        $('tarotQuestion').addEventListener('change', e => {
            ctx.question = e.target.value;
            reset();
        });
        $('btnTarotReset').addEventListener('click', reset);
    }

    function pickedSummary() {
        return ctx.picks.filter((_, k) => ctx.flipped.has(k)).map(i => cardTitle(ctx.deck[i].card) + (ctx.deck[i].rev ? '(역)' : ''));
    }

    return { init, setUser, setMode, pickedSummary };
})();
