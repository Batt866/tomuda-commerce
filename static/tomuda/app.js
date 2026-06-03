const app = document.getElementById("app");
const modal = document.getElementById("modal");
let barcodeScanTarget = "picker",
  barcodeStream = null,
  barcodeScanFrame = 0,
  barcodeScanning = false,
  zxingReader = null,
  zxingControls = null;
const state = {
  ...seed,
  currentView: "worker",
  mobileOpen: false,
  currentEmployee: null,
  isLoggedIn: false,
  searches: {},
  filters: {
    order: "all",
    category: "all",
    inventory: "stock",
    inventoryCategory: "all",
    worker: "new",
    workerCategory: "",
    workerPay: "all",
    workerDate: "",
    promotionTab: "quantity",
  },
  promotionRules: { quantity: [], price: [] },
  workerCustomer: "",
  workerStoreReady: false,
  orderEmployee: "emp-hasan",
  deliveryDate: "",
  paymentTerm: "cash",
  isPaid: false,
  selectedWorkers: [],
  selectedWarehouseOrderId: "",
  deliveryName: "",
  deliveryPhone: "",
  workerQty: {},
  extraCategories: [],
  inventoryLogs: [],
  countQty: {},
  countDone: false,
  settings: {
    stockAlertEnabled: true,
    stockAlertMin: 10,
  },
};
const API_BASE = window.TOMUDA_API_BASE || "/api";
const BRAND = {
  logoWhite: "/static/tomuda/branding/logo-white.png",
  logoBlue: "/static/tomuda/branding/logo-blue.png",
};
const persistKeys = [
  "customers",
  "products",
  "employees",
  "orders",
  "extraCategories",
  "inventoryLogs",
  "countQty",
  "countDone",
  "workerCustomer",
  "orderEmployee",
  "paymentTerm",
  "workerQty",
  "promotionRules",
  "deliveryDate",
  "settings",
];
let backendReady = false;
let backendSaveTimer = null;
let backendLastSaved = "";
const fmt = (n) => "₮" + Number(n || 0).toLocaleString();
function ensureSettings() {
  if (!state.settings || typeof state.settings !== "object") {
    state.settings = { stockAlertEnabled: true, stockAlertMin: 10 };
    return;
  }
  if (state.settings.stockAlertEnabled == null)
    state.settings.stockAlertEnabled = true;
  if (state.settings.stockAlertMin == null) state.settings.stockAlertMin = 10;
}
function stockAlertLevel(p) {
  const per = Number(p?.minStock ?? 0);
  if (per > 0) return per;
  return Math.max(0, Number(state.settings?.stockAlertMin ?? 10));
}
function isLowStock(p) {
  if (state.settings?.stockAlertEnabled === false) return false;
  return Number(p?.stock ?? 0) <= stockAlertLevel(p);
}
function lowStockProducts() {
  return state.products.filter(isLowStock);
}
const dte = (d) => new Date(d).toLocaleDateString("mn-MN");
const isoDay = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const todayIso = () => isoDay(new Date());
const tomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return isoDay(d);
};
const orderDay = (o) => isoDay(o.deliveryDate || o.createdAt);
const mapsLink = (lat, lng) =>
  lat && lng && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))
    ? `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`
    : "";
const esc = (s = "") =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c],
  );
const pickerOpen = () => !!modal.querySelector("[data-picker-root]");
const cats = () => [
  ...new Set([
    ...state.products.map((p) => p.category),
    ...state.extraCategories,
  ]),
];
const role = (r) =>
  ({ admin: "Админ", sales: "HT", warehouse: "Агуулах" })[r] || "Ажилчин";
function currentRole() {
  return state.currentEmployee?.role || "";
}
function isAdmin() {
  return currentRole() === "admin";
}
function canDelete() {
  return isAdmin();
}
function defaultViewForRole(r) {
  if (r === "admin") return "admin";
  if (r === "warehouse") return "warehouse";
  return "worker";
}
function canAccessView(viewId, r = currentRole()) {
  if (r === "admin") return true;
  if (r === "warehouse")
    return ["warehouse", "warehouseReceipts"].includes(viewId);
  if (r === "sales")
    return [
      "worker",
      "customers",
      "products",
      "warehouse",
      "warehouseReceipts",
    ].includes(viewId);
  return false;
}
function allowedNavIds(r = currentRole()) {
  if (r === "admin")
    return ["worker", "customers", "products", "warehouse", "count", "admin"];
  if (r === "warehouse") return ["warehouse"];
  if (r === "sales") return ["worker", "customers", "products", "warehouse"];
  return ["worker", "customers", "products"];
}
const EMPLOYEE_EMAIL_DEFAULTS = {
  admin: "admin@tomuda.mn",
  "emp-dulam": "aguulah@tomuda.mn",
  "emp-hasan": "ht@tomuda.mn",
  "emp-galsan": "ht.galsan@tomuda.mn",
  "emp-munkh": "ht.munkh@tomuda.mn",
};
function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}
function ensureEmployeeEmails() {
  state.employees.forEach((e) => {
    if (!e.email && EMPLOYEE_EMAIL_DEFAULTS[e.id]) {
      e.email = EMPLOYEE_EMAIL_DEFAULTS[e.id];
    }
  });
}
function orderActor() {
  if (state.currentEmployee?.role === "sales") return state.currentEmployee;
  return (
    state.employees.find((x) => x.id === state.orderEmployee) ||
    state.currentEmployee ||
    {}
  );
}
function orderEmailFields(emp) {
  const actor = emp || state.currentEmployee || {};
  return {
    employeeEmail: actor.email || "",
    createdByEmail: state.currentEmployee?.email || actor.email || "",
  };
}
const status = (s) =>
  ({
    pending: "Хүлээгдэж буй",
    confirmed: "Баталсан",
    delivered: "Хүргэсэн",
    cancelled: "Цуцалсан",
  })[s];
const badge = (s) =>
  ({
    confirmed: "tone tone--success",
    pending: "tone tone--warning",
    delivered: "tone tone--info",
    cancelled: "tone tone--danger",
  })[s] || "tone tone--danger";
const card = (l, v, t = "") =>
  `<div class="stat-card bg-card rounded p-4"><p class="stat-card__label">${l}</p><p class="stat-card__value ${t}">${v}</p></div>`;
const pageHead = (title, action = "") =>
  action
    ? `<div class="page-head page-head--row"><h2 class="page-head__title">${title}</h2>${action}</div>`
    : `<h2 class="page-head__title">${title}</h2>`;
const productImage = (p) =>
  p.image ||
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="18" fill="${p.category === "Ундаа" ? "#dff5fb" : p.category === "Чихэр" ? "#fff0d8" : p.category === "Excel бүртгэл" ? "#eaf3e6" : "#eef2f5"}"/><circle cx="118" cy="34" r="24" fill="#16899a" opacity=".18"/><rect x="42" y="28" width="76" height="92" rx="14" fill="#fff" stroke="#16899a" stroke-width="4"/><rect x="55" y="45" width="50" height="28" rx="6" fill="#16899a" opacity=".85"/><text x="80" y="91" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#182032">${esc((p.name || "Бараа").slice(0, 12))}</text><text x="80" y="110" text-anchor="middle" font-family="Arial" font-size="11" fill="#687386">${esc(p.category || "")}</text></svg>`)}`;

