export function windingCapacity(hubRadius, maxRadius) {
  // All tape must fit on either reel, rather than filling both to maximum.
  return Math.PI * (maxRadius ** 2 - hubRadius ** 2);
}
export function windingRadius(area, hubRadius) {
  return Math.sqrt(Math.max(area, 0) / Math.PI + hubRadius ** 2);
}
export function tapeTangentAngle(center, radius, guide, side, guideRadius) {
  const dx = guide.x - center.x, dz = guide.z - center.z;
  const distance = Math.hypot(dx, dz);
  const direction = Math.atan2(dz, dx);
  const offset = Math.acos(Math.max(-1, Math.min(1, (radius - guideRadius) / distance)));
  const leftNormal = Math.cos(direction - offset);
  return (side < 0 ? leftNormal < 0 : leftNormal > 0) ? direction - offset : direction + offset;
}
