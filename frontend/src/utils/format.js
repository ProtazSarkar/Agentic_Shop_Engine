export function formatCurrency(amount) {
  const num = Number(amount);
  if (Number.isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

export function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return String(isoString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function getStockMeta(stock) {
  const count = Number(stock) || 0;
  if (count <= 0) {
    return { label: 'Out of stock', tone: 'danger', available: false };
  }
  if (count <= 7) {
    return { label: `Only ${count} left`, tone: 'warning', available: true };
  }
  return { label: `In stock (${count} ready)`, tone: 'success', available: true };
}

