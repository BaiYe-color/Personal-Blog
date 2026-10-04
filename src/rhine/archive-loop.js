// RhineLabUI, MIT, copyright 2026 LBEILC.
import { archiveColumns, columnFiles, fileLocation } from "./data.js";
export const LOOP_COLUMNS = 9;
export const LOOP_ROWS = 32;
export const COLUMN_SPACING = 5.2;
export const ROW_SPACING = 0.62;
const POOL_LANES = [
    0,
    1,
    2,
    3,
    4,
    -2,
    -1,
    5,
    6
];
export function wrap(value, count) {
    return (value % count + count) % count;
}
export function nearestOccurrence(value, center, period) {
    return value + Math.floor((center - value + period / 2) / period) * period;
}
export function fileAtCell({ lane, row }) {
    const files = columnFiles(wrap(lane, archiveColumns.length));
    return files[wrap(row - 12, files.length)];
}
export function selectionCell(index, current, navigation) {
    if (navigation && "cell" in navigation) return {
        ...navigation.cell
    };
    const next = fileLocation(index);
    const row = nearestOccurrence(next.row, current.row, columnFiles(next.lane).length);
    if (navigation?.axis === "row") {
        return {
            lane: current.lane,
            row: current.row + navigation.direction
        };
    }
    return {
        lane: navigation?.axis === "lane" ? current.lane + navigation.direction : nearestOccurrence(next.lane, current.lane, archiveColumns.length),
        row
    };
}
export function poolCell(index) {
    return {
        lane: POOL_LANES[Math.floor(index / LOOP_ROWS)],
        row: index % LOOP_ROWS
    };
}
export function visibleCell(index, center) {
    return {
        lane: nearestOccurrence(POOL_LANES[Math.floor(index / LOOP_ROWS)], center.lane, LOOP_COLUMNS),
        row: nearestOccurrence(index % LOOP_ROWS, center.row, LOOP_ROWS)
    };
}
export function cellKey(cell) {
    return `${cell.lane}:${cell.row}`;
}
export function sameCell(a, b) {
    return a.lane === b.lane && a.row === b.row;
}
