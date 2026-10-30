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

  // Remplissage des onglets d'accueil
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
   3. LECTEUR VIDÉO & AFFICHAGE DU CONTENU
   ========================================================================== */
function getEmbedUrl(url) {
  // Détection YouTube (Standard, Shorts, Partages courts youtu.be)
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (ytMatch) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
  }

  // Détection Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return null;
}

function formatMediaElement(item) {
  // 1. Image
  if (item.type === "image") {
    return `<img src="${item.url}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/600x400?text=Image+Introuvable';">`;
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

  // 3. Vidéo HTML5 (.mp4, .webm) avec bouton de secours
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
   4. SUGGESTIONS VISITEURS (DÉTECTION AUTOMATIQUE DU FORMAT)
   ========================================================================== */
function handleUserSuggestion(e) {
  e.preventDefault();
  const title = document.getElementById("suggestTitleInput").value;
  const url = document.getElementById("suggestUrlInput").value.trim();

  // Détection automatique du type de média à partir du lien
  const isVideoUrl = 
    url.includes("youtube.com") || 
    url.includes("youtu.be") || 
    url.includes("vimeo.com") ||
    url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);

  const detectedType = isVideoUrl ? "video" : "image";

  // Catégorie par défaut (première disponible)
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
  updateSubmissionCount();
}

/* ==========================================================================
   5. ADMINISTRATION & MODÉRATION
   ========================================================================== */
function openAdmin() {
  if (isAdmin) {
    openModal("adminDashboardModal");
    renderSubmissions();
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
  } else {
    alert("Mot de passe incorrect !");
  }
}

// Changement d'onglet fiable dans le panneau d'administration
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
  alert("Média publié avec succès !");
  closeModal("adminDashboardModal");
  e.target.reset();
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
  updateSubmissionCount();

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
        <button class="btn btn-secondary" onclick="rejectSubmission(${item.id})">Refuser</button>
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
    renderFeed();
  }
}

function rejectSubmission(id) {
  submissions = submissions.filter(s => s.id !== id);
  saveData();
  renderSubmissions();
}

function updateSubmissionCount() {
  const countElem = document.getElementById("submissionCount");
  if (countElem) {
    countElem.innerText = submissions.length;
  }
}

/* ==========================================================================
   6. GESTION DES MODALES
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

// Démarrage au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
  populateCategoryDropdowns();
  renderFeed();
  updateSubmissionCount();
});