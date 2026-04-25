const SUPABASE_URL = "https://qyhughffiwuwtswkkbmy.supabase.co";
// Supabase 新版控制台展示的是 publishable key，前端可直接用于 createClient。
const SUPABASE_ANON_KEY = "sb_publishable_SlE2txIpOi4XrBqYvyA_ZA_yabsl-c_";

let supabaseClient;

export function getSupabaseClient() {
  if (SUPABASE_URL === "YOUR_SUPABASE_URL" || SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY") {
    throw new Error("请先在 js/supabase.js 中填入 Supabase 项目的 URL 和 anon key。");
  }

  if (!window.supabase?.createClient) {
    throw new Error("Supabase SDK 未加载成功，请检查网络或 CDN 地址。");
  }

  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  return supabaseClient;
}

export async function getSession() {
  const supabase = getSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}

export async function signInWithPassword(email, password) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export function onAuthStateChange(callback) {
  const supabase = getSupabaseClient();
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}
