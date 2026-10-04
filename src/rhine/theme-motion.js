// RhineLabUI, MIT, copyright 2026 LBEILC.
const key = (cell)=>`${cell.lane}:${cell.row}`;
const ease = (t)=>{
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
};
export class ThemeWave {
    target = 0;
    start = -10;
    origin = {
        row: 12,
        lane: 2
    };
    from = new Map();
    latest = new Map();
    backgroundFrom = 0;
    set(dark, time, origin, immediate = false) {
        const target = dark ? 1 : 0;
        if (target === this.target && !immediate) return;
        this.backgroundFrom = immediate ? target : this.background(time);
        this.from = immediate ? new Map() : new Map(this.latest);
        this.target = target;
        this.start = immediate ? time - 10 : time;
        this.origin = {
            ...origin
        };
    }
    background(time) {
        return this.backgroundFrom + (this.target - this.backgroundFrom) * ease((time - this.start) / .85);
    }
    beginFrame() {
        this.latest.clear();
    }
    sample(cell, time) {
        const delay = Math.min(.6, Math.abs(cell.row - this.origin.row) * .034 + Math.abs(cell.lane - this.origin.lane) * .11);
        const from = this.from.get(key(cell)) ?? this.backgroundFrom;
        const value = from + (this.target - from) * ease((time - this.start - delay) / .58);
        this.latest.set(key(cell), value);
        return value;
    }
}
