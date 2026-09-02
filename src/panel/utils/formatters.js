/**
 * Format megabytes to readable gigabytes
 * e.g., 4096 -> '4 GB', 1536 -> '1.5 GB'
 */
export const formatMbToGb = (mb) => {
  if (mb === undefined || mb === null) return '0 GB';
  const gb = Number(mb) / 1024;
  return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`;
};

export default {
  formatMbToGb,
};
