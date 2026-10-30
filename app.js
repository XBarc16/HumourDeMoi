/* ==========================================================================
   1. DONNÉES PAR DÉFAUT & LOCALSTORAGE
   ========================================================================== */
const defaultCategories = {
  "Animaux": ["Chats", "Chiens", "Oiseaux"],
  "Jeux Vidéo": ["Fails", "Bugs", "Victoires"],
  "Memes": ["Classiques", "Boulot & Bureau"]
};

const defaultPosts = [
  {
    id: 1,
    title: "Chat très méfiant qui regarde de côté",
    url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600",
    type: "image",
    category: "Animaux",
    subCategory: "Chats"
  },
  {
    id: 2,
    title: "Court-métrage d'animation amusant",
    url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    type: "video",
    category: "Jeux Vidéo",
    subCategory: "Fails"
  }
];

let categories = JSON.parse(localStorage.getItem("hdm_categories")) || defaultCategories;
let posts = JSON.parse(localStorage.getItem("hdm_posts")) || defaultPosts;
let submissions = JSON.parse(localStorage.getItem("hdm_submissions")) || [];
let isAdmin = false;

function saveData() {
  localStorage.setItem("hdm_categories", JSON.stringify(categories));
  localStorage.setItem("hdm_posts", JSON.stringify(posts));
  localStorage.setItem("hdm_submissions", JSON.stringify(submissions));
}

/* ==========================================================================
   2. GESTION DES CATÉGORIES & NAVIGATION
   ========================================================================== */
function populateCategoryDropdowns() {
  const filterCat = document.getElementById("filterCategory");
  const adminCat = document.getElementById("adminCat");
  const parentCat = document.getElementById("parentCatSelect");
  const tabsContainer = document.getElementById("categoryTabsContainer");

  const catNames = Object.keys(categories);

  if (filterCat) filterCat.innerHTML = `<option value="all">Toutes</option>`;
  if (adminCat) adminCat.innerHTML = "";
  if (parentCat) parentCat.innerHTML = "";

  if (tabsContainer) {
    tabsContainer.innerHTML = `<button class="category-tab-btn active" onclick="selectCategoryTab(this, 'all')">Toutes</button>`;
  }

  catNames.forEach(cat => {
    if (filterCat) filterCat.innerHTML += `<option value="${cat}">${cat}</option>`;
    if (adminCat) adminCat.innerHTML += `<option value="${cat}">${cat}</option>`;
    if (parentCat) parentCat.innerHTML += `<option value="${cat}">${cat}</option>`;

    if (tabsContainer) {
      tabsContainer.innerHTML += `<button class="category-tab-btn" onclick="selectCategoryTab(this, '${cat}')">${cat}</button>`;
    }
  });

  onCategoryFilterChange();
  populateAdminSubcategories();
}

function selectCategoryTab(buttonEl, cat) {
  document.querySelectorAll(".category-tab-btn").forEach(btn => btn.classList.remove("active"));
  buttonEl.classList.add("active");
  const filterCat = document.getElementById("filterCategory");
  if (filterCat) {
    filterCat.value = cat;
  }
  onCategoryFilterChange();
}

function onCategoryFilterChange() {
  const filterCat = document.getElementById("filterCategory");
  const subSelect = document.getElementById("filterSubCategory");
  if (!filterCat || !subSelect) return;

  const selectedCat = filterCat.value;
  subSelect.innerHTML = `<option value="all">Toutes</option>`;

  if (selectedCat !== "all" && categories[selectedCat]) {
    categories[selectedCat].forEach(sub => {
      subSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
    });
  }
  renderFeed();
}

function populateAdminSubcategories() {
  const adminCat = document.getElementById("adminCat");
  const subSelect = document.getElementById("adminSubcat");
  if (!adminCat || !subSelect) return;

  const cat = adminCat.value;
  subSelect.innerHTML = "";
  if (categories[cat]) {
    categories[cat].forEach(sub => {
      subSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
    });
  }
}

