/**
 * Venue maps: the stage, the zones people buy (each linked to a ticket type)
 * and the facilities around them (bars, entry, washrooms), drawn on one
 * canvas. Pure data helpers shared by the buyer's map, the admin builder and
 * the ticket API. No DOM.
 *
 * Stored on the event as `venueMap`:
 *   { w: 1000, h: 700, background: { url, opacity, show }, elements: [...] }
 * Each element:
 *   { id, type: 'stage' | 'zone' | 'facility' | 'label',
 *     shape: 'rect' | 'ellipse', x, y, w, h, r (degrees), label,
 *     tierId (zones), kind (facilities) }
 * Coordinates are canvas units (the canvas is always 1000 wide).
 *
 * Events made before this have `venueLayout` (an image) with zones drawn on
 * it as % rectangles (`ticketCategories[].mapping`) or points (`coords`);
 * `eventVenueMap` turns those into the same shape, so one renderer shows both.
 */

export const MAP_W = 1000;
export const DEFAULT_MAP_H = 700;
export const MIN_SIZE = 24;

export const FACILITIES = [
    { kind: 'entry', label: 'Entry' },
    { kind: 'exit', label: 'Exit' },
    { kind: 'bar', label: 'Bar' },
    { kind: 'food', label: 'Food' },
    { kind: 'washroom', label: 'Washrooms' },
    { kind: 'merch', label: 'Merch' },
    { kind: 'console', label: 'Sound desk' },
    { kind: 'firstaid', label: 'First aid' },
    { kind: 'smoking', label: 'Smoking area' },
    { kind: 'lounge', label: 'Lounge' },
    { kind: 'cloakroom', label: 'Cloakroom' },
    { kind: 'parking', label: 'Parking' },
];
export const facilityLabel = (kind) => FACILITIES.find(f => f.kind === kind)?.label || 'Area';

export const ELEMENT_TYPES = ['stage', 'zone', 'facility', 'label'];

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const round1 = (n) => Math.round(n * 10) / 10;

export const newElementId = (prefix = 'el') => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** A clean element, inside the canvas, with sane sizes. Unknown types are dropped. */
export const normalizeElement = (el, h = DEFAULT_MAP_H) => {
    if (!el || !ELEMENT_TYPES.includes(el.type)) return null;
    const w = clamp(num(el.w, 120), MIN_SIZE, MAP_W);
    const height = clamp(num(el.h, 80), MIN_SIZE, h);
    const out = {
        id: String(el.id || newElementId()).slice(0, 40),
        type: el.type,
        shape: el.shape === 'ellipse' ? 'ellipse' : 'rect',
        x: round1(clamp(num(el.x), 0, MAP_W - w)),
        y: round1(clamp(num(el.y), 0, h - height)),
        w: round1(w),
        h: round1(height),
        r: round1(((num(el.r) % 360) + 360) % 360),
        label: String(el.label || '').slice(0, 40),
    };
    if (el.type === 'zone' && el.tierId) out.tierId = String(el.tierId).slice(0, 60);
    if (el.type === 'facility') out.kind = FACILITIES.some(f => f.kind === el.kind) ? el.kind : 'bar';
    return out;
};

/** A stored map, cleaned. Returns null when there's nothing to draw. */
export const normalizeVenueMap = (map) => {
    if (!map || typeof map !== 'object') return null;
    const h = clamp(Math.round(num(map.h, DEFAULT_MAP_H)), 300, 1600);
    const elements = (Array.isArray(map.elements) ? map.elements : [])
        .map(el => normalizeElement(el, h))
        .filter(Boolean)
        .slice(0, 120);
    const bg = map.background && /^https:\/\/\S+$/i.test(String(map.background.url || '')) ? {
        url: String(map.background.url),
        opacity: clamp(num(map.background.opacity, 1), 0.1, 1),
        show: map.background.show !== false,
    } : null;
    if (!elements.length && !bg) return null;
    return { w: MAP_W, h, ...(bg ? { background: bg } : {}), elements };
};

