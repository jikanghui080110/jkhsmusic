import { getSupabaseClient } from "./supabase.js";

const feedback = document.querySelector("#detail-feedback");
const detailCard = document.querySelector("#detail-card");
const scoreLabels = [
  ["melody_score", "旋律"],
  ["structure_score", "结构"],
  ["timbre_score", "音色"],
  ["emotion_score", "情感"],
  ["relisten_score", "耐听"],
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setFeedback(message, hidden = false) {
  feedback.textContent = message;
  feedback.classList.toggle("is-hidden", hidden);
}

function getSongId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function buildRadarPoints(song) {
  const center = 110;
  const radius = 80;

  return scoreLabels
    .map(([key], index) => {
      const value = Number(song[key] ?? 0);
      const ratio = Math.max(0, Math.min(5, value)) / 5;
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / scoreLabels.length;
      const x = center + Math.cos(angle) * radius * ratio;
      const y = center + Math.sin(angle) * radius * ratio;
      return `${x},${y}`;
    })
    .join(" ");
}

function buildRadarSvg(song) {
  const rings = [1, 2, 3, 4, 5]
    .map((step) => {
      const points = scoreLabels
        .map((_, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / scoreLabels.length;
          const radius = (80 * step) / 5;
          const x = 110 + Math.cos(angle) * radius;
          const y = 110 + Math.sin(angle) * radius;
          return `${x},${y}`;
        })
        .join(" ");

      return `<polygon points="${points}" fill="none" stroke="#e5e5e5" />`;
    })
    .join("");

  const axes = scoreLabels
    .map(([, label], index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / scoreLabels.length;
      const x = 110 + Math.cos(angle) * 80;
      const y = 110 + Math.sin(angle) * 80;
      const lx = 110 + Math.cos(angle) * 98;
      const ly = 110 + Math.sin(angle) * 98;
      return `
        <line x1="110" y1="110" x2="${x}" y2="${y}" stroke="#e5e5e5" />
        <text x="${lx}" y="${ly}" font-size="11" fill="#666" text-anchor="middle" dominant-baseline="middle">${label}</text>
      `;
    })
    .join("");

  return `
    <svg class="radar-svg" viewBox="0 0 220 220" role="img" aria-label="歌曲评分雷达图">
      ${rings}
      ${axes}
      <polygon points="${buildRadarPoints(song)}" fill="rgba(17,17,17,0.16)" stroke="#111111" stroke-width="2" />
      <circle cx="110" cy="110" r="2.5" fill="#111111" />
    </svg>
  `;
}

function buildScoreRows(song) {
  return scoreLabels
    .map(([key, label]) => {
      const value = Math.max(0, Math.min(5, Number(song[key] ?? 0)));
      return `
        <div class="score-row">
          <span>${label}</span>
          <div class="score-track"><div class="score-fill" style="width:${(value / 5) * 100}%"></div></div>
          <span class="score-value">${value}/5</span>
        </div>
      `;
    })
    .join("");
}

function renderDetail(song) {
  detailCard.innerHTML = `
    <div class="detail-meta">
      <h2 class="detail-title">${escapeHtml(song.title || "未命名歌曲")}</h2>
      <p class="detail-artist">${escapeHtml(song.artist || "未知歌手")}</p>
    </div>
    <section class="panel">
      <h3 class="detail-section-title">评分雷达图</h3>
      <div class="radar-wrap">
        ${buildRadarSvg(song)}
        <div class="score-list">${buildScoreRows(song)}</div>
      </div>
    </section>
    <section class="panel">
      <h3 class="detail-section-title">评价</h3>
      <p class="review-copy">${escapeHtml(song.review || "这首歌还没有写评价。")}</p>
    </section>
  `;
}

function normalizeSong(data) {
  const song = { ...data };

  for (const [key] of scoreLabels) {
    song[key] = Number(song[key] ?? 0);
    if (Number.isNaN(song[key])) {
      song[key] = 0;
    }
  }

  return song;
}

async function loadSongDetail() {
  const songId = getSongId();

  if (!songId) {
    setFeedback("缺少歌曲 id，无法读取详情。请从列表页进入。");
    return;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("songs")
      .select("id, title, artist, review, melody_score, structure_score, timbre_score, emotion_score, relisten_score")
      .eq("id", songId)
      .single();

    if (error) {
      throw error;
    }

    const song = normalizeSong(data);
    renderDetail(song);
    detailCard.hidden = false;
    setFeedback("", true);
    document.title = `${song.title ?? "歌曲详情"} | J.的音乐`;
  } catch (error) {
    detailCard.hidden = true;
    setFeedback(`读取失败：${error.message}`);
  }
}

loadSongDetail();
