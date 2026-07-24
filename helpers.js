export function toast(msg, type = "ok") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = type === "error" ? "show error" : "show";
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => { el.className = ""; }, 2600);
}

export function money(n) {
  const num = Number(n || 0);
  return num.toLocaleString("en-US", { maximumFractionDigits: 0 }) + " د.ع";
}

export function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
