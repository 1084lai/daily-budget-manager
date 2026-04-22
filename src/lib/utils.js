export const DAILY = 20;
export const KV_KEY = 'budget_v2';
export const TOKEN_KEY = 'budget_token';
export const API_LOAD = '/api/load';
export const API_SAVE = '/api/save';
export const API_EXPENSE = '/api/expense';
export const API_LOGIN = '/api/login';
export const API_REGISTER = '/api/register';
export const TAG_PALETTE = ['#e74c3c','#e67e22','#d4a017','#27ae60','#2980b9','#8e44ad','#16a085','#7f8c8d'];

export function todayKey() {
  return new Date().toISOString().split('T')[0];
}

export function fmt(n) {
  return '€' + Math.abs(n).toFixed(2).replace('.', ',');
}

export function fmtSigned(n) {
  return (n >= 0 ? '+' : '-') + fmt(n);
}

export function nowTime() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

export function dateLabel(dateStr, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('it-IT', opts);
}