function persistentState() {
  return persistKeys.reduce((data, key) => {
    data[key] = state[key];
    return data;
  }, {});
}
function applyPersistentState(data) {
  if (!data || typeof data !== "object") return false;
  persistKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) state[key] = data[key];
  });
  if (!state.promotionRules?.quantity)
    state.promotionRules = { quantity: [], price: [] };
  ensureSettings();
  return true;
}
async function boot() {
  app.innerHTML = `<div class="min-h-screen grid place-items-center bg-background text-foreground"><div class="bg-card rounded p-6 text-center"><p class="font-semibold">ТОМУДА ачаалж байна</p><p class="text-sm text-muted-foreground mt-1">Backend-ээс мэдээлэл татаж байна...</p></div></div>`;
  try {
    const res = await fetch(`${API_BASE}/state`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const payload = await res.json();
      applyPersistentState(payload.state);
    }
  } catch (error) {
    console.warn("Backend state load failed", error);
  }
  backendReady = true;
  ensureEmployeeEmails();
  ensureSettings();
  initNoZoom();
  initPickerModalActions();
  initAppBack();
  render();
  initPwa();
}
function handleAppBack() {
  if (!state.isLoggedIn) return false;

  if (barcodeScanning) {
    stopBarcodeScan();
    if (pickerOpen()) pickerModal();
    else render();
    return true;
  }

  if (modal.innerHTML.trim()) {
    if (pickerOpen() && state.filters.workerCategory) backToPickerCategories();
    else closeModal();
    return true;
  }

  if (state.mobileOpen) {
    state.mobileOpen = false;
    render();
    return true;
  }

  if (
    state.currentView === "worker" &&
    state.filters.worker === "new" &&
    state.workerStoreReady
  ) {
    state.workerStoreReady = false;
    state.workerCustomer = "";
    state.searches.workerStore = "";
    render();
    return true;
  }

  const subAdminViews = ["employees", "inventory", "reports", "promotions"];
  if (subAdminViews.includes(state.currentView)) {
    go("admin");
    return true;
  }

  if (state.currentView === "warehouseReceipts") {
    go("warehouse");
    return true;
  }

  const defaultView = defaultViewForRole(currentRole());
  if (state.currentView !== defaultView) {
    go(defaultView);
    return true;
  }

  if (state.currentView === "worker" && state.filters.worker === "orders") {
    state.filters.worker = "new";
    render();
    return true;
  }

  return false;
}
function armAppBackGuard() {
  history.pushState({ tomudaBack: 1 }, "");
}
function tryExitApp() {
  const App = window.Capacitor?.Plugins?.App;
  if (App?.exitApp) {
    App.exitApp();
    return;
  }
  if (window.Capacitor?.isNativePlatform?.()) return;
  history.back();
}
function initAppBack() {
  if (window.__tomudaBackReady) return;
  window.__tomudaBackReady = true;
  armAppBackGuard();
  window.addEventListener("popstate", () => {
    if (handleAppBack()) armAppBackGuard();
    else tryExitApp();
  });
  bindCapacitorBackButton();
}
function bindCapacitorBackButton() {
  const cap = window.Capacitor;
  if (!cap?.isNativePlatform?.()) return;
  const App = cap.Plugins?.App;
  if (!App?.addListener) return;
  App.addListener("backButton", () => {
    if (handleAppBack()) armAppBackGuard();
    else tryExitApp();
  });
}
function initPickerModalActions() {
  if (modal.dataset.pickerBound) return;
  modal.dataset.pickerBound = "1";
  modal.addEventListener("click", (e) => {
    const catBtn = e.target.closest("[data-picker-cat]");
    if (catBtn) {
      setPickerCategory(catBtn.getAttribute("data-picker-cat") || "");
      return;
    }
    const qtyBtn = e.target.closest("[data-picker-qty]");
    if (qtyBtn?.disabled) return;
    if (qtyBtn) {
      setWorkerQty(
        qtyBtn.getAttribute("data-product-id") || "",
        Number(qtyBtn.getAttribute("data-qty")),
      );
      return;
    }
    const backBtn = e.target.closest("[data-picker-back]");
    if (backBtn) {
      backToPickerCategories();
      return;
    }
    const clearSearchBtn = e.target.closest("[data-picker-clear-search]");
    if (clearSearchBtn) {
      clearPickerSearch();
      return;
    }
    const clearCartBtn = e.target.closest("[data-picker-clear-cart]");
    if (clearCartBtn) {
      clearPickerCart();
    }
  });
  modal.addEventListener("change", (e) => {
    const qtyInput = e.target.closest("[data-picker-qty-input]");
    if (!qtyInput) return;
    setWorkerQty(
      qtyInput.getAttribute("data-product-id") || "",
      Number(qtyInput.value),
    );
  });
}
function initNoZoom() {
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) {
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
    );
  }
  ["gesturestart", "gesturechange", "gestureend"].forEach((type) => {
    document.addEventListener(type, (e) => e.preventDefault(), {
      passive: false,
    });
  });
  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false },
  );
}
let pwaInstallPrompt = null;
function isStandalonePwa() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}
function isInAppBrowser() {
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line\/|Twitter|Snapchat|MicroMessenger|WeChat/i.test(
    ua,
  );
}
function inAppBrowserName() {
  const ua = navigator.userAgent || "";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV/i.test(ua)) return "Facebook";
  return "энэ app";
}
function copyAppLink() {
  const url = location.href.split("#")[0];
  const done = () =>
    alert(
      "Link хуулагдлаа!\n\nChrome (Android) эсвэл Safari (iPhone) нээж, хаягийн мөрөнд paste хийгээд нээнэ үү.",
    );
  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(url)
      .then(done)
      .catch(() => prompt("Link-ийг хуулна уу:", url));
  } else {
    prompt("Link-ийг хуулна уу:", url);
  }
}
function pwaInAppEscapeSteps() {
  const app = inAppBrowserName();
  const android = isAndroidDevice();
  const ios = isIosDevice();
  if (android) {
    return `<div class="tone tone--success tone--block text-sm mb-4"><b>Android:</b> APK файлыг татаад шууд суулгана. Instagram, Facebook дотор ч болно.</div>${androidApkInstallSteps()}`;
  }
  if (ios) {
    return `<div class="tone tone--danger tone--block text-sm mb-4"><b>${app} дотор суулгах боломжгүй!</b><br>Эхлээд Safari browser руу шилжинэ үү.</div><ol class="space-y-3 text-sm leading-relaxed mb-4"><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">1</span><span>Дээд баруун <b>⋯</b> (цэгүүд) дарна</span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">2</span><span><b>Safari-аар нээх</b> / <b>Open in Safari</b> сонгоно</span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">3</span><span>Safari дээр доод <b>Хуваалцах □↑</b> → <b>Нүүр дэлгэцэнд нэмэх</b></span></li></ol><button type="button" onclick="copyAppLink()" class="w-full py-3 bg-primary text-primary-foreground rounded font-semibold">Link хуулах</button>`;
  }
  return `<p class="text-sm">Link-ийг Chrome эсвэл Safari-аар нээнэ үү.</p><button type="button" onclick="copyAppLink()" class="w-full py-3 mt-3 bg-primary text-primary-foreground rounded font-semibold">Link хуулах</button>`;
}
function isIosDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}
function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent || "");
}
function isSafariBrowser() {
  const ua = navigator.userAgent || "";
  return (
    isIosDevice() && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)
  );
}
function isChromeAndroid() {
  const ua = navigator.userAgent || "";
  return (
    isAndroidDevice() &&
    /Chrome/i.test(ua) &&
    !/EdgA|OPR|SamsungBrowser|MiuiBrowser|UCBrowser/i.test(ua)
  );
}
function pwaInstallLabel() {
  return "📱 App суулгах";
}
function isNativeApp() {
  return isStandalonePwa() || !!window.Capacitor;
}
function showInstallToast(msg) {
  document.querySelector(".install-toast")?.remove();
  const el = document.createElement("div");
  el.className = "install-toast";
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("install-toast--visible"));
  setTimeout(() => {
    el.classList.remove("install-toast--visible");
    setTimeout(() => el.remove(), 300);
  }, 4500);
}
function downloadAndroidApk() {
  const url = apkDownloadUrl();
  const a = document.createElement("a");
  a.href = url;
  a.download = "TOMUDA.apk";
  document.body.appendChild(a);
  a.click();
  a.remove();
  sessionStorage.setItem("tomuda-apk-downloaded", "1");
  window.setTimeout(() => {
    if (document.visibilityState !== "hidden") location.href = url;
  }, 400);
}
async function triggerNativeInstallPrompt() {
  if (!pwaInstallPrompt) return false;
  try {
    await pwaInstallPrompt.prompt();
    await pwaInstallPrompt.userChoice;
    pwaInstallPrompt = null;
    dismissPwaInstall(false);
    dismissInstallCoach();
    return true;
  } catch (err) {
    console.warn("Install prompt failed", err);
    pwaInstallPrompt = null;
    return false;
  }
}
function dismissInstallCoach() {
  document.getElementById("install-coach")?.remove();
}
function showIosInstallCoach() {
  dismissInstallCoach();
  const el = document.createElement("div");
  el.id = "install-coach";
  el.className = "ios-install-coach";
  el.innerHTML = `<div class="ios-install-coach-backdrop" onclick="dismissInstallCoach()"></div><div class="ios-install-coach-panel"><p class="ios-install-coach-title">📱 iPhone дээр суулгах</p><p class="ios-install-coach-step">1. Доод <b>Share □↑</b> дарна</p><p class="ios-install-coach-step">2. <b>Add to Home Screen</b> (Нүүр дэлгэцэнд нэмэх)</p><p class="ios-install-coach-step">3. <b>Add</b> (Нэмэх) дарна</p><div class="ios-install-coach-arrow" aria-hidden="true">↓</div><button type="button" class="ios-install-coach-btn" onclick="dismissInstallCoach()">Ойлголоо</button></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("ios-install-coach--visible"));
}
function showAndroidInstallCoach() {
  dismissInstallCoach();
  const el = document.createElement("div");
  el.id = "install-coach";
  el.className = "ios-install-coach";
  el.innerHTML = `<div class="ios-install-coach-backdrop" onclick="dismissInstallCoach()"></div><div class="ios-install-coach-panel"><p class="ios-install-coach-title">📱 Android дээр суулгах</p><p class="install-coach-warn"><b>Play Protect блокловол:</b> «More details» → «Install anyway» дарна. Энэ нь манай app, аюулгүй.</p><p class="ios-install-coach-step">1. <b>TOMUDA.apk</b> файл дээр дарна</p><p class="ios-install-coach-step">2. «App blocked» гарвал → <b>More details</b></p><p class="ios-install-coach-step">3. <b>Install anyway</b> дарна</p><p class="ios-install-coach-step">4. «Unknown apps» зөвшөөрнө</p><button type="button" class="ios-install-coach-btn" onclick="downloadAndroidApk()">Дахин татах</button><button type="button" class="ios-install-coach-btn mt-2" style="margin-top:8px;background:var(--hex-secondary);color:var(--hex-foreground)" onclick="dismissInstallCoach()">Ойлголоо</button></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("ios-install-coach--visible"));
}
function installUrlWithFlag() {
  const url = new URL(location.href);
  url.searchParams.set("install", "1");
  return url.toString();
}
function openInSafari() {
  const target = installUrlWithFlag();
  if (/CriOS/i.test(navigator.userAgent || "")) {
    location.href = target.replace(/^https:\/\//, "x-safari-https://");
    return;
  }
  location.href = target;
}
function installAppOnPhone() {
  if (isNativeApp()) return;
  dismissPwaInstall(false);

  if (isIosDevice()) {
    if (!isSafariBrowser() || isInAppBrowser()) {
      sessionStorage.setItem("tomuda-pending-install", "1");
      openInSafari();
      showInstallToast("Safari нээгдэж байна...");
      return;
    }
    triggerNativeInstallPrompt().then((installed) => {
      if (!installed) showIosInstallCoach();
    });
    return;
  }

  triggerNativeInstallPrompt().then((installed) => {
    if (installed) return;
    if (isAndroidDevice()) {
      if (isInAppBrowser()) {
        openInChrome();
        showInstallToast("Chrome нээгдэж байна...");
        return;
      }
      downloadAndroidApk();
      showAndroidInstallCoach();
      return;
    }
    downloadAndroidApk();
    showAndroidInstallCoach();
  });
}
function checkPendingApkInstallCoach() {
  if (
    sessionStorage.getItem("tomuda-apk-downloaded") === "1" &&
    isAndroidDevice() &&
    !isNativeApp()
  ) {
    sessionStorage.removeItem("tomuda-apk-downloaded");
    setTimeout(showAndroidInstallCoach, 800);
  }
}
function tryAutoInstallFromRedirect() {
  const url = new URL(location.href);
  const pending =
    url.searchParams.get("install") === "1" ||
    sessionStorage.getItem("tomuda-pending-install") === "1";
  if (!pending) return;
  url.searchParams.delete("install");
  history.replaceState(null, "", url.pathname + url.search + url.hash);
  sessionStorage.removeItem("tomuda-pending-install");

  if (!isIosDevice()) {
    if (isAndroidDevice()) installAppOnPhone();
    return;
  }

  if (!isSafariBrowser()) return;

  let tries = 0;
  const attempt = async () => {
    if (await triggerNativeInstallPrompt()) return;
    if (++tries < 15) {
      setTimeout(attempt, 400);
      return;
    }
    showIosInstallCoach();
  };
  setTimeout(attempt, 600);
}
function apkDownloadUrl() {
  return "/static/tomuda/downloads/TOMUDA.apk";
}
function androidApkInstallSteps() {
  return `<a href="${apkDownloadUrl()}" download="TOMUDA.apk" class="block w-full py-3 mb-4 bg-primary text-primary-foreground rounded font-semibold text-center no-underline">📥 TOMUDA.apk татах (Play Store шаардлаггүй)</a><ol class="space-y-3 text-sm leading-relaxed"><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">1</span><span>Дээрх товчоор <b>APK файл</b> татна</span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">2</span><span>Татсан файл дээр дарж <b>суулгана</b></span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">3</span><span>«Танихгүй эх үүсвэр» гэвэл <b>Зөвшөөрөх</b> дарна</span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">4</span><span>Нүүр дэлгэцээс <b>ТОМУДА</b> app-аар нээнэ</span></li></ol>`;
}
function openInChrome() {
  const page = installUrlWithFlag();
  const path = page.replace(/^https?:\/\//, "");
  location.href = `intent://${path}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(page)};end`;
}
function initPwa() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("Service worker registration failed", err));
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    pwaInstallPrompt = e;
    showUnifiedInstallBanner();
  });
  window.addEventListener("appinstalled", () => {
    dismissPwaInstall(false);
    dismissInstallCoach();
    showInstallToast("App амжилттай суулгагдлаа!");
  });
  checkPendingApkInstallCoach();
  tryAutoInstallFromRedirect();
  if (isNativeApp()) return;
  const dismissed = Number(localStorage.getItem("pwa-install-dismissed") || 0);
  const showAuto = Date.now() - dismissed >= 7 * 86400000;
  if (showAuto) setTimeout(showUnifiedInstallBanner, 1200);
}
function pwaInstallSidebarBtn() {
  if (isNativeApp()) return "";
  return `<button onclick="installAppOnPhone()" class="w-full px-4 py-3 rounded text-left hover:bg-sidebar-accent border border-sidebar-primary/30"><span class="font-medium text-sidebar-primary">${pwaInstallLabel()}</span></button>`;
}
function showUnifiedInstallBanner() {
  if (isNativeApp() || document.getElementById("pwa-install")) return;
  const el = document.createElement("div");
  el.id = "pwa-install";
  el.className = "pwa-install-banner";
  el.innerHTML = `<div class="pwa-install-inner"><div><p class="pwa-install-title">${pwaInstallLabel()}</p><p class="pwa-install-text">Дармагц суулгагдана — нүүр дэлгэц дээр <strong>байнгын app</strong></p></div><div class="pwa-install-actions"><button type="button" onclick="installAppOnPhone()" class="pwa-install-btn">Суулгах</button><button type="button" onclick="dismissPwaInstall()" class="pwa-install-dismiss">Хаах</button></div></div>`;
  document.body.appendChild(el);
}
function openPwaInstallModal() {
  installAppOnPhone();
}
function showPwaInstallBanner() {
  showUnifiedInstallBanner();
}
function installPwaApp() {
  installAppOnPhone();
}
function dismissPwaInstall(remember = true) {
  document.getElementById("pwa-install")?.remove();
  if (remember)
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
}
function scheduleBackendSave() {
  if (!backendReady) return;
  clearTimeout(backendSaveTimer);
  backendSaveTimer = setTimeout(saveBackendState, 350);
}
async function saveBackendState() {
  const body = JSON.stringify({ state: persistentState() });
  if (body === backendLastSaved) return;
  try {
    const res = await fetch(`${API_BASE}/state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
    });
    if (res.ok) backendLastSaved = body;
  } catch (error) {
    console.warn("Backend state save failed", error);
  }
}

function go(view) {
  if (!canAccessView(view)) return;
  state.currentView = view;
  state.mobileOpen = false;
  render();
}
function search(key, value) {
  state.searches[key] = value;
  render();
  const el = document.querySelector(`[data-focus="${key}"]`);
  if (el) {
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }
}
function shell(content) {
  const userRole = currentRole();
  const nav = [
    ["worker", "Захиалга үүсгэх"],
    ["customers", "Харилцагч"],
    ["products", "Бараа"],
    ["warehouse", "Агуулах"],
    ["count", "Тооллогo"],
    ["admin", "Админ"],
  ].filter(([id]) => allowedNavIds(userRole).includes(id));
  return `<div class="min-h-screen bg-background flex"><button onclick="state.mobileOpen=!state.mobileOpen;render()" class="mobile-menu-button lg:hidden fixed z-50 bg-sidebar text-sidebar-foreground rounded ${state.mobileOpen ? "mobile-menu-button--open" : ""}" aria-label="${state.mobileOpen ? "Цэс хаах" : "Цэс нээх"}">${state.mobileOpen ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>` : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`}</button>${state.mobileOpen ? `<div onclick="state.mobileOpen=false;render()" class="mobile-menu-overlay lg:hidden fixed inset-0 bg-black/50 z-30"></div>` : ""}<aside class="mobile-sidebar fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 ${state.mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} flex flex-col"><div class="sidebar-brand p-6 border-b border-sidebar-border"><div class="sidebar-brand__row flex items-center gap-3 min-w-0"><img src="${BRAND.logoWhite}" alt="ТОМУДА" class="tomuda-logo" width="44" height="44" decoding="async"><div class="min-w-0"><h1 class="text-lg font-bold text-sidebar-primary truncate">ТОМУДА</h1></div></div></div><nav class="flex-1 p-4 space-y-1 overflow-y-auto">${nav.map(([id, label]) => `<button onclick="go('${id}')" class="w-full px-4 py-3 rounded text-left ${state.currentView === id ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent"}"><span class="font-medium">${label}</span></button>`).join("")}${pwaInstallSidebarBtn()}</nav><div class="p-4 border-t border-sidebar-border"><div class="flex items-center gap-3 px-4 py-3 rounded bg-sidebar-accent"><div class="flex-1 min-w-0"><p class="font-medium truncate">${state.currentEmployee?.name || "Нэвтрээгүй"}</p><p class="text-xs text-sidebar-foreground/70 truncate">${state.currentEmployee ? role(state.currentEmployee.role) : ""}</p></div>${state.currentEmployee ? `<button onclick="logout()" class="px-3 py-2 hover:bg-sidebar-border rounded text-sm shrink-0">Гарах</button>` : ""}</div></div></aside><main class="flex-1 p-4 lg:p-8 overflow-auto"><div class="max-w-7xl mx-auto pt-12 lg:pt-0">${["employees", "inventory", "reports", "promotions"].includes(state.currentView) ? `<button onclick="go('admin')" class="mb-2 px-3 py-1.5 bg-card rounded text-sm">← Админ</button>` : ""}${content}</div></main></div>`;
}
function adminView() {
  ensureSettings();
  const pending = state.orders.filter((o) => o.status === "pending").length,
    lowList = lowStockProducts(),
    low = lowList.length,
    sales = state.employees.length;
  const alertMin = state.settings.stockAlertMin;
  const alertOn = state.settings.stockAlertEnabled !== false;
  const actions = [
    ["products", "Бараа"],
    ["employees", "Ажилтан"],
    ["inventory", "Агуулах"],
    ["reports", "Тайлан"],
    ["promotions", "Урамшуулал"],
  ];
  const lowListHtml = alertOn && low
    ? `<div class="bg-card rounded overflow-hidden border border-border"><div class="px-4 py-3 bg-secondary/50 flex items-center justify-between gap-2"><p class="font-semibold text-sm">Дутуу үлдэгдэл (${low})</p><button type="button" onclick="go('products')" class="text-sm text-primary font-medium">Бараа харах</button></div><div class="divide-y divide-border max-h-48 overflow-y-auto">${lowList
        .slice(0, 12)
        .map(
          (p) =>
            `<div class="px-4 py-2.5 flex justify-between gap-2 text-sm"><span class="truncate font-medium">${esc(p.name)}</span><span class="shrink-0 text-tone-warning font-semibold">${p.stock} / ${stockAlertLevel(p)}</span></div>`,
        )
        .join("")}${low > 12 ? `<p class="px-4 py-2 text-xs text-muted-foreground">+ ${low - 12} бараа...</p>` : ""}</div></div>`
    : "";
  return `<div class="space-y-4">${pageHead("Админ")}<div class="grid grid-cols-2 lg:grid-cols-4 gap-2">${card("Хүлээгдэж", pending)}${card("Дутуу үлд", low, low && alertOn ? "text-tone-warning" : "text-tone-success")}${card("Харилцагч", state.customers.length)}${card("Ажилтан", sales)}</div><form onsubmit="saveStockAlertSettings(event)" class="bg-card rounded p-4 space-y-3 border border-border"><p class="font-semibold">Үлдэгдэл сануулга</p><label class="flex items-center gap-3 text-sm cursor-pointer"><input type="checkbox" name="stockAlertEnabled" ${alertOn ? "checked" : ""} class="w-4 h-4 rounded"><span>Үлдэгдэл доош болохоор сануулга харуулах</span></label><label class="block text-sm"><span class="font-medium">Ерөнхий доод хэмжээ (ширхэг)</span><input type="number" name="stockAlertMin" min="0" step="1" value="${alertMin}" class="w-full mt-2 px-4 py-3 bg-secondary rounded app-input"><span class="text-xs text-muted-foreground mt-1 block">Үлдэгдэл энэ тооноос ≤ бол «дутуу» гэж тооцно. Бараа бүрт 0 гэж өгвөл энэ ерөнхий тоо ашиглагдана.</span></label><button type="submit" class="w-full sm:w-auto px-4 py-2.5 bg-primary text-primary-foreground rounded font-medium">Хадгалах</button></form>${lowListHtml}<div class="grid grid-cols-2 md:grid-cols-3 gap-2">${actions.map((a) => `<button onclick="go('${a[0]}')" class="admin-action bg-card rounded p-4 text-left font-semibold hover:bg-secondary/40">${a[1]}</button>`).join("")}</div></div>`;
}
function saveStockAlertSettings(e) {
  if (!isAdmin()) return;
  e.preventDefault();
  ensureSettings();
  const data = new FormData(e.target);
  state.settings.stockAlertEnabled = data.get("stockAlertEnabled") === "on";
  state.settings.stockAlertMin = Math.max(0, Number(data.get("stockAlertMin") || 0));
  scheduleBackendSave();
  render();
  showInstallToast("Үлдэгдэл сануулгын тохиргоо хадгалагдлаа");
}
function ordersView() {
  return `<div class="space-y-5">${orderReceiptsPanel({ title: "Захиалга", searchKey: "orders", showCreate: true })}</div>`;
}
function orderReceiptsPanel({
  title = "Захиалгын баримтууд",
  searchKey = "warehouseOrders",
  employeeIds = [],
  showCreate = false,
  compact = false,
} = {}) {
  const q = state.searches[searchKey] || "",
    rows = state.orders.filter(
      (o) =>
        (!employeeIds.length || employeeIds.includes(o.employeeId)) &&
        o.customerName.toLowerCase().includes(q.toLowerCase()) &&
        (state.filters.order === "all" || o.status === state.filters.order),
    );
  if (compact)
    return warehouseReceiptsPanel(rows, { title, searchKey, employeeIds });
  return `<section class="bg-card rounded overflow-hidden"><div class="p-3 border-b border-border flex items-center justify-between gap-2"><h2 class="page-head__title">${title}</h2>${showCreate ? `<button onclick="orderModal()" class="px-3 py-2 bg-primary text-primary-foreground rounded text-sm shrink-0">+ Шинэ</button>` : ""}</div><div class="p-3 flex flex-col sm:flex-row gap-2"><input data-focus="${searchKey}" value="${esc(q)}" oninput="search('${searchKey}',this.value)" placeholder="Хайх..." class="flex-1 px-3 py-2.5 bg-secondary rounded text-sm"><select onchange="state.filters.order=this.value;render()" class="px-4 py-2.5 bg-secondary rounded text-sm"><option value="all">Бүгд</option>${["pending", "confirmed", "delivered", "cancelled"].map((s) => `<option value="${s}" ${state.filters.order === s ? "selected" : ""}>${status(s)}</option>`).join("")}</select></div><div class="overflow-x-auto"><table class="w-full"><thead class="bg-secondary/50"><tr><th class="px-4 py-3 text-left text-xs font-semibold">Захиалга</th><th class="px-4 py-3 text-left text-xs font-semibold">Ажилтан</th><th class="px-4 py-3 text-left text-xs font-semibold">Бараа</th><th class="px-4 py-3 text-left text-xs font-semibold">Төлөв</th><th class="px-4 py-3 text-right text-xs font-semibold">Дүн</th><th class="px-4 py-3 text-right text-xs font-semibold">Үйлдэл</th></tr></thead><tbody class="divide-y divide-border">${rows.map(orderRow).join("")}</tbody></table></div>${rows.length ? "" : `<div class="p-12 text-center text-muted-foreground">Захиалга олдсонгүй</div>`}</section>`;
}
function warehouseReceiptsPanel(rows, { title, searchKey, employeeIds }) {
  if (rows.length && !rows.some((o) => o.id === state.selectedWarehouseOrderId))
    state.selectedWarehouseOrderId = rows[0].id;
  if (!rows.length) state.selectedWarehouseOrderId = "";
  const selected = rows.find((o) => o.id === state.selectedWarehouseOrderId),
    total = rows.reduce((s, o) => s + o.total, 0);
  return `<section class="bg-card rounded overflow-hidden"><div class="p-3 border-b border-border flex items-center justify-between gap-2"><h2 class="page-head__title">${title}</h2><div class="flex items-center gap-2 shrink-0"><b class="text-primary">${fmt(total)}</b><button onclick="go('warehouse')" class="px-2 py-1.5 bg-secondary rounded text-sm">←</button></div></div><div class="p-3 flex flex-col sm:flex-row gap-2"><input data-focus="${searchKey}" value="${esc(state.searches[searchKey] || "")}" oninput="search('${searchKey}',this.value)" placeholder="Хайх..." class="flex-1 px-3 py-2.5 bg-secondary rounded text-sm"><select onchange="state.filters.order=this.value;render()" class="px-4 py-2.5 bg-secondary rounded text-sm"><option value="all">Бүгд</option>${["pending", "confirmed", "delivered", "cancelled"].map((s) => `<option value="${s}" ${state.filters.order === s ? "selected" : ""}>${status(s)}</option>`).join("")}</select></div><div class="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] border-t border-border"><div class="border-b lg:border-b-0 lg:border-r border-border max-h-[520px] overflow-y-auto">${rows.length ? rows.map((o) => `<button onclick="selectWarehouseOrder('${o.id}')" class="w-full text-left px-4 py-3 border-b border-border hover:bg-secondary/40 ${state.selectedWarehouseOrderId === o.id ? "bg-primary/10" : ""}"><p class="font-semibold truncate">${o.customerName}</p></button>`).join("") : `<div class="p-6 text-sm text-muted-foreground text-center">Захиалга олдсонгүй</div>`}</div>${selected ? warehouseOrderDetail(selected) : `<div class="p-8 text-sm text-muted-foreground text-center">Дэлгүүр сонгоно уу</div>`}</div></section>`;
}
function warehouseOrderDetail(o) {
  return `<div class="p-4 space-y-4"><div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><p class="text-sm text-muted-foreground">Захиалгын дүн</p><p class="text-2xl font-bold text-primary">${fmt(o.total)}</p></div><div class="flex flex-wrap gap-2"><span class="inline-flex px-2.5 py-1 rounded text-xs font-medium ${badge(o.status)}">${status(o.status)}</span><button onclick="printOrderReceipt('${o.id}')" class="px-3 py-1.5 bg-secondary rounded text-sm">Хэвлэх</button></div></div><div><h3 class="font-semibold">${o.customerName}</h3><p class="text-sm text-muted-foreground">${o.employeeName || "-"} · ${dte(o.createdAt)}</p></div><div class="bg-secondary/50 rounded overflow-hidden"><div class="grid grid-cols-[1fr_72px_100px] gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground"><span>Бараа</span><span class="text-right">Тоо</span><span class="text-right">Дүн</span></div>${o.items.map((i) => `<div class="grid grid-cols-[1fr_72px_100px] gap-2 px-3 py-3 border-t border-border text-sm"><span class="font-medium">${i.productName}</span><b class="text-right">${i.quantity}</b><span class="text-right">${fmt(i.total)}</span></div>`).join("")}</div></div>`;
}
function orderRow(o) {
  const pendingActions =
    o.status === "pending"
      ? `<button onclick="setOrder('${o.id}','confirmed')" class="px-3 py-1.5 tone tone--success rounded text-sm">Батлах</button>${canDelete() ? `<button onclick="setOrder('${o.id}','cancelled')" class="px-3 py-1.5 tone tone--danger rounded text-sm">Цуцлах</button>` : ""}`
      : "";
  const deliveredAction =
    o.status === "confirmed"
      ? `<button onclick="setOrder('${o.id}','delivered')" class="px-3 py-1.5 tone tone--info rounded text-sm">Хүргэсэн</button>`
      : "";
  return `<tr class="hover:bg-secondary/30"><td class="px-4 py-3"><p class="font-medium">${o.customerName}</p><p class="text-xs text-muted-foreground">#${o.id} · ${dte(o.createdAt)}</p></td><td class="px-4 py-3 text-sm">${o.employeeName || "-"}</td><td class="px-4 py-3 text-sm">${o.items.length} бараа</td><td class="px-4 py-3"><span class="inline-flex px-2.5 py-1 rounded text-xs font-medium ${badge(o.status)}">${status(o.status)}</span></td><td class="px-4 py-3 text-right text-sm font-semibold">${fmt(o.total)}</td><td class="px-4 py-3"><div class="flex justify-end gap-2 whitespace-nowrap"><button onclick="orderReceiptModal('${o.id}')" class="px-3 py-1.5 bg-secondary rounded text-sm">Баримт</button><button onclick="printOrderReceipt('${o.id}')" class="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm">Хэвлэх</button>${pendingActions}${deliveredAction}</div></td></tr>`;
}
function customerListHead() {
  return `<div class="customer-row customer-row--head" aria-hidden="true"><div class="customer-row__name"><span>Харилцагч</span></div><div class="customer-row__phone"><span>Дугаар</span></div><div class="customer-row__address"><span>Хаяг</span></div><div class="customer-row__actions"><span class="customer-row__actions-label">Үйлдэл</span></div></div>`;
}
function customerListRow(c, actionsHtml, active = false) {
  const addr = customerAddress(c);
  return `<div class="customer-row ${active ? "customer-row--active" : ""}"><div class="customer-row__name min-w-0"><p class="customer-row__title">${esc(c.name)}</p><p class="customer-row__company">${esc(c.companyName || "-")}</p></div><div class="customer-row__phone"><span class="customer-row__label">Дугаар</span><span class="customer-row__value">${esc(c.phone1 || "-")}</span></div><div class="customer-row__address min-w-0"><span class="customer-row__label">Хаяг</span><span class="customer-row__value customer-row__value--address" title="${esc(addr)}">${esc(addr)}</span></div><div class="customer-row__actions">${actionsHtml}</div></div>`;
}
function customersView() {
  const q = state.searches.customers || "",
    rows = state.customers.filter((c) =>
      [c.name, c.companyName, c.phone1].some((v) =>
        (v || "").toLowerCase().includes(q.toLowerCase()),
      ),
    );
  return `<div class="space-y-4">${pageHead("Харилцагч", `<button type="button" onclick="customerModal()" class="px-3 py-2 bg-primary text-primary-foreground rounded text-sm shrink-0">+ Нэмэх</button>`)}<div class="list-panel"><div class="list-panel__toolbar"><input data-focus="customers" value="${esc(q)}" oninput="search('customers',this.value)" placeholder="Хайх..." class="list-panel__search app-input"></div><div class="list-panel__table">${customerListHead()}<div class="list-panel__body divide-y divide-border/60">${rows.length ? rows.map(customerRow).join("") : `<div class="list-panel__empty">Харилцагч олдсонгүй</div>`}</div></div></div></div>`;
}
function customerAddress(c) {
  return (
    [c.province, c.district, c.khoroo, c.address].filter(Boolean).join(", ") ||
    "-"
  );
}
function customerRow(c) {
  const deleteBtn = canDelete()
    ? `<button type="button" onclick="confirmDelete('customer','${c.id}')" class="list-btn list-btn--danger">Устгах</button>`
    : "";
  return customerListRow(
    c,
    `<button type="button" onclick="customerDetail('${c.id}')" class="list-btn list-btn--secondary">Харах</button><button type="button" onclick="customerModal('${c.id}')" class="list-btn list-btn--primary">Засах</button>${deleteBtn}`,
  );
}
function workerStoreRow(c) {
  const active = state.workerCustomer === c.id;
  return customerListRow(
    c,
    `<button type="button" onclick="customerDetail('${c.id}')" class="list-btn list-btn--secondary">Харах</button><button type="button" onclick="pickWorkerStore('${c.id}')" class="list-btn list-btn--primary">Сонгох</button>`,
    active,
  );
}
function productsView() {
  const q = state.searches.products || "",
    cat = state.filters.category,
    list = state.products.filter(
      (p) =>
        (p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.barcode.includes(q)) &&
        (cat === "all" || p.category === cat),
    ),
    low = lowStockProducts().length;
  return `<div class="space-y-4">${pageHead("Бараа", `<button onclick="csv('products.csv',state.products.map(p=>[p.barcode,p.name,p.category,p.price,p.stock,p.unit]))" class="px-3 py-2 bg-secondary rounded text-sm shrink-0">Татах</button>`)}<div class="mobile-stats grid grid-cols-3 gap-2">${card("Бараа", state.products.length)}${card("Төрөл", cats().length)}${card("Дутуу", low, low ? "text-tone-warning" : "text-tone-success")}</div><div class="bg-card rounded p-3 products-toolbar"><input data-focus="products" value="${esc(q)}" oninput="search('products',this.value)" placeholder="Хайх..." class="flex-1 px-3 py-2.5 bg-secondary rounded"><select onchange="state.filters.category=this.value;render()" class="px-3 py-2.5 bg-secondary rounded"><option value="all">Бүх төрөл</option>${cats()
    .map((c) => `<option ${cat === c ? "selected" : ""}>${c}</option>`)
    .join(
      "",
    )}</select>${isAdmin() ? `<button onclick="categoryModal()" class="px-4 py-3 bg-secondary rounded">Төрөл нэмэх</button><button onclick="productModal()" class="px-4 py-3 bg-primary text-primary-foreground rounded">Бараа нэмэх</button>` : ""}</div><div class="bg-card rounded overflow-hidden product-list">${list.length ? list.map(productCard).join("") : `<div class="p-8 text-center text-sm text-muted-foreground">Бараа олдсонгүй</div>`}</div></div>`;
}
function productCard(p) {
  const adminActions = isAdmin()
    ? `<div class="product-card__actions"><button onclick="productModal('${p.id}')" class="px-3 py-2 bg-secondary rounded text-sm">Засах</button><button onclick="confirmDelete('product','${p.id}')" class="px-3 py-2 tone tone--danger rounded text-sm">Устгах</button></div>`
    : "";
  return `<article class="product-card">${adminActions}<div class="product-card__body"><img src="${productImage(p)}" alt="${esc(p.name)}" class="product-card__img"><div class="product-card__meta"><p class="product-card__title">${p.name}</p><p class="product-card__sub product-card__sub--desktop">${p.category || "-"} · ${p.country || ""}</p><div class="product-card__row"><span class="product-card__price">${fmt(p.price)}</span><span class="product-card__badge ${isLowStock(p) ? "product-card__badge--low" : ""}">Үлд: ${p.stock ?? 0}</span></div><p class="product-card__sub product-card__sub--desktop font-mono">${p.barcode || "-"}</p></div></div></article>`;
}
function inventoryView() {
  const tab = state.filters.inventory,
    cat = state.filters.inventoryCategory,
    q = state.searches.inventory || "",
    list = state.products.filter(
      (p) =>
        (cat === "all" || p.category === cat) &&
        (p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.barcode.includes(q)),
    );
  return `<div class="space-y-4">${pageHead("Агуулах", `<button onclick="csv('inventory.csv',state.inventoryLogs.map(l=>[dte(l.date),l.productName,l.type,l.quantity,l.employeeName]))" class="px-3 py-2 bg-secondary rounded text-sm shrink-0">Татах</button>`)}<div class="inventory-tabs grid grid-cols-3 gap-1 p-1 bg-secondary rounded">${[
    ["stock", "Үлдэгдэл"],
    ["in", "Орлого авах"],
    ["out", "Зарлага гаргах"],
  ]
    .map(
      (t) =>
        `<button type="button" onclick="state.filters.inventory='${t[0]}';render()" class="inventory-tab px-2 py-2.5 rounded text-sm font-medium ${tab === t[0] ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}">${t[1]}</button>`,
    )
    .join(
      "",
    )}</div><div class="bg-card rounded p-3 space-y-3"><div class="inventory-categories flex flex-wrap gap-2"><button type="button" onclick="setInventoryCategory('all')" class="px-3 py-2 rounded text-sm ${cat === "all" ? "bg-primary text-primary-foreground" : "bg-secondary"}">Бүх төрөл</button>${cats()
    .map(
      (c) =>
        `<button type="button" onclick="setInventoryCategory('${esc(c)}')" class="px-3 py-2 rounded text-sm ${cat === c ? "bg-primary text-primary-foreground" : "bg-secondary"}">${c}</button>`,
    )
    .join(
      "",
    )}</div><input data-focus="inventory" value="${esc(q)}" oninput="search('inventory',this.value)" placeholder="Хайх..." class="w-full px-3 py-2.5 bg-secondary rounded app-input"></div>${tab === "stock" ? stockGrid(list) : stockActionList(list, tab)}</div>`;
}
function stockActionRow(p, tab) {
  const isIn = tab === "in",
    label = isIn ? "Орлого" : "Зарлага",
    btnClass = isIn
      ? "inventory-stock-row__btn inventory-stock-row__btn--in"
      : "inventory-stock-row__btn inventory-stock-row__btn--out";
  return `<div class="inventory-stock-row"><img src="${productImage(p)}" alt="${esc(p.name)}" class="product-thumb inventory-stock-row__thumb"><div class="inventory-stock-row__info min-w-0"><p class="inventory-stock-row__name">${p.name}</p><p class="inventory-stock-row__barcode">${p.barcode || "-"}</p><span class="inventory-stock-row__stock">Үлдэгдэл: <b>${p.stock} ${p.unit || "ш"}</b></span></div><div class="inventory-stock-row__controls"><label class="inventory-stock-row__qty-label"><span>Тоо</span><input id="qty-${p.id}" type="number" min="1" value="1" inputmode="numeric" class="inventory-stock-row__qty app-input"></label><button type="button" onclick="applyStock('${p.id}','${tab}')" class="${btnClass}">${label}</button></div></div>`;
}
function stockActionList(list, tab) {
  const hint =
    tab === "in"
      ? "Агуулах руу нэмэх барааны тоог оруулаад «Орлого» дарна"
      : "Гаргах барааны тоог оруулаад «Зарлага» дарна";
  return `<div class="bg-card rounded overflow-hidden inventory-stock-panel"><div class="inventory-stock-panel__hint px-4 py-3 text-sm text-muted-foreground bg-secondary/40 border-b border-border">${hint}</div><div class="divide-y divide-border">${list.length ? list.map((p) => stockActionRow(p, tab)).join("") : `<div class="p-8 text-center text-sm text-muted-foreground">Бараа олдсонгүй</div>`}</div></div>`;
}
function stockGrid(list) {
  return `<div class="bg-card rounded overflow-hidden"><div class="hidden md:grid grid-cols-[1fr_140px_140px_120px] gap-3 px-4 py-3 bg-secondary/50 text-xs font-semibold text-muted-foreground"><span>Бараа</span><span>Төрөл</span><span>Баркод</span><span class="text-right">Үлдэгдэл</span></div><div class="divide-y divide-border">${list.length ? list.map((p) => `<div class="p-4 grid grid-cols-1 md:grid-cols-[1fr_140px_140px_120px] gap-3 md:items-center"><div><p class="font-medium">${p.name}</p><p class="md:hidden text-xs text-muted-foreground mt-1">${p.category} · ${p.barcode}</p></div><span class="hidden md:block text-sm">${p.category}</span><span class="hidden md:block text-sm font-mono">${p.barcode}</span><b class="md:text-right">${p.stock} ${p.unit}</b></div>`).join("") : `<div class="p-8 text-center text-sm text-muted-foreground">Бараа олдсонгүй</div>`}</div></div>`;
}
function countView() {
  const q = state.searches.count || "",
    list = state.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q.toLowerCase()) || p.barcode.includes(q),
    ),
    counted = Object.keys(state.countQty).filter(
      (id) => countValue(id) !== null,
    ).length,
    mismatches = countMismatches();
  return `<div class="space-y-4">${pageHead("Тооллогo")}<div class="mobile-stats grid grid-cols-3 gap-2">${card("Тоолсон", counted)}${card("Зөрүү", mismatches.length, mismatches.length ? "text-tone-danger" : "text-tone-success")}${card("Нийт", state.products.length)}</div><input data-focus="count" value="${esc(q)}" oninput="search('count',this.value)" placeholder="Хайх..." class="w-full px-3 py-2.5 bg-card rounded"><div class="bg-card rounded overflow-hidden"><div class="count-list divide-y divide-border">${list.map(countRow).join("")}</div></div><div class="grid grid-cols-2 gap-2"><button onclick="finishCount()" class="py-3 bg-primary text-primary-foreground rounded font-medium">Дуусгах</button><button onclick="state.countQty={};state.countDone=false;render()" class="py-3 bg-card rounded font-medium">Шинэ</button></div>${state.countDone ? countResult(mismatches) : ""}</div>`;
}
function countRow(p) {
  const value = countValue(p.id),
    diff = value === null ? null : value - Number(p.stock || 0),
    diffText = diff === null ? "-" : diff > 0 ? `+${diff}` : String(diff),
    diffClass =
      diff === null || diff === 0
        ? "text-muted-foreground"
        : "text-tone-danger font-semibold";
  return `<div class="count-row"><img src="${productImage(p)}" class="product-thumb" alt="${esc(p.name)}"><div class="min-w-0"><p class="font-medium text-sm">${p.name}</p><p class="text-xs text-muted-foreground count-row__meta">Бүрт ${p.stock} ${p.unit}</p></div><input onchange="setCountQty('${p.id}',this.value)" value="${value ?? ""}" placeholder="0" type="number" class="px-2 py-2 bg-secondary rounded text-center w-16"><span class="text-sm ${diffClass} count-row__diff">${diffText}</span></div>`;
}
function countValue(id) {
  const value = state.countQty[id];
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function setCountQty(id, value) {
  if (value === "") delete state.countQty[id];
  else state.countQty[id] = Number(value);
  state.countDone = false;
  render();
}
function countMismatches() {
  return state.products
    .map((p) => {
      const counted = countValue(p.id);
      return counted === null
        ? null
        : { product: p, counted, diff: counted - Number(p.stock || 0) };
    })
    .filter((row) => row && row.diff !== 0);
}
function countResult(mismatches) {
  return `<div class="bg-card rounded overflow-hidden"><div class="px-4 py-3 bg-secondary/50"><p class="font-semibold">Тооллого хадгалагдлаа</p><p class="text-sm text-muted-foreground mt-1">Зөрүүтэй бараа: ${mismatches.length}</p></div>${mismatches.length ? `<div class="divide-y divide-border">${mismatches.map(({ product, counted, diff }) => `<div class="px-4 py-3 grid grid-cols-1 sm:grid-cols-[1fr_90px_90px_90px] gap-2 text-sm"><span class="font-medium">${product.name}</span><span>Бүртгэл: <b>${product.stock}</b></span><span>Тоолсон: <b>${counted}</b></span><span class="${diff === 0 ? "text-muted-foreground" : "text-tone-danger font-semibold"}">Зөрүү: ${diff > 0 ? `+${diff}` : diff}</span></div>`).join("")}</div>` : `<div class="p-4 text-sm text-tone-success font-medium">Зөрүүтэй бараа байхгүй</div>`}</div>`;
}
function finishCount() {
  if (!Object.keys(state.countQty).some((id) => countValue(id) !== null)) {
    return alert("Тоолсон тоо оруулна уу");
  }
  state.countDone = true;
  render();
}
function setInventoryCategory(cat) {
  state.filters.inventoryCategory = cat;
  render();
}
function reportsView() {
  const total = state.orders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + o.total, 0),
    paid = state.orders
      .filter((o) => o.isPaid)
      .reduce((s, o) => s + o.total, 0),
    stock = state.products.reduce((s, p) => s + p.stock * p.costPrice, 0);
  const sales = state.employees
    .filter((e) => e.role === "sales")
    .map((e) => {
      const orders = state.orders.filter((o) => o.employeeId === e.id);
      const sum = orders.reduce((s, o) => s + o.total, 0);
      return {
        ...e,
        count: orders.length,
        sum,
        commission: (sum * e.commissionRate) / 100,
      };
    });
  return `<div class="space-y-4">${pageHead("Тайлан", `<button onclick="csv('report.csv',[[${total},${paid}]])" class="px-3 py-2 bg-primary text-primary-foreground rounded text-sm shrink-0">Татах</button>`)}<div class="grid grid-cols-2 lg:grid-cols-4 gap-2">${card("Борлуулалт", fmt(total))}${card("Төлсөн", fmt(paid), "text-tone-success")}${card("Төлөөгүй", fmt(total - paid), "text-tone-danger")}${card("Үлдэгдэл", fmt(stock))}</div><div class="bg-card rounded overflow-hidden"><div class="px-3 py-2 bg-secondary/50 font-semibold text-sm">Төлбөр</div>${state.orders.length ? state.orders.map(paymentRow).join("") : `<div class="p-4 text-sm text-muted-foreground">Захиалга байхгүй</div>`}</div><div class="bg-card rounded overflow-hidden"><div class="px-3 py-2 bg-secondary/50 font-semibold text-sm">Ажилтан</div>${sales.map((e, i) => `<div class="px-3 py-2 border-t flex justify-between gap-2"><span>${i + 1}. ${e.name}</span><b>${fmt(e.sum)}</b></div>`).join("")}</div></div>`;
}
function paymentRow(o) {
  return `<div class="px-4 py-3 border-t grid grid-cols-1 md:grid-cols-[1fr_130px_130px_190px] gap-3 md:items-center"><div><p class="font-medium">${o.customerName}</p><p class="text-xs text-muted-foreground">#${o.id} · ${o.employeeName || "-"} · ${o.paymentTerm === "credit" ? "Зээлээр" : "Бэлэн"}</p></div><b class="text-sm">${fmt(o.total)}</b><span class="text-sm font-medium ${o.isPaid ? "text-tone-success" : "text-tone-danger"}">${o.isPaid ? "Төлсөн" : "Төлөөгүй"}</span><div class="grid grid-cols-2 gap-2"><button onclick="setPaid('${o.id}',true)" class="px-3 py-2 rounded text-sm ${o.isPaid ? "tone tone--success" : "bg-secondary"}">Төлсөн</button><button onclick="setPaid('${o.id}',false)" class="px-3 py-2 rounded text-sm ${!o.isPaid ? "tone tone--danger" : "bg-secondary"}">Төлөөгүй</button></div></div>`;
}
function promotionsView() {
  const tab = state.filters.promotionTab,
    qty = state.promotionRules.quantity || [],
    price = state.promotionRules.price || [];
  return `<div class="space-y-4">${pageHead("Урамшуулал", `<button onclick="go('admin')" class="px-3 py-2 bg-card rounded text-sm shrink-0">←</button>`)}<div class="grid grid-cols-2 gap-2 bg-card rounded p-2"><button onclick="state.filters.promotionTab='quantity';render()" class="py-2.5 rounded font-medium text-sm ${tab === "quantity" ? "bg-primary text-primary-foreground" : "bg-secondary/60"}">Тоо ширхэг</button><button onclick="state.filters.promotionTab='price';render()" class="py-2.5 rounded font-medium text-sm ${tab === "price" ? "bg-primary text-primary-foreground" : "bg-secondary/60"}">Үнийн хөнгөлөлт</button></div>${tab === "quantity" ? promotionQuantityPanel(qty) : promotionPricePanel(price)}</div>`;
}
function productLabel(id) {
  return state.products.find((p) => p.id === id)?.name || "-";
}
function promotionProductPickerBlock(
  fieldName,
  title,
  selectedId = "",
  opts = null,
) {
  const variant = opts?.variant || "",
    excludeId = opts?.excludeId || "",
    placeholder = opts?.placeholder || "Нэр, баркод бичээд хайна уу...",
    hint = opts?.hint || "",
    rawQ = state.searches[`promo_${fieldName}`] || "",
    q = rawQ.toLowerCase().trim(),
    selected = state.products.find((p) => p.id === selectedId),
    products = q
      ? state.products.filter(
          (p) =>
            p.id !== excludeId &&
            (p.name.toLowerCase().includes(q) ||
              p.barcode.includes(q) ||
              p.category.toLowerCase().includes(q)),
        )
      : [],
    duplicate = selectedId && excludeId && selectedId === excludeId,
    listHtml = q
      ? products.length
        ? `<div class="promo-product-list">${products.map((p) => promotionProductPickRow(p, fieldName, selectedId)).join("")}</div>`
        : `<p class="p-4 text-sm text-muted-foreground text-center">${excludeId ? "Бусад бараа олдсонгүй" : "Бараа олдсонгүй"}</p>`
      : selected
        ? `<div class="promo-product-list">${promotionProductPickRow(selected, fieldName, selectedId)}</div>`
        : "",
    qtyHtml = opts?.qty
      ? promotionQtyField(
          opts.qty.name,
          opts.qty.label,
          opts.qty.defaultValue,
          true,
        )
      : "",
    searchInput = `<input data-promo-search="${fieldName}" value="${esc(rawQ)}" oninput="promoProductSearch('${fieldName}',this.value)" placeholder="${esc(placeholder)}" class="promo-search-input px-3 py-2 bg-secondary rounded text-sm">`,
    inputRow = opts?.qty
      ? `<div class="promo-input-row">${searchInput}${qtyHtml}</div>`
      : `<div class="mb-2">${searchInput}</div>`,
    badge = variant === "buy" ? "1" : variant === "free" ? "2" : "",
    head = badge
      ? `<div class="promo-section-head"><span class="promo-section-badge">${badge}</span><div><p class="promo-section-title">${title}</p>${hint ? `<p class="promo-section-hint">${hint}</p>` : ""}</div></div>`
      : `<span class="block text-sm font-medium mb-2">${title}</span>`,
    warn = duplicate
      ? `<p class="promo-section-warn">Энэ барааг аль хэдийн нөгөө талд сонгосон байна. Өөр бараа сонгоно уу.</p>`
      : "";
  return `<div class="promo-section${variant ? ` promo-section--${variant}` : ""}"><div class="promo-product-block"><input type="hidden" name="${fieldName}" id="promo-${fieldName}" value="${esc(selectedId)}" required>${head}${inputRow}${warn}${listHtml}</div></div>`;
}
function promoSectionArrow() {
  return `<div class="promo-section-arrow" aria-hidden="true"><span class="promo-section-arrow-icon">↓</span><span class="promo-section-arrow-text">үнэгүй өгнө</span></div>`;
}
function promotionQtyField(name, label, defaultValue, inline = false) {
  const val =
    defaultValue !== undefined && defaultValue !== ""
      ? ` value="${defaultValue}"`
      : "";
  const cls = inline
    ? "promo-qty-field promo-qty-field--inline"
    : "promo-qty-field";
  const wrap = inline ? "" : `<div class="promo-qty-inline">`;
  const wrapEnd = inline ? "" : `</div>`;
  return `${wrap}<label class="${cls}"><span class="block text-xs text-muted-foreground mb-1">${label}</span><input name="${name}" type="number" min="1" required${val} placeholder="1" class="promo-qty-input bg-secondary rounded"></label>${wrapEnd}`;
}
function promotionProductPickRow(p, fieldName, selectedId) {
  const active = selectedId === p.id;
  return `<button type="button" onclick="selectPromoProduct('${fieldName}','${p.id}')" class="promo-product-row ${active ? "is-active" : ""}"><img src="${productImage(p)}" class="product-thumb" alt=""><div class="min-w-0 text-left"><p class="text-sm font-medium truncate">${p.name}</p><p class="text-xs text-muted-foreground">${p.category} · ${p.barcode}</p><p class="text-xs font-semibold text-primary mt-1">${fmt(p.price)} · үлд ${p.stock} ${p.unit}</p></div></button>`;
}
function promoProductSearch(fieldName, value) {
  state.searches[`promo_${fieldName}`] = value;
  promotionQtyModal();
  if (value.trim()) {
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-promo-search="${fieldName}"]`);
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }
}
function selectPromoProduct(fieldName, id) {
  const otherField =
      fieldName === "buyProductId" ? "freeProductId" : "buyProductId",
    otherId = state.promoPick?.[otherField];
  if (otherId && otherId === id) {
    const msg =
      fieldName === "buyProductId"
        ? "Үнэгүй өгөх бараатай ижил байж болохгүй. Өөр бараа сонгоно уу."
        : "Авах бараатай ижил байж болохгүй. Өөр бараа сонгоно уу.";
    return alert(msg);
  }
  state.promoPick = { ...(state.promoPick || {}), [fieldName]: id };
  state.searches[`promo_${fieldName}`] = "";
  const input = document.getElementById(`promo-${fieldName}`);
  if (input) input.value = id;
  promotionQtyModal();
}
function promotionQtyRuleText(r) {
  if (r.buyProductId && r.freeProductId)
    return `${productLabel(r.buyProductId)}-аас ${r.buyQty} ш авахад → ${productLabel(r.freeProductId)} ${r.freeQty || 1} ш үнэгүй`;
  return `${r.minQty || 0} ширхэг · ${r.discountPercent || 0}% (хуучин дүрэм)`;
}
function promotionQuantityPanel(rows) {
  return `<div class="space-y-3"><p class="text-sm text-muted-foreground">Тодорхой бараанаас тодорхой тоо авахад өөр барааг үнэгүй өгнө.</p><button onclick="openPromotionQtyModal()" class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Дүрэм нэмэх</button><div class="bg-card rounded overflow-hidden divide-y divide-border">${rows.length ? rows.map((r, i) => promotionQtyRuleCard(r, i)).join("") : `<div class="p-6 text-sm text-muted-foreground">Тоо ширхгийн дүрэм байхгүй</div>`}</div></div>`;
}
function promotionQtyRuleCard(r, i) {
  const buy = state.products.find((p) => p.id === r.buyProductId) || {},
    free = state.products.find((p) => p.id === r.freeProductId) || {};
  return `<div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"><div class="flex items-center gap-3 min-w-0 flex-1"><img src="${productImage(buy)}" class="product-thumb"><div class="min-w-0"><p class="text-xs text-muted-foreground">Дүрэм ${i + 1}</p><p class="font-medium truncate">${buy.name || "-"}</p><p class="text-muted-foreground">${r.buyQty} ш авахад</p></div><span class="text-muted-foreground shrink-0">→</span><img src="${productImage(free)}" class="product-thumb"><div class="min-w-0"><p class="font-medium truncate">${free.name || "-"}</p><p class="text-tone-success">${r.freeQty || 1} ш үнэгүй</p></div></div>${canDelete() ? `<button onclick="removePromotionRule('quantity',${i})" class="px-3 py-2 tone tone--danger rounded text-sm shrink-0">Устгах</button>` : ""}</div>`;
}
function promotionPricePanel(rows) {
  return `<div class="space-y-3"><button onclick="promotionPriceModal()" class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Дүрэм нэмэх</button><div class="bg-card rounded overflow-hidden divide-y divide-border">${rows.length ? rows.map((r, i) => `<div class="p-4 flex justify-between gap-3 text-sm"><div><p class="font-medium">Дүрэм ${i + 1}</p><p class="text-muted-foreground mt-1">${r.category ? "Ангилал: " + r.category + " · " : "Бүх ангилал · "}${r.discountPercent}% хөнгөлөлт</p></div>${canDelete() ? `<button onclick="removePromotionRule('price',${i})" class="px-3 py-2 tone tone--danger rounded text-sm">Устгах</button>` : ""}</div>`).join("") : `<div class="p-6 text-sm text-muted-foreground">Үнийн дүнгийн дүрэм байхгүй</div>`}</div></div>`;
}
function openPromotionQtyModal() {
  state.promoPick = { buyProductId: "", freeProductId: "" };
  state.searches.promo_buyProductId = "";
  state.searches.promo_freeProductId = "";
  promotionQtyModal();
}
function promotionQtyModal() {
  state.promoPick = state.promoPick || { buyProductId: "", freeProductId: "" };
  const buy = state.promoPick.buyProductId || "",
    free = state.promoPick.freeProductId || "";
  box(
    "Тоо ширхгийн урамшуулал",
    `<form onsubmit="savePromotionQty(event)" class="p-5 flex flex-col max-h-[85vh]"><div class="modal-scroll overflow-y-auto space-y-3 flex-1">${promotionProductPickerBlock("buyProductId", "Авах бараа", buy, { variant: "buy", excludeId: free, hint: "Худалдан авч буй бараа", placeholder: "Авах бараа хайх...", qty: { name: "buyQty", label: "Ширхэг" } })}${promoSectionArrow()}${promotionProductPickerBlock("freeProductId", "Үнэгүй өгөх бараа", free, { variant: "free", excludeId: buy, hint: "Үнэгүй өгөх бараа", placeholder: "Үнэгүй бараа хайх...", qty: { name: "freeQty", label: "Ширхэг", defaultValue: "1" } })}</div><div class="pt-4 mt-2 border-t border-border"><button class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">Хадгалах</button></div></form>`,
    "max-w-2xl",
  );
}
function promotionPriceModal() {
  box(
    "Үнийн дүнгийн урамшуулал",
    `<form onsubmit="savePromotionPrice(event)" class="p-5 space-y-3"><select name="category" class="w-full px-3 py-3 bg-secondary rounded"><option value="">Бүх ангилал</option>${cats()
      .map((c) => `<option>${esc(c)}</option>`)
      .join(
        "",
      )}</select><input name="discountPercent" type="number" min="1" max="100" required placeholder="Хөнгөлөлт %" class="w-full px-3 py-3 bg-secondary rounded"><button class="w-full py-3 bg-primary text-primary-foreground rounded">Хадгалах</button></form>`,
    "max-w-md",
  );
}
function savePromotionQty(e) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  if (!f.buyProductId || !f.freeProductId)
    return alert("Авах болон үнэгүй бараа сонгоно уу");
  if (f.buyProductId === f.freeProductId)
    return alert("Авах болон үнэгүй бараа өөр байх ёстой");
  state.promotionRules.quantity.push({
    buyProductId: f.buyProductId,
    buyQty: Number(f.buyQty),
    freeProductId: f.freeProductId,
    freeQty: Number(f.freeQty) || 1,
  });
  state.promoPick = null;
  state.searches.promo_buyProductId = "";
  state.searches.promo_freeProductId = "";
  closeModal();
  render();
}
function workerPaidLines() {
  return state.products
    .map((p) => {
      const q = state.workerQty[p.id] || 0;
      return q
        ? {
            productId: p.id,
            productName: p.name,
            quantity: q,
            price: p.price,
            total: p.price * q,
          }
        : null;
    })
    .filter(Boolean);
}
function applyQuantityPromotions(lines) {
  const result = lines.map((line) => ({ ...line }));
  const qtyByProduct = {};
  result.forEach((line) => {
    qtyByProduct[line.productId] =
      (qtyByProduct[line.productId] || 0) + line.quantity;
  });
  (state.promotionRules.quantity || []).forEach((rule) => {
    const buyId = rule.buyProductId,
      freeId = rule.freeProductId,
      buyQty = Number(rule.buyQty) || 0,
      freeQty = Number(rule.freeQty) || 1;
    if (!buyId || !freeId || buyQty < 1) return;
    const sets = Math.floor((qtyByProduct[buyId] || 0) / buyQty);
    if (sets < 1) return;
    const grant = sets * freeQty;
    const product = state.products.find((p) => p.id === freeId);
    if (!product) return;
    const existing = result.find(
      (l) => l.productId === freeId && l.isPromoFree,
    );
    if (existing) {
      existing.quantity += grant;
      existing.total = 0;
    } else {
      result.push({
        productId: freeId,
        productName: product.name,
        quantity: grant,
        price: 0,
        total: 0,
        isPromoFree: true,
      });
    }
    qtyByProduct[freeId] = (qtyByProduct[freeId] || 0) + grant;
  });
  return result;
}
function workerOrderLines() {
  return applyQuantityPromotions(workerPaidLines());
}
function workerCartSummary() {
  const paid = workerPaidLines(),
    all = workerOrderLines(),
    promo = all.filter((l) => l.isPromoFree);
  return {
    paid,
    all,
    promo,
    total: all.reduce((s, l) => s + l.total, 0),
    skuCount: paid.length,
    pieceQty: all.reduce((s, l) => s + l.quantity, 0),
  };
}
function savePromotionPrice(e) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  state.promotionRules.price.push({
    category: f.category,
    discountPercent: Number(f.discountPercent),
  });
  closeModal();
  render();
}
function removePromotionRule(type, index) {
  if (!canDelete()) return;
  state.promotionRules[type].splice(index, 1);
  render();
}
function employeesView() {
  return `<div class="space-y-4">${pageHead("Ажилтан", `<button onclick="employeeModal()" class="px-3 py-2 bg-primary text-primary-foreground rounded text-sm shrink-0">+ Нэмэх</button>`)}<div class="bg-card rounded overflow-hidden employee-list">${state.employees.map((e) => `<div class="employee-row px-3 py-3 border-b border-border flex items-center justify-between gap-2"><div class="min-w-0"><p class="font-medium truncate">${e.name}</p><p class="text-sm text-muted-foreground truncate">${role(e.role)} · ${e.email || "-"}</p></div>${canDelete() ? `<button onclick="confirmDelete('employee','${e.id}')" class="px-3 py-2 tone tone--danger rounded text-sm shrink-0">×</button>` : ""}</div>`).join("")}</div></div>`;
}
function getSavedLogin() {
  try {
    const raw = localStorage.getItem("tomuda-login");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function saveLoginCredentials(email, password, remember) {
  if (!remember) {
    localStorage.removeItem("tomuda-login");
    return;
  }
  localStorage.setItem(
    "tomuda-login",
    JSON.stringify({ email, password, remember: true }),
  );
}
function toggleLoginPassword() {
  const input = document.getElementById("loginPassword");
  const btn = document.getElementById("loginPasswordToggle");
  if (!input || !btn) return;
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  btn.textContent = show ? "Нуух" : "Харах";
  btn.setAttribute("aria-label", show ? "Нууц үг нуух" : "Нууц үг харах");
}
function loginView() {
  const saved = getSavedLogin();
  const remember = !!saved?.remember;
  const installBtn = isNativeApp()
    ? ""
    : `<button type="button" onclick="installAppOnPhone()" class="w-full mt-4 py-3 bg-primary text-primary-foreground rounded font-semibold text-sm">${pwaInstallLabel()}</button>`;
  return `<div class="min-h-screen flex items-center justify-center p-4"><div class="w-full max-w-sm"><div class="login-brand"><img src="${BRAND.logoBlue}" alt="ТОМУДА" class="login-brand__logo"><h1 class="text-lg font-bold text-center">ТОМУДА</h1></div><form onsubmit="login(event)" class="bg-card rounded p-4 space-y-3 mt-4"><input id="loginEmail" type="email" inputmode="email" autocomplete="username" autofocus placeholder="Email" value="${esc(saved?.email || "")}" class="w-full px-4 py-3 bg-secondary rounded app-input"><div class="login-password-wrap"><input id="loginPassword" type="password" autocomplete="current-password" placeholder="Нууц үг" value="${esc(saved?.password || "")}" class="w-full px-4 py-3 bg-secondary rounded app-input"><button type="button" id="loginPasswordToggle" onclick="toggleLoginPassword()" class="login-password-toggle" aria-label="Нууц үг харах">Харах</button></div><label class="login-remember"><input id="loginRemember" type="checkbox" ${remember ? "checked" : ""}><span>Нууц үг санах</span></label><div id="loginError"></div><button class="w-full h-12 rounded text-base font-semibold bg-primary text-primary-foreground">Нэвтрэх</button>${installBtn}</form></div></div>`;
}
function workerOrdersList() {
  let list = [...state.orders];
  if (state.currentEmployee?.role === "sales") {
    list = list.filter((o) => o.employeeId === state.currentEmployee.id);
  }
  const pay = state.filters.workerPay;
  if (pay === "paid") list = list.filter((o) => o.isPaid);
  if (pay === "unpaid") list = list.filter((o) => !o.isPaid);
  const day = state.filters.workerDate;
  if (day) list = list.filter((o) => orderDay(o) === day);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
function workerView() {
  const tab = state.filters.worker,
    cart = workerCartSummary(),
    orders = workerOrdersList();
  return `<div class="space-y-4"><div class="grid grid-cols-2 gap-2 bg-card rounded p-2"><button onclick="openWorkerNewTab()" class="py-3 rounded font-medium ${tab === "new" ? "bg-primary text-primary-foreground" : "bg-secondary/60"}">Захиалга авах</button><button onclick="openWorkerOrdersTab()" class="py-3 rounded font-medium ${tab === "orders" ? "bg-primary text-primary-foreground" : "bg-secondary/60"}">Нийт захиалга</button></div>${tab === "new" ? workerNew(cart) : workerOrders(orders)}</div>`;
}
function openWorkerNewTab() {
  state.filters.worker = "new";
  state.workerStoreReady = false;
  state.searches.workerStore = "";
  render();
}
function openWorkerOrdersTab() {
  state.filters.worker = "orders";
  render();
  requestAnimationFrame(scrollWorkerOrdersToDate);
}
function clearWorkerOrderDate() {
  state.filters.workerDate = "";
  render();
}
function setWorkerOrderDate(day) {
  state.filters.workerDate = day;
  render();
  requestAnimationFrame(scrollWorkerOrdersToDate);
}
function scrollWorkerOrdersToDate() {
  const day = state.filters.workerDate;
  if (!day) return;
  document
    .querySelector(`[data-order-day="${day}"]`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function warehouseView() {
  const orders = state.selectedWorkers.length
    ? state.orders.filter((o) => state.selectedWorkers.includes(o.employeeId))
    : [];
  return `<div class="space-y-3">${pageHead("Агуулах")}<div class="grid grid-cols-1 gap-3">${workerChooser(orders)}${warehouseReceiptsButton()}</div></div>`;
}
function warehouseReceiptsView() {
  const employeeIds = state.selectedWorkers.length ? state.selectedWorkers : [];
  return `<div class="space-y-4">${orderReceiptsPanel({ employeeIds, compact: true })}</div>`;
}
function warehouseReceiptsButton() {
  const count = state.orders.length,
    total = state.orders.reduce((s, o) => s + o.total, 0);
  return `<button onclick="go('warehouseReceipts')" class="bg-card rounded p-4 text-left hover:bg-secondary/40 w-full flex items-center justify-between gap-3"><div><p class="font-semibold">Баримтууд</p><p class="text-sm text-muted-foreground">${count} зах · ${fmt(total)}</p></div><span class="text-primary text-lg">→</span></button>`;
}
function workerChooser(orders) {
  const qty = orders
      .flatMap((o) => o.items)
      .reduce((s, i) => s + i.quantity, 0),
    total = orders.reduce((s, o) => s + o.total, 0),
    names = state.employees
      .filter((e) => state.selectedWorkers.includes(e.id))
      .map((e) => e.name)
      .join(", "),
    detail = qtyDetail(orders);
  return `<section class="bg-card rounded p-3 space-y-3"><button onclick="workerSelectModal()" class="w-full text-left bg-secondary rounded p-3 flex items-center justify-between gap-2"><span class="font-semibold">Ажилтан</span><span class="text-sm truncate ${names ? "" : "text-muted-foreground"}">${names || "Сонгох"}</span></button><div class="grid grid-cols-2 gap-2"><input value="${esc(state.deliveryName)}" oninput="state.deliveryName=this.value" placeholder="Түгээгч" class="w-full px-3 py-2 bg-secondary rounded text-sm"><input value="${esc(state.deliveryPhone)}" oninput="state.deliveryPhone=this.value" placeholder="Утас" inputmode="tel" class="w-full px-3 py-2 bg-secondary rounded text-sm"></div>${state.selectedWorkers.length ? `<div class="grid grid-cols-3 gap-2 text-sm bg-secondary/50 rounded p-2 text-center"><div><b>${state.selectedWorkers.length}</b><p class="text-xs text-muted-foreground">Ажилтан</p></div><div><b>${qty}</b><p class="text-xs text-muted-foreground">Ширхэг</p></div><div><b class="text-primary">${fmt(total)}</b><p class="text-xs text-muted-foreground">Дүн</p></div></div><div class="divide-y divide-border">${detail.length ? detail.map(detailRow).join("") : `<p class="p-3 text-sm text-muted-foreground text-center">Захиалга алга</p>`}</div><button onclick="employeeExcel()" class="w-full py-2.5 bg-primary text-primary-foreground rounded font-medium">Excel</button>` : `<div class="p-4 text-center text-sm text-muted-foreground bg-secondary/50 rounded">Ажилтан сонгоно уу</div>`}</section>`;
}
function qtyDetail(orders) {
  const map = {};
  orders.forEach((o) =>
    o.items.forEach(
      (i) => (map[i.productId] = (map[i.productId] || 0) + i.quantity),
    ),
  );
  return Object.entries(map)
    .map(([id, qty]) => ({
      product: state.products.find((p) => p.id === id) || {},
      qty,
    }))
    .sort((a, b) => b.qty - a.qty);
}
function detailRow(x) {
  const p = x.product;
  return `<div class="detail-row flex items-center gap-3 px-3 py-2"><img src="${productImage(p)}" class="w-9 h-9 rounded object-cover shrink-0"><div class="min-w-0 flex-1"><p class="font-medium truncate text-sm">${p.name || "-"}</p></div><b class="text-sm shrink-0">${x.qty} ш</b></div>`;
}
function workerStoreSummary(c) {
  if (!c)
    return `<p class="text-sm text-muted-foreground">Дэлгүүр сонгоогүй</p>`;
  const addr = [c.province, c.district, c.khoroo, c.address]
    .filter(Boolean)
    .join(", ");
  return `<div class="rounded bg-primary/10 p-3 text-sm space-y-0.5"><p class="font-semibold">${c.name}</p><p>${c.phone1 || "-"}</p><p class="text-xs text-muted-foreground worker-store-extra truncate">${addr || ""}</p></div>`;
}
function filterWorkerStores() {
  const q = (state.searches.workerStore || "").toLowerCase();
  return state.customers.filter((c) =>
    [
      c.name,
      c.companyName,
      c.phone1,
      c.phone2,
      c.address,
      c.province,
      c.district,
    ].some((v) => (v || "").toLowerCase().includes(q)),
  );
}
function workerStorePickStep() {
  const q = state.searches.workerStore || "",
    rows = filterWorkerStores();
  return `<div class="space-y-3">${pageHead("Дэлгүүр")}<div class="list-panel"><div class="list-panel__toolbar"><input data-focus="workerStore" value="${esc(q)}" oninput="search('workerStore',this.value)" placeholder="Хайх..." class="list-panel__search app-input"></div><div class="list-panel__table worker-store-list">${customerListHead()}<div class="list-panel__body divide-y divide-border/60">${rows.length ? rows.map(workerStoreRow).join("") : `<div class="list-panel__empty">Олдсонгүй</div>`}</div></div></div></div>`;
}
function pickWorkerStore(id) {
  state.workerCustomer = id;
  state.workerStoreReady = true;
  state.searches.workerProduct = "";
  state.filters.workerCategory = "";
  render();
}
function clearWorkerStore() {
  state.workerStoreReady = false;
  state.workerCustomer = "";
  state.workerQty = {};
  state.searches.workerStore = "";
  render();
}
function workerNew(cart) {
  if (!state.workerStoreReady || !state.workerCustomer)
    return workerStorePickStep();
  return workerNewOrderStep(cart);
}
function workerPromoRow(line) {
  const p = state.products.find((x) => x.id === line.productId) || {};
  return `<div class="worker-selected-row worker-promo-row"><img src="${productImage(p)}" class="product-thumb"><div class="min-w-0"><p class="font-medium truncate">${line.productName}</p><p class="text-xs text-tone-success mt-1">Урамшуулал · үнэгүй</p></div><b class="text-sm">${line.quantity} ш</b></div>`;
}
function paymentTermPicker() {
  const term = state.paymentTerm;
  return `<div><div class="grid grid-cols-2 gap-2"><button type="button" onclick="setPaymentTerm('cash')" class="py-2.5 rounded font-medium text-sm ${term === "cash" ? "bg-primary text-primary-foreground" : "bg-secondary/60"}">Бэлэн</button><button type="button" onclick="setPaymentTerm('credit')" class="py-2.5 rounded font-medium text-sm ${term === "credit" ? "bg-primary text-primary-foreground" : "bg-secondary/60"}">Зээл</button></div></div>`;
}
function setPaymentTerm(term) {
  state.paymentTerm = term;
  render();
}
function workerNewOrderStep(cart) {
  const customer = state.customers.find((c) => c.id === state.workerCustomer),
    deliveryDay = state.deliveryDate || tomorrowIso(),
    paidProducts = state.products
      .map((p) => ({ ...p, qty: state.workerQty[p.id] || 0 }))
      .filter((p) => p.qty > 0),
    listHtml =
      paidProducts.map(workerSelectedRow).join("") +
      (cart.promo.length ? cart.promo.map(workerPromoRow).join("") : "");
  const employeeField =
    state.currentEmployee?.role === "sales"
      ? `<div class="rounded bg-secondary/50 p-2 text-sm font-semibold">${state.currentEmployee.name}</div>`
      : `<select onchange="state.orderEmployee=this.value" class="w-full px-3 py-2.5 bg-secondary rounded app-input">${state.employees
          .filter((e) => e.role === "sales")
          .map(
            (e) =>
              `<option value="${e.id}" ${state.orderEmployee === e.id ? "selected" : ""}>${e.name}</option>`,
          )
          .join("")}</select>`;
  return `<section class="bg-card rounded overflow-hidden"><div class="p-3 border-b border-border flex items-start justify-between gap-2"><div class="flex-1 min-w-0">${workerStoreSummary(customer)}</div><button type="button" onclick="clearWorkerStore()" class="px-2 py-1.5 bg-secondary rounded text-sm shrink-0">Солих</button></div><div class="p-3 space-y-3"><div class="flex items-stretch gap-2"><div class="grid grid-cols-3 gap-1 flex-1 text-sm rounded bg-secondary/50 p-2 text-center"><div><b>${cart.skuCount}</b><p class="text-xs text-muted-foreground">Бараа</p></div><div><b>${cart.pieceQty}</b><p class="text-xs text-muted-foreground">Ширхэг</p></div><div><b class="text-primary">${fmt(cart.total)}</b><p class="text-xs text-muted-foreground">Дүн</p></div></div><button type="button" onclick="openPickerModal()" class="worker-add-plus" aria-label="Бараа нэмэх">+</button></div><input type="date" value="${deliveryDay}" onchange="state.deliveryDate=this.value;render()" class="w-full px-3 py-2.5 bg-secondary rounded app-input">${employeeField}</div><div class="divide-y divide-border">${listHtml || `<div class="p-6 text-center text-sm text-muted-foreground">+ дарж бараа нэмнэ</div>`}</div><div class="sticky bottom-0 bg-card p-3 border-t border-border space-y-2">${paymentTermPicker()}<button onclick="saveWorker()" class="w-full py-2.5 bg-primary text-primary-foreground rounded font-medium ${cart.paid.length ? "" : "opacity-50"}">Хадгалах</button></div></section>`;
}
function workerSelectedRow(p) {
  return `<div class="worker-selected-row"><img src="${productImage(p)}" class="product-thumb"><div class="min-w-0 flex-1"><p class="font-medium truncate">${p.name}</p><p class="worker-row-meta text-xs text-muted-foreground">${p.category} · ${fmt(p.price)} · Үлд ${p.stock - p.qty}</p><p class="worker-row-compact text-sm font-semibold text-primary">${fmt(p.price * p.qty)}</p></div><div class="qty-stepper"><button onclick="setWorkerQty('${p.id}',${p.qty - 1})">-</button><input onchange="setWorkerQty('${p.id}',Number(this.value))" value="${p.qty}" type="number"><button onclick="setWorkerQty('${p.id}',${p.qty + 1})">+</button></div></div>`;
}
function workerOrders(orders) {
  const total = orders.reduce((s, o) => s + o.total, 0),
    paid = orders.filter((o) => o.isPaid).reduce((s, o) => s + o.total, 0),
    unpaid = total - paid,
    day = state.filters.workerDate || "",
    pay = state.filters.workerPay,
    today = todayIso();
  return `<section class="bg-card rounded p-3 space-y-3"><div class="grid grid-cols-3 gap-2">${card("Нийт", fmt(total))}${card("Төлсөн", fmt(paid), "text-tone-success")}${card("Төлөөгүй", fmt(unpaid), "text-tone-danger")}</div><div class="flex flex-wrap gap-2"><button type="button" onclick="clearWorkerOrderDate()" class="px-3 py-2 rounded text-sm ${!day ? "bg-primary text-primary-foreground" : "bg-secondary"}">Бүгд</button><button type="button" onclick="setWorkerOrderDate('${today}')" class="px-3 py-2 rounded text-sm ${day === today ? "bg-primary text-primary-foreground" : "bg-secondary"}">Өнөөдөр</button><input type="date" value="${day}" onchange="setWorkerOrderDate(this.value)" class="flex-1 min-w-[140px] px-3 py-2 bg-secondary rounded text-sm"><select onchange="state.filters.workerPay=this.value;render()" class="px-3 py-2 bg-secondary rounded text-sm"><option value="all" ${pay === "all" ? "selected" : ""}>Бүгд</option><option value="paid" ${pay === "paid" ? "selected" : ""}>Төлсөн</option><option value="unpaid" ${pay === "unpaid" ? "selected" : ""}>Төлөөгүй</option></select></div><div class="max-h-[55vh] overflow-y-auto space-y-2">${orders.length ? orders.map((o) => `<button data-order-day="${orderDay(o)}" onclick="workerOrderDetail('${o.id}')" class="w-full text-left bg-secondary/50 rounded p-3"><div class="flex justify-between gap-2"><p class="font-medium truncate">${o.customerName}</p><b class="text-sm shrink-0">${fmt(o.total)}</b></div><p class="text-xs text-muted-foreground mt-0.5">${dte(o.createdAt)} · ${o.items.length} бараа · ${orderDay(o) !== isoDay(o.createdAt) ? `Хүргэлт ${orderDay(o)} · ` : ""}<span class="${o.isPaid ? "text-tone-success" : "text-tone-danger"}">${o.isPaid ? "Төлсөн" : "Төлөөгүй"}</span></p></button>`).join("") : `<p class="text-sm text-muted-foreground text-center py-4">Захиалга байхгүй</p>`}</div></section>`;
}
function workerOrderDetail(id) {
  orderReceiptModal(id);
}
function render() {
  if (!state.isLoggedIn) {
    app.innerHTML = loginView();
    return;
  }
  const r = currentRole();
  if (!canAccessView(state.currentView, r)) {
    state.currentView = defaultViewForRole(r);
  }
  const map = {
    admin: adminView,
    orders: ordersView,
    customers: customersView,
    products: productsView,
    inventory: inventoryView,
    employees: employeesView,
    reports: reportsView,
    promotions: promotionsView,
    worker: workerView,
    warehouse: warehouseView,
    warehouseReceipts: warehouseReceiptsView,
    count: countView,
  };
  const view = map[state.currentView] || workerView;
  app.innerHTML = shell(view());
  scheduleBackendSave();
  if (state.filters.worker === "orders")
    requestAnimationFrame(scrollWorkerOrdersToDate);
}
function box(title, body, max = "max-w-2xl") {
  modal.innerHTML = `<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div class="bg-card rounded w-full ${max} max-h-[90vh] overflow-hidden"><div class="p-6 border-b flex justify-between"><h3 class="text-lg font-semibold">${title}</h3><button onclick="closeModal()" class="p-2 hover:bg-secondary rounded">✕</button></div>${body}</div></div>`;
}
function closeModal() {
  stopBarcodeScan();
  destroyCustomerMap();
  state.promoPick = null;
  state.filters.workerCategory = "";
  state.searches.workerProduct = "";
  state.pickerStatus = "";
  modal.innerHTML = "";
}
function destroyCustomerMap() {
  if (window.customerMapInitTimer) {
    clearTimeout(window.customerMapInitTimer);
    window.customerMapInitTimer = null;
  }
  if (window.customerMapResizeTimer) {
    clearTimeout(window.customerMapResizeTimer);
    window.customerMapResizeTimer = null;
  }
  cleanupCustomerMapInstance();
  const el = document.getElementById("customerMap");
  if (el) {
    el.removeAttribute("data-leaflet-id");
    el._leaflet_id = undefined;
    el.innerHTML = "";
  }
}
function cleanupCustomerMapInstance() {
  if (window.customerMap?.remove) {
    try {
      window.customerMap.off();
      window.customerMap.remove();
    } catch (e) {}
  }
  window.customerMap = null;
  window.customerMapMarker = null;
  window.customerTileLayer = null;
  window.customerTileFallback = false;
}
function scheduleCustomerMapResize() {
  const fix = () => {
    if (window.customerMap) window.customerMap.invalidateSize(true);
  };
  fix();
  requestAnimationFrame(fix);
  clearTimeout(window.customerMapResizeTimer);
  window.customerMapResizeTimer = setTimeout(fix, 150);
  setTimeout(fix, 350);
}
function field(name, label, value = "", type = "text") {
  return `<label><span class="block text-sm font-medium mb-2">${label}</span><input name="${name}" type="${type}" value="${esc(value)}" class="w-full px-4 py-3 bg-secondary rounded"></label>`;
}
function customerModal(id) {
  destroyCustomerMap();
  const c = state.customers.find((x) => x.id === id) || {};
  box(
    id ? "Харилцагч засах" : "Харилцагч бүртгэх",
    `<form onsubmit="saveCustomer(event,'${id || ""}')" class="p-6 space-y-4 modal-scroll overflow-y-auto"><div class="grid sm:grid-cols-2 gap-4">${field("name", "Нэр", c.name)}${field("registrationNumber", "Регистрийн дугаар", c.registrationNumber)}</div>${field("companyName", "Байгууллагын нэр", c.companyName)}<div class="grid sm:grid-cols-2 gap-4">${field("phone1", "Утас 1", c.phone1)}${field("phone2", "Утас 2", c.phone2)}</div><div class="grid sm:grid-cols-2 gap-4">${field("province", "Аймаг/Хот", c.province)}${field("district", "Дүүрэг/Сум", c.district)}</div>${field("khoroo", "Хороо", c.khoroo)}${field("address", "Дэлгэрэнгүй хаяг", c.address)}<div><div class="flex items-center justify-between gap-3 mb-2"><span class="block text-sm font-medium">Байршил</span><span id="customerMapStatus" class="text-xs text-muted-foreground">Map дээр дарж pin тавина</span></div><div id="customerMap" class="customer-map" style="height:360px;min-height:360px;width:100%;display:block;"></div></div><div class="grid sm:grid-cols-2 gap-4"><label><span class="block text-sm font-medium mb-2">Өргөрөг</span><input id="customerLat" name="latitude" value="${esc(c.latitude || "")}" readonly class="w-full px-4 py-3 bg-secondary rounded"></label><label><span class="block text-sm font-medium mb-2">Уртраг</span><input id="customerLng" name="longitude" value="${esc(c.longitude || "")}" readonly class="w-full px-4 py-3 bg-secondary rounded"></label></div>${field("locationText", "Location тайлбар", c.locationText || "")}<button class="w-full py-3 bg-primary text-primary-foreground rounded">Хадгалах</button></form>`,
    "max-w-3xl",
  );
  window.customerMapInitTimer = setTimeout(() => {
    window.customerMapInitTimer = null;
    initCustomerMap(c.latitude, c.longitude);
  }, 120);
}
function loadLeaflet(cb) {
  if (window.L) return cb();
  if (window.leafletLoading) {
    setTimeout(() => loadLeaflet(cb), 200);
    return;
  }
  window.leafletLoading = true;
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "/static/tomuda/vendor/leaflet/leaflet.css";
  document.head.appendChild(css);
  const script = document.createElement("script");
  script.src = "/static/tomuda/vendor/leaflet/leaflet.js";
  script.onload = () => {
    window.leafletLoading = false;
    cb();
  };
  script.onerror = () => {
    window.leafletLoading = false;
    const el = document.getElementById("customerMap");
    if (el)
      el.innerHTML = `<div class="h-full grid place-items-center text-sm text-muted-foreground bg-secondary rounded">Map сүлжээнээс ачаалж чадсангүй</div>`;
  };
  document.body.appendChild(script);
}
function initCustomerMap(lat, lng) {
  const el = document.getElementById("customerMap"),
    latInput = document.getElementById("customerLat"),
    lngInput = document.getElementById("customerLng"),
    status = document.getElementById("customerMapStatus");
  if (!el) return;
  if (!window.L) {
    el.innerHTML = `<div class="h-full grid place-items-center text-sm text-muted-foreground bg-secondary rounded">Map ачаалж байна...</div>`;
    loadLeaflet(() => initCustomerMap(lat, lng));
    return;
  }
  cleanupCustomerMapInstance();
  if (!document.getElementById("customerMap")) return;
  const mapEl = document.getElementById("customerMap");
  mapEl.removeAttribute("data-leaflet-id");
  mapEl._leaflet_id = undefined;
  mapEl.innerHTML = "";
  const has =
      lat !== undefined &&
      lng !== undefined &&
      lat !== "" &&
      lng !== "" &&
      !Number.isNaN(Number(lat)) &&
      !Number.isNaN(Number(lng)),
    start = [has ? Number(lat) : 47.9189, has ? Number(lng) : 106.9176];
  window.customerMap = L.map(mapEl, {
    tap: true,
    zoomControl: true,
  }).setView(start, has ? 15 : 12);
  window.customerTileFallback = false;
  window.customerTileLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    },
  ).addTo(window.customerMap);
  window.customerTileLayer.on("tileerror", () => {
    if (window.customerTileFallback || !window.customerMap) return;
    window.customerTileFallback = true;
    if (window.customerTileLayer?.remove) window.customerTileLayer.remove();
    window.customerTileLayer = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap &copy; CARTO",
      },
    ).addTo(window.customerMap);
  });
  const setPoint = (la, ln) => {
    if (!window.customerMap) return;
    const fixedLat = Number(la).toFixed(6),
      fixedLng = Number(ln).toFixed(6);
    if (latInput) latInput.value = fixedLat;
    if (lngInput) lngInput.value = fixedLng;
    if (window.customerMapMarker)
      window.customerMapMarker.setLatLng([fixedLat, fixedLng]);
    else
      window.customerMapMarker = L.marker([fixedLat, fixedLng]).addTo(
        window.customerMap,
      );
    if (status) status.textContent = `Pin: ${fixedLat}, ${fixedLng}`;
  };
  if (has) setPoint(start[0], start[1]);
  window.customerMap.on("click", (e) => setPoint(e.latlng.lat, e.latlng.lng));
  scheduleCustomerMapResize();
}
function saveCustomer(e, id) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  id
    ? Object.assign(
        state.customers.find((c) => c.id === id),
        data,
      )
    : state.customers.push({ ...data, id: String(Date.now()) });
  closeModal();
  render();
}
function customerDetail(id) {
  const c = state.customers.find((x) => x.id === id),
    addr = [c.province, c.district, c.khoroo, c.address]
      .filter(Boolean)
      .join(", "),
    link = mapsLink(c.latitude, c.longitude);
  box(
    c.name,
    `<div class="p-6 space-y-4"><p class="text-muted-foreground">${c.companyName}</p><p><b>Дугаар:</b> ${c.phone1 || "-"}</p><p><b>Хаяг:</b> ${addr}</p><p><b>Байршил:</b> ${link ? `<a href="${link}" target="_blank" rel="noopener" class="text-primary underline">Google Maps дээр нээх</a>` : "-"}</p>${c.locationText ? `<p class="text-sm text-muted-foreground">${esc(c.locationText)}</p>` : ""}<div class="grid ${canDelete() ? "grid-cols-2" : "grid-cols-1"} gap-2">${canDelete() ? `<button onclick="closeModal();confirmDelete('customer','${id}')" class="py-3 tone tone--danger rounded font-medium">Устгах</button>` : ""}<button onclick="closeModal();customerModal('${id}')" class="py-3 bg-primary text-primary-foreground rounded">Засах</button></div></div>`,
    "max-w-xl",
  );
}
function productModal(id) {
  if (!isAdmin()) return;
  const p = state.products.find((x) => x.id === id) || {
    unit: "ширхэг",
    boxQuantity: 1,
    price: 0,
    costPrice: 0,
    stock: 0,
    minStock: 0,
    country: "Монгол",
  };
  box(
    id ? "Бараа засах" : "Бараа бүртгэх",
    `<form onsubmit="saveProduct(event,'${id || ""}')" class="p-6 space-y-4 modal-scroll overflow-y-auto"><div class="grid sm:grid-cols-2 gap-4"><label><span class="block text-sm font-medium mb-2">Баркод</span><div class="barcode-input-row"><input id="productBarcodeInput" name="barcode" value="${esc(p.barcode || "")}" inputmode="numeric" onchange="fillProductFromBarcode(this.value)" class="w-full px-4 py-3 bg-secondary rounded"><button type="button" onclick="startBarcodeScan('product')" class="px-4 py-3 bg-primary text-primary-foreground rounded text-sm">Scan</button></div><p id="productBarcodeLookupStatus" class="text-xs text-muted-foreground mt-2"></p></label>${field("name", "Барааны нэр", p.name)}</div><div id="barcodeScanner" class="barcode-scanner" hidden><video id="barcodeVideo" playsinline webkit-playsinline muted autoplay></video><div class="barcode-scanner-actions"><span id="barcodeStatus">Баркодоо camera-д ойртуулна уу</span><button type="button" onclick="stopBarcodeScan()" class="px-3 py-2 bg-card rounded text-sm text-foreground">Зогсоох</button></div></div><div class="grid sm:grid-cols-2 gap-4">${field("boxQuantity", "Хайрцаг (тоо)", p.boxQuantity, "number")}</div><label><span class="block text-sm font-medium mb-2">Төрөл</span><select name="category" class="category-scroll w-full px-4 py-2 bg-secondary rounded" size="6">${[...(p.category ? [p.category] : []), ...cats().filter((c) => c !== p.category)].map((c) => `<option ${p.category === c ? "selected" : ""}>${esc(c)}</option>`).join("")}<option value="__new__">+ Шинэ төрөл</option></select></label><label><span class="block text-sm font-medium mb-2">Хэмжих нэгж</span><select name="unit" class="w-full px-4 py-3 bg-secondary rounded">${["ширхэг", "KG", "метр"].map((u) => `<option ${p.unit === u ? "selected" : ""}>${u}</option>`).join("")}</select></label><div class="grid sm:grid-cols-2 gap-4">${field("price", "Үнэ", p.price, "number")}${field("costPrice", "Өртөг", p.costPrice, "number")}</div>${field("country", "Үйлдвэрлэсэн улс", p.country)}<div><span class="block text-sm font-medium mb-2">Зураг</span><div class="flex items-center gap-3 bg-secondary rounded p-3"><img id="productImagePreview" src="${productImage(p)}" class="w-20 h-20 rounded object-cover bg-card"><div class="flex-1"><input type="file" accept="image/*" onchange="handleProductImage(this)" class="w-full text-sm"><input id="productImageValue" name="image" type="hidden" value="${esc(p.image || "")}"><p class="text-xs text-muted-foreground mt-2">JPG, PNG, WEBP зураг сонгоно.</p></div></div></div>${field("minStock", "Доод үлдэгдэл (0 = ерөнхий)", p.minStock ?? 0, "number")}<p class="text-xs text-muted-foreground -mt-2">0 бол админы ерөнхий доод хэмжээ (${state.settings?.stockAlertMin ?? 10} ш) ашиглана.</p>${field("stock", "Тоо ширхэг", p.stock, "number")}<button class="w-full py-3 bg-primary text-primary-foreground rounded">Хадгалах</button></form>`,
  );
}
function handleProductImage(input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const value = document.getElementById("productImageValue"),
      preview = document.getElementById("productImagePreview");
    if (value) value.value = reader.result;
    if (preview) preview.src = reader.result;
  };
  reader.readAsDataURL(file);
}
let productBarcodeLookupId = 0;
const cleanExternalText = (text) =>
  String(text || "")
    .replace(/^en:/, "")
    .replace(/-/g, " ")
    .trim();
