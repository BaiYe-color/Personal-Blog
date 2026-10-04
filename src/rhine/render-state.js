// RhineLabUI, MIT, copyright 2026 LBEILC.
export class RenderState {
    values = [];
    cursor = 0;
    changed = true;
    begin() {
        this.cursor = 0;
    }
    add(...values) {
        for (const value of values){
            if (this.values[this.cursor] !== value) this.changed = true;
            this.values[this.cursor++] = value;
        }
    }
    floats(...values) {
        this.add(...values.map((value)=>value === undefined ? undefined : Math.fround(value)));
    }
    end() {
        const changed = this.changed || this.values.length !== this.cursor;
        this.values.length = this.cursor;
        this.changed = false;
        return changed;
    }
    invalidate() {
        this.changed = true;
    }
}
