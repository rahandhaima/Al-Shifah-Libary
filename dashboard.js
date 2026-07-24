import { supabase } from "../supabaseClient.js";
import { money, monthRange } from "../helpers.js";

export async function renderDashboard(container) {
  container.innerHTML = `
    <h1 class="page-title">سەرەتا</h1>
    <p class="page-subtitle">پوختەیەکی گشتی لە بارودۆخی کتێبخانەکەت ئەم مانگە</p>
    <div class="stat-grid" id="statGrid">
      ${skeletonCards()}
    </div>
    <div class="card">
      <h3>بەخێربێیت 👋</h3>
      <p style="color:var(--muted); font-size:14.5px; line-height:1.9;">
        لە پەڕەی «زیادکردنی کتێب» کتێبی نوێ زیاد بکە، لە پەڕەی «فرۆشتنی کتێب» فرۆشتن تۆمار بکە،
        و لە پەڕەی «کتێبەکانم» هەموو کتێبەکانت ببینە و دەستکاریان بکە.
      </p>
    </div>
  `;

  const { start, end } = monthRange();
  const startDate = start.slice(0, 10);
  const endDate = end.slice(0, 10);

  const [{ count: booksAdded }, salesRes] = await Promise.all([
    supabase.from("books").select("id", { count: "exact", head: true })
      .gte("created_at", start).lt("created_at", end),
    supabase.from("sales").select("quantity, profit, wholesale_price")
      .gte("sale_date", startDate).lt("sale_date", endDate),
  ]);

  const sales = salesRes.data || [];
  const soldQty = sales.reduce((a, s) => a + Number(s.quantity || 0), 0);
  const profit = sales.reduce((a, s) => a + Number(s.profit || 0), 0);
  const wholesaleTotal = sales.reduce((a, s) => a + Number(s.quantity || 0) * Number(s.wholesale_price || 0), 0);

  const grid = container.querySelector("#statGrid");
  grid.innerHTML = `
    ${statCard("📚", "کتێبی زیادکراو ئەم مانگە", booksAdded ?? 0)}
    ${statCard("🧾", "کتێبی فرۆشراو ئەم مانگە", soldQty)}
    ${statCard("💰", "قازانجی مانگانە", money(profit))}
    ${statCard("📦", "کۆی نرخی جوملە (فرۆشراو)", money(wholesaleTotal))}
  `;
}

function statCard(icon, label, value) {
  return `
    <div class="stat-card">
      <div class="icon">${icon}</div>
      <div class="label">${label}</div>
      <div class="value">${value}</div>
    </div>
  `;
}

function skeletonCards() {
  return Array.from({ length: 4 }).map(() => `
    <div class="stat-card">
      <div class="icon">⏳</div>
      <div class="label">چاوەڕوانبە...</div>
      <div class="value">—</div>
    </div>
  `).join("");
}
