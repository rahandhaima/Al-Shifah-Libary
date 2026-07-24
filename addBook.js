import { supabase } from "../supabaseClient.js";
import { toast, escapeHtml } from "../helpers.js";
import { getCategories } from "./categories.js";

let selectedFile = null;

export async function renderAddBook(container) {
  const cats = await getCategories();

  container.innerHTML = `
    <h1 class="page-title">زیادکردنی کتێب</h1>
    <p class="page-subtitle">زانیاری کتێبی نوێ پڕ بکەرەوە</p>

    <div class="card">
      <form id="bookForm">
        <div class="form-grid">
          <div class="field">
            <label>ناوی کتێب</label>
            <input type="text" id="title" required placeholder="ناوی کتێبەکە بنووسە" />
          </div>

          <div class="field">
            <label>جۆری کتێب</label>
            <div class="row-inline" style="align-items:center;">
              <select id="categorySelect" style="flex:1;">
                <option value="">-- هەڵبژاردنی جۆر --</option>
                ${cats.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}
              </select>
              <button type="button" class="btn btn-outline btn-sm" id="quickAddCat">➕ جۆری نوێ</button>
            </div>
            <div class="hint">ئەگەر جۆرەکە بوونی نییە، لێرەوە بە خێرایی زیادی بکە</div>
          </div>

          <div class="field">
            <label>نرخی فرۆش (تاک)</label>
            <input type="number" id="sellPrice" min="0" step="250" required placeholder="0" />
          </div>

          <div class="field">
            <label>نرخی جوملە</label>
            <input type="number" id="wholesalePrice" min="0" step="250" required placeholder="0" />
          </div>

          <div class="field">
            <label>بڕی کتێب (کۆگا)</label>
            <input type="number" id="quantity" value="999" required />
            <div class="hint">بەشێوەی خۆکار ٩٩٩ دادەنرێت، دەتوانیت بیگۆڕیت</div>
          </div>
        </div>

        <div class="field">
          <label>وێنەی کتێب</label>
          <div class="file-drop" id="dropZone">
            <div id="dropContent">📷 کرتە بکە بۆ هەڵبژاردنی وێنە لە کۆمپیوتەرەکەت</div>
          </div>
          <input type="file" id="imageInput" accept="image/*" style="display:none;" />
        </div>

        <button type="submit" class="btn btn-primary" id="submitBtn" style="margin-top:10px;">
          💾 پاشەکەوتکردنی کتێب
        </button>
      </form>
    </div>

    <!-- Quick add category modal (inline) -->
    <div id="quickCatCard" class="card" style="display:none;">
      <h3>زیادکردنی جۆری نوێ</h3>
      <div class="row-inline">
        <input type="text" id="quickCatName" placeholder="ناوی جۆر" style="flex:1;" />
        <button class="btn btn-accent btn-sm" id="quickCatSave">زیادکردن</button>
        <button class="btn btn-outline btn-sm" id="quickCatCancel">پاشگەزبوونەوە</button>
      </div>
    </div>
  `;

  selectedFile = null;

  const dropZone = container.querySelector("#dropZone");
  const imageInput = container.querySelector("#imageInput");
  const dropContent = container.querySelector("#dropContent");

  dropZone.addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      dropContent.innerHTML = `<img src="${e.target.result}" alt="پێشبینین" /><div>${escapeHtml(file.name)}</div>`;
    };
    reader.readAsDataURL(file);
  });

  // quick add category
  const quickBtn = container.querySelector("#quickAddCat");
  const quickCard = container.querySelector("#quickCatCard");
  quickBtn.addEventListener("click", () => {
    quickCard.style.display = quickCard.style.display === "none" ? "block" : "none";
  });
  container.querySelector("#quickCatCancel").addEventListener("click", () => {
    quickCard.style.display = "none";
  });
  container.querySelector("#quickCatSave").addEventListener("click", async () => {
    const name = container.querySelector("#quickCatName").value.trim();
    if (!name) return;
    const { data, error } = await supabase.from("categories").insert({ name }).select().single();
    if (error) { toast("هەڵە: " + error.message, "error"); return; }
    const select = container.querySelector("#categorySelect");
    const opt = document.createElement("option");
    opt.value = data.id;
    opt.textContent = data.name;
    opt.selected = true;
    select.appendChild(opt);
    container.querySelector("#quickCatName").value = "";
    quickCard.style.display = "none";
    toast("جۆرەکە زیادکرا ✅");
  });

  container.querySelector("#bookForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = container.querySelector("#submitBtn");
    submitBtn.disabled = true;
    submitBtn.textContent = "چاوەڕوانبە...";

    try {
      let imageUrl = null;
      if (selectedFile) {
        const ext = selectedFile.name.split(".").pop();
        const path = `books/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("book-images").upload(path, selectedFile);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("book-images").getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }

      const payload = {
        title: container.querySelector("#title").value.trim(),
        category_id: container.querySelector("#categorySelect").value || null,
        sell_price: Number(container.querySelector("#sellPrice").value || 0),
        wholesale_price: Number(container.querySelector("#wholesalePrice").value || 0),
        quantity: Number(container.querySelector("#quantity").value || 999),
        image_url: imageUrl,
      };

      const { error } = await supabase.from("books").insert(payload);
      if (error) throw error;

      toast("کتێبەکە بە سەرکەوتوویی زیادکرا ✅");
      renderAddBook(container);
    } catch (err) {
      toast("هەڵەیەک ڕوویدا: " + err.message, "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "💾 پاشەکەوتکردنی کتێب";
    }
  });
}
