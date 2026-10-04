// Preserve the original materials; spend fewer pixels on their render passes.
export const archiveQuality = [85, 70, 55].map(scale => ({
  scale, pixelRatio: 1, antialias: 'off', shadows: 1024,
  aoSamples: 16, aoResolution: .5, depthOfField: 85,
  transmission: .5, anisotropy: 4,
}));
export class ArchiveFrameBudget {
  level = 0;
  reset() { this.count = 0; this.total = 0; }
  constructor() { this.reset(); }
  sample(milliseconds) {
    if (milliseconds <= 0 || milliseconds > 250) return false;
    this.total += milliseconds; this.count++;
    if (this.count < 30) return false;
    const slow = this.total / this.count > 28;
    this.reset();
    if (!slow || this.level >= archiveQuality.length - 1) return false;
    this.level++;
    return true;
  }
}
