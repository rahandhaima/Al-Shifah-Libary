import { supabase } from "./supabaseClient.js";

export async function updateNavAvatar() {
  const navAvatar = document.getElementById("navAvatar");
  if (!navAvatar) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    navAvatar.innerHTML = "؟";
    return;
  }
  const { data: profile } = await supabase
    .from("admin_profile")
    .select("avatar_url, display_name")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profile?.avatar_url) {
    navAvatar.innerHTML = `<img src="${profile.avatar_url}" alt="ئەدمین" />`;
  } else {
    navAvatar.innerHTML = (profile?.display_name?.[0] || session.user.email?.[0] || "A").toUpperCase();
  }
}

export function setActiveNav(route) {
  document.querySelectorAll(".nav-link[data-route]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.route === route);
  });
}
