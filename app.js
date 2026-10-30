/* ==========================================================================
   1. MOTEUR DE STOCKAGE HAUTE CAPACITÉ (INDEXEDDB)
   ========================================================================== */
const DB_NAME = "HumourDeMoiDB";
const DB_VERSION = 1;
let db = null;

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains("posts")) {
        database.createObjectStore("posts", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("submissions")) {
        database.createObjectStore("submissions", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("meta")) {
        database.createObjectStore("meta", { keyPath: "key" });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = (e) => reject("Erreur IndexedDB: " + e.target.error);
  });
}

function dbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(storeName, item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function dbDelete(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/* ==========================================================================
   2. DONNÉES GLOBALES & INITIALISATION
   ========================================================================== */
const defaultCategories = {
  "Animaux": ["Chats", "Chiens", "Oiseaux"],
  "Jeux Vidéo": ["Fails", "Bugs", "Victoires"],
  "Memes": ["Classiques", "Boulot & Bureau"]
};

let categories = JSON.parse(localStorage.getItem("hdm_categories")) || defaultCategories;
let posts = [];
let submissions = [];
let isAdmin = false;

function saveCategories() {
  localStorage.setItem("hdm_categories", JSON.stringify(categories));
}

// Convertit un fichier uploadé en DataURL pour stockage direct
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/* ==========================================================================
   3. GESTION DES CATÉGORIES & FILTRES
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
  if (filterCat) filterCat.value = cat;
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
   4. BASES ET LECTEUR MÉDIA UNIVERSEL
   ========================================================================== */
function getEmbedUrl(url) {
  if (!url || typeof url !== "string") return null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (ytMatch) return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

function formatMediaElement(item) {
  const isVideo = item.type === "video";

  // 1. FORMAT VIDÉO
  if (isVideo) {
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

    // Fichier Vidéo uploadé (Base64) ou lien direct .mp4/.webm/.mov
    return `
      <video controls playsinline preload="metadata" onerror="handleMediaError(this, '${item.url}', 'video')">
        <source src="${item.url}">
        Votre navigateur ne peut pas lire ce format vidéo.
      </video>
    `;
  }

  // 2. FORMAT IMAGE
  const safeTitle = (item.title || "").replace(/'/g, "\\'");
  return `
    <img 
      src="${item.url}" 
      alt="${item.title}" 
      title="Cliquez pour agrandir et zoomer"
      onclick="openLightbox('${item.url}', '${safeTitle}')"
      loading="lazy" 
      crossorigin="anonymous"
      onerror="handleMediaError(this, '${item.url}', 'image')">
  `;
}

// Secours si une image ou vidéo externe ne peut pas être chargée
function handleMediaError(element, originalUrl, type) {
  const wrapper = element.parentElement;
  if (wrapper) {
    wrapper.innerHTML = `
      <div class="media-error-box">
        <span style="font-size: 1.8rem;">⚠️</span>
        <p style="font-size: 0.8rem; color: var(--text-muted);">
          Le site distant empêche l'affichage direct.
        </p>
        <a href="${originalUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="font-size: 0.75rem;">
          🔗 Ouvrir dans un nouvel onglet
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
    feed.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Aucun contenu trouvé dans cette catégorie !</p>`;
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
          <span class="tag">${item.type === "video" ? "🎬 Vidéo" : "🖼️ Image"}</span>
        </div>
      </div>
    </article>
  `).join("");
}

/* ==========================================================================
   5. BASCULE FICHIER / LIEN (FORMULAIRES)
   ========================================================================== */
function toggleSourceInput(prefix, type) {
  const fileBlock = document.getElementById(`${prefix}FileInputBlock`);
  const urlBlock = document.getElementById(`${prefix}UrlInputBlock`);
  if (type === "file") {
    fileBlock.classList.remove("hidden");
    urlBlock.classList.add("hidden");
  } else {
    fileBlock.classList.add("hidden");
    urlBlock.classList.remove("hidden");
  }
}

/* ==========================================================================
   6. SOUMISSIONS VISITEURS (UPLOAD OU LIEN)
   ========================================================================== */
async function handleUserSuggestion(e) {
  e.preventDefault();
  const title = document.getElementById("suggestTitleInput").value;
  const sourceType = document.querySelector('input[name="suggestSourceType"]:checked').value;
  let mediaUrl = "";
  let mediaType = "image";

  if (sourceType === "file") {
    const fileInput = document.getElementById("suggestFileInput");
    if (!fileInput.files || fileInput.files.length === 0) {
      alert("Veuillez sélectionner un fichier image ou vidéo.");
      return;
    }
    const file = fileInput.files[0];
    mediaType = file.type.startsWith("video/") ? "video" : "image";
    mediaUrl = await fileToDataUrl(file);
  } else {
    mediaUrl = document.getElementById("suggestUrlInput").value.trim();
    if (!mediaUrl) {
      alert("Veuillez entrer une adresse web.");
      return;
    }
    const isVideo = mediaUrl.includes("youtube.com") || mediaUrl.includes("youtu.be") || mediaUrl.match(/\.(mp4|webm|mov|avi)(\?.*)?$/i);
    mediaType = isVideo ? "video" : "image";
  }

  const defaultCategory = Object.keys(categories)[0] || "Memes";

  const suggestion = {
    id: Date.now(),
    title,
    url: mediaUrl,
    category: defaultCategory,
    subCategory: (categories[defaultCategory] && categories[defaultCategory][0]) ? categories[defaultCategory][0] : "Général",
    type: mediaType
  };

  await dbPut("submissions", suggestion);
  submissions.unshift(suggestion);
  updateCounts();

  alert("Merci ! Votre média a bien été enregistré et envoyé pour validation.");
  closeModal("suggestModal");
  e.target.reset();
  toggleSourceInput('suggest', 'file');
}

/* ==========================================================================
   7. ADMINISTRATION : AJOUT & SUPPRESSION DE FICHIERS/LIENS
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
  if (targetPane) targetPane.classList.remove("hidden");
  if (e && e.currentTarget) e.currentTarget.classList.add("active");
}

async function handleAdminAddMedia(e) {
  e.preventDefault();
  const title = document.getElementById("adminTitle").value;
  const sourceType = document.querySelector('input[name="adminSourceType"]:checked').value;
  let mediaUrl = "";
  let mediaType = "image";

  if (sourceType === "file") {
    const fileInput = document.getElementById("adminFileInput");
    if (!fileInput.files || fileInput.files.length === 0) {
      alert("Veuillez sélectionner un fichier depuis votre appareil.");
      return;
    }
    const file = fileInput.files[0];
    mediaType = file.type.startsWith("video/") ? "video" : "image";
    mediaUrl = await fileToDataUrl(file);
  } else {
    mediaUrl = document.getElementById("adminUrl").value.trim();
    if (!mediaUrl) {
      alert("Veuillez entrer une adresse web.");
      return;
    }
    const isVideo = mediaUrl.includes("youtube.com") || mediaUrl.includes("youtu.be") || mediaUrl.match(/\.(mp4|webm|mov|avi)(\?.*)?$/i);
    mediaType = isVideo ? "video" : "image";
  }

  const newPost = {
    id: Date.now(),
    title,
    url: mediaUrl,
    type: mediaType,
    category: document.getElementById("adminCat").value,
    subCategory: document.getElementById("adminSubcat").value
  };

  await dbPut("posts", newPost);
  posts.unshift(newPost);

  renderFeed();
  renderAdminPosts();
  updateCounts();
  alert("Média publié avec succès !");
  closeModal("adminDashboardModal");
  e.target.reset();
  toggleSourceInput('admin', 'file');
}

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
          ? `<img src="${item.url}" class="sub-thumbnail" alt="${item.title}">`
          : `<div class="sub-thumbnail" style="display:flex;align-items:center;justify-content:center;color:var(--primary);font-size:1.2rem;">🎬</div>`
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

async function deletePost(id) {
  if (confirm("Supprimer définitivement cette publication ?")) {
    await dbDelete("posts", id);
    posts = posts.filter(p => p.id !== id);
    renderFeed();
    renderAdminPosts();
    updateCounts();
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
        <small style="color:var(--text-muted);">${item.category}</small>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary" onclick="approveSubmission(${item.id})">Valider</button>
        <button class="btn btn-danger" onclick="rejectSubmission(${item.id})">Refuser</button>
      </div>
    </div>
  `).join("");
}

async function approveSubmission(id) {
  const item = submissions.find(s => s.id === id);
  if (item) {
    await dbDelete("submissions", id);
    await dbPut("posts", item);
    submissions = submissions.filter(s => s.id !== id);
    posts.unshift(item);
    renderSubmissions();
    renderAdminPosts();
    renderFeed();
    updateCounts();
  }
}

async function rejectSubmission(id) {
  await dbDelete("submissions", id);
  submissions = submissions.filter(s => s.id !== id);
  renderSubmissions();
  updateCounts();
}

function addCategory() {
  const name = document.getElementById("newCatInput").value.trim();
  if (name && !categories[name]) {
    categories[name] = [];
    saveCategories();
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
    saveCategories();
    populateCategoryDropdowns();
    document.getElementById("newSubCatInput").value = "";
    alert(`Sous-catégorie "${sub}" ajoutée à "${parent}" !`);
  }
}

function updateCounts() {
  const subCountElem = document.getElementById("submissionCount");
  const postCountElem = document.getElementById("postCount");
  if (subCountElem) subCountElem.innerText = submissions.length;
  if (postCountElem) postCountElem.innerText = posts.length;
}

/* ==========================================================================
   8. LIGHTBOX & MODALES
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
  if (lightbox) lightbox.style.display = "none";
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
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
  if (lightboxImg) lightboxImg.style.transform = `scale(1)`;
}

function handleWheelZoom(event) {
  event.preventDefault();
  zoomImage(event.deltaY < 0 ? 0.2 : -0.2);
}

function toggleFullScreen() {
  const lightbox = document.getElementById("imageLightbox");
  if (!document.fullscreenElement) {
    if (lightbox.requestFullscreen) lightbox.requestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = "flex";
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = "none";
}

window.onclick = function(e) {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.style.display = "none";
  }
};

/* ==========================================================================
   9. INITIALISATION AUTOMATIQUE
   ========================================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await initDB();
  posts = await dbGetAll("posts");
  submissions = await dbGetAll("submissions");

  // Démo initiale si base vide
  if (posts.length === 0) {
    const demoPosts = [
      {
        id: 1,
        title: "Chat méfiant",
        url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600",
        type: "image",
        category: "Animaux",
        subCategory: "Chats"
      },
      {
        id: 2,
        title: "Vidéo d'animation drôle",
        url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
        type: "video",
        category: "Jeux Vidéo",
        subCategory: "Fails"
      }
    ];
    for (const p of demoPosts) {
      await dbPut("posts", p);
    }
    posts = demoPosts;
  }

  populateCategoryDropdowns();
  renderFeed();
  updateCounts();
});