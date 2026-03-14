// ── Config ────────────────────────────────────────────────────────────────
const DEFAULT_YOURMIND_URL = "https://your-mind.vercel.app";

async function getConfig() {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.sync.get({ yourmindUrl: DEFAULT_YOURMIND_URL }, resolve);
    } else {
      resolve({ yourmindUrl: DEFAULT_YOURMIND_URL });
    }
  });
}

// ── DOM refs ──────────────────────────────────────────────────────────────
const pageTitleEl = document.getElementById("page-title");
const pageUrlEl = document.getElementById("page-url");
const saveBtn = document.getElementById("save-btn");
const statusEl = document.getElementById("status");
const openDashboardEl = document.getElementById("open-dashboard");
const configureLinkEl = document.getElementById("configure-link");

// ── Helpers ───────────────────────────────────────────────────────────────
function showStatus(type, message) {
  statusEl.className = `status ${type}`;
  statusEl.innerHTML =
    type === "saving"
      ? `<span class="spinner"></span>${message}`
      : message;
}

function hideStatus() {
  statusEl.className = "status hidden";
  statusEl.textContent = "";
}

function truncate(str, max) {
  return str && str.length > max ? str.slice(0, max) + "…" : str || "";
}

function getHostname(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const { yourmindUrl } = await getConfig();

  // Get active tab
  let tab = { title: "Unknown page", url: "" };
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    tab = activeTab || tab;
  } catch {
    // Fallback if chrome.tabs not available
  }

  const title = tab.title || "Untitled";
  const url = tab.url || "";

  pageTitleEl.textContent = truncate(title, 80);
  pageUrlEl.textContent = getHostname(url);

  // ── Open dashboard link ────────────────────────────────────────────────
  openDashboardEl.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: yourmindUrl + "/dashboard" });
    window.close();
  });

  // ── Configure link ────────────────────────────────────────────────────
  configureLinkEl.addEventListener("click", (e) => {
    e.preventDefault();
    const newUrl = prompt(
      "Enter your YourMind URL (e.g. https://your-mind.vercel.app):",
      yourmindUrl
    );
    if (newUrl && newUrl.startsWith("http")) {
      chrome.storage.sync.set({ yourmindUrl: newUrl.replace(/\/$/, "") });
    }
  });

  // ── Save button ────────────────────────────────────────────────────────
  saveBtn.addEventListener("click", async () => {
    if (!url || url.startsWith("chrome://") || url.startsWith("about:")) {
      showStatus("error", "⚠ Cannot save this page");
      return;
    }

    saveBtn.disabled = true;
    showStatus("saving", "Saving to YourMind…");

    // Open YourMind dashboard with ?save= param — dashboard auto-saves the URL
    const dashboardUrl =
      yourmindUrl +
      "/dashboard?save=" +
      encodeURIComponent(url) +
      "&title=" +
      encodeURIComponent(title);

    chrome.tabs.create({ url: dashboardUrl });

    // Brief feedback then close
    setTimeout(() => {
      showStatus("saved", "✓ Opening YourMind…");
      setTimeout(() => window.close(), 800);
    }, 300);
  });
});
