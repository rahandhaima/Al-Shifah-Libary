import { supabase } from "../supabaseClient.js";
import { toast, escapeHtml } from "../helpers.js";

export async function getCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function renderCategories(container) {
  container.innerHTML = `
    <h1 class="page-title">جۆرەکانی کتێب</h1>
    <p class="page-subtitle">جۆرەکان زیاد بکە بۆ ئەوەی لە کاتی زیادکردنی کتێب هەڵیانبژێریت</p>

    <div class="card">
      <h3>زیادکردنی جۆری نوێ</h3>
      <form id="catForm" class="row-inline">
        <div class="field" style="flex:1; margin-bottom:0;">
          <label>ناوی جۆر</label>
          <input type="text" id="catName" placeholder="بۆ نموونە: ئاینی، مانگابوک، ڕۆمان" required />
        </div>
        <button class="btn btn-accent" type="submit">➕ زیادکردن</button>
      </form>
    </div>

    <div class="card">
      <h3>جۆرەکانی هەیە</h3>
      <div id="catList">چاوەڕوانبە...</div>
    </div>
  `;

  const list = container.querySelector("#catList");

  async function refresh() {
    const cats = await getCategories();
    if (!cats.length) {
      list.innerHTML = `<div class="empty-state"><div class="icon">🗂️</div>هیچ جۆرێک زیاد نەکراوە</div>`;
      return;
    }
    list.innerHTML = `
      <table>
        <thead><tr><th>ناوی جۆر</th><th></th></tr></thead>
        <tbody>
          ${cats.map(c => `
            <tr>
              <td>${escapeHtml(c.name)}</td>
              <td style="text-align:left;"><button class="btn btn-sm btn-danger" data-del="${c.id}">سڕینەوە</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    list.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("دڵنیایت لە سڕینەوەی ئەم جۆرە؟")) return;
        const { error } = await supabase.from("categories").delete().eq("id", btn.dataset.del);
        if (error) toast("هەڵەیەک ڕوویدا: " + error.message, "error");
        else { toast("جۆرەکە سڕایەوە"); refresh(); }
      });
    });
  }

  container.querySelector("#catForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = container.querySelector("#catName").value.trim();
    if (!name) return;
    const { error } = await supabase.from("categories").insert({ name });
    if (error) toast("هەڵەیەک ڕوویدا: " + error.message, "error");
    else {
      toast("جۆری نوێ زیادکرا ✅");
      container.querySelector("#catName").value = "";
      refresh();
    }
  });

  refresh();
}
