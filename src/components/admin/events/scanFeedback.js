/*
 * Sound and vibration for the gate scanner, so door staff know the result
 * without reading the screen. Browsers only allow audio after a tap, so call
 * unlockScanAudio() from a click handler first.
 */

let ctx = null;

export const unlockScanAudio = () => {
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!ctx) ctx = new AC();
        if (ctx.state === 'suspended') ctx.resume();
    } catch { /* no audio on this device */ }
};

const tone = (freq, start, duration, type = 'sine', gain = 0.18) => {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.0001, ctx.currentTime + start);
    amp.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + start + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration + 0.02);
};

const PATTERNS = {
    good: { notes: [[880, 0, 0.09], [1320, 0.1, 0.14]], vibrate: [70] },
    warn: { notes: [[660, 0, 0.12], [660, 0.18, 0.12]], vibrate: [90, 70, 90] },
    bad: { notes: [[220, 0, 0.38, 'sawtooth', 0.12]], vibrate: [320, 90, 320] },
    info: { notes: [[520, 0, 0.12]], vibrate: [40] },
};

/** kind: good | warn | bad | info */
export const scanFeedback = (kind, { sound = true, vibrate = true } = {}) => {
    const p = PATTERNS[kind] || PATTERNS.info;
    if (vibrate) {
        try { navigator.vibrate?.(p.vibrate); } catch { /* not supported (iPhone) */ }
    }
    if (sound && ctx) {
        try { p.notes.forEach(([f, s, d, t, g]) => tone(f, s, d, t, g)); } catch { /* ignore */ }
    }
};
