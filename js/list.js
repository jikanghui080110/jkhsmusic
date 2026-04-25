import { getSupabaseClient } from "./supabase.js";

const feedback = document.querySelector("#list-feedback");
const songGrid = document.querySelector("#song-grid");

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function setFeedback(message, hidden = false) {
  feedback.textContent = message;
  feedback.classList.toggle("is-hidden", hidden);
}

function renderSongs(songs) {
  songGrid.innerHTML = songs
    .map(
      (song) => `
        <a class="song-card" href="./detail.html?id=${encodeURIComponent(song.id)}">
          <h2 class="song-title">${escapeHtml(song.title || "未命名歌曲")}</h2>
          <p class="song-artist">${escapeHtml(song.artist || "未知歌手")}</p>
        </a>
      `
    )
    .join("");
}

async function loadSongs() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("songs")
      .select("id, title, artist, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      songGrid.innerHTML = "";
      setFeedback("目前还没有歌曲数据。先去 Supabase 的 songs 表插入几条测试记录。");
      return;
    }

    renderSongs(data);
    setFeedback("", true);
  } catch (error) {
    songGrid.innerHTML = "";
    setFeedback(`加载失败：${error.message}`);
  }
}

loadSongs();
