import { supabase } from "../supabaseClient.js";
import { toast, escapeHtml } from "../helpers.js";
import { updateNavAvatar } from "../ui.js";

export async function renderSettings(container) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    renderLogin(container);
    return;
  }

  const user = session.user;
  const { data: profile } = await supabase.from("admin_profile").select("*").eq("id", user.id).maybeSingle();

  container.innerHTML = `
    <h1 class="page-title">ئەکاونتی ئەدمین</h1>
    <p class="page-subtitle">زانیاری ئەکاونتەکەت بەڕێوە ببە</p>

    <div class="card" style="text-align:center; max-width:420px;">
      <div style="margin-bottom:16px;">
        <div id="avatarPreview" style="width:96px; height:96px; border-radius:50%; margin:0 auto; overflow:hidden; background:var(--accent-soft); display:flex; align-items:center; justify-content:center; border:1px solid var(--border);">
          ${profile?.avatar_url
            ? `<img src="${profile.avatar_url}" style="width:100%; height:100%; object-fit:cover;" />`
            : `<span style="font-size:34px;">👤</span>`}
        </div>
      </div>
      <input type="file" id="avatarInput" accept="image/*" style="display:none;" />
      <button class="btn btn-outline btn-sm" id="changeAvatarBtn">📷 گۆڕینی وێنەی ئەکاونت</button>

      <div class="field" style="margin-top:20px; text-align:right;">
        <label>ناوی پیشاندان</label>
        <input type="text" id="displayName" value="${escapeHtml(profile?.display_name || "")}" placeholder="ناوت بنووسە" />
      </div>
      <div class="field" style="text-align:right;">
        <label>ئیمەیل</label>
        <input type="text" value="${escapeHtml(user.email || "")}" disabled />
      </div>
      <button class="btn btn-primary" id="saveProfileBtn" style="width:100%;">💾 پاشەکەوتکردن</button>
      <button class="btn btn-danger" id="logoutBtn" style="width:100%; margin-top:10px;">🚪 چوونەدەرەوە</button>
    </div>

    <div class="card">
      <h3>زیادکردنی ئەدمینی نوێ</h3>
      <p style="font-size:13.5px; color:var(--muted); line-height:1.9;">
        بۆ زیادکردنی ئەدمینی نوێ، لە داشبۆردی Supabase بڕۆ بۆ
        <b>Authentication &gt; Users &gt; Add user</b> و ئیمەیل و وشەی نهێنی دابنێ.
        هەموو بەکارهێنەرێک کە لەوێ زیادبکرێت دەتوانێت بچێتە ژوورەوەی ئەم سیستەمە.
      </p>
    </div>
  `;

  const avatarInput = container.querySelector("#avatarInput");
  container.querySelector("#changeAvatarBtn").addEventListener("click", () => avatarInput.click());

  avatarInput.addEventListener("change", async () => {
    const file = avatarInput.files[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { toast("هەڵە: " + upErr.message, "error"); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase.from("admin_profile").upsert({ id: user.id, avatar_url: pub.publicUrl });
    if (error) { toast("هەڵە: " + error.message, "error"); return; }
    container.querySelector("#avatarPreview").innerHTML = `<img src="${pub.publicUrl}" style="width:100%; height:100%; object-fit:cover;" />`;
    toast("وێنەی ئەکاونت نوێکرایەوە ✅");
    updateNavAvatar();
  });

  container.querySelector("#saveProfileBtn").addEventListener("click", async () => {
    const display_name = container.querySelector("#displayName").value.trim();
    const { error } = await supabase.from("admin_profile").upsert({ id: user.id, display_name });
    if (error) { toast("هەڵە: " + error.message, "error"); return; }
    toast("زانیارییەکان پاشەکەوتکران ✅");
    updateNavAvatar();
  });

  container.querySelector("#logoutBtn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    toast("چوویتە دەرەوە");
    location.hash = "#/dashboard";
    location.reload();
  });
}

function renderLogin(container) {
  container.innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <div class="mark" style="width:52px; height:52px; border-radius:14px; margin:0 auto 16px; background:linear-gradient(135deg, var(--ink), var(--accent)); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800;">AS</div>
        <h2 style="margin:0 0 4px; color:var(--ink-strong);">چوونەژوورەوەی ئەدمین</h2>
        <p style="color:var(--muted); font-size:13.5px; margin:0 0 20px;">تەنها ئەدمینی کتێبخانە دەتوانێت بچێتە ژوورەوە</p>
        <form id="loginForm" style="text-align:right;">
          <div class="field">
            <label>ئیمەیل</label>
            <input type="email" id="loginEmail" required placeholder="admin@example.com" />
          </div>
          <div class="field">
            <label>وشەی نهێنی</label>
            <input type="password" id="loginPassword" required placeholder="••••••••" />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">چوونەژوورەوە</button>
        </form>
      </div>
    </div>
  `;

  container.querySelector("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = container.querySelector("#loginEmail").value.trim();
    const password = container.querySelector("#loginPassword").value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast("هەڵە لە چوونەژوورەوە: " + error.message, "error"); return; }
    toast("بەخێربێیت 👋");
    updateNavAvatar();
    location.hash = "#/dashboard";
  });
}
