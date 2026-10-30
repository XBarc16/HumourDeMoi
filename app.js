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
    title: "Court-métrage drôle Big Buck Bunny",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
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
   2. GESTION DES CATÉGORIES & AFFICHAGE
   ========================================================================== */
function populateCategoryDropdowns() {
  const filterCat = document.getElementById("filterCategory");
  const suggestCat = document.getElementById("suggestCategorySelect");
  const adminCat = document.getElementById("adminCat");
  const parentCat = document.getElementById("parentCatSelect");
  const tabsContainer = document.getElementById("categoryTabsContainer");

  const catNames = Object.keys(categories);

  // Remplissage des sélecteurs
  filterCat.innerHTML = `<option value="all">Toutes</option>`;
  suggestCat.innerHTML = "";
  adminCat.innerHTML = "";
  parentCat.innerHTML = "";

  // Remplissage des onglets d'accueil
  if (tabsContainer) {
    tabsContainer.innerHTML = `<button class="category-tab-btn active" onclick="selectCategoryTab(this, 'all')">Toutes</button>`;
  }

  catNames.forEach(cat => {
    filterCat.innerHTML += `<option value="${cat}">${cat}</option>`;
    suggestCat.innerHTML += `<option value="${cat}">${cat}</option>`;
    adminCat.innerHTML += `<option value="${cat}">${cat}</option>`;
    parentCat.innerHTML += `<option value="${cat}">${cat}</option>`;

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
  document.getElementById("filterCategory").value = cat;
  onCategoryFilterChange();
}

function onCategoryFilterChange() {
  const selectedCat = document.getElementById("filterCategory").value;
  const subSelect = document.getElementById("filterSubCategory");

  subSelect.innerHTML = `<option value="all">Toutes</option>`;
  if (selectedCat !== "all" && categories[selectedCat]) {
    categories[selectedCat].forEach(sub => {
      subSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
    });
  }
  renderFeed();
}

function populateAdminSubcategories() {
  const cat = document.getElementById("adminCat").value;
  const subSelect = document.getElementById("adminSubcat");
  subSelect.innerHTML = "";
  if (categories[cat]) {
    categories[cat].forEach(sub => {
      subSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
    });
  }
}

function formatMediaElement(item) {
  if (item.type === "image") {
    return `<img src="${item.url}" alt="${item.title}" loading="lazy" onerror="this.src='https://placehold.co/600x400?text=Image+Introuvable';">`;
  } else if (item.url.includes("youtube.com") || item.url.includes("youtu.be")) {
    let embedUrl = item.url;
    if (item.url.includes("watch?v=")) {
      embedUrl = item.url.replace("watch?v=", "embed/");
    } else if (item.url.includes("youtu.be/")) {
      embedUrl = item.url.replace("youtu.be/", "www.youtube.com/embed/");
    }
    return `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
  } else {
    return `<video controls playsinline src="${item.url}"></video>`;
  }
}

function renderFeed() {
  const feed = document.getElementById("mediaFeed");
  const selectedCat = document.getElementById("filterCategory").value;
  const selectedSub = document.getElementById("filterSubCategory").value;
  const selectedType = document.getElementById("filterMediaType").value;

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
   3. SUGGESTIONS DES VISITEURS
   ========================================================================== */
function handleUserSuggestion(e) {
  e.preventDefault();
  const title = document.getElementById("suggestTitleInput").value;
  const url = document.getElementById("suggestUrlInput").value;
  const category = document.getElementById("suggestCategorySelect").value;
  const type = document.getElementById("suggestTypeSelect").value;

  const suggestion = {
    id: Date.now(),
    title,
    url,
    category,
    subCategory: (categories[category] && categories[category][0]) ? categories[category][0] : "Général",
    type
  };

  submissions.push(suggestion);
  saveData();
  alert("Merci ! Votre proposition a été envoyée à l'administrateur pour validation.");
  closeModal("suggestModal");
  e.target.reset();
  updateSubmissionCount();
}

/* ==========================================================================
   4. OPÉRATIONS ADMINISTRATEUR
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
    document.getElementById("adminToggleBtn").innerText = "⚙️ Tableau de bord";
    openModal("adminDashboardModal");
    renderSubmissions();
  } else {
    alert("Mot de passe incorrect !");
  }
}

// Fonction de changement d'onglet sécurisée
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

  if (submissions.length === 0) {
    container.innerHTML = "<p style='color: var(--text-muted);'>Aucune proposition en attente.</p>";
    return;
  }

  container.innerHTML = submissions.map(item => `
    <div class="sub-item">
      <div>
        <strong>${item.title}</strong> [${item.type}]<br>
        <small style="color:var(--text-muted);">${item.category}</small> - 
        <a href="${item.url}" target="_blank" style="color:var(--primary)">Voir le média</a>
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
  document.getElementById("submissionCount").innerText = submissions.length;
}

/* ==========================================================================
   5. UTILITAIRES DE MODALE
   ========================================================================== */
function openModal(id) {
  document.getElementById(id).style.display = "flex";
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
}

window.onclick = function(e) {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.style.display = "none";
  }
};

// Initialisation
document.addEventListener("DOMContentLoaded", () => {
  populateCategoryDropdowns();
  renderFeed();
  updateSubmissionCount();
});