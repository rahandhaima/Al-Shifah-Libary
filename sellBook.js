import { supabase } from "../supabaseClient.js";
import { toast, money, monthRange, todayStr, escapeHtml } from "../helpers.js";

let selectedBook = null;

export async function renderSellBook(container) {
  container.innerHTML = `
    <h1 class="page-title">فرۆشتنی کتێب</h1>
    <p class="page-subtitle">بگەڕێ بۆ کتێبەکە و فرۆشتنەکە تۆمار بکە</p>

    <div class="card">
      <div class="field search-wrap">
        <label>گەڕان بەدوای کتێب</label>
        <input type="text" id="searchInput" placeholder="ناوی کتێبەکە بنووسە..." autocomplete="off" />
        <div id="searchResults" class="search-results" style="display:none;"></div>
      </div>

      <div id="selectedBox"></div>

      <form id="sellForm" style="display:none; margin-top:14px;">
        <div class="form-grid">
          <div class="field">
            <label>بڕی فرۆش</label>
            <input type="number" id="qty" min="1" value="1" required />
          </div>
          <div class="field">
            <label>کۆی نرخ</label>
            <input type="text" id="totalPreview" disabled />
          </div>
        </div>
        <button class="btn btn-primary" type="submit">✅ تۆمارکردنی فرۆشتن</button>
      </form>
    </div>

    <div class="card">
      <h3>فرۆشراوەکانی ئەمڕۆ (${todayStr()})</h3>
      <div id="dailyList">چاوەڕوانبە...</div>
    </div>

    <div class="card">
      <h3>ڕاپۆرتی مانگانە</h3>
      <div id="monthlyReport">چاوەڕوانبە...</div>
    </div>
  `;

  selectedBook = null;
  const searchInput = container.querySelector("#searchInput");
  const searchResults = container.querySelector("#searchResults");
  const selectedBox = container.querySelector("#selectedBox");
  const sellForm = container.querySelector("#sellForm");
  const qtyInput = container.querySelector("#qty");
  const totalPreview = container.querySelector("#totalPreview");

  searchInput.addEventListener("input", debounce(async () => {
    const term = searchInput.value.trim();
    if (!term) { searchResults.style.display = "none"; return; }
    const { data } = await supabase.from("books").select("*").ilike("title", `%${term}%`).limit(8);
    if (!data || !data.length) {
      searchResults.innerHTML = `<div class="search-result-item">هیچ کتێبێک نەدۆزرایەوە</div>`;
      searchResults.style.display = "block";
      return;
    }
    searchResults.innerHTML = data.map(b => `
      <div class="search-result-item" data-id="${b.id}">
        <img class="book-thumb" style="width:34px;height:44px;" src="${b.image_url || ""}" onerror="this.style.visibility='hidden'" />
        <div>
          <div style="font-weight:700; font-size:13.5px;">${escapeHtml(b.title)}</div>
          <div style="font-size:12px; color:var(--muted);">فرۆش: ${money(b.sell_price)}</div>
        </div>
      </div>
    `).join("");
    searchResults.style.display = "block";
    searchResults.querySelectorAll("[data-id]").forEach(el => {
      el.addEventListener("click", () => {
        const book = data.find(x => x.id === el.dataset.id);
        selectBook(book);
      });
    });
  }, 300));

  function selectBook(book) {
    selectedBook = book;
    searchResults.style.display = "none";
    searchInput.value = book.title;
    selectedBox.innerHTML = `
      <div class="selected-book-box">
        <img class="book-thumb" src="${book.image_url || ""}" onerror="this.style.visibility='hidden'" />
        <div>
          <div class="book-title">${escapeHtml(book.title)}</div>
          <div class="book-meta">نرخی فرۆش: <b>${money(book.sell_price)}</b> &nbsp;|&nbsp; نرخی جوملە: <b>${money(book.wholesale_price)}</b></div>
        </div>
      </div>
    `;
    sellForm.style.display = "block";
    updateTotal();
  }

  function updateTotal() {
    if (!selectedBook) return;
    const qty = Number(qtyInput.value || 0);
    totalPreview.value = money(qty * Number(selectedBook.sell_price || 0));
  }
  qtyInput.addEventListener("input", updateTotal);

  sellForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selectedBook) return;
    const qty = Number(qtyInput.value || 1);
    const { error } = await supabase.from("sales").insert({
      book_id: selectedBook.id,
      book_title: selectedBook.title,
      quantity: qty,
      sell_price: selectedBook.sell_price,
      wholesale_price: selectedBook.wholesale_price,
      sale_date: todayStr(),
    });
    if (error) { toast("هەڵە: " + error.message, "error"); return; }
    toast("فرۆشتنەکە تۆمارکرا ✅");
    selectedBook = null;
    searchInput.value = "";
    selectedBox.innerHTML = "";
    sellForm.style.display = "none";
    loadDaily();
    loadMonthly();
  });

  const dailyList = container.querySelector("#dailyList");
  async function loadDaily() {
    const { data } = await supabase.from("sales").select("*")
      .eq("sale_date", todayStr()).order("created_at", { ascending: false });
    if (!data || !data.length) {
      dailyList.innerHTML = `<div class="empty-state">هێشتا هیچ فرۆشتنێک ئەمڕۆ تۆمار نەکراوە</div>`;
      return;
    }
    const totalToday = data.reduce((a, s) => a + Number(s.total), 0);
    dailyList.innerHTML = `
      <table>
        <thead><tr><th>کتێب</th><th>بڕ</th><th>کۆی نرخ</th></tr></thead>
        <tbody>
          ${data.map(s => `<tr><td>${escapeHtml(s.book_title)}</td><td>${s.quantity}</td><td>${money(s.total)}</td></tr>`).join("")}
        </tbody>
      </table>
      <p style="text-align:left; font-weight:700; margin-top:10px;">کۆی گشتی ئەمڕۆ: ${money(totalToday)}</p>
    `;
  }

  const monthlyReport = container.querySelector("#monthlyReport");
  async function loadMonthly() {
    const { start, end } = monthRange();
    const { data } = await supabase.from("sales").select("*")
      .gte("sale_date", start.slice(0, 10)).lt("sale_date", end.slice(0, 10));
    if (!data || !data.length) {
      monthlyReport.innerHTML = `<div class="empty-state">هێشتا هیچ فرۆشتنێک ئەم مانگە تۆمار نەکراوە</div>`;
      return;
    }
    const byBook = {};
    let totalRevenue = 0, totalProfit = 0, totalQty = 0;
    data.forEach(s => {
      byBook[s.book_title] ??= { qty: 0, revenue: 0 };
      byBook[s.book_title].qty += s.quantity;
      byBook[s.book_title].revenue += Number(s.total);
      totalRevenue += Number(s.total);
      totalProfit += Number(s.profit);
      totalQty += s.quantity;
    });
    monthlyReport.innerHTML = `
      <table>
        <thead><tr><th>کتێب</th><th>بڕی فرۆشراو</th><th>کۆی داهات</th></tr></thead>
        <tbody>
          ${Object.entries(byBook).map(([title, v]) => `
            <tr><td>${escapeHtml(title)}</td><td>${v.qty}</td><td>${money(v.revenue)}</td></tr>
          `).join("")}
        </tbody>
      </table>
      <div style="display:flex; gap:24px; margin-top:14px; flex-wrap:wrap;">
        <div><span class="badge">کۆی فرۆشراو: ${totalQty}</span></div>
        <div><span class="badge">کۆی داهات: ${money(totalRevenue)}</span></div>
        <div><span class="badge">کۆی قازانج: ${money(totalProfit)}</span></div>
      </div>
    `;
  }

  loadDaily();
  loadMonthly();

  document.addEventListener("click", (e) => {
    if (!searchResults.contains(e.target) && e.target !== searchInput) {
      searchResults.style.display = "none";
    }
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
