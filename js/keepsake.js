/**
 * [Keepsake] 명운첩(命運帖) 카드 — 한지 배경에 오늘의 풀이와 낙관 도장을 담은 공유 이미지 (9:16)
 * 외부 캡처 라이브러리 없이 Canvas 2D로 직접 그립니다.
 */
const Keepsake = (() => {
    const W = 1080, H = 1920;
    const INK = '#2b2420', SEAL = '#b3261e', PAPER = '#efe6d2';
    const SERIF = '"Gowun Batang", "Nanum Myeongjo", serif';
    const SANS = 'Pretendard, sans-serif';
    const EL_COLOR = { wood: '#3f7d52', fire: '#b8432c', earth: '#9a7431', metal: '#6c6f75', water: '#2f5d95' };

    let canvas, ctx, data = null, stamps = [], selectedSeal = null, paperTexture = null;

    function init(canvasEl) {
        canvas = canvasEl;
        canvas.width = W;
        canvas.height = H;
        ctx = canvas.getContext('2d');
        canvas.addEventListener('click', onStamp);
    }

    function makePaper() {
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const g = c.getContext('2d');
        g.fillStyle = PAPER;
        g.fillRect(0, 0, W, H);
        // 한지 섬유 질감 (고정 시드로 매번 같은 무늬)
        const rnd = Engine.prng('hanji');
        for (let i = 0; i < 2600; i++) {
            g.strokeStyle = `rgba(120, 95, 60, ${0.03 + rnd() * 0.05})`;
            g.lineWidth = 0.6 + rnd() * 1.4;
            const x = rnd() * W, y = rnd() * H, len = 8 + rnd() * 40, ang = rnd() * Math.PI;
            g.beginPath();
            g.moveTo(x, y);
            g.quadraticCurveTo(x + Math.cos(ang) * len / 2 + (rnd() - 0.5) * 10, y + Math.sin(ang) * len / 2, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
            g.stroke();
        }
        const vg = g.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, H * 0.75);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(90,60,20,0.18)');
        g.fillStyle = vg;
        g.fillRect(0, 0, W, H);
        return c;
    }

    function wrap(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let line = '';
        for (const w of words) {
            const test = line ? line + ' ' + w : w;
            if (ctx.measureText(test).width > maxWidth && line) {
                lines.push(line);
                line = w;
            } else {
                line = test;
            }
        }
        if (line) lines.push(line);
        return lines;
    }

    function drawText(text, x, y, { font, color = INK, align = 'center', maxWidth = 860, lineHeight = 1.55, maxLines = 99 }) {
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = 'alphabetic';
        const size = parseInt(font.match(/(\d+)px/)[1], 10);
        const lines = wrap(text, maxWidth).slice(0, maxLines);
        lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * size * lineHeight));
        return y + lines.length * size * lineHeight;
    }

    function drawSeal(ch, x, y, size, rot, alpha = 0.9) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = SEAL;
        ctx.fillStyle = SEAL;
        ctx.lineWidth = size * 0.07;
        const r = size / 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-r, -r, size, size, size * 0.12);
        else ctx.rect(-r, -r, size, size);
        ctx.stroke();
        ctx.font = `700 ${Math.round(size * (ch.length > 1 ? 0.36 : 0.62))}px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (ch.length > 1) {
            // 2글자 도장은 세로 배치
            ctx.fillText(ch[0], 0, -size * 0.2);
            ctx.fillText(ch[1], 0, size * 0.2);
        } else {
            ctx.fillText(ch, 0, size * 0.04);
        }
        ctx.restore();
    }

    function hline(y, pad = 150) {
        ctx.strokeStyle = 'rgba(43,36,32,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pad, y);
        ctx.lineTo(W - pad, y);
        ctx.stroke();
    }

    function draw() {
        if (!ctx || !data) return;
        if (!paperTexture) paperTexture = makePaper();
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(paperTexture, 0, 0);

        // 테두리 (이중선)
        ctx.strokeStyle = INK;
        ctx.lineWidth = 6;
        ctx.strokeRect(50, 50, W - 100, H - 100);
        ctx.lineWidth = 2;
        ctx.strokeRect(68, 68, W - 136, H - 136);

        let y = 200;
        drawText('命 運 帖', W / 2, y, { font: `700 88px ${SERIF}` });
        y += 60;
        drawText(`명운첩 · ${data.dateLabel}`, W / 2, y, { font: `400 34px ${SERIF}`, color: '#6b5e52' });
        y += 90;
        drawText(`${data.name} 님`, W / 2, y, { font: `700 60px ${SERIF}` });
        y += 54;
        drawText(data.subtitle, W / 2, y, { font: `400 32px ${SANS}`, color: '#6b5e52' });
        y += 50;

        // 사주 원국 (있을 때만)
        if (data.pillars) {
            y += 20;
            const cols = data.pillars.length;
            const cw = 150, gap = 22, total = cols * cw + (cols - 1) * gap;
            let x0 = (W - total) / 2;
            data.pillars.forEach((p, i) => {
                const cx = x0 + i * (cw + gap) + cw / 2;
                ctx.font = `400 26px ${SANS}`;
                ctx.fillStyle = '#6b5e52';
                ctx.textAlign = 'center';
                ctx.fillText(p.label, cx, y);
                [p.stem, p.branch].forEach((g, k) => {
                    const top = y + 18 + k * 142;
                    ctx.fillStyle = g ? EL_COLOR[g.el] : 'rgba(0,0,0,0.08)';
                    ctx.globalAlpha = g ? 0.14 : 1;
                    ctx.fillRect(cx - cw / 2, top, cw, 130);
                    ctx.globalAlpha = 1;
                    if (g) {
                        ctx.font = `700 84px ${SERIF}`;
                        ctx.fillStyle = EL_COLOR[g.el];
                        ctx.fillText(g.hanja, cx, top + 96);
                    } else {
                        ctx.font = `400 40px ${SERIF}`;
                        ctx.fillStyle = '#9a8e80';
                        ctx.fillText('?', cx, top + 80);
                    }
                    if (p.me && k === 0) {
                        ctx.strokeStyle = INK;
                        ctx.lineWidth = 4;
                        ctx.strokeRect(cx - cw / 2, top, cw, 130);
                    }
                });
            });
            y += 18 + 2 * 142 + 40;
            if (data.ilganLine) {
                drawText(data.ilganLine, W / 2, y, { font: `700 36px ${SERIF}` });
                y += 40;
            }
        }

        hline(y);
        y += 90;

        // 오늘의 풀이
        if (data.dayTitle) {
            drawText(data.dayTitle, W / 2, y, { font: `700 50px ${SERIF}`, color: SEAL });
            y += 70;
        }
        y = drawText(data.text, W / 2, y, { font: `400 38px ${SANS}`, maxWidth: 820, maxLines: 5 });
        y += 40;

        // 점수 막대
        const rows = [
            ['연애', data.scores.love, '#c75b7a'],
            ['금전', data.scores.money, '#b8932c'],
            ['직장', data.scores.work, '#3f73a8']
        ];
        rows.forEach(([label, v, c]) => {
            ctx.font = `700 34px ${SANS}`;
            ctx.fillStyle = INK;
            ctx.textAlign = 'left';
            ctx.fillText(label, 170, y + 12);
            ctx.fillStyle = 'rgba(43,36,32,0.12)';
            ctx.fillRect(290, y - 10, 520, 26);
            ctx.fillStyle = c;
            ctx.fillRect(290, y - 10, 520 * v / 100, 26);
            ctx.fillStyle = INK;
            ctx.textAlign = 'right';
            ctx.fillText(String(v), 910, y + 12);
            y += 64;
        });
        y += 20;

        if (data.quote) {
            hline(y);
            y += 80;
            drawText(data.quote.hanmun, W / 2, y, { font: `700 42px ${SERIF}`, maxWidth: 820 });
            y += 56;
            drawText(data.quote.kor, W / 2, y, { font: `400 30px ${SANS}`, color: '#6b5e52', maxWidth: 800, maxLines: 2 });
        }

        // 낙관 (고정)
        drawText('재미로 보는 운세 · © 2026 엽쌤', 170, H - 120, { font: `400 26px ${SANS}`, color: '#8a7d70', align: 'left' });
        drawSeal('命運', W - 190, H - 190, 120, -0.06, 0.92);

        // 사용자가 찍은 도장
        stamps.forEach(s => drawSeal(s.ch, s.x, s.y, 150, s.rot, 0.85));
    }

    async function render(newData) {
        data = newData;
        stamps = [];
        try {
            await Promise.all([
                document.fonts.load(`700 40px "Gowun Batang"`),
                document.fonts.load(`400 40px "Gowun Batang"`),
                document.fonts.load(`700 40px Pretendard`)
            ]);
        } catch (e) { /* 폰트를 못 불러와도 기본 폰트로 그립니다 */ }
        draw();
    }

    function setSeal(ch) { selectedSeal = ch; }

    function onStamp(e) {
        if (!selectedSeal) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (W / rect.width);
        const y = (e.clientY - rect.top) * (H / rect.height);
        stamps.push({ ch: selectedSeal, x, y, rot: (Math.random() - 0.5) * 0.5 });
        draw();
    }

    function clearStamps() { stamps = []; draw(); }

    function toBlob() {
        return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    }

    async function download(filename) {
        const blob = await toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function share(filename, text) {
        const blob = await toBlob();
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], text });
            return true;
        }
        return false;
    }

    return { init, render, setSeal, clearStamps, download, share };
})();
