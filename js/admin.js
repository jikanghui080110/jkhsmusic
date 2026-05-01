import {
  getSession,
  getSupabaseClient,
  onAuthStateChange,
  signInWithPassword,
  signOut,
} from "./supabase.js";

const loginForm = document.querySelector("#login-form");
const loginStatus = document.querySelector("#login-status");
const authPanel = document.querySelector("#auth-panel");
const adminApp = document.querySelector("#admin-app");
const sessionEmail = document.querySelector("#session-email");
const logoutButton = document.querySelector("#logout-button");
const newSongButton = document.querySelector("#new-song-button");
const songForm = document.querySelector("#song-form");
const editorTitle = document.querySelector("#editor-title");
const editorStatus = document.querySelector("#editor-status");
const adminSongList = document.querySelector("#admin-song-list");
const resetButton = document.querySelector("#reset-button");

const fields = {
  id: document.querySelector("#song-id"),
  title: document.querySelector("#song-title"),
  artist: document.querySelector("#song-artist"),
  melody_score: document.querySelector("#melody-score"),
  structure_score: document.querySelector("#structure-score"),
  timbre_score: document.querySelector("#timbre-score"),
  emotion_score: document.querySelector("#emotion-score"),
  relisten_score: document.querySelector("#relisten-score"),
  review: document.querySelector("#song-review"),
};

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function setLoginStatus(message) {
  loginStatus.textContent = message;
}

function setEditorStatus(message) {
  editorStatus.textContent = message;
}

function setAdminVisible(session) {
  const loggedIn = Boolean(session);
  authPanel.classList.toggle("is-hidden", loggedIn);
  adminApp.classList.toggle("is-hidden", !loggedIn);
  sessionEmail.textContent = session?.user?.email ? `当前账号：${session.user.email}` : "";
}

function resetForm() {
  songForm.reset();
  fields.id.value = "";
  editorTitle.textContent = "新建歌曲";
  setEditorStatus("");
}

function fillForm(song) {
  fields.id.value = song.id;
  fields.title.value = song.title ?? "";
  fields.artist.value = song.artist ?? "";
  fields.melody_score.value = song.melody_score ?? 1;
  fields.structure_score.value = song.structure_score ?? 1;
  fields.timbre_score.value = song.timbre_score ?? 1;
  fields.emotion_score.value = song.emotion_score ?? 1;
  fields.relisten_score.value = song.relisten_score ?? 1;
  fields.review.value = song.review ?? "";
  editorTitle.textContent = `编辑：${song.title ?? "未命名歌曲"}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getFormPayload() {
  return {
    title: fields.title.value.trim(),
    artist: fields.artist.value.trim(),
    melody_score: Number(fields.melody_score.value),
    structure_score: Number(fields.structure_score.value),
    timbre_score: Number(fields.timbre_score.value),
    emotion_score: Number(fields.emotion_score.value),
    relisten_score: Number(fields.relisten_score.value),
    review: fields.review.value.trim(),
  };
}

function validatePayload(payload) {
  if (!payload.title || !payload.artist || !payload.review) {
    throw new Error("歌曲名、歌手和评价不能为空。");
  }

  for (const key of ["melody_score", "structure_score", "timbre_score", "emotion_score", "relisten_score"]) {
    const value = payload[key];
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new Error("所有评分都必须是 1 到 5 的整数。");
    }
  }
}

async function loadSongs() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("songs")
    .select("id, title, artist, review, melody_score, structure_score, timbre_score, emotion_score, relisten_score, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  adminSongList.innerHTML = "";

  if (!data?.length) {
    adminSongList.innerHTML = `<article class="panel"><p class="muted-text">还没有歌曲，先在左侧创建第一首。</p></article>`;
    return;
  }

  for (const song of data) {
    const item = document.createElement("article");
    item.className = "admin-song-item";
    item.innerHTML = `
      <div class="admin-song-head">
        <div>
          <h2 class="song-title">${escapeHtml(song.title || "未命名歌曲")}</h2>
          <p class="song-artist">${escapeHtml(song.artist || "未知歌手")}</p>
        </div>
        <div class="actions-row">
          <button class="tiny-button" type="button" data-action="edit" data-id="${song.id}">编辑</button>
          <button class="tiny-button is-danger" type="button" data-action="delete" data-id="${song.id}">删除</button>
        </div>
      </div>
    `;

    item.querySelector('[data-action="edit"]').addEventListener("click", () => fillForm(song));
    item.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      const confirmed = window.confirm(`确认删除《${song.title || "未命名歌曲"}》吗？`);
      if (!confirmed) {
        return;
      }
      await deleteSong(song.id);
    });
    adminSongList.appendChild(item);
  }
}

async function saveSong(event) {
  event.preventDefault();
  setEditorStatus("正在保存...");

  try {
    const payload = getFormPayload();
    validatePayload(payload);

    const supabase = getSupabaseClient();
    const songId = fields.id.value.trim();
    const query = songId
      ? supabase.from("songs").update(payload).eq("id", songId)
      : supabase.from("songs").insert(payload);
    const { error } = await query;

    if (error) {
      throw error;
    }

    setEditorStatus(songId ? "修改完成。" : "创建完成。");
    resetForm();
    await loadSongs();
  } catch (error) {
    setEditorStatus(`保存失败：${error.message}`);
  }
}

async function deleteSong(songId) {
  setEditorStatus("正在删除...");

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("songs").delete().eq("id", songId);

    if (error) {
      throw error;
    }

    setEditorStatus("删除完成。");
    if (fields.id.value === songId) {
      resetForm();
    }
    await loadSongs();
  } catch (error) {
    setEditorStatus(`删除失败：${error.message}`);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  setLoginStatus("正在登录...");

  try {
    await signInWithPassword(email, password);
    setLoginStatus("");
  } catch (error) {
    setLoginStatus(`登录失败：${error.message}`);
  }
}

async function initialize() {
  try {
    const session = await getSession();
    setAdminVisible(session);
    if (session) {
      await loadSongs();
    }
  } catch (error) {
    setLoginStatus(error.message);
  }
}

loginForm.addEventListener("submit", handleLogin);
songForm.addEventListener("submit", saveSong);
logoutButton.addEventListener("click", async () => {
  try {
    await signOut();
    resetForm();
    adminSongList.innerHTML = "";
  } catch (error) {
    setEditorStatus(`退出失败：${error.message}`);
  }
});
newSongButton.addEventListener("click", resetForm);
resetButton.addEventListener("click", resetForm);

onAuthStateChange(async (session) => {
  setAdminVisible(session);
  if (session) {
    setLoginStatus("");
    await loadSongs();
  } else {
    adminSongList.innerHTML = "";
  }
});

initialize();