function productNameFromBarcodeData(product) {
  return (
    product.product_name ||
    product.product_name_en ||
    product.generic_name ||
    product.brands ||
    ""
  ).trim();
}
function productCategoryFromBarcodeData(product) {
  const tag = product.categories_tags?.[0],
    category = cleanExternalText(tag || product.categories);
  return category ? category.charAt(0).toUpperCase() + category.slice(1) : "";
}
function productCountryFromBarcodeData(product) {
  const country = cleanExternalText(
    product.countries_tags?.[0] || product.countries,
  );
  return country ? country.charAt(0).toUpperCase() + country.slice(1) : "";
}
function productUnitFromBarcodeData(product) {
  const quantity = String(product.quantity || "").toLowerCase();
  if (/\b(kg|g|гр|кг)\b/.test(quantity)) return "KG";
  if (/\b(m|cm|метр)\b/.test(quantity)) return "метр";
  return "ширхэг";
}
async function fillProductFromBarcode(code) {
  const input = document.getElementById("productBarcodeInput"),
    form = input?.closest("form"),
    status = document.getElementById("productBarcodeLookupStatus"),
    barcode = String(code || "").trim(),
    lookupId = ++productBarcodeLookupId;
  if (!form || !barcode) return;
  if (input) input.value = barcode;
  if (status) status.textContent = "Баркодоор мэдээлэл хайж байна...";
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_en,generic_name,brands,categories,categories_tags,countries,countries_tags,image_url,quantity`,
      { headers: { Accept: "application/json" } },
    );
    if (lookupId !== productBarcodeLookupId) return;
    if (!res.ok) throw new Error("lookup failed");
    const data = await res.json(),
      product = data.product || {};
    if (!data.status || !Object.keys(product).length) {
      if (status) status.textContent = "Энэ баркодоор мэдээлэл олдсонгүй";
      return;
    }
    const values = {
      name: productNameFromBarcodeData(product),
      category: productCategoryFromBarcodeData(product),
      unit: productUnitFromBarcodeData(product),
      country: productCountryFromBarcodeData(product),
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value && form.elements[key]) form.elements[key].value = value;
    });
    const image = product.image_url || "",
      imageValue = document.getElementById("productImageValue"),
      imagePreview = document.getElementById("productImagePreview");
    if (imageValue && image) imageValue.value = image;
    if (imagePreview && image) imagePreview.src = image;
    if (status)
      status.textContent = values.name
        ? `${values.name} мэдээлэл автоматаар орлоо`
        : "Олдсон мэдээллээр input-уудыг бөглөлөө";
  } catch (error) {
    if (status) status.textContent = "Barcode мэдээлэл татаж чадсангүй";
    return;
  }
}
function saveProduct(e, id) {
  if (!isAdmin()) return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  if (data.category === "__new__") {
    const custom = prompt("Шинэ төрлийн нэр");
    if (!custom?.trim()) return alert("Төрөл сонгоно уу");
    data.category = custom.trim();
    if (!state.extraCategories.includes(data.category))
      state.extraCategories.push(data.category);
  }
  ["price", "stock", "minStock", "boxQuantity", "costPrice"].forEach(
    (k) => (data[k] = Number(data[k] || 0)),
  );
  id
    ? Object.assign(
        state.products.find((p) => p.id === id),
        data,
      )
    : state.products.push({ ...data, id: String(Date.now()) });
  closeModal();
  render();
}
function categoryModal() {
  if (!isAdmin()) return;
  box(
    "Төрөл нэмэх",
    `<form onsubmit="event.preventDefault();state.extraCategories.push(this.category.value);closeModal();render()" class="p-6 space-y-4"><input name="category" autofocus required class="w-full px-4 py-3 bg-secondary rounded"><button class="w-full py-3 bg-primary text-primary-foreground rounded">Нэмэх</button></form>`,
    "max-w-md",
  );
}
function employeeModal() {
  if (!isAdmin()) return;
  box(
    "Ажилтан нэмэх",
    `<form onsubmit="saveEmployee(event)" class="p-5 space-y-3"><input name="name" required placeholder="Нэр" class="w-full px-3 py-3 bg-secondary rounded app-input"><input name="email" type="email" required placeholder="Email" class="w-full px-3 py-3 bg-secondary rounded app-input"><input name="phone" placeholder="Утас" class="w-full px-3 py-3 bg-secondary rounded app-input"><input name="password" required placeholder="Нууц үг" class="w-full px-3 py-3 bg-secondary rounded app-input"><select name="role" class="w-full px-3 py-3 bg-secondary rounded app-input"><option value="sales">HT (Борлуулалт)</option><option value="warehouse">Агуулах</option><option value="admin">Админ</option></select><button class="w-full py-3 bg-primary text-primary-foreground rounded">Нэмэх</button></form>`,
    "max-w-md",
  );
}
function orderModal() {
  box(
    "Шинэ захиалга",
    `<form onsubmit="saveOrder(event)" class="p-5 space-y-4 modal-scroll overflow-y-auto"><select name="customerId" class="w-full px-3 py-3 bg-secondary rounded">${state.customers.map((c) => `<option value="${c.id}">${c.companyName}</option>`).join("")}</select><div class="grid md:grid-cols-2 gap-3">${state.products.map((p) => `<label class="rounded bg-secondary/50 p-3 grid grid-cols-[1fr_80px] gap-2"><span><b>${p.name}</b><small class="block text-muted-foreground">${fmt(p.price)} · Үлд ${p.stock}</small></span><input name="${p.id}" type="number" min="0" value="0" class="px-2 py-2 bg-card rounded text-center"></label>`).join("")}</div><button class="w-full py-3 bg-primary text-primary-foreground rounded">Хадгалах</button></form>`,
    "max-w-5xl",
  );
}
function saveOrder(e) {
  e.preventDefault();
  if (!state.isLoggedIn) return alert("Захиалга хадгалахын өмнө нэвтэрнэ үү");
  const f = new FormData(e.target),
    c = state.customers.find((x) => x.id === f.get("customerId")),
    emp = state.currentEmployee || {},
    items = state.products
      .map((p) => {
        const q = Number(f.get(p.id) || 0);
        return q
          ? {
              productId: p.id,
              productName: p.name,
              quantity: q,
              price: p.price,
              total: p.price * q,
            }
          : null;
      })
      .filter(Boolean);
  if (!items.length) return alert("Бараа сонгоно уу");
  state.orders.push({
    id: String(state.orders.length + 1),
    customerId: c.id,
    customerName: c.companyName,
    items,
    total: items.reduce((s, i) => s + i.total, 0),
    status: "pending",
    employeeId: emp.id || "",
    employeeName: emp.name || "",
    employeePhone: emp.phone || "",
    ...orderEmailFields(emp),
    isPaid: false,
    createdAt: new Date().toISOString(),
  });
  items.forEach((i) => stock(i.productId, i.quantity, "out"));
  closeModal();
  render();
}
function orderReceiptModal(id) {
  const o = state.orders.find((x) => x.id === id);
  if (!o) return;
  box(
    `Баримт #${o.id}`,
    `<div class="p-5 space-y-4"><div class="rounded bg-secondary/50 p-3 space-y-1 text-sm"><p class="font-semibold">${esc(o.customerName)}</p><p class="text-muted-foreground">${esc(o.employeeName || "-")} · ${dte(o.createdAt)}</p><p><span class="inline-flex px-2 py-0.5 rounded text-xs font-medium ${badge(o.status)}">${status(o.status)}</span></p></div><table class="w-full text-sm"><tbody>${o.items.map((i) => `<tr class="border-t border-border"><td class="py-2 pr-2">${esc(i.productName)}</td><td class="py-2 text-right whitespace-nowrap">${i.quantity}</td><td class="py-2 text-right font-medium whitespace-nowrap">${fmt(i.total)}</td></tr>`).join("")}</tbody></table><div class="flex justify-between border-t pt-3 font-semibold"><span>Нийт</span><span class="text-primary">${fmt(o.total)}</span></div><button type="button" onclick="printOrderReceipt('${o.id}')" class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">Баримт хэвлэх</button></div>`,
    "max-w-lg",
  );
}
function printRootEl() {
  let root = document.getElementById("print-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "print-root";
    root.setAttribute("aria-hidden", "true");
    document.body.appendChild(root);
  }
  return root;
}
function printOrderReceipt(id) {
  const o = state.orders.find((x) => x.id === id);
  if (!o) return;
  const root = printRootEl();
  root.innerHTML = receipt(o);
  const cleanup = () => {
    root.innerHTML = "";
  };
  window.addEventListener("afterprint", cleanup, { once: true });
  setTimeout(() => {
    window.print();
    setTimeout(cleanup, 1500);
  }, 120);
}
function orderDetail(id) {
  orderReceiptModal(id);
}
function receiptDetail(id) {
  orderReceiptModal(id);
}
function receipt(o) {
  const c = state.customers.find((x) => x.id === o.customerId) || {},
    sales = state.employees.find((e) => e.id === o.employeeId) || {},
    sub = o.total / 1.1,
    vat = o.total - sub,
    addr =
      [c.province, c.district, c.khoroo, c.address]
        .filter(Boolean)
        .join(", ") || "-",
    paid = o.paymentTerm === "cash" || o.isPaid,
    bank = o.paymentTerm === "credit" && !o.isPaid,
    salesName = o.employeeName || sales.name || "-",
    salesPhone = o.employeePhone || sales.phone || "-",
    deliveryName =
      o.deliveryName ||
      state.deliveryName ||
      (state.currentEmployee?.role === "warehouse"
        ? state.currentEmployee.name
        : "-"),
    deliveryPhone =
      o.deliveryPhone ||
      state.deliveryPhone ||
      (state.currentEmployee?.role === "warehouse"
        ? state.currentEmployee.phone
        : "-"),
    deliveryDay = o.deliveryDate || o.createdAt;
  return `<div class="print-receipt"><div class="receipt-page"><header class="receipt-header"><img src="${BRAND.logoBlue}" alt="ТОМУДА" class="receipt-logo"><div class="receipt-company"><h1>ТОМУДА групп ХХК</h1><p>Хаяг: Улаанбаатар Баянзүрх, 26-р хороо, Олимп хороолол- 2 /13312/</p><p>Нийслэл хүрээ өргөн чөлөө 331-401. Утас: +976-75333357</p></div><div class="receipt-date"><p>Хүргэлтийн огноо:</p><b>${dte(deliveryDay)}</b></div></header><h2 class="receipt-title">ЗАРЛАГЫН БАРИМТ №${o.id}</h2><section class="receipt-info"><div><p><span>Худалдааны төлөөлөгч:</span><b>${salesName}</b></p><p><span>Худалдааны төлөөлөгчийн утас:</span><b>${salesPhone}</b></p><p><span>Түгээгчийн нэр:</span><b>${deliveryName}</b></p><p><span>Түгээгчийн утас:</span><b>${deliveryPhone}</b></p></div><div><p><span>Харилцагч:</span><b>${c.name || o.customerName}</b></p><p><span>Регистрийн дугаар:</span><b>${c.registrationNumber || "-"}</b></p><p><span>Компанийн нэр:</span><b>${c.companyName || "-"}</b></p><p><span>Утасны дугаар:</span><b>${c.phone1 || "-"}</b></p><p><span>Төлбөрийн нөхцөл:</span><b><span class="receipt-check">${paid ? "☑" : "☐"}</span> Бэлнээр&nbsp;&nbsp;<span class="receipt-check">${bank ? "☑" : "☐"}</span> Дансаар</b></p><p class="receipt-address"><span>Хүргэлтийн хаяг:</span><b>${addr}</b></p></div></section><section class="receipt-bank-grid"><div><p><span>Дансны нэр:</span><b>ТОМУДА групп</b></p><p><span>Регистрийн дугаар:</span><b>5397987</b></p><p><span>Банкны нэр:</span><b>Хаан банк</b></p><p><span>Дансны дугаар:</span><b>51333333307</b></p></div></section><table class="receipt-table"><thead><tr><th>№</th><th>Барааны нэр</th><th>Хэмжих нэгж</th><th>Баркод</th><th>Тоо/ш</th><th>Нэгж үнэ</th><th>Нийт үнэ</th></tr></thead><tbody>${o.items
    .map((i, n) => {
      const p = state.products.find((x) => x.id === i.productId) || {};
      return `<tr><td>${n + 1}</td><td>${i.productName}</td><td>${p.unit || "ш"}</td><td>${p.barcode || "-"}</td><td>${i.quantity}</td><td>${i.price.toLocaleString()}</td><td>${i.total.toLocaleString()}</td></tr>`;
    })
    .join(
      "",
    )}</tbody></table><div class="receipt-return"><b>Буцаалтын тэмдэглэгээ:</b><span></span></div><section class="receipt-summary"><p><b>Урамшуулал</b><span>Үнэтрүүлэгч</span><strong>0</strong></p><p><span></span><span></span><strong>0</strong></p><p><b>Бараа ажил үйлчилгээний дүн</b><span></span><strong>${sub.toFixed(2)}</strong></p><p><b>НӨАТ</b><span></span><strong>${vat.toFixed(2)}</strong></p><p class="receipt-grand"><b>Таны нийт төлөх дүн</b><span></span><strong>${o.total.toLocaleString()}</strong></p></section><section class="receipt-warning"><p>Эрхэм харилцагч та төлбөрөө заавал баримт дээрх компанийн дансанд шилжүүлнэ үү.</p><p><b>Хувь хүний дансанд шилжүүлэхгүй байхыг анхаарна уу.</b></p><p>Өөр дансруу шилжүүлсэн төлбөрийг нийлүүлэгч компани хариуцахгүй болно</p><p><b>Барааг сайтар шалгаж тоо ширхэгийг тулгаж хүлээн авахыг анхаарна уу!</b></p></section><footer class="receipt-sign"><p><span>Хүлээлгэн өгсөн ажилтны гарын үсэг:</span><b></b></p><p><span>Хүлээн авсан ажилтны гарын үсэг:</span><b></b></p></footer></div></div>`;
}
function stock(id, qty, type) {
  const p = state.products.find((x) => x.id === id);
  if (p) p.stock += type === "in" ? qty : -qty;
}
function applyStock(id, type) {
  const p = state.products.find((x) => x.id === id),
    q = Number(document.getElementById(`qty-${id}`).value || 0);
  if (type === "out" && q > p.stock)
    return alert("Үлдэгдэл хүрэлцэхгүй байна!");
  stock(id, q, type);
  state.inventoryLogs.push({
    id: Date.now(),
    productName: p.name,
    type,
    quantity: q,
    date: new Date(),
    employeeName: state.currentEmployee?.name || "",
  });
  render();
}
function setWorkerQty(id, qty) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  state.workerQty[id] = Math.max(0, Math.min(Number(qty) || 0, p.stock));
  if (!state.workerQty[id]) delete state.workerQty[id];
  const keepPicker = pickerOpen() || !!state.filters.workerCategory;
  render();
  if (keepPicker) pickerModal();
}
function applyPickerBarcode(value, scanned = false) {
  const code = String(value || "").trim();
  if (!code) return;
  state.pickerBarcode = code;
  state.searches.workerProduct = code;
  state.filters.workerCategory = "";
  const product =
    state.products.find((p) => String(p.barcode) === code) ||
    state.products.find((p) => String(p.barcode).includes(code));
  if (product) {
    const current = state.workerQty[product.id] || 0;
    if (current >= product.stock) {
      state.pickerStatus = `${product.name} үлдэгдэл хүрэлцэхгүй байна`;
    } else {
      state.workerQty[product.id] = current + 1;
      state.pickerStatus = `${product.name} нэмэгдлээ`;
    }
  } else {
    state.pickerStatus = `${code} баркодтой бараа олдсонгүй`;
  }
  if (scanned) stopBarcodeScan();
  pickerModal();
}
function applyPickerBarcodeInput() {
  applyPickerBarcode(document.querySelector("[data-picker-barcode]")?.value);
}
function clearPickerFilter() {
  state.searches.workerProduct = "";
  state.filters.workerCategory = "";
  state.pickerStatus = "";
  state.pickerBarcode = "";
  pickerModal();
}
function handleScannedBarcode(code) {
  const value = String(code || "").trim();
  if (!value || !barcodeScanning) return;
  barcodeScanning = false;
  if (barcodeScanTarget === "product") {
    const input = document.getElementById("productBarcodeInput");
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    fillProductFromBarcode(value);
    stopBarcodeScan();
    return;
  }
  applyPickerBarcode(value, true);
}
function loadZxingBrowser() {
  if (window.ZXingBrowser?.BrowserMultiFormatReader)
    return Promise.resolve(window.ZXingBrowser);
  if (window.zxingBrowserLoading) {
    return new Promise((resolve, reject) => {
      const wait = setInterval(() => {
        if (window.ZXingBrowser?.BrowserMultiFormatReader) {
          clearInterval(wait);
          resolve(window.ZXingBrowser);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(wait);
        reject(new Error("ZXing load timeout"));
      }, 15000);
    });
  }
  window.zxingBrowserLoading = true;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://unpkg.com/@zxing/browser@0.1.5/umd/zxing-browser.min.js";
    script.onload = () => {
      window.zxingBrowserLoading = false;
      if (window.ZXingBrowser?.BrowserMultiFormatReader)
        resolve(window.ZXingBrowser);
      else reject(new Error("ZXing unavailable"));
    };
    script.onerror = () => {
      window.zxingBrowserLoading = false;
      reject(new Error("ZXing load failed"));
    };
    document.head.appendChild(script);
  });
}
async function startNativeBarcodeScan(video, status) {
  barcodeStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });
  video.srcObject = barcodeStream;
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  await video.play();
  barcodeScanning = true;
  const detector = new BarcodeDetector({
    formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
  });
  const scan = async () => {
    if (!barcodeScanning) return;
    try {
      const codes = await detector.detect(video);
      if (codes.length) {
        handleScannedBarcode(codes[0].rawValue);
        return;
      }
      status.textContent = "Баркодоо camera-д ойртуулна уу";
    } catch (e) {
      status.textContent = "Scan уншиж чадсангүй";
    }
    barcodeScanFrame = requestAnimationFrame(scan);
  };
  scan();
}
async function startZxingBarcodeScan(video, status) {
  const { BrowserMultiFormatReader } = await loadZxingBrowser();
  zxingReader = new BrowserMultiFormatReader();
  barcodeScanning = true;
  status.textContent = "Баркодоо camera-д ойртуулна уу";
  zxingControls = await zxingReader.decodeFromVideoDevice(
    undefined,
    video,
    (result) => {
      if (result) handleScannedBarcode(result.getText());
    },
  );
}
async function startBarcodeScan(target = "picker") {
  if (!navigator.mediaDevices?.getUserMedia)
    return alert("Энэ browser camera scan дэмжихгүй байна.");
  stopBarcodeScan();
  barcodeScanTarget = target;
  const panel = document.getElementById("barcodeScanner");
  const video = document.getElementById("barcodeVideo");
  const status = document.getElementById("barcodeStatus");
  if (!panel || !video) return;
  panel.hidden = false;
  status.textContent = "Camera нээгдэж байна...";
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  try {
    if ("BarcodeDetector" in window)
      await startNativeBarcodeScan(video, status);
    else await startZxingBarcodeScan(video, status);
  } catch (e) {
    console.warn("Barcode scan failed", e);
    stopBarcodeScan();
    alert(
      "Camera нээгдсэнгүй. Browser-д camera зөвшөөрөл өгөөд дахин оролдоно уу.",
    );
  }
}
function stopBarcodeScan() {
  barcodeScanning = false;
  if (barcodeScanFrame) cancelAnimationFrame(barcodeScanFrame);
  barcodeScanFrame = 0;
  if (zxingControls?.stop) {
    try {
      zxingControls.stop();
    } catch (e) {}
    zxingControls = null;
  }
  if (zxingReader?.reset) {
    try {
      zxingReader.reset();
    } catch (e) {}
    zxingReader = null;
  }
  if (barcodeStream) {
    barcodeStream.getTracks().forEach((track) => track.stop());
    barcodeStream = null;
  }
  const panel = document.getElementById("barcodeScanner");
  const video = document.getElementById("barcodeVideo");
  if (video) {
    video.pause();
    video.srcObject = null;
  }
  if (panel) panel.hidden = true;
}
function openPickerModal() {
  state.filters.workerCategory = "";
  state.searches.workerProduct = "";
  state.pickerStatus = "";
  pickerModal();
}
function pickerCategoryBtn(c) {
  return `<button type="button" data-picker-cat="${esc(c)}" class="picker-cat-btn picker-cat-btn--step1">${esc(c)}</button>`;
}
function pickerModal() {
  const cat = state.filters.workerCategory,
    categories = cats();
  if (!cat) {
    box(
      "Бараа нэмэх",
      `<div class="picker-step1 p-5 space-y-4 modal-scroll" data-picker-root><p class="text-sm font-medium shrink-0">Төрөл сонгоно уу</p><div class="picker-categories picker-categories--step1">${categories.length ? categories.map((c) => pickerCategoryBtn(c)).join("") : `<div class="p-6 text-center text-sm text-muted-foreground">Төрөл байхгүй</div>`}</div><button type="button" onclick="closeModal()" class="w-full py-3 bg-secondary rounded font-medium shrink-0">Болих</button></div>`,
      "max-w-lg",
    );
    return;
  }
  const q = (state.searches.workerProduct || "").toLowerCase(),
    selected = state.products
      .map((p) => ({ ...p, qty: state.workerQty[p.id] || 0 }))
      .filter((p) => p.qty > 0),
    selectedQty = selected.reduce((s, p) => s + p.qty, 0),
    selectedTotal = selected.reduce((s, p) => s + p.qty * p.price, 0),
    products = state.products.filter(
      (p) =>
        p.category === cat &&
        (p.name.toLowerCase().includes(q) || String(p.barcode).includes(q)),
    );
  box(
    "Бараа нэмэх",
    `<div class="picker-step2" data-picker-root><div class="picker-step2__scroll"><div class="picker-step-head"><button type="button" data-picker-back class="picker-back-btn">← Төрөл</button><span class="picker-step-cat">${esc(cat)}</span></div><div class="picker-search-tools"><input data-picker-search value="${esc(state.searches.workerProduct || "")}" oninput="pickerSearch(this.value)" placeholder="Хайх..." class="w-full px-3 py-3 bg-secondary rounded app-input"><button type="button" data-picker-clear-search class="px-4 py-3 bg-secondary rounded text-sm whitespace-nowrap">Цэвэрлэх</button></div>${state.pickerStatus ? `<div class="picker-status">${esc(state.pickerStatus)}</div>` : ""}<div class="picker-list" data-picker-products>${products.length ? products.map((p) => pickerRow(p)).join("") : `<div class="p-6 text-center text-sm text-muted-foreground bg-secondary/50 rounded">Бараа олдсонгүй</div>`}</div></div><div class="picker-step2__bottom"><div class="picker-summary"><div><p>Сонгосон</p><b>${selected.length}</b></div><div><p>Ширхэг</p><b>${selectedQty}</b></div><div><p>Нийт</p><b>${fmt(selectedTotal)}</b></div></div><div class="picker-footer"><button type="button" data-picker-clear-cart class="py-3 bg-secondary rounded font-medium ${selected.length ? "" : "opacity-50"}">Цэвэрлэх</button><button type="button" onclick="closeModal();render()" class="py-3 bg-primary text-primary-foreground rounded font-medium">Дуусгах</button></div></div></div>`,
    "max-w-4xl",
  );
  const el = document.querySelector("[data-picker-search]");
  if (el) {
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }
}
function backToPickerCategories() {
  state.filters.workerCategory = "";
  state.searches.workerProduct = "";
  state.pickerStatus = "";
  pickerModal();
}
function clearPickerSearch() {
  state.searches.workerProduct = "";
  state.pickerStatus = "";
  pickerModal();
}
function clearPickerCart() {
  state.workerQty = {};
  render();
  pickerModal();
}
function pickerRow(p) {
  const q = state.workerQty[p.id] || 0,
    left = p.stock - q,
    id = esc(p.id);
  return `<div class="picker-row ${q ? "is-selected" : ""}"><img src="${productImage(p)}" class="product-thumb"><div class="min-w-0"><p class="text-sm font-medium truncate">${p.name}</p><p class="text-xs text-muted-foreground">${esc(p.barcode)}</p><div class="flex flex-wrap gap-2 mt-2 text-xs"><span class="px-2 py-1 rounded bg-card font-semibold">${fmt(p.price)}</span><span class="px-2 py-1 rounded bg-card text-muted-foreground">Үлд ${left}</span>${q ? `<span class="px-2 py-1 rounded bg-primary text-primary-foreground">${fmt(q * p.price)}</span>` : ""}</div></div>${q ? `<div class="qty-stepper"><button type="button" data-picker-qty data-product-id="${id}" data-qty="${q - 1}">-</button><input data-picker-qty-input data-product-id="${id}" value="${q}" type="number" min="0" max="${p.stock}" class="app-input"><button type="button" data-picker-qty data-product-id="${id}" data-qty="${q + 1}">+</button></div>` : `<button type="button" data-picker-qty data-product-id="${id}" data-qty="1" class="px-3 py-2 bg-primary text-primary-foreground rounded text-sm ${p.stock ? "" : "opacity-50"}" ${p.stock ? "" : "disabled"}>Нэмэх</button>`}</div>`;
}
function setPickerCategory(cat) {
  if (!cat) return;
  state.filters.workerCategory = cat;
  state.searches.workerProduct = "";
  state.pickerStatus = "";
  pickerModal();
}
function pickerSearch(value) {
  state.searches.workerProduct = value;
  const list = modal.querySelector("[data-picker-products]");
  if (!list || !state.filters.workerCategory) {
    pickerModal();
    return;
  }
  const q = (value || "").toLowerCase(),
    cat = state.filters.workerCategory,
    products = state.products.filter(
      (p) =>
        p.category === cat &&
        (p.name.toLowerCase().includes(q) || String(p.barcode).includes(q)),
    );
  list.innerHTML = products.length
    ? products.map((p) => pickerRow(p)).join("")
    : `<div class="p-6 text-center text-sm text-muted-foreground bg-secondary/50 rounded">Бараа олдсонгүй</div>`;
}
function toggleWorker(id) {
  state.selectedWorkers = state.selectedWorkers.includes(id)
    ? state.selectedWorkers.filter((x) => x !== id)
    : [...state.selectedWorkers, id];
  render();
}
function selectWarehouseOrder(id) {
  state.selectedWarehouseOrderId = id;
  render();
}
function workerSelectModal() {
  box(
    "Ажилтан сонгох",
    `<div class="p-5 space-y-3">${state.employees
      .filter((e) => e.role === "sales")
      .map(
        (e) =>
          `<label class="flex items-center gap-3 bg-secondary rounded p-3"><input type="checkbox" ${state.selectedWorkers.includes(e.id) ? "checked" : ""} onchange="toggleWorkerOnly('${e.id}')"><span class="font-medium">${e.name}</span></label>`,
      )
      .join(
        "",
      )}<button onclick="closeModal();render()" class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">Болсон</button></div>`,
    "max-w-md",
  );
}
function storePickerSearch(value) {
  state.searches.workerStore = value;
  storePickerModal();
}
function selectWorkerCustomer(id) {
  pickWorkerStore(id);
  closeModal();
}
function storePickerModal() {
  const q = (state.searches.workerStore || "").toLowerCase(),
    selected = state.customers.find((c) => c.id === state.workerCustomer),
    rows = state.customers.filter((c) =>
      [c.name, c.companyName, c.phone1, c.phone2, c.address].some((v) =>
        (v || "").toLowerCase().includes(q),
      ),
    );
  box(
    "Дэлгүүр сонгох",
    `<div class="p-5 space-y-4 modal-scroll overflow-y-auto max-h-[80vh]"><input data-store-search value="${esc(state.searches.workerStore || "")}" oninput="storePickerSearch(this.value)" placeholder="Нэр, компани, утас, хаягаар хайх..." class="w-full px-3 py-3 bg-secondary rounded"><div class="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-3"><div class="store-picker-list space-y-2">${rows.length ? rows.map((c) => `<button type="button" onclick="state.workerCustomer='${c.id}';storePickerModal()" class="w-full text-left rounded p-3 ${state.workerCustomer === c.id ? "bg-primary/10 border border-primary" : "bg-secondary/50"}"><p class="font-medium">${c.name}</p><p class="text-xs text-muted-foreground">${c.companyName || "-"} · ${c.phone1 || "-"}</p></button>`).join("") : `<p class="text-sm text-muted-foreground p-3">Дэлгүүр олдсонгүй</p>`}</div><div>${selected ? workerStoreSummary(selected) : `<p class="text-sm text-muted-foreground">Жагсаалтаас дэлгүүр сонгоно уу</p>`}</div></div><button onclick="selectWorkerCustomer(state.workerCustomer)" class="w-full py-3 bg-primary text-primary-foreground rounded font-medium" ${selected ? "" : "disabled"}>Сонгох</button></div>`,
    "max-w-3xl",
  );
  const el = document.querySelector("[data-store-search]");
  if (el) {
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }
}
function toggleWorkerOnly(id) {
  state.selectedWorkers = state.selectedWorkers.includes(id)
    ? state.selectedWorkers.filter((x) => x !== id)
    : [...state.selectedWorkers, id];
  workerSelectModal();
}
function employeeExcel() {
  if (!state.selectedWorkers.length) return alert("Ажилтан сонгоно уу");
  const orders = state.orders.filter((o) =>
      state.selectedWorkers.includes(o.employeeId),
    ),
    map = {};
  orders.forEach((o) =>
    o.items.forEach((i) => {
      const key = i.productId || i.productName;
      if (!map[key])
        map[key] = {
          productId: i.productId,
          productName: i.productName,
          quantity: 0,
          total: 0,
        };
      map[key].quantity += i.quantity;
      map[key].total += i.total || i.quantity * i.price;
    }),
  );
  const names = state.employees
      .filter((e) => state.selectedWorkers.includes(e.id))
      .map((e) => e.name)
      .join(", "),
    rows = Object.values(map),
    totalQty = rows.reduce((sum, row) => sum + row.quantity, 0),
    totalAmount = rows.reduce((sum, row) => sum + row.total, 0);
  const sheetRows = [
    ["Ажилтан", names],
    ["Огноо", dte(new Date())],
    ["Захиалга", orders.length],
    ["Нийт ширхэг", totalQty],
    ["Нийт дүн", totalAmount],
    [],
    ["№", "Бараа", "Ангилал", "Баркод", "Тоо", "Дүн"],
    ...rows.map((x, i) => {
      const p = state.products.find(
        (product) => product.id === x.productId,
      ) || {
        category: "",
        barcode: "",
      };
      return [
        i + 1,
        x.productName,
        p.category || "-",
        p.barcode || "",
        x.quantity,
        x.total,
      ];
    }),
  ];
  excel("ajiltny-zahialga.xls", sheetRows);
  alert("Excel файл татагдлаа");
}
function saveWorker() {
  if (!state.isLoggedIn) return alert("Захиалга хадгалахын өмнө нэвтэрнэ үү");
  const c = state.customers.find((x) => x.id === state.workerCustomer),
    e = orderActor(),
    items = workerOrderLines();
  if (!workerPaidLines().length) return alert("Бараа сонгоно уу");
  state.orders.push({
    id: String(state.orders.length + 1),
    customerId: c.id,
    customerName: c.name,
    items,
    total: items.reduce((s, i) => s + i.total, 0),
    status: "pending",
    employeeId: e.id,
    employeeName: e.name,
    employeePhone: e.phone || "",
    ...orderEmailFields(e),
    isPaid: false,
    paymentTerm: state.paymentTerm,
    deliveryDate: state.deliveryDate || tomorrowIso(),
    deliveryName: state.deliveryName || "",
    deliveryPhone: state.deliveryPhone || "",
    createdAt: new Date().toISOString(),
  });
  items.forEach((i) => stock(i.productId, i.quantity, "out"));
  state.workerQty = {};
  state.filters.worker = "orders";
  render();
}
function login(e) {
  e.preventDefault();
  ensureEmployeeEmails();
  const email = normalizeEmail(document.getElementById("loginEmail").value),
    password = document.getElementById("loginPassword").value.trim();
  const emp = state.employees.find(
    (x) => normalizeEmail(x.email) === email && x.password === password,
  );
  if (!emp)
    return (document.getElementById("loginError").innerHTML =
      `<div class="tone tone--danger text-sm p-3 rounded text-center">Email эсвэл нууц үг буруу байна</div>`);
  saveLoginCredentials(
    email,
    password,
    document.getElementById("loginRemember")?.checked,
  );
  state.currentEmployee = emp;
  state.isLoggedIn = true;
  state.orderEmployee = emp.id;
  if (emp.role === "warehouse") {
    state.selectedWorkers = [];
    state.selectedWarehouseOrderId = "";
    state.deliveryName = "";
    state.deliveryPhone = "";
  }
  state.currentView = defaultViewForRole(emp.role);
  render();
}
function logout() {
  state.currentEmployee = null;
  state.isLoggedIn = false;
  render();
}
function saveEmployee(e) {
  if (!isAdmin()) return;
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  if (
    state.employees.some(
      (e) => normalizeEmail(e.email) === normalizeEmail(f.email),
    )
  ) {
    return alert("Энэ email аль хэдийн бүртгэгдсэн байна");
  }
  state.employees.push({
    id: "employee-" + Date.now(),
    ...f,
    email: normalizeEmail(f.email),
    totalSales: 0,
    commissionRate: 0,
  });
  closeModal();
  render();
}
function confirmDelete(type, id) {
  if (!canDelete()) return;
  const item =
    type === "product"
      ? state.products.find((p) => p.id === id)
      : type === "employee"
        ? state.employees.find((e) => e.id === id)
        : type === "customer"
          ? state.customers.find((c) => c.id === id)
          : null;
  const name =
    item?.name || (type === "customer" ? item?.companyName : null) || "энэ мөр";
  box(
    "Устгах уу?",
    `<div class="p-5 space-y-4"><p class="text-sm text-muted-foreground"><b class="text-foreground">${esc(name)}</b> устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.</p><div class="grid grid-cols-2 gap-2"><button onclick="closeModal()" class="py-3 bg-secondary rounded">Болих</button><button onclick="deleteNow('${type}','${id}')" class="py-3 btn-solid--danger rounded font-medium">Устгах</button></div></div>`,
    "max-w-md",
  );
}
function deleteNow(type, id) {
  if (!canDelete()) return;
  if (type === "product")
    state.products = state.products.filter((p) => p.id !== id);
  if (type === "employee")
    state.employees = state.employees.filter((e) => e.id !== id);
  if (type === "customer") {
    state.customers = state.customers.filter((c) => c.id !== id);
    if (state.workerCustomer === id) {
      state.workerCustomer = "";
      state.workerStoreReady = false;
      state.workerQty = {};
    }
  }
  closeModal();
  render();
}
function delEmployee(id) {
  if (!canDelete()) return;
  state.employees = state.employees.filter((e) => e.id !== id);
  render();
}
function delProduct(id) {
  if (!canDelete()) return;
  state.products = state.products.filter((p) => p.id !== id);
  render();
}
function setOrder(id, s) {
  if (s === "cancelled" && !canDelete()) return;
  state.orders.find((o) => o.id === id).status = s;
  render();
}
function setPaid(id, isPaid) {
  state.orders.find((o) => o.id === id).isPaid = isPaid;
  render();
}
function csvRow(cells) {
  return cells
    .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
    .join(",");
}
function csv(name, rows) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob(["\uFEFF" + rows.map(csvRow).join("\n")], {
      type: "text/csv;charset=utf-8",
    }),
  );
  a.download = name;
  a.click();
}
function excel(name, rows) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob(["\uFEFF" + rows.map(csvRow).join("\n")], {
      type: "application/vnd.ms-excel;charset=utf-8",
    }),
  );
  a.download = name;
  a.click();
}
Object.assign(window, {
  state,
  go,
  search,
  render,
  closeModal,
  customerModal,
  saveCustomer,
  customerDetail,
  productModal,
  handleProductImage,
  fillProductFromBarcode,
  saveProduct,
  categoryModal,
  employeeModal,
  orderModal,
  saveOrder,
  orderDetail,
  orderReceiptModal,
  receiptDetail,
  printOrderReceipt,
  workerOrderDetail,
  applyStock,
  setInventoryCategory,
  setWorkerQty,
  openPickerModal,
  pickerModal,
  backToPickerCategories,
  clearPickerSearch,
  clearPickerCart,
  pickerSearch,
  setPickerCategory,
  applyPickerBarcode,
  applyPickerBarcodeInput,
  clearPickerFilter,
  startBarcodeScan,
  stopBarcodeScan,
  toggleWorker,
  selectWarehouseOrder,
  workerSelectModal,
  workerSelectedRow,
  toggleWorkerOnly,
  employeeExcel,
  storePickerModal,
  storePickerSearch,
  selectWorkerCustomer,
  pickWorkerStore,
  clearWorkerStore,
  openWorkerNewTab,
  openWorkerOrdersTab,
  clearWorkerOrderDate,
  setWorkerOrderDate,
  scrollWorkerOrdersToDate,
  openPromotionQtyModal,
  promotionQtyModal,
  promoProductSearch,
  selectPromoProduct,
  promotionPriceModal,
  savePromotionQty,
  savePromotionPrice,
  removePromotionRule,
  excel,
  saveWorker,
  login,
  toggleLoginPassword,
  logout,
  saveEmployee,
  confirmDelete,
  deleteNow,
  delEmployee,
  delProduct,
  setOrder,
  setPaid,
  setPaymentTerm,
  csv,
  finishCount,
  setCountQty,
  saveStockAlertSettings,
  saveBackendState,
  installPwaApp,
  dismissPwaInstall,
  installAppOnPhone,
  downloadAndroidApk,
  dismissIosInstallCoach: dismissInstallCoach,
  dismissInstallCoach,
  showAndroidInstallCoach,
  openPwaInstallModal,
  openInChrome,
  copyAppLink,
});
boot();
