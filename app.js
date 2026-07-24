import { supabase } from "./supabaseClient.js";
import { updateNavAvatar, setActiveNav } from "./ui.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderAddBook } from "./pages/addBook.js";
import { renderSellBook } from "./pages/sellBook.js";
import { renderMyBooks } from "./pages/myBooks.js";
import { renderCategories } from "./pages/categories.js";
import { renderSettings } from "./pages/settings.js";

const content = document.getElementById("content");

const routes = {
  "#/dashboard": { render: renderDashboard, protect: true },
  "#/add-book": { render: renderAddBook, protect: true },
  "#/sell": { render: renderSellBook, protect: true },
  "#/books": { render: renderMyBooks, protect: true },
  "#/categories": { render: renderCategories, protect: true },
  "#/settings": { render: renderSettings, protect: false },
};

async function router() {
  let hash = location.hash || "#/dashboard";
  if (!routes[hash]) hash = "#/dashboard";
  const route = routes[hash];

  setActiveNav(hash);

  if (route.protect) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="icon">🔒</div>
          پێویستە یەکەم جار بچیتە ژوورەوە بۆ ئەکاونتی ئەدمین.
          <div style="margin-top:14px;">
            <button class="btn btn-primary" onclick="location.hash='#/settings'">چوونەژوورەوە</button>
          </div>
        </div>`;
      return;
    }
  }

  content.innerHTML = `<div class="empty-state">چاوەڕوانبە...</div>`;
  route.render(content);
}

// nav clicks
document.querySelectorAll("[data-route]").forEach((el) => {
  el.addEventListener("click", () => {
    location.hash = el.dataset.route;
    document.getElementById("navLinks").classList.remove("open");
  });
});

document.getElementById("menuToggle")?.addEventListener("click", () => {
  document.getElementById("navLinks").classList.toggle("open");
});

window.addEventListener("hashchange", router);

supabase.auth.onAuthStateChange(() => {
  updateNavAvatar();
});

updateNavAvatar();
router();