/* ==========================================================================
   3. VISIONNEUSE GRAND ÉCRAN & ZOOM (LIGHTBOX)
   ========================================================================== */
let currentZoom = 1;

function openLightbox(url, title) {
  const lightbox = document.getElementById("imageLightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxTitle = document.getElementById("lightboxTitle");

  if (!lightbox || !lightboxImg) return;

  lightboxImg.src = url;
  if (lightboxTitle) lightboxTitle.innerText = title;

  currentZoom = 1;
  lightboxImg.style.transform = `scale(1)`;
  lightbox.style.display = "flex";
}

function closeLightbox() {
  const lightbox = document.getElementById("imageLightbox");
  if (lightbox) {
    lightbox.style.display = "none";
  }
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

function zoomImage(delta) {
  const lightboxImg = document.getElementById("lightboxImg");
  if (!lightboxImg) return;

  currentZoom = Math.min(Math.max(0.5, currentZoom + delta), 4);
  lightboxImg.style.transform = `scale(${currentZoom})`;
}

function resetZoom() {
  currentZoom = 1;
  const lightboxImg = document.getElementById("lightboxImg");
  if (lightboxImg) {
    lightboxImg.style.transform = `scale(1)`;
  }
}

function handleWheelZoom(event) {
  event.preventDefault();
  const delta = event.deltaY < 0 ? 0.2 : -0.2;
  zoomImage(delta);
}

function toggleFullScreen() {
  const lightbox = document.getElementById("imageLightbox");
  if (!document.fullscreenElement) {
    if (lightbox.requestFullscreen) {
      lightbox.requestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

// Fermeture avec la touche Échap
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeLightbox();
  }
});

/* ==========================================================================
   4. LECTEUR VIDÉO & AFFICHAGE DU CONTENU
   ========================================================================== */
function getEmbedUrl(url) {
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (ytMatch) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return null;
}

function formatMediaElement(item) {
  // 1. Image cliquable pour zoom et plein écran
  if (item.type === "image") {
    const safeTitle = item.title.replace(/'/g, "\\'");
    return `
      <img 
        src="${item.url}" 
        alt="${item.title}" 
        title="Cliquez pour agrandir et zoomer"
        onclick="openLightbox('${item.url}', '${safeTitle}')"
        loading="lazy" 
        onerror="this.onerror=null; this.src='https://placehold.co/600x400?text=Image+Introuvable';">
    `;
  }

  // 2. Vidéo YouTube ou Vimeo
  const embedUrl = getEmbedUrl(item.url);
  if (embedUrl) {
    return `
      <iframe 
        src="${embedUrl}" 
        title="${item.title}" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        allowfullscreen>
      </iframe>
    `;
  }

  // 3. Vidéo HTML5 (.mp4, .webm)
  return `
    <video controls playsinline preload="metadata" onerror="handleVideoError(this, '${item.url}')">
      <source src="${item.url}" type="video/mp4">
      <source src="${item.url}" type="video/webm">
      Votre navigateur ne supporte pas cette vidéo.
    </video>
  `;
}

function handleVideoError(videoElement, url) {
  const wrapper = videoElement.parentElement;
  if (wrapper) {
    wrapper.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px;">
          Vidéo non lisible directement dans le lecteur
        </p>
        <a href="${url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="font-size: 0.8rem; text-decoration: none; display: inline-block;">
          ▶ Ouvrir la vidéo
        </a>
      </div>
    `;
  }
}

function renderFeed() {
  const feed = document.getElementById("mediaFeed");
  const filterCat = document.getElementById("filterCategory");
  const filterSub = document.getElementById("filterSubCategory");
  const filterType = document.getElementById("filterMediaType");

  const selectedCat = filterCat ? filterCat.value : "all";
  const selectedSub = filterSub ? filterSub.value : "all";
  const selectedType = filterType ? filterType.value : "all";

  const filtered = posts.filter(item => {
    const matchCat = (selectedCat === "all" || item.category === selectedCat);
    const matchSub = (selectedSub === "all" || item.subCategory === selectedSub);
    const matchType = (selectedType === "all" || item.type === selectedType);
    return matchCat && matchSub && matchType;
  });

  if (filtered.length === 0) {
    feed.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Aucun contenu drôle trouvé dans cette catégorie !</p>`;
    return;
  }

  feed.innerHTML = filtered.map(item => `
    <article class="card">
      <div class="media-wrapper">
        ${formatMediaElement(item)}
      </div>
      <div class="card-content">
        <h4 class="card-title">${item.title}</h4>
        <div class="card-tags">
          <span class="tag">📁 ${item.category}</span>
          ${item.subCategory ? `<span class="tag">↳ ${item.subCategory}</span>` : ""}
        </div>
      </div>
    </article>
  `).join("");
}

/* ==========================================================================
   5. SUGGESTIONS VISITEURS
   ========================================================================== */
function handleUserSuggestion(e) {
  e.preventDefault();
  const title = document.getElementById("suggestTitleInput").value;
  const url = document.getElementById("suggestUrlInput").value.trim();

  const isVideoUrl = 
    url.includes("youtube.com") || 
    url.includes("youtu.be") || 
    url.includes("vimeo.com") ||
    url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);

  const detectedType = isVideoUrl ? "video" : "image";
  const defaultCategory = Object.keys(categories)[0] || "Memes";

  const suggestion = {
    id: Date.now(),
    title,
    url,
    category: defaultCategory,
    subCategory: (categories[defaultCategory] && categories[defaultCategory][0]) ? categories[defaultCategory][0] : "Général",
    type: detectedType
  };

  submissions.push(suggestion);
  saveData();
  alert("Merci ! Votre proposition a été envoyée pour validation.");
  closeModal("suggestModal");
  e.target.reset();
  updateCounts();
}

/* ==========================================================================
   6. ADMINISTRATION & SUPPRESSION DE POSTS
   ========================================================================== */
function openAdmin() {
  if (isAdmin) {
    openModal("adminDashboardModal");
    renderSubmissions();
    renderAdminPosts();
  } else {
    openModal("adminLoginModal");
  }
}

function handleAdminLogin(e) {
  e.preventDefault();
  const pass = document.getElementById("adminPasswordInput").value;
  
  if (pass === "admin123") {
    isAdmin = true;
    closeModal("adminLoginModal");
    const toggleBtn = document.getElementById("adminToggleBtn");
    if (toggleBtn) toggleBtn.innerText = "⚙️ Tableau de bord";
    document.getElementById("adminPasswordInput").value = "";
    openModal("adminDashboardModal");
    renderSubmissions();
    renderAdminPosts();
  } else {
    alert("Mot de passe incorrect !");
  }
}

function switchTab(e, tabId) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));

  const targetPane = document.getElementById(tabId);
  if (targetPane) {
    targetPane.classList.remove("hidden");
  }

  if (e && e.currentTarget) {
    e.currentTarget.classList.add("active");
  }
}

