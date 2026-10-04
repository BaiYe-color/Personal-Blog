// Blog bridge for the original renderer. A multi-category article has a scene
// record in each matching lane; its visible file number remains stable.
export let records = [], archiveColumns = [], rowPeriod = 1;
const wrap = (value, count) => ((value % count) + count) % count;
export function configureArticles(columns, numbers) {
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  rowPeriod = columns.reduce((period, column) => period * column.posts.length / gcd(period, column.posts.length), 1);
  archiveColumns = columns.map((_, lane) => columns[wrap(lane - 2, columns.length)].slug);
  records = archiveColumns.flatMap(category => columns.find(column => column.slug === category).posts.map(post => ({
    category, slug: post.slug, number: numbers[post.slug],
  })));
}
export function columnFiles(lane) {
  const category = archiveColumns[wrap(lane, archiveColumns.length)];
  return records.flatMap((record, index) => record.category === category ? [index] : []);
}
export function fileLocation(index) {
  const lane = archiveColumns.indexOf(records[index].category);
  const row = 12 + columnFiles(lane).indexOf(index);
  return { lane, row, slot: lane * 32 + row };
}
export function fileAtSlot(slot) {
  const files = columnFiles(Math.floor(slot / 32));
  return files[Math.max(0, Math.min(files.length - 1, (slot % 32) - 12))];
}
export function fileNumber(index) { return records[index]?.number || '000'; }
export function indexAtCell(cell) {
  const files = columnFiles(cell.lane);
  return files[wrap(cell.row - 12, files.length)];
}
