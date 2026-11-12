/*
 * "Share to story": a 1080×1920 picture of the giveaway with the person's
 * invite link, drawn on a canvas in the browser (nothing is uploaded). Shared
 * as a file where the phone allows it, downloaded otherwise.
 */

const W = 1080;
const H = 1920;

const loadImage = (src) => new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
});

const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
};

/* Words onto lines no wider than `max`; at most `lines` of them. */
const wrap = (ctx, text, max, lines = 3) => {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const out = [];
    let line = '';
    words.forEach((w) => {
        const next = line ? `${line} ${w}` : w;
        if (ctx.measureText(next).width > max && line) { out.push(line); line = w; } else line = next;
    });
    if (line) out.push(line);
    if (out.length > lines) {
        const kept = out.slice(0, lines);
        kept[lines - 1] = `${kept[lines - 1].replace(/\s+\S*$/, '')}…`;
        return kept;
    }
    return out;
};

const drawCover = (ctx, img, x, y, w, h) => {
    const s = Math.max(w / img.width, h / img.height);
    const dw = img.width * s;
    const dh = img.height * s;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
};

export const drawStoryCard = async ({ name, prize, posterUrl, url, points, ctaLabel = 'Enter with my link' }) => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    try { await document.fonts?.ready; } catch { /* fine */ }

    // Night sky with neon glows.
    ctx.fillStyle = '#07090d';
    ctx.fillRect(0, 0, W, H);
    [[180, 260, 620, 'rgba(57,255,20,0.30)'], [940, 1500, 700, 'rgba(255,79,139,0.26)'], [900, 300, 520, 'rgba(0,240,255,0.18)']].forEach(([x, y, r, c]) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, c);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    });

    // Poster in a rounded frame (skipped if the image can't be read).
    const poster = await loadImage(posterUrl);
    const px = 120;
    const py = 250;
    const pw = W - 240;
    const ph = 840;
    ctx.save();
    roundRect(ctx, px, py, pw, ph, 56);
    ctx.clip();
    if (poster) {
        try { drawCover(ctx, poster, px, py, pw, ph); } catch { /* tainted: leave the frame dark */ }
    } else {
        const g = ctx.createLinearGradient(px, py, px + pw, py + ph);
        g.addColorStop(0, '#1c2b14');
        g.addColorStop(1, '#2a0f1d');
        ctx.fillStyle = g;
        ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = 'rgba(57,255,20,0.9)';
        ctx.font = '900 220px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎁', W / 2, py + ph / 2 + 80);
    }
    ctx.restore();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, px, py, pw, ph, 56);
    ctx.stroke();

    // Top label.
    ctx.textAlign = 'center';
    ctx.fillStyle = '#39FF14';
    roundRect(ctx, W / 2 - 190, 120, 380, 84, 42);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = '900 40px Outfit, sans-serif';
    ctx.fillText('GIVEAWAY', W / 2, 177);

    // Title and prize.
    ctx.fillStyle = '#fff';
    ctx.font = '900 76px Outfit, sans-serif';
    const titleLines = wrap(ctx, name, W - 200, 3);
    let y = 1200;
    titleLines.forEach((l) => { ctx.fillText(l, W / 2, y); y += 86; });
    if (prize) {
        ctx.font = '800 50px Outfit, sans-serif';
        ctx.fillStyle = '#39FF14';
        ctx.fillText(`WIN ${String(prize).toUpperCase()}`, W / 2, y + 20);
        y += 70;
    }
    if (points) {
        ctx.font = '600 38px Inter, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(`I'm in with ${points} points. Beat me.`, W / 2, y + 40);
    }

    // The link pill.
    const pillY = 1650;
    ctx.fillStyle = '#fff';
    roundRect(ctx, 110, pillY, W - 220, 150, 75);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = '900 46px Outfit, sans-serif';
    ctx.fillText(ctaLabel.toUpperCase(), W / 2, pillY + 64);
    ctx.font = '600 32px Inter, sans-serif';
    ctx.fillStyle = '#333';
    const shown = String(url || '').replace(/^https?:\/\//, '');
    ctx.fillText(shown.length > 46 ? `${shown.slice(0, 45)}…` : shown, W / 2, pillY + 112);

    ctx.font = '800 34px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('newbi.live', W / 2, 1880);

    return new Promise((resolve) => {
        try { canvas.toBlob((b) => resolve(b), 'image/png'); } catch { resolve(null); }
    });
};

/* Share the card as a file, or download it. Returns 'shared' | 'downloaded' | 'failed'. */
export const shareStoryCard = async (opts) => {
    const blob = await drawStoryCard(opts);
    if (!blob) return 'failed';
    const file = new File([blob], 'newbi-giveaway.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: opts.name, text: opts.url });
            return 'shared';
        } catch (err) {
            if (err?.name === 'AbortError') return 'shared';
        }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'newbi-giveaway.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'downloaded';
};
