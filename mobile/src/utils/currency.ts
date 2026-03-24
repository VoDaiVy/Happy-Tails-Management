export function formatVnd(value?: number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")} VND`;
}

export function formatCompactVnd(value?: number | null) {
  const amount = Number(value || 0);
  const abs = Math.abs(amount);

  if (abs >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)}B VND`;
  }

  if (abs >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M VND`;
  }

  if (abs >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K VND`;
  }

  return formatVnd(amount);
}