function handleAdminAddMedia(e) {
  e.preventDefault();
  const newPost = {
    id: Date.now(),
    title: document.getElementById("adminTitle").value,
    url: document.getElementById("adminUrl").value,
    type: document.getElementById("adminType").value,
    category: document.getElementById("adminCat").value,
    subCategory: document.getElementById("adminSubcat").value
  };

  posts.unshift(newPost);
  saveData();
  renderFeed();
  renderAdminPosts();
  updateCounts();
  alert("Média publié avec succès !");
  closeModal("adminDashboardModal");
  e.target.reset();
}

// Affichage et gestion des suppressions de posts
function renderAdminPosts() {
  const container = document.getElementById("adminPostsList");
  updateCounts();

  if (!container) return;

  if (posts.length === 0) {
    container.innerHTML = "<p style='color: var(--text-muted);'>Aucune publication en ligne actuellement.</p>";
    return;
  }

  container.innerHTML = posts.map(item => `
    <div class="sub-item">
      <div class="sub-item-preview">
        ${item.type === 'image' 
          ? `<img src="${item.url}" class="sub-thumbnail" alt="${item.title}" onerror="this.src='https://placehold.co/48?text=Image';">`
          : `<div class="sub-thumbnail" style="display:flex;align-items:center;justify-content:center;color:var(--primary);font-size:1.2rem;">▶</div>`
        }
        <div>
          <strong>${item.title}</strong> [${item.type}]<br>
          <small style="color:var(--text-muted);">${item.category} &gt; ${item.subCategory}</small>
        </div>
      </div>
      <div>
        <button class="btn btn-danger" onclick="deletePost(${item.id})">🗑 Supprimer</button>
      </div>
    </div>
  `).join("");
}