/** Old image + % rectangles → a venue map over that image. */
export const legacyVenueMap = (event) => {
    const url = String(event?.venueLayout || '');
    if (!/^https?:\/\//i.test(url)) return null;
    const cats = Array.isArray(event?.ticketCategories) ? event.ticketCategories : [];
    const h = DEFAULT_MAP_H;
    const elements = cats.filter(c => c.mapping || c.coords).map(c => {
        if (c.mapping) {
            return normalizeElement({
                id: `legacy_${c.id}`, type: 'zone', tierId: c.id, label: c.name,
                x: (num(c.mapping.x) / 100) * MAP_W, y: (num(c.mapping.y) / 100) * h,
                w: (num(c.mapping.width, 10) / 100) * MAP_W, h: (num(c.mapping.height, 10) / 100) * h,
            }, h);
        }
        return normalizeElement({
            id: `legacy_${c.id}`, type: 'zone', shape: 'ellipse', tierId: c.id, label: c.name,
            x: (num(c.coords.x) / 100) * MAP_W - 30, y: (num(c.coords.y) / 100) * h - 30, w: 60, h: 60,
        }, h);
    }).filter(Boolean);
    // The old image was shown at its own aspect; stretch it to the canvas.
    return { w: MAP_W, h, background: { url, opacity: 1, show: true, stretch: true }, elements, legacy: true };
};

/** The map to show for an event: its own, else one made from the old layout, else null. */
export const eventVenueMap = (event) => normalizeVenueMap(event?.venueMap) || legacyVenueMap(event);

/** Zones linked to ticket types that exist (so a deleted tier's zone shows as plain). */
export const mapZones = (map, tiers = []) => (map?.elements || [])
    .filter(el => el.type === 'zone')
    .map(el => ({ ...el, tier: tiers.find(t => t.id === el.tierId) || null }));

/** True when the map lets buyers pick at least one ticket type by tapping. */
export const mapHasPickableZones = (map, tiers = []) => mapZones(map, tiers).some(z => z.tier && !z.tier.hidden);

// ── starting layouts ─────────────────────────────────────────────────────────

const zone = (label, x, y, w, h, extra = {}) => ({ type: 'zone', label, x, y, w, h, ...extra });
const fac = (kind, x, y, w = 110, h = 56) => ({ type: 'facility', kind, label: facilityLabel(kind), x, y, w, h });

export const MAP_TEMPLATES = [
    {
        id: 'club',
        name: 'Club or house party',
        hint: 'DJ booth, dance floor, VIP and bar',
        h: 700,
        elements: [
            { type: 'stage', label: 'DJ booth', x: 380, y: 30, w: 240, h: 90 },
            zone('Dance floor', 150, 150, 700, 300),
            zone('VIP', 150, 470, 300, 140),
            fac('bar', 600, 480, 250, 70),
            fac('washroom', 600, 570, 170, 56),
            fac('entry', 830, 620, 140, 56),
        ],
    },
    {
        id: 'concert',
        name: 'Concert or festival',
        hint: 'Stage, fan pit, GA, VIP and a sound desk',
        h: 800,
        elements: [
            { type: 'stage', label: 'Stage', x: 300, y: 30, w: 400, h: 100 },
            zone('Fan pit', 300, 160, 400, 150),
            zone('General admission', 120, 330, 760, 230),
            zone('VIP', 20, 160, 250, 150),
            zone('VIP', 730, 160, 250, 150),
            fac('console', 440, 580, 120, 60),
            fac('bar', 40, 600, 200, 60),
            fac('food', 760, 600, 200, 60),
            fac('washroom', 40, 690, 160, 56),
            fac('entry', 420, 720, 160, 56),
        ],
    },
    {
        id: 'seated',
        name: 'Seated hall',
        hint: 'Stage with front, middle and back sections',
        h: 760,
        elements: [
            { type: 'stage', label: 'Stage', x: 250, y: 30, w: 500, h: 90 },
            zone('Platinum', 200, 160, 600, 130),
            zone('Gold', 150, 310, 700, 150),
            zone('Silver', 100, 480, 800, 150),
            fac('entry', 80, 670, 140, 56),
            fac('exit', 780, 670, 140, 56),
        ],
    },
    {
        id: 'blank',
        name: 'Blank canvas',
        hint: 'Start with just a stage',
        h: 700,
        elements: [{ type: 'stage', label: 'Stage', x: 350, y: 30, w: 300, h: 90 }],
    },
];

/**
 * A template as a map. Zones are linked to the event's ticket types in order
 * (first zone → first type), and a zone whose label matches a type's name
 * gets that type first.
 */
export const mapFromTemplate = (templateId, tiers = []) => {
    const tpl = MAP_TEMPLATES.find(t => t.id === templateId) || MAP_TEMPLATES[0];
    const free = [...tiers];
    const elements = tpl.elements.map(el => {
        const out = { ...el, id: newElementId(el.type) };
        if (el.type === 'zone') {
            const byName = free.findIndex(t => String(t.name).trim().toLowerCase() === el.label.toLowerCase());
            const pick = byName >= 0 ? free.splice(byName, 1)[0] : free.shift();
            if (pick) out.tierId = pick.id;
        }
        return out;
    });
    return normalizeVenueMap({ h: tpl.h, elements });
};

/** Colours for ticket types that have none, in order. */
export const TIER_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6', '#ec4899', '#eab308'];
export const tierColor = (tier, index = 0) => (/^#[0-9a-f]{3,8}$/i.test(String(tier?.color || '')) ? tier.color : TIER_COLORS[index % TIER_COLORS.length]);
