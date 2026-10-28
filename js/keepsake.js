/**
 * [Keepsake] 별빛 도감(星光帖) 카드 — 한지 배경에 오늘의 기질·다짐과 도장을 담은 공유 이미지 (9:16)
 * 외부 캡처 라이브러리 없이 Canvas 2D로 직접 그립니다.
 */
const Keepsake = (() => {
    const W = 1080, H = 1920;
    const INK = '#2b2420', SEAL = '#b3261e', PAPER = '#efe6d2';
    const SERIF = '"Gowun Batang", "Nanum Myeongjo", serif';
    const SANS = '"Pretendard Variable", Pretendard, sans-serif';
    const EL_COLOR = { wood: '#3f7d52', fire: '#b8432c', earth: '#9a7431', metal: '#6c6f75', water: '#2f5d95' };
    const STEM_META = [
        { no: '01', code: '甲木', label: '큰 나무', el: 'wood' },
        { no: '02', code: '乙木', label: '풀과 꽃', el: 'wood' },
        { no: '03', code: '丙火', label: '밝은 태양', el: 'fire' },
        { no: '04', code: '丁火', label: '따뜻한 별빛', el: 'fire' },
        { no: '05', code: '戊土', label: '든든한 큰 산', el: 'earth' },
        { no: '06', code: '己土', label: '기름진 정원', el: 'earth' },
        { no: '07', code: '庚金', label: '단단한 원석', el: 'metal' },
        { no: '08', code: '辛金', label: '빛나는 보석', el: 'metal' },
        { no: '09', code: '壬水', label: '넓은 바다', el: 'water' },
        { no: '10', code: '癸水', label: '맑은 이슬비', el: 'water' }
    ];

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

    function drawSparkle(x, y, r, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            const d = i % 2 === 0 ? r : r * 0.28;
            const px = Math.cos(a) * d, py = Math.sin(a) * d;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawCornerOrnaments(accent) {
        const corners = [
            [68, 68, 1, 1],
            [W - 68, 68, -1, 1],
            [68, H - 68, 1, -1],
            [W - 68, H - 68, -1, -1]
        ];
        ctx.save();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        corners.forEach(([cx, cy, sx, sy]) => {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(sx, sy);
            ctx.beginPath();
            ctx.moveTo(14, 48);
            ctx.lineTo(14, 14);
            ctx.lineTo(48, 14);
            ctx.stroke();
            ctx.strokeRect(14, 14, 16, 16);
            drawSparkle(44, 44, 9, accent);
            ctx.restore();
        });
        ctx.restore();
    }

    function drawCharacterEmblem(stemIdx, cx, cy, r) {
        const meta = STEM_META[stemIdx] || STEM_META[0];
        const col = EL_COLOR[meta.el] || INK;
        ctx.save();
        ctx.translate(cx, cy);

        // 후광 및 메달리온 배경
        const grad = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r * 1.15);
        grad.addColorStop(0, 'rgba(255, 250, 235, 0.92)');
        grad.addColorStop(0.7, 'rgba(239, 230, 210, 0.55)');
        grad.addColorStop(1, 'rgba(239, 230, 210, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
        ctx.fill();

        // 외곽 별빛 링
        ctx.strokeStyle = col;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(43,36,32,0.35)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, r - 10, 0, Math.PI * 2);
        ctx.stroke();

        // 좌우 별빛 장식
        drawSparkle(-r - 26, 0, 12, col);
        drawSparkle(r + 26, 0, 12, col);
        drawSparkle(-r - 50, -14, 6, '#9a7431');
        drawSparkle(r + 50, 14, 6, '#9a7431');

        // 10천간 자연물 캐릭터 심볼 일러스트
        ctx.strokeStyle = col;
        ctx.fillStyle = col;
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stemIdx === 0) {
            // 0: 갑목(큰 나무)
            ctx.fillRect(-7, 10, 14, 38);
            [[-22, -8, 24], [22, -8, 24], [0, -24, 30]].forEach(([x, y, cr]) => {
                ctx.beginPath(); ctx.arc(x, y, cr, 0, Math.PI * 2);
                ctx.globalAlpha = 0.22; ctx.fill();
                ctx.globalAlpha = 1; ctx.stroke();
            });
        } else if (stemIdx === 1) {
            // 1: 을목(풀과 꽃)
            ctx.beginPath();
            ctx.moveTo(0, 44); ctx.quadraticCurveTo(6, 15, 0, -6);
            ctx.moveTo(0, 28); ctx.quadraticCurveTo(-24, 16, -26, 4); ctx.quadraticCurveTo(-10, 6, 0, 28);
            ctx.moveTo(0, 22); ctx.quadraticCurveTo(24, 10, 26, -2); ctx.quadraticCurveTo(10, 0, 0, 22);
            ctx.stroke();
            for (let i = 0; i < 5; i++) {
                const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * 16, -18 + Math.sin(a) * 16, 10, 0, Math.PI * 2);
                ctx.globalAlpha = 0.22; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
            }
            ctx.beginPath(); ctx.arc(0, -18, 6, 0, Math.PI * 2); ctx.fill();
        } else if (stemIdx === 2) {
            // 2: 병화(밝은 태양)
            ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2);
            ctx.globalAlpha = 0.24; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
            for (let i = 0; i < 12; i++) {
                const a = (i * Math.PI) / 6;
                const r1 = 34, r2 = i % 2 === 0 ? 50 : 42;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
                ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
                ctx.stroke();
            }
        } else if (stemIdx === 3) {
            // 3: 정화(따뜻한 등불·별빛)
            ctx.beginPath();
            ctx.moveTo(0, -42);
            ctx.bezierCurveTo(26, -12, 24, 20, 0, 26);
            ctx.bezierCurveTo(-24, 20, -26, -12, 0, -42);
            ctx.globalAlpha = 0.24; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-22, 36); ctx.lineTo(22, 36);
            ctx.moveTo(-14, 45); ctx.lineTo(14, 45);
            ctx.stroke();
            drawSparkle(-32, -22, 8, col);
            drawSparkle(32, -16, 7, col);
        } else if (stemIdx === 4) {
            // 4: 무토(든든한 큰 산)
            ctx.beginPath();
            ctx.moveTo(-50, 34); ctx.lineTo(-12, -32); ctx.lineTo(24, 34);
            ctx.moveTo(-6, 34); ctx.lineTo(22, -14); ctx.lineTo(50, 34);
            ctx.closePath();
            ctx.globalAlpha = 0.2; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
            ctx.beginPath(); ctx.arc(28, -32, 9, 0, Math.PI * 2); ctx.stroke();
        } else if (stemIdx === 5) {
            // 5: 기토(기름진 정원과 새싹)
            ctx.beginPath();
            ctx.moveTo(0, 14); ctx.lineTo(0, -20);
            ctx.moveTo(0, -6); ctx.quadraticCurveTo(-24, -22, -22, -34); ctx.quadraticCurveTo(-4, -28, 0, -6);
            ctx.moveTo(0, -12); ctx.quadraticCurveTo(24, -28, 22, -40); ctx.quadraticCurveTo(4, -34, 0, -12);
            ctx.stroke();
            [-1, 1].forEach(dir => {
                ctx.beginPath();
                ctx.arc(dir * 22, 32, 28, Math.PI * 1.1, Math.PI * 1.9);
                ctx.stroke();
            });
        } else if (stemIdx === 6) {
            // 6: 경금(단단한 원석·바위)
            ctx.beginPath();
            ctx.moveTo(0, -44); ctx.lineTo(38, -16); ctx.lineTo(28, 34);
            ctx.lineTo(-28, 34); ctx.lineTo(-38, -16); ctx.closePath();
            ctx.globalAlpha = 0.2; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, -44); ctx.lineTo(0, 34);
            ctx.moveTo(-38, -16); ctx.lineTo(38, -16);
            ctx.stroke();
        } else if (stemIdx === 7) {
            // 7: 신금(빛나는 보석)
            ctx.beginPath();
            ctx.moveTo(-24, -30); ctx.lineTo(24, -30); ctx.lineTo(42, -8);
            ctx.lineTo(0, 42); ctx.lineTo(-42, -8); ctx.closePath();
            ctx.globalAlpha = 0.2; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-42, -8); ctx.lineTo(42, -8);
            ctx.moveTo(-24, -30); ctx.lineTo(-12, -8); ctx.lineTo(0, 42);
            ctx.moveTo(24, -30); ctx.lineTo(12, -8); ctx.lineTo(0, 42);
            ctx.stroke();
            drawSparkle(0, -48, 8, col);
        } else if (stemIdx === 8) {
            // 8: 임수(넓은 바다 물결)
            [-16, 6, 28].forEach((wy, idx) => {
                ctx.beginPath();
                ctx.moveTo(-44, wy);
                ctx.bezierCurveTo(-22, wy - 18, -6, wy + 18, 14, wy);
                ctx.bezierCurveTo(28, wy - 14, 36, wy + 10, 44, wy);
                ctx.lineWidth = 5 - idx * 0.6;
                ctx.stroke();
            });
            ctx.beginPath(); ctx.arc(0, -34, 8, 0, Math.PI * 2);
            ctx.globalAlpha = 0.25; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
        } else {
            // 9: 계수(맑은 이슬비)
            ctx.beginPath();
            ctx.moveTo(0, -42);
            ctx.bezierCurveTo(26, -6, 26, 20, 0, 24);
            ctx.bezierCurveTo(-26, 20, -26, -6, 0, -42);
            ctx.globalAlpha = 0.22; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(0, 36, 34, 8, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    function draw() {
        if (!ctx || !data) return;
        if (!paperTexture) paperTexture = makePaper();
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(paperTexture, 0, 0);

        const isTeacher = data.mode === 'teacher';
        const hasStem = typeof data.stemIdx === 'number' && STEM_META[data.stemIdx];
        const meta = hasStem ? STEM_META[data.stemIdx] : null;
        const accent = meta ? EL_COLOR[meta.el] : '#9a7431';

        // 테두리 (이중선) + 네 모서리 별빛 장식
        ctx.strokeStyle = INK;
        ctx.lineWidth = 6;
        ctx.strokeRect(50, 50, W - 100, H - 100);
        ctx.lineWidth = 2;
        ctx.strokeRect(68, 68, W - 136, H - 136);
        drawCornerOrnaments(accent);

        let y = 148;
        if (meta) {
            drawText(`✦ ${isTeacher ? '별빛 나침반' : '별빛 도감'} No.${meta.no} · ${meta.code} ${meta.label} ✦`, W / 2, y, {
                font: `700 28px ${SANS}`, color: accent
            });
            y += 68;
        } else {
            y = 190;
        }
        drawText('星 光 帖', W / 2, y, { font: `700 78px ${SERIF}` });
        y += 50;
        drawText(`${isTeacher ? '별빛 나침반' : '별빛 도감'} · ${data.dateLabel}`, W / 2, y, { font: `400 31px ${SERIF}`, color: '#6b5e52' });

        if (meta) {
            drawCharacterEmblem(data.stemIdx, W / 2, y + 114, 78);
            y += 242;
        } else {
            y += 80;
        }

        drawText(`${data.name} ${isTeacher ? '선생님' : '학생'}`, W / 2, y, { font: `700 54px ${SERIF}` });
        y += 48;
        drawText(data.subtitle, W / 2, y, { font: `400 30px ${SANS}`, color: '#6b5e52' });
        y += 40;

        // 사주 원국 (있을 때만)
        if (data.pillars) {
            y += 12;
            const cols = data.pillars.length;
            const cw = 146, gap = 22, total = cols * cw + (cols - 1) * gap;
            let x0 = (W - total) / 2;
            data.pillars.forEach((p, i) => {
                const cx = x0 + i * (cw + gap) + cw / 2;
                ctx.font = `400 25px ${SANS}`;
                ctx.fillStyle = '#6b5e52';
                ctx.textAlign = 'center';
                ctx.fillText(p.label, cx, y);
                [p.stem, p.branch].forEach((g, k) => {
                    const top = y + 16 + k * 130;
                    ctx.fillStyle = g ? EL_COLOR[g.el] : 'rgba(0,0,0,0.08)';
                    ctx.globalAlpha = g ? 0.14 : 1;
                    ctx.fillRect(cx - cw / 2, top, cw, 118);
                    ctx.globalAlpha = 1;
                    if (g) {
                        ctx.font = `700 78px ${SERIF}`;
                        ctx.fillStyle = EL_COLOR[g.el];
                        ctx.fillText(g.hanja, cx, top + 88);
                    } else {
                        ctx.font = `400 38px ${SERIF}`;
                        ctx.fillStyle = '#9a8e80';
                        ctx.fillText('?', cx, top + 74);
                    }
                    if (p.me && k === 0) {
                        ctx.strokeStyle = INK;
                        ctx.lineWidth = 4;
                        ctx.strokeRect(cx - cw / 2, top, cw, 118);
                    }
                });
            });
            y += 16 + 2 * 130 + 36;
            if (data.ilganLine) {
                drawText(data.ilganLine, W / 2, y, { font: `700 35px ${SERIF}`, color: accent });
                y += 34;
            }
        }

        hline(y);
        y += 74;

        // 오늘의 풀이
        if (data.dayTitle) {
            drawText(data.dayTitle, W / 2, y, { font: `700 46px ${SERIF}`, color: SEAL });
            y += 62;
        }
        y = drawText(data.text, W / 2, y, { font: `400 35px ${SANS}`, maxWidth: 820, lineHeight: 1.5, maxLines: 5 });
        y += 32;

        // 점수 막대
        const rows = isTeacher ? [
            ['소통', data.scores.love, '#c75b7a'],
            ['활력', data.scores.money, '#b8932c'],
            ['수업', data.scores.work, '#3f73a8']
        ] : [
            ['우정', data.scores.love, '#c75b7a'],
            ['탐구', data.scores.money, '#b8932c'],
            ['배움', data.scores.work, '#3f73a8']
        ];
        rows.forEach(([label, v, c]) => {
            ctx.font = `700 32px ${SANS}`;
            ctx.fillStyle = INK;
            ctx.textAlign = 'left';
            ctx.fillText(label, 170, y + 12);
            ctx.fillStyle = 'rgba(43,36,32,0.12)';
            ctx.fillRect(290, y - 10, 520, 24);
            ctx.fillStyle = c;
            ctx.fillRect(290, y - 10, 520 * v / 100, 24);
            ctx.fillStyle = INK;
            ctx.textAlign = 'right';
            ctx.fillText(String(v), 910, y + 12);
            y += 58;
        });
        y += 14;

        if (data.quote) {
            hline(y);
            y += 68;
            drawText(data.quote.hanmun, W / 2, y, { font: `700 40px ${SERIF}`, maxWidth: 820 });
            y += 52;
            drawText(data.quote.kor, W / 2, y, { font: `400 28px ${SANS}`, color: '#6b5e52', maxWidth: 800, maxLines: 2 });
        }

        // 낙관 및 도감 고유 해시태그·검색 워터마크
        const tag = meta && data.mbti ? `#${meta.code}-${data.mbti}` : (meta ? `#${meta.code}` : '');
        const wmText = `별빛 나침반 ${tag ? tag + ' · ' : ''}검색: 엽쌤 별빛 나침반 · © 2026 엽쌤`;
        drawText(wmText, 120, H - 115, { font: `400 24px ${SANS}`, color: '#8a7d70', align: 'left', maxWidth: 680, maxLines: 1 });
        drawSeal('星光', W - 190, H - 185, 118, -0.06, 0.92);

        // 사용자가 찍은 도장
        stamps.forEach(s => drawSeal(s.ch, s.x, s.y, 150, s.rot, 0.85));
    }

    async function render(newData) {
        data = newData;
        stamps = [];
        const sample = JSON.stringify(newData) + '0123456789우정탐구배움소통활력수업별빛나침반도감학생선생님';
        try {
            await Promise.all([
                document.fonts.load(`700 40px "Gowun Batang"`, sample),
                document.fonts.load(`400 40px "Gowun Batang"`, sample),
                document.fonts.load(`400 40px "Pretendard Variable"`, sample),
                document.fonts.load(`700 40px "Pretendard Variable"`, sample)
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
