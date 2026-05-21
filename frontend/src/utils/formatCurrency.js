export default function formatCurrency(amount) {
  const num = parseFloat(amount || 0);
  return new Intl.NumberFormat('ar-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num).replace('د.ج.', '').trim() + ' د.ج';
}
