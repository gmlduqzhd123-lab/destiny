/**
 * [BirthdayCard] 자연물 캐릭터와 생일 절기가 담긴 생일 축하 카드 (Canvas, 1080×1350)
 */
const BirthdayCard = (() => {
    const W = 1080, H = 1350;
    const SERIF = '"Gowun Batang", "Nanum Myeongjo", serif';
    const SANS = '"Pretendard Variable", Pretendard, sans-serif';
    const THEME = {
        wood: ['#1f5f3a', '#8fd19e', '🌳'], fire: ['#8a2b1e', '#ffb38a', '☀️'], earth: ['#6b4a1d', '#f2cf8c', '⛰️'],
        metal: ['#3d4552', '#dfe4ea', '💎'], water: ['#163a6b', '#9cc6ff', '🌊']
    };

    function wrap(ctx, text, maxWidth) {
        const out = [];
        let line = '';
        for (const ch of String(text)) {
            const test = line + ch;
            if (ctx.measureText(test).width > maxWidth && line) { out.push(line); line = ch; } else line = test;
        }
        if (line) out.push(line);
        return out;
    }

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {{name:string, hanja:string, el:string, title:string, strength:string, term:string, dateLabel:string, message:string}} d
     */
    async function draw(canvas, d) {
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        const [deep, light, icon] = THEME[d.el] || THEME.wood;
        try {
            const sample = Object.values(d).join('') + '생일축하해';
            await Promise.all([
                document.fonts.load(`700 60px "Gowun Batang"`, sample),
                document.fonts.load(`700 40px "Pretendard Variable"`, sample),
                document.fonts.load(`400 40px "Pretendard Variable"`, sample)
            ]);
        } catch (e) { /* 기본 글꼴로 그림 */ }

        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, deep);
        g.addColorStop(1, '#0b1120');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // 별 가루 (이름으로 정해져 매번 같은 무늬)
        const rnd = Engine.prng('bday-' + d.name);
        for (let i = 0; i < 90; i++) {
            ctx.globalAlpha = 0.3 + rnd() * 0.6;
            ctx.fillStyle = rnd() < 0.3 ? '#ffd166' : '#ffffff';
            ctx.beginPath();
            ctx.arc(rnd() * W, rnd() * H * 0.75, 1 + rnd() * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd166';
        ctx.font = `700 54px ${SANS}`;
        ctx.fillText('🎂 생일 축하해! 🎉', W / 2, 150);

        ctx.fillStyle = '#ffffff';
        ctx.font = `700 96px ${SERIF}`;
        ctx.fillText(d.name, W / 2, 270);

        // 캐릭터 엠블럼
        const cx = W / 2, cy = 520, r = 170;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,209,102,0.25)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = light;
        ctx.fill();
        ctx.fillStyle = deep;
        ctx.font = `700 190px ${SERIF}`;
        ctx.textBaseline = 'middle';
        ctx.fillText(d.hanja, cx, cy + 10);
        ctx.textBaseline = 'alphabetic';
        ctx.font = `400 64px ${SANS}`;
        ctx.fillText(icon, cx + r - 10, cy - r + 50);

        ctx.fillStyle = '#ffd166';
        ctx.font = `700 50px ${SERIF}`;
        ctx.fillText(d.title, W / 2, 790);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = `400 36px ${SANS}`;
        ctx.fillText(`${d.term ? d.term + ' 무렵에 태어난 ' : ''}${d.dateLabel}`, W / 2, 860);
        ctx.fillText(`나의 빛나는 강점 · ${d.strength}`, W / 2, 915);

        // 축하 메시지
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(110, 980, W - 220, 230);
        ctx.fillStyle = '#ffffff';
        ctx.font = `400 40px ${SANS}`;
        wrap(ctx, d.message, W - 300).slice(0, 4).forEach((ln, i) => ctx.fillText(ln, W / 2, 1050 + i * 56));

        ctx.fillStyle = '#94a3b8';
        ctx.font = `400 28px ${SANS}`;
        ctx.fillText('별빛 나침반 · © 2026 엽쌤', W / 2, H - 50);
    }

    function download(canvas, filename) {
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, 'image/png');
    }

    return { draw, download };
})();