// Fonction de suppression de publication
function deletePost(id) {
  if (confirm("Êtes-vous sûr de vouloir supprimer définitivement ce média du site ?")) {
    posts = posts.filter(p => p.id !== id);
    saveData();
    renderFeed();
    renderAdminPosts();
    updateCounts();
  }
}

function addCategory() {
  const name = document.getElementById("newCatInput").value.trim();
  if (name && !categories[name]) {
    categories[name] = [];
    saveData();
    populateCategoryDropdowns();
    document.getElementById("newCatInput").value = "";
    alert(`Catégorie "${name}" créée avec succès !`);
  }
}

function addSubCategory() {
  const parent = document.getElementById("parentCatSelect").value;
  const sub = document.getElementById("newSubCatInput").value.trim();
  if (parent && sub && !categories[parent].includes(sub)) {
    categories[parent].push(sub);
    saveData();
    populateCategoryDropdowns();
    document.getElementById("newSubCatInput").value = "";
    alert(`Sous-catégorie "${sub}" ajoutée à "${parent}" !`);
  }
}

function renderSubmissions() {
  const container = document.getElementById("submissionsList");
  updateCounts();

  if (!container) return;

  if (submissions.length === 0) {
    container.innerHTML = "<p style='color: var(--text-muted);'>Aucune proposition en attente.</p>";
    return;
  }

  container.innerHTML = submissions.map(item => `
    <div class="sub-item">
      <div>
        <strong>${item.title}</strong> [${item.type}]<br>
        <small style="color:var(--text-muted);">${item.category}</small> - 
        <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="color:var(--primary)">Voir le lien</a>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary" onclick="approveSubmission(${item.id})">Valider</button>
        <button class="btn btn-danger" onclick="rejectSubmission(${item.id})">Refuser</button>
      </div>
    </div>
  `).join("");
}

function approveSubmission(id) {
  const index = submissions.findIndex(s => s.id === id);
  if (index !== -1) {
    posts.unshift(submissions[index]);
    submissions.splice(index, 1);
    saveData();
    renderSubmissions();
    renderAdminPosts();
    renderFeed();
    updateCounts();
  }
}

function rejectSubmission(id) {
  submissions = submissions.filter(s => s.id !== id);
  saveData();
  renderSubmissions();
  updateCounts();
}

function updateCounts() {
  const subCountElem = document.getElementById("submissionCount");
  const postCountElem = document.getElementById("postCount");
  if (subCountElem) subCountElem.innerText = submissions.length;
  if (postCountElem) postCountElem.innerText = posts.length;
}

/* ==========================================================================
   7. GESTION DES MODALES
   ========================================================================== */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "flex";
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "none";
}

window.onclick = function(e) {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.style.display = "none";
  }
};

// Démarrage initial
document.addEventListener("DOMContentLoaded", () => {
  populateCategoryDropdowns();
  renderFeed();
  updateCounts();
});