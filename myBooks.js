import { supabase } from "../supabaseClient.js";
import { toast, money, escapeHtml } from "../helpers.js";
import { getCategories } from "./categories.js";

export async function renderMyBooks(container) {
  const cats = await getCategories();
  const catMap = Object.fromEntries(cats.map(c => [c.id, c.name]));

  container.innerHTML = `
    <h1 class="page-title">کتێبەکانم</h1>
    <p class="page-subtitle">هەموو کتێبەکانی زیادکراو، بگەڕێ و دەستکاریان بکە</p>

    <div class="searchbar">
      <input type="text" id="searchInput" placeholder="🔍 گەڕان بەدوای ناوی کتێب..." />
      <select id="catFilter">
        <option value="">هەموو جۆرەکان</option>
        ${cats.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}
      </select>
    </div>

    <div class="card" style="padding:8px 16px;">
      <div id="bookList">چاوەڕوانبە...</div>
    </div>
  `;

  const listEl = container.querySelector("#bookList");
  const searchInput = container.querySelector("#searchInput");
  const catFilter = container.querySelector("#catFilter");

  async function load() {
    listEl.innerHTML = "چاوەڕوانبە...";
    let query = supabase.from("books").select("*").order("created_at", { ascending: false });
    if (searchInput.value.trim()) query = query.ilike("title", `%${searchInput.value.trim()}%`);
    if (catFilter.value) query = query.eq("category_id", catFilter.value);
    const { data, error } = await query;
    if (error) { listEl.innerHTML = `<div class="empty-state">هەڵەیەک ڕوویدا</div>`; return; }
    renderList(data || []);
  }

  function renderList(books) {
    if (!books.length) {
      listEl.innerHTML = `<div class="empty-state"><div class="icon">📚</div>هیچ کتێبێک نەدۆزرایەوە</div>`;
      return;
    }
    listEl.innerHTML = books.map(b => bookRowHtml(b, catMap)).join("");

    books.forEach(b => {
      const row = listEl.querySelector(`[data-row="${b.id}"]`);
      row.querySelector("[data-edit]").addEventListener("click", () => enterEdit(row, b, cats));
    });
  }

  container.__reload = load;
  searchInput.addEventListener("input", debounce(load, 300));
  catFilter.addEventListener("change", load);
  load();
}

function bookRowHtml(b, catMap) {
  const catName = catMap[b.category_id] || "بێ جۆر";
  return `
    <div class="book-row" data-row="${b.id}">
      <img class="book-thumb" src="${b.image_url || placeholderImg()}" alt="" />
      <div style="flex:1;">
        <div class="book-title">${escapeHtml(b.title)}</div>
        <div class="book-meta"><span class="badge">${escapeHtml(catName)}</span></div>
      </div>
      <div class="book-prices">
        <div>فرۆش: <b>${money(b.sell_price)}</b></div>
        <div>جوملە: <b>${money(b.wholesale_price)}</b></div>
      </div>
      <button class="btn btn-outline btn-sm" data-edit>✏️ دەستکاری</button>
    </div>
  `;
}

function enterEdit(row, book, cats) {
  row.innerHTML = `
    <img class="book-thumb" src="${book.image_url || placeholderImg()}" alt="" />
    <div style="flex:1; display:flex; gap:8px; flex-wrap:wrap;">
      <input type="text" value="${escapeHtml(book.title)}" data-f="title" style="min-width:160px; flex:1;" />
      <select data-f="category_id" style="min-width:140px;">
        <option value="">بێ جۆر</option>
        ${cats.map(c => `<option value="${c.id}" ${c.id === book.category_id ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
      </select>
      <input type="number" value="${book.sell_price}" data-f="sell_price" style="width:110px;" placeholder="نرخی فرۆش" />
      <input type="number" value="${book.wholesale_price}" data-f="wholesale_price" style="width:110px;" placeholder="نرخی جوملە" />
    </div>
    <button class="btn btn-accent btn-sm" data-save>✅ پاشەکەوت</button>
    <button class="btn btn-outline btn-sm" data-cancel>گەڕانەوە</button>
  `;

  row.querySelector("[data-cancel]").addEventListener("click", () => {
    const container = row.closest("main");
    const reloadFn = container?.__reload;
    if (reloadFn) reloadFn(); else location.reload();
  });

  row.querySelector("[data-save]").addEventListener("click", async () => {
    const updates = {
      title: row.querySelector('[data-f="title"]').value.trim(),
      category_id: row.querySelector('[data-f="category_id"]').value || null,
      sell_price: Number(row.querySelector('[data-f="sell_price"]').value || 0),
      wholesale_price: Number(row.querySelector('[data-f="wholesale_price"]').value || 0),
    };
    const { error } = await supabase.from("books").update(updates).eq("id", book.id);
    if (error) { toast("هەڵە: " + error.message, "error"); return; }
    toast("گۆڕانکارییەکان پاشەکەوتکران ✅");
    const container = row.closest("main");
    const reloadFn = container?.__reload;
    if (reloadFn) reloadFn(); else location.reload();
  });
}

function placeholderImg() {
  return "data:image/svg+xml;utf8," + encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='52' height='68'>
      <rect width='52' height='68' rx='8' fill='#eaf1ff'/>
      <text x='26' y='38' font-size='22' text-anchor='middle' fill='#2f6feb'>📘</text>
    </svg>`);
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
