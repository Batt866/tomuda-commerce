const app = document.getElementById("app");
const modal = document.getElementById("modal");
let barcodeScanTarget = "picker",
  barcodeStream = null,
  barcodeScanFrame = 0,
  barcodeScanning = false;
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
};
const API_BASE = window.TOMUDA_API_BASE || "/api";
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
];
let backendReady = false;
let backendSaveTimer = null;
let backendLastSaved = "";
const fmt = (n) => "₮" + Number(n || 0).toLocaleString();
const dte = (d) => new Date(d).toLocaleDateString("mn-MN");
const isoDay = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return x.toISOString().slice(0, 10);
};
const tomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return isoDay(d);
};
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
const cats = () => [
  ...new Set([
    ...state.products.map((p) => p.category),
    ...state.extraCategories,
  ]),
];
const role = (r) =>
  ({ admin: "Админ", sales: "Борлуулалт", warehouse: "Агуулах" })[r] ||
  "Ажилчин хэсгээс нэвтэрнэ";
const status = (s) =>
  ({
    pending: "Хүлээгдэж буй",
    confirmed: "Баталсан",
    delivered: "Хүргэсэн",
    cancelled: "Цуцалсан",
  })[s];
const badge = (s) =>
  s === "confirmed"
    ? "bg-emerald-100 text-emerald-700"
    : s === "pending"
      ? "bg-amber-100 text-amber-700"
      : s === "delivered"
        ? "bg-blue-100 text-blue-700"
        : "bg-red-100 text-red-700";
const card = (l, v, t = "") =>
  `<div class="bg-card rounded p-4"><p class="text-sm text-muted-foreground">${l}</p><p class="text-lg font-semibold ${t}">${v}</p></div>`;
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
  if (!state.promotionRules?.quantity) state.promotionRules = { quantity: [], price: [] };
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
  render();
  initPwa();
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
  return /FBAN|FBAV|Instagram|Line\/|Twitter|Snapchat|MicroMessenger|WeChat/i.test(ua);
}
function inAppBrowserName() {
  const ua = navigator.userAgent || "";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV/i.test(ua)) return "Facebook";
  return "энэ app";
}
function copyAppLink() {
  const url = location.href.split("#")[0];
  const done = () => alert("Link хуулагдлаа!\n\nChrome (Android) эсвэл Safari (iPhone) нээж, хаягийн мөрөнд paste хийгээд нээнэ үү.");
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(done).catch(() => prompt("Link-ийг хуулна уу:", url));
  } else {
    prompt("Link-ийг хуулна уу:", url);
  }
}
function pwaInAppEscapeSteps() {
  const app = inAppBrowserName();
  const android = isAndroidDevice();
  const ios = isIosDevice();
  if (android) {
    return `<div class="p-4 rounded bg-red-50 text-red-900 text-sm mb-4"><b>${app} дотор суулгах боломжгүй!</b><br>Эхлээд Chrome browser руу шилжинэ үү.</div><ol class="space-y-3 text-sm leading-relaxed mb-4"><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">1</span><span>Дээд баруун <b>⋮</b> (гурвалжин) дарна</span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">2</span><span><b>Chrome-ээр нээх</b> / <b>Open in Chrome</b> сонгоно</span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">3</span><span>Chrome нээгдсний дараа <b>App суулгах</b> заавар дагана</span></li></ol><button type="button" onclick="openInChrome()" class="w-full py-3 mb-2 bg-primary text-primary-foreground rounded font-semibold">Chrome-оор нээх</button><button type="button" onclick="copyAppLink()" class="w-full py-3 bg-secondary rounded font-medium">Link хуулах</button>`;
  }
  if (ios) {
    return `<div class="p-4 rounded bg-red-50 text-red-900 text-sm mb-4"><b>${app} дотор суулгах боломжгүй!</b><br>Эхлээд Safari browser руу шилжинэ үү.</div><ol class="space-y-3 text-sm leading-relaxed mb-4"><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">1</span><span>Дээд баруун <b>⋯</b> (цэгүүд) дарна</span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">2</span><span><b>Safari-аар нээх</b> / <b>Open in Safari</b> сонгоно</span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">3</span><span>Safari дээр доод <b>Хуваалцах □↑</b> → <b>Нүүр дэлгэцэнд нэмэх</b></span></li></ol><button type="button" onclick="copyAppLink()" class="w-full py-3 bg-primary text-primary-foreground rounded font-semibold">Link хуулах</button>`;
  }
  return `<p class="text-sm">Link-ийг Chrome эсвэл Safari-аар нээнэ үү.</p><button type="button" onclick="copyAppLink()" class="w-full py-3 mt-3 bg-primary text-primary-foreground rounded font-semibold">Link хуулах</button>`;
}
function isIosDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}
function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent || "");
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
  if (isAndroidDevice()) return "📱 Android App суулгах";
  if (isIosDevice()) return "📱 iPhone дээр суулгах";
  return "📱 Утсан дээр суулгах";
}
function openInChrome() {
  const page = location.href;
  const path = page.replace(/^https?:\/\//, "");
  location.href = `intent://${path}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(page)};end`;
}
function initPwa() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch((err) =>
      console.warn("Service worker registration failed", err),
    );
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    pwaInstallPrompt = e;
    showPwaInstallBanner();
  });
  if (isStandalonePwa()) return;
  const dismissed = Number(localStorage.getItem("pwa-install-dismissed") || 0);
  const showAuto = Date.now() - dismissed >= 7 * 86400000;
  if (isAndroidDevice() && showAuto) {
    setTimeout(() => {
      if (isChromeAndroid()) showPwaInstallBanner();
      else openPwaInstallModal();
    }, 1000);
    return;
  }
  if (isIosDevice() && showAuto) {
    setTimeout(() => {
      if (isInAppBrowser()) openPwaInstallModal();
      else showPwaInstallBanner();
    }, 1200);
  }
}
function pwaInstallSidebarBtn() {
  if (isStandalonePwa()) return "";
  return `<button onclick="openPwaInstallModal()" class="w-full px-4 py-3 rounded text-left hover:bg-sidebar-accent border border-sidebar-primary/30"><span class="font-medium text-sidebar-primary">${pwaInstallLabel()}</span></button>`;
}
function openPwaInstallModal() {
  dismissPwaInstall(false);
  const inApp = isInAppBrowser();
  const ios = isIosDevice();
  const android = isAndroidDevice();
  let steps = "";
  let title = "Утсан дээр суулгах";
  if (android) {
    title = "Android App суулгах";
    if (!isChromeAndroid() || inApp) {
      steps = `<div class="p-4 rounded bg-amber-50 text-amber-900 text-sm mb-4">Эхлээд <b>Google Chrome</b>-оор нээнэ үү. Play Store шаардлаггүй.</div><button type="button" onclick="openInChrome()" class="w-full py-3 mb-4 bg-primary text-primary-foreground rounded font-semibold">Chrome-оор нээх</button>`;
    }
    steps += `<ol class="space-y-3 text-sm leading-relaxed"><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">1</span><span><b>Chrome</b> browser-ээр link нээнэ</span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">2</span><span>${pwaInstallPrompt ? "Доорх <b>App суулгах</b> дарна" : "Дээд <b>⋮</b> цэс → <b>App суулгах</b> эсвэл <b>Нүүр дэлгэцэнд нэмэх</b>"}</span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">3</span><span>Нүүр дэлгэц дээр <b>ТОМУДА</b> icon гарна</span></li></ol>`;
  } else if (ios) {
    title = "iPhone дээр суулгах";
    if (inApp) {
      steps = `<div class="p-4 rounded bg-amber-50 text-amber-900 text-sm mb-4">Link-ийг <b>Safari</b>-аар нээнэ үү.</div>`;
    }
    steps += `<ol class="space-y-3 text-sm leading-relaxed"><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">1</span><span><b>Safari</b> browser-ээр link нээнэ</span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">2</span><span>Доод <b>Хуваалцах □↑</b> → <b>Нүүр дэлгэцэнд нэмэх</b></span></li><li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">3</span><span><b>Нэмэх</b> дарна</span></li></ol>`;
  } else {
    steps += `<p class="text-sm text-muted-foreground">Android: Chrome. iPhone: Safari ашиглана уу.</p>`;
  }
  const installBtn =
    android && pwaInstallPrompt
      ? `<button type="button" onclick="installPwaApp()" class="w-full py-3 mt-4 bg-primary text-primary-foreground rounded font-semibold text-base">App суулгах</button>`
      : "";
  box(
    title,
    `<div class="p-5 overflow-y-auto max-h-[70vh]"><p class="text-sm text-muted-foreground mb-4">Play Store, App Store шаардлаггүй.</p>${steps}${installBtn}</div>`,
    "max-w-md",
  );
}
function showPwaInstallBanner() {
  if (isStandalonePwa() || document.getElementById("pwa-install")) return;
  if (isInAppBrowser()) {
    openPwaInstallModal();
    return;
  }
  const android = isAndroidDevice();
  const hint = android
    ? pwaInstallPrompt
      ? "Google Chrome → <strong>App суулгах</strong> дарна"
      : "Chrome <strong>⋮</strong> → <strong>App суулгах</strong>"
    : "Safari → <strong>Хуваалцах □↑</strong> → <strong>Нүүр дэлгэцэнд нэмэх</strong>";
  const title = android ? "🤖 Android App суулгах" : "📱 iPhone дээр суулгах";
  const quick =
    android && pwaInstallPrompt
      ? `<button type="button" onclick="installPwaApp()" class="pwa-install-btn">App суулгах</button>`
      : `<button type="button" onclick="openPwaInstallModal()" class="pwa-install-btn">Заавар</button>`;
  const el = document.createElement("div");
  el.id = "pwa-install";
  el.className = "pwa-install-banner";
  el.innerHTML = `<div class="pwa-install-inner"><div><p class="pwa-install-title">${title}</p><p class="pwa-install-text">${hint}</p></div><div class="pwa-install-actions">${quick}<button type="button" onclick="dismissPwaInstall()" class="pwa-install-dismiss">Хаах</button></div></div>`;
  document.body.appendChild(el);
}
function installPwaApp() {
  if (!pwaInstallPrompt) return openPwaInstallModal();
  pwaInstallPrompt.prompt();
  pwaInstallPrompt.userChoice.finally(() => {
    pwaInstallPrompt = null;
    dismissPwaInstall(false);
    closeModal();
  });
}
function dismissPwaInstall(remember = true) {
  document.getElementById("pwa-install")?.remove();
  if (remember) localStorage.setItem("pwa-install-dismissed", String(Date.now()));
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
  const userRole = state.currentEmployee?.role;
  const nav = [
    ["worker", "Захиалга үүсгэх"],
    ["customers", "Харилцагч"],
    ["products", "Бараа"],
    ["warehouse", "Агуулах"],
    ["count", "Тооллог"],
    ["admin", "Админ"],
  ].filter(([id]) => {
    if (userRole === "warehouse")
      return ["warehouse", "warehouseReceipts"].includes(id);
    if (userRole === "sales") return id !== "admin" && id !== "promotions";
    if (userRole === "admin") return true;
    return ["worker", "customers", "products"].includes(id);
  });
  return `<div class="min-h-screen bg-background flex"><button onclick="state.mobileOpen=!state.mobileOpen;render()" class="mobile-menu-button lg:hidden fixed top-4 left-4 z-50 bg-sidebar text-sidebar-foreground rounded" aria-label="${state.mobileOpen ? "Цэс хаах" : "Цэс нээх"}">${state.mobileOpen ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>` : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`}</button>${state.mobileOpen ? `<div onclick="state.mobileOpen=false;render()" class="lg:hidden fixed inset-0 bg-black/50 z-30"></div>` : ""}<aside class="fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 ${state.mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} flex flex-col"><div class="p-6 border-b border-sidebar-border"><div class="flex items-center gap-3"><div class="tomuda-logo">T</div><div><h1 class="text-lg font-bold text-sidebar-primary">ТОМУДА</h1><p class="text-sm text-sidebar-foreground/70 mt-1">Борлуулалт, агуулах</p></div></div></div><nav class="flex-1 p-4 space-y-1">${nav.map(([id, label]) => `<button onclick="go('${id}')" class="w-full px-4 py-3 rounded text-left ${state.currentView === id ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent"}"><span class="font-medium">${label}</span></button>`).join("")}${pwaInstallSidebarBtn()}</nav><div class="p-4 border-t border-sidebar-border"><div class="flex items-center gap-3 px-4 py-3 rounded bg-sidebar-accent"><div class="flex-1 min-w-0"><p class="font-medium truncate">${state.currentEmployee?.name || "Нэвтрээгүй"}</p><p class="text-xs text-sidebar-foreground/70">${state.currentEmployee ? role(state.currentEmployee.role) : "Ажилчин хэсгээс нэвтэрнэ"}</p></div>${state.currentEmployee ? `<button onclick="logout()" class="px-3 py-2 hover:bg-sidebar-border rounded text-sm">Гарах</button>` : ""}</div></div></aside><main class="flex-1 p-4 lg:p-8 overflow-auto"><div class="max-w-7xl mx-auto pt-12 lg:pt-0">${["employees", "inventory", "reports"].includes(state.currentView) ? `<button onclick="go('admin')" class="mb-4 px-4 py-2 bg-card rounded text-sm">Админ руу буцах</button>` : ""}${content}</div></main></div>`;
}
function adminView() {
  const pending = state.orders.filter((o) => o.status === "pending").length,
    low = state.products.filter((p) => p.stock <= p.minStock).length,
    sales = state.employees.length;
  const actions = [
    [
      "products",
      "Бараа удирдах",
      "Бараа нэмэх, төрөл удирдах, үнэ үлдэгдэл засах",
    ],
    [
      "employees",
      "Ажилтан удирдах",
      "Ажилтан нэмэх, устгах, нууц үг тохируулах",
    ],
    ["inventory", "Агуулах", "Орлого авах, зарлага гаргах, үлдэгдэл хянах"],
    ["reports", "Тайлан", "Өдөр, сар, дэлгүүр, ажилтнаар борлуулалт харах"],
    [
      "promotions",
      "Урамшуулал",
      "Тоо ширхгийн болон үнийн хөнгөлөлтийн дүрэм тохируулах",
    ],
  ];
  return `<div class="space-y-5"><div><h2 class="text-lg font-bold">Админ</h2><p class="text-sm text-muted-foreground mt-1">Бараа, ажилтан, агуулах, тайланг нэг дороос удирдана</p></div><div class="grid grid-cols-2 lg:grid-cols-4 gap-3">${card("Хүлээгдэж буй", pending)}${card("Захиалгад оруулах бараа", low)}${card("Харилцагч", state.customers.length)}${card("Ажилтны тоо", sales)}</div><div class="grid grid-cols-1 md:grid-cols-2 gap-3">${actions.map((a) => `<button onclick="go('${a[0]}')" class="bg-card rounded p-5 text-left hover:bg-secondary/40"><p class="font-semibold">${a[1]}</p><p class="text-sm text-muted-foreground mt-1">${a[2]}</p></button>`).join("")}</div></div>`;
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
  return `<section class="bg-card rounded overflow-hidden"><div class="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 class="text-lg font-bold">${title}</h2><p class="text-sm text-muted-foreground mt-1">${employeeIds.length ? "Сонгосон ажилтны захиалгууд" : "Бүх захиалгын баримт"}</p></div>${showCreate ? `<button onclick="orderModal()" class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Шинэ захиалга</button>` : ""}</div><div class="p-4 flex flex-col sm:flex-row gap-3"><input data-focus="${searchKey}" value="${esc(q)}" oninput="search('${searchKey}',this.value)" placeholder="Харилцагч хайх" class="flex-1 px-4 py-2.5 bg-secondary rounded text-sm"><select onchange="state.filters.order=this.value;render()" class="px-4 py-2.5 bg-secondary rounded text-sm"><option value="all">Бүгд</option>${["pending", "confirmed", "delivered", "cancelled"].map((s) => `<option value="${s}" ${state.filters.order === s ? "selected" : ""}>${status(s)}</option>`).join("")}</select></div><div class="overflow-x-auto"><table class="w-full"><thead class="bg-secondary/50"><tr><th class="px-4 py-3 text-left text-xs font-semibold">Захиалга</th><th class="px-4 py-3 text-left text-xs font-semibold">Ажилтан</th><th class="px-4 py-3 text-left text-xs font-semibold">Бараа</th><th class="px-4 py-3 text-left text-xs font-semibold">Төлөв</th><th class="px-4 py-3 text-right text-xs font-semibold">Дүн</th><th class="px-4 py-3 text-right text-xs font-semibold">Үйлдэл</th></tr></thead><tbody class="divide-y divide-border">${rows.map(orderRow).join("")}</tbody></table></div>${rows.length ? "" : `<div class="p-12 text-center text-muted-foreground">Захиалга олдсонгүй</div>`}</section>`;
}
function warehouseReceiptsPanel(rows, { title, searchKey, employeeIds }) {
  if (rows.length && !rows.some((o) => o.id === state.selectedWarehouseOrderId))
    state.selectedWarehouseOrderId = rows[0].id;
  if (!rows.length) state.selectedWarehouseOrderId = "";
  const selected = rows.find((o) => o.id === state.selectedWarehouseOrderId),
    total = rows.reduce((s, o) => s + o.total, 0);
  return `<section class="bg-card rounded overflow-hidden"><div class="p-4 border-b border-border"><div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><h2 class="text-lg font-bold">${title}</h2><p class="text-sm text-muted-foreground mt-1">${employeeIds.length ? "Сонгосон ажилтны захиалгууд" : "Бүх захиалгын баримт"}</p></div><div class="flex items-start gap-3 sm:text-right"><div><p class="text-sm text-muted-foreground">Нийт захиалгын үнэ</p><p class="text-2xl font-bold text-primary">${fmt(total)}</p></div><button onclick="go('warehouse')" class="px-3 py-1.5 bg-secondary rounded text-sm">Агуулах руу буцах</button></div></div></div><div class="p-4 flex flex-col sm:flex-row gap-3"><input data-focus="${searchKey}" value="${esc(state.searches[searchKey] || "")}" oninput="search('${searchKey}',this.value)" placeholder="Дэлгүүр хайх" class="flex-1 px-4 py-2.5 bg-secondary rounded text-sm"><select onchange="state.filters.order=this.value;render()" class="px-4 py-2.5 bg-secondary rounded text-sm"><option value="all">Бүгд</option>${["pending", "confirmed", "delivered", "cancelled"].map((s) => `<option value="${s}" ${state.filters.order === s ? "selected" : ""}>${status(s)}</option>`).join("")}</select></div><div class="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] border-t border-border"><div class="border-b lg:border-b-0 lg:border-r border-border max-h-[520px] overflow-y-auto">${rows.length ? rows.map((o) => `<button onclick="selectWarehouseOrder('${o.id}')" class="w-full text-left px-4 py-3 border-b border-border hover:bg-secondary/40 ${state.selectedWarehouseOrderId === o.id ? "bg-primary/10" : ""}"><p class="font-semibold truncate">${o.customerName}</p></button>`).join("") : `<div class="p-6 text-sm text-muted-foreground text-center">Захиалга олдсонгүй</div>`}</div>${selected ? warehouseOrderDetail(selected) : `<div class="p-8 text-sm text-muted-foreground text-center">Дэлгүүр сонгоно уу</div>`}</div></section>`;
}
function warehouseOrderDetail(o) {
  return `<div class="p-4 space-y-4"><div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><p class="text-sm text-muted-foreground">Захиалгын дүн</p><p class="text-2xl font-bold text-primary">${fmt(o.total)}</p></div><div class="flex flex-wrap gap-2"><span class="inline-flex px-2.5 py-1 rounded text-xs font-medium ${badge(o.status)}">${status(o.status)}</span><button onclick="receiptDetail('${o.id}')" class="px-3 py-1.5 bg-secondary rounded text-sm">Хэвлэх</button></div></div><div><h3 class="font-semibold">${o.customerName}</h3><p class="text-sm text-muted-foreground">${o.employeeName || "-"} · ${dte(o.createdAt)}</p></div><div class="bg-secondary/50 rounded overflow-hidden"><div class="grid grid-cols-[1fr_72px_100px] gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground"><span>Бараа</span><span class="text-right">Тоо</span><span class="text-right">Дүн</span></div>${o.items.map((i) => `<div class="grid grid-cols-[1fr_72px_100px] gap-2 px-3 py-3 border-t border-border text-sm"><span class="font-medium">${i.productName}</span><b class="text-right">${i.quantity}</b><span class="text-right">${fmt(i.total)}</span></div>`).join("")}</div></div>`;
}
function orderRow(o) {
  return `<tr class="hover:bg-secondary/30"><td class="px-4 py-3"><p class="font-medium">${o.customerName}</p><p class="text-xs text-muted-foreground">#${o.id} · ${dte(o.createdAt)}</p></td><td class="px-4 py-3 text-sm">${o.employeeName || "-"}</td><td class="px-4 py-3 text-sm">${o.items.length} бараа</td><td class="px-4 py-3"><span class="inline-flex px-2.5 py-1 rounded text-xs font-medium ${badge(o.status)}">${status(o.status)}</span></td><td class="px-4 py-3 text-right text-sm font-semibold">${fmt(o.total)}</td><td class="px-4 py-3"><div class="flex justify-end gap-2 whitespace-nowrap"><button onclick="orderDetail('${o.id}')" class="px-3 py-1.5 bg-secondary rounded text-sm">Харах</button>${o.status === "pending" ? `<button onclick="setOrder('${o.id}','confirmed')" class="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded text-sm">Батлах</button><button onclick="setOrder('${o.id}','cancelled')" class="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm">Цуцлах</button>` : ""}${o.status === "confirmed" ? `<button onclick="setOrder('${o.id}','delivered')" class="px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-sm">Хүргэсэн</button>` : ""}</div></td></tr>`;
}
function customersView() {
  const q = state.searches.customers || "",
    rows = state.customers.filter((c) =>
      [c.name, c.companyName, c.phone1].some((v) =>
        (v || "").toLowerCase().includes(q.toLowerCase()),
      ),
    );
  return `<div class="space-y-5"><div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h2 class="text-lg font-bold">Харилцагч бүртгэл</h2><p class="text-muted-foreground mt-1">Дэлгүүр, байгууллагын мэдээлэл</p></div><button onclick="customerModal()" class="px-4 py-2 bg-primary text-primary-foreground rounded">Харилцагч нэмэх</button></div><input data-focus="customers" value="${esc(q)}" oninput="search('customers',this.value)" placeholder="Нэр, компани, утасаар хайх..." class="w-full px-4 py-3 bg-card rounded"><div class="bg-card rounded overflow-hidden"><div class="hidden lg:grid grid-cols-[1.1fr_140px_1.4fr_190px] gap-3 px-4 py-3 bg-secondary/50 text-xs font-semibold text-muted-foreground"><span>Харилцагч</span><span>Дугаар</span><span>Хаяг</span><span class="text-right">Үйлдэл</span></div><div class="divide-y divide-border/60">${rows.map(customerRow).join("")}</div></div></div>`;
}
function customerAddress(c) {
  return (
    [c.province, c.district, c.khoroo, c.address].filter(Boolean).join(", ") ||
    "-"
  );
}
function customerRow(c) {
  const addr = customerAddress(c);
  return `<div class="p-4 hover:bg-secondary/30"><div class="grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_140px_1.4fr_190px] lg:items-center"><div><p class="font-semibold">${c.name}</p><p class="text-sm text-muted-foreground">${c.companyName}</p></div><p class="font-medium text-sm">${c.phone1 || "-"}</p><p class="font-medium text-sm truncate">${addr}</p><div class="flex gap-2 lg:justify-end"><button onclick="customerDetail('${c.id}')" class="px-3 py-2 bg-secondary rounded text-sm">Дэлгэрэнгүй</button><button onclick="customerModal('${c.id}')" class="px-3 py-2 bg-primary text-primary-foreground rounded text-sm">Засах</button></div></div></div>`;
}
function workerStoreRow(c) {
  const addr = customerAddress(c),
    active = state.workerCustomer === c.id;
  return `<div class="p-4 hover:bg-secondary/30 ${active ? "bg-primary/5" : ""}"><div class="grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_140px_1.4fr_190px] lg:items-center"><div><p class="font-semibold">${c.name}</p><p class="text-sm text-muted-foreground">${c.companyName || "-"}</p></div><p class="font-medium text-sm">${c.phone1 || "-"}</p><p class="font-medium text-sm truncate">${addr}</p><div class="flex gap-2 lg:justify-end"><button type="button" onclick="customerDetail('${c.id}')" class="px-3 py-2 bg-secondary rounded text-sm">Дэлгэрэнгүй</button><button type="button" onclick="pickWorkerStore('${c.id}')" class="px-3 py-2 bg-primary text-primary-foreground rounded text-sm">Сонгох</button></div></div></div>`;
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
    low = state.products.filter((p) => p.stock <= p.minStock).length;
  return `<div class="space-y-5"><div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h2 class="text-lg font-bold">Бараа</h2><p class="text-muted-foreground mt-1">Бараа хайх, бүртгэх, файл татах</p></div><button onclick="csv('products.csv',state.products.map(p=>[p.barcode,p.name,p.category,p.price,p.stock,p.unit]))" class="px-4 py-2 bg-secondary rounded">Файл татах</button></div><div class="grid grid-cols-1 sm:grid-cols-3 gap-3">${card("Нийт бараа", state.products.length)}${card("Төрөл", cats().length)}${card("Анхаарах үлдэгдэл", low, low ? "text-amber-600" : "text-emerald-600")}</div><div class="bg-card rounded p-3 flex flex-col gap-3 xl:flex-row"><input data-focus="products" value="${esc(q)}" oninput="search('products',this.value)" placeholder="Нэр, баркодоор хайх..." class="flex-1 px-4 py-3 bg-secondary rounded"><select onchange="state.filters.category=this.value;render()" class="px-4 py-3 bg-secondary rounded"><option value="all">Бүх төрөл</option>${cats()
    .map((c) => `<option ${cat === c ? "selected" : ""}>${c}</option>`)
    .join(
      "",
    )}</select><button onclick="categoryModal()" class="px-4 py-3 bg-secondary rounded">Төрөл нэмэх</button><button onclick="productModal()" class="px-4 py-3 bg-primary text-primary-foreground rounded">Бараа нэмэх</button></div><div class="bg-card rounded overflow-hidden"><div class="overflow-x-auto"><table class="w-full"><thead class="bg-secondary/50"><tr>${["Зураг", "Бараа", "Баркод", "Үнэ", "Хэмжих нэгж", "Үйлдэл"].map((h, i) => `<th class="px-6 py-4 ${i === 5 ? "text-right" : "text-left"} text-sm font-semibold">${h}</th>`).join("")}</tr></thead><tbody class="divide-y divide-border">${list.map(productRow).join("")}</tbody></table></div></div></div>`;
}
function productRow(p) {
  const img = `<img src="${productImage(p)}" class="w-12 h-12 rounded object-cover">`;
  return `<tr class="hover:bg-secondary/30"><td class="px-6 py-4">${img}</td><td class="px-6 py-4"><p class="font-medium">${p.name}</p><p class="text-xs text-muted-foreground">${p.country}</p></td><td class="px-6 py-4 text-sm font-mono">${p.barcode}</td><td class="px-6 py-4 text-sm font-semibold">${fmt(p.price)}</td><td class="px-6 py-4 text-sm">${p.unit}</td><td class="px-6 py-4"><div class="flex justify-end gap-2"><button onclick="productModal('${p.id}')" class="px-3 py-2 bg-secondary rounded">Засах</button><button onclick="confirmDelete('product','${p.id}')" class="px-3 py-2 bg-red-100 text-red-700 rounded">Устгах</button></div></td></tr>`;
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
  return `<div class="space-y-5"><div class="flex justify-between gap-4"><div><h2 class="text-lg font-bold">Агуулах</h2><p class="text-sm text-muted-foreground mt-1">Орлого, зарлага, үлдэгдэл</p></div><button onclick="csv('inventory.csv',state.inventoryLogs.map(l=>[dte(l.date),l.productName,l.type,l.quantity,l.employeeName]))" class="px-4 py-2 bg-secondary rounded text-sm">Татах</button></div><div class="flex gap-2 p-1 bg-secondary rounded w-fit">${[
    ["stock", "Үлдэгдэл"],
    ["in", "Орлого авах"],
    ["out", "Зарлага гаргах"],
  ]
    .map(
      (t) =>
        `<button onclick="state.filters.inventory='${t[0]}';render()" class="px-4 py-2 rounded text-sm ${tab === t[0] ? "bg-card" : "text-muted-foreground"}">${t[1]}</button>`,
    )
    .join(
      "",
    )}</div><div class="bg-card rounded p-3 space-y-3"><div class="flex gap-2 overflow-x-auto pb-1"><button onclick="setInventoryCategory('all')" class="px-3 py-2 rounded whitespace-nowrap text-sm ${cat === "all" ? "bg-primary text-primary-foreground" : "bg-secondary"}">Бүх төрөл</button>${cats()
    .map(
      (c) =>
        `<button onclick="setInventoryCategory('${esc(c)}')" class="px-3 py-2 rounded whitespace-nowrap text-sm ${cat === c ? "bg-primary text-primary-foreground" : "bg-secondary"}">${c}</button>`,
    )
    .join(
      "",
    )}</div><input data-focus="inventory" value="${esc(q)}" oninput="search('inventory',this.value)" placeholder="Бараа хайх (нэр, баркод)..." class="w-full px-4 py-3 bg-secondary rounded"></div>${tab === "stock" ? stockGrid(list) : stockTable(list, tab)}</div>`;
}
function stockGrid(list) {
  return `<div class="bg-card rounded overflow-hidden"><div class="hidden md:grid grid-cols-[1fr_140px_140px_120px] gap-3 px-4 py-3 bg-secondary/50 text-xs font-semibold text-muted-foreground"><span>Бараа</span><span>Төрөл</span><span>Баркод</span><span class="text-right">Үлдэгдэл</span></div><div class="divide-y divide-border">${list.length ? list.map((p) => `<div class="p-4 grid grid-cols-1 md:grid-cols-[1fr_140px_140px_120px] gap-3 md:items-center"><div><p class="font-medium">${p.name}</p><p class="md:hidden text-xs text-muted-foreground mt-1">${p.category} · ${p.barcode}</p></div><span class="hidden md:block text-sm">${p.category}</span><span class="hidden md:block text-sm font-mono">${p.barcode}</span><b class="md:text-right">${p.stock} ${p.unit}</b></div>`).join("") : `<div class="p-8 text-center text-sm text-muted-foreground">Бараа олдсонгүй</div>`}</div></div>`;
}
function stockTable(list, tab) {
  return `<div class="bg-card rounded overflow-hidden"><div class="overflow-x-auto"><table class="w-full"><tbody class="divide-y divide-border">${list.map((p) => `<tr><td class="px-6 py-4 font-medium">${p.name}</td><td class="px-6 py-4 text-sm font-mono">${p.barcode}</td><td class="px-6 py-4 font-semibold">${p.stock} ${p.unit}</td><td class="px-6 py-4 text-right"><input id="qty-${p.id}" type="number" min="1" value="1" class="w-20 text-center px-3 py-2 bg-secondary rounded"><button onclick="applyStock('${p.id}','${tab}')" class="ml-2 px-4 py-2 rounded text-white ${tab === "in" ? "bg-emerald-500" : "bg-red-500"}">${tab === "in" ? "Орлого" : "Зарлага"}</button></td></tr>`).join("")}</tbody></table></div></div>`;
}
function countView() {
  const q = state.searches.count || "",
    list = state.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q.toLowerCase()) || p.barcode.includes(q),
    ),
    counted = Object.keys(state.countQty).filter((id) => countValue(id) !== null).length,
    mismatches = countMismatches();
  return `<div class="space-y-5"><div><h2 class="text-lg font-bold">Тооллог</h2><p class="text-sm text-muted-foreground mt-1">Агуулахад байгаа бүртгэлтэй бараа</p></div><div class="grid grid-cols-1 sm:grid-cols-3 gap-3">${card("Тоолсон бараа", counted)}${card("Зөрүүтэй", mismatches.length, mismatches.length ? "text-red-600" : "text-emerald-600")}${card("Нийт бүртгэл", state.products.length)}</div><input data-focus="count" value="${esc(q)}" oninput="search('count',this.value)" placeholder="Бараа хайх..." class="w-full px-4 py-3 bg-card rounded"><div class="bg-card rounded overflow-hidden"><div class="count-list divide-y divide-border">${list.map(countRow).join("")}</div></div><div class="grid sm:grid-cols-[1fr_auto] gap-2"><button onclick="finishCount()" class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">Тооллого дуусгах</button><button onclick="state.countQty={};state.countDone=false;render()" class="px-4 py-3 bg-card rounded font-medium">Шинэ тооллого</button></div>${state.countDone ? countResult(mismatches) : ""}</div>`;
}
function countRow(p) {
  const value = countValue(p.id),
    diff = value === null ? null : value - Number(p.stock || 0),
    diffText = diff === null ? "-" : diff > 0 ? `+${diff}` : String(diff),
    diffClass =
      diff === null || diff === 0
        ? "text-muted-foreground"
        : "text-red-600 font-semibold";
  return `<div class="count-row"><img src="${productImage(p)}" class="product-thumb" alt="${esc(p.name)}"><div><p class="font-medium">${p.name}</p><p class="text-xs text-muted-foreground">${p.category} · бүртгэл ${p.stock} ${p.unit}</p></div><input onchange="setCountQty('${p.id}',this.value)" value="${value ?? ""}" placeholder="Тоолсон" type="number" class="px-3 py-2 bg-secondary rounded text-center"><span class="text-sm ${diffClass}">Зөрүү ${diffText}</span></div>`;
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
  return `<div class="bg-card rounded overflow-hidden"><div class="px-4 py-3 bg-secondary/50"><p class="font-semibold">Тооллого хадгалагдлаа</p><p class="text-sm text-muted-foreground mt-1">Зөрүүтэй бараа: ${mismatches.length}</p></div>${mismatches.length ? `<div class="divide-y divide-border">${mismatches.map(({ product, counted, diff }) => `<div class="px-4 py-3 grid grid-cols-1 sm:grid-cols-[1fr_90px_90px_90px] gap-2 text-sm"><span class="font-medium">${product.name}</span><span>Бүртгэл: <b>${product.stock}</b></span><span>Тоолсон: <b>${counted}</b></span><span class="${diff === 0 ? "text-muted-foreground" : "text-red-600 font-semibold"}">Зөрүү: ${diff > 0 ? `+${diff}` : diff}</span></div>`).join("")}</div>` : `<div class="p-4 text-sm text-emerald-600 font-medium">Зөрүүтэй бараа байхгүй</div>`}</div>`;
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
  return `<div class="space-y-5"><div class="flex justify-between"><div><h2 class="text-lg font-bold">Тайлан</h2><p class="text-sm text-muted-foreground mt-1">Борлуулалт, төлбөр, урамшуулал</p></div><button onclick="csv('report.csv',[[${total},${paid}]])" class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Тайлан татах</button></div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">${card("Нийт борлуулалт", fmt(total))}${card("Төлсөн", fmt(paid), "text-emerald-600")}${card("Төлөөгүй", fmt(total - paid), "text-red-600")}${card("Барааны үлдэгдэл", fmt(stock))}</div><div class="bg-card rounded overflow-hidden"><div class="px-4 py-3 bg-secondary/50"><h3 class="text-sm font-semibold">Төлбөрийн хяналт</h3></div>${state.orders.length ? state.orders.map(paymentRow).join("") : `<div class="p-6 text-sm text-muted-foreground">Захиалга байхгүй</div>`}</div><div class="bg-card rounded overflow-hidden"><div class="px-4 py-3 bg-secondary/50"><h3 class="text-sm font-semibold">Ажилтны борлуулалт</h3></div>${sales.map((e, i) => `<div class="px-4 py-3 border-t"><div class="flex justify-between"><span>${i + 1}. ${e.name}</span><b>${fmt(e.sum)}</b></div><p class="text-sm text-muted-foreground">${e.count} баримт · Урамшуулал ${fmt(e.commission)}</p></div>`).join("")}</div></div>`;
}
function paymentRow(o) {
  return `<div class="px-4 py-3 border-t grid grid-cols-1 md:grid-cols-[1fr_130px_130px_190px] gap-3 md:items-center"><div><p class="font-medium">${o.customerName}</p><p class="text-xs text-muted-foreground">#${o.id} · ${o.employeeName || "-"} · ${o.paymentTerm === "credit" ? "Зээлээр" : "Бэлэн"}</p></div><b class="text-sm">${fmt(o.total)}</b><span class="text-sm font-medium ${o.isPaid ? "text-emerald-600" : "text-red-600"}">${o.isPaid ? "Төлсөн" : "Төлөөгүй"}</span><div class="grid grid-cols-2 gap-2"><button onclick="setPaid('${o.id}',true)" class="px-3 py-2 rounded text-sm ${o.isPaid ? "bg-emerald-100 text-emerald-700" : "bg-secondary"}">Төлсөн</button><button onclick="setPaid('${o.id}',false)" class="px-3 py-2 rounded text-sm ${!o.isPaid ? "bg-red-100 text-red-700" : "bg-secondary"}">Төлөөгүй</button></div></div>`;
}
function promotionsView() {
  const tab = state.filters.promotionTab,
    qty = state.promotionRules.quantity || [],
    price = state.promotionRules.price || [];
  return `<div class="space-y-5"><div class="flex justify-between gap-3"><div><h2 class="text-lg font-bold">Урамшуулал</h2><p class="text-sm text-muted-foreground mt-1">Тоо ширхэг болон үнийн хөнгөлөлт</p></div><button onclick="go('admin')" class="px-4 py-2 bg-card rounded text-sm">Админ руу буцах</button></div><div class="grid grid-cols-2 gap-2 bg-card rounded p-2"><button onclick="state.filters.promotionTab='quantity';render()" class="py-3 rounded font-medium ${tab === "quantity" ? "bg-primary text-primary-foreground" : "bg-secondary/60"}">Тоо ширхгийн урамшуулал</button><button onclick="state.filters.promotionTab='price';render()" class="py-3 rounded font-medium ${tab === "price" ? "bg-primary text-primary-foreground" : "bg-secondary/60"}">Үнийн дүнгийн урамшуулал</button></div>${tab === "quantity" ? promotionQuantityPanel(qty) : promotionPricePanel(price)}</div>`;
}
function productLabel(id) {
  return state.products.find((p) => p.id === id)?.name || "-";
}
function promotionProductPickerBlock(fieldName, title, selectedId = "", opts = null) {
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
    duplicate =
      selectedId && excludeId && selectedId === excludeId,
    listHtml = q
      ? products.length
        ? `<div class="promo-product-list">${products.map((p) => promotionProductPickRow(p, fieldName, selectedId)).join("")}</div>`
        : `<p class="p-4 text-sm text-muted-foreground text-center">${excludeId ? "Бусад бараа олдсонгүй" : "Бараа олдсонгүй"}</p>`
      : selected
        ? `<div class="promo-product-list">${promotionProductPickRow(selected, fieldName, selectedId)}</div>`
        : "",
    qtyHtml = opts?.qty
      ? promotionQtyField(opts.qty.name, opts.qty.label, opts.qty.defaultValue, true)
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
  const cls = inline ? "promo-qty-field promo-qty-field--inline" : "promo-qty-field";
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
  return `<div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"><div class="flex items-center gap-3 min-w-0 flex-1"><img src="${productImage(buy)}" class="product-thumb"><div class="min-w-0"><p class="text-xs text-muted-foreground">Дүрэм ${i + 1}</p><p class="font-medium truncate">${buy.name || "-"}</p><p class="text-muted-foreground">${r.buyQty} ш авахад</p></div><span class="text-muted-foreground shrink-0">→</span><img src="${productImage(free)}" class="product-thumb"><div class="min-w-0"><p class="font-medium truncate">${free.name || "-"}</p><p class="text-emerald-600">${r.freeQty || 1} ш үнэгүй</p></div></div><button onclick="removePromotionRule('quantity',${i})" class="px-3 py-2 bg-red-100 text-red-700 rounded text-sm shrink-0">Устгах</button></div>`;
}
function promotionPricePanel(rows) {
  return `<div class="space-y-3"><button onclick="promotionPriceModal()" class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Дүрэм нэмэх</button><div class="bg-card rounded overflow-hidden divide-y divide-border">${rows.length ? rows.map((r, i) => `<div class="p-4 flex justify-between gap-3 text-sm"><div><p class="font-medium">Дүрэм ${i + 1}</p><p class="text-muted-foreground mt-1">${r.category ? "Ангилал: " + r.category + " · " : "Бүх ангилал · "}${r.discountPercent}% хөнгөлөлт</p></div><button onclick="removePromotionRule('price',${i})" class="px-3 py-2 bg-red-100 text-red-700 rounded text-sm">Устгах</button></div>`).join("") : `<div class="p-6 text-sm text-muted-foreground">Үнийн дүнгийн дүрэм байхгүй</div>`}</div></div>`;
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
    `<form onsubmit="savePromotionPrice(event)" class="p-5 space-y-3"><select name="category" class="w-full px-3 py-3 bg-secondary rounded"><option value="">Бүх ангилал</option>${cats().map((c) => `<option>${esc(c)}</option>`).join("")}</select><input name="discountPercent" type="number" min="1" max="100" required placeholder="Хөнгөлөлт %" class="w-full px-3 py-3 bg-secondary rounded"><button class="w-full py-3 bg-primary text-primary-foreground rounded">Хадгалах</button></form>`,
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
    const existing = result.find((l) => l.productId === freeId && l.isPromoFree);
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
  state.promotionRules[type].splice(index, 1);
  render();
}
function employeesView() {
  return `<div class="space-y-5"><div class="flex justify-between"><div><h2 class="text-lg font-bold">Ажилтан</h2><p class="text-sm text-muted-foreground mt-1">Ажилтан нэмэх, устгах, нууц үг тохируулах</p></div><button onclick="employeeModal()" class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Ажилтан нэмэх</button></div><div class="bg-card rounded overflow-hidden"><table class="w-full"><tbody class="divide-y divide-border">${state.employees.map((e) => `<tr><td class="px-4 py-3 font-medium">${e.name}</td><td class="px-4 py-3 text-sm font-mono">${e.password}</td><td class="px-4 py-3 text-sm">${role(e.role)}</td><td class="px-4 py-3 text-right"><button onclick="confirmDelete('employee','${e.id}')" class="px-3 py-2 bg-red-100 text-red-700 rounded text-sm">Устгах</button></td></tr>`).join("")}</tbody></table></div></div>`;
}
function loginView() {
  const installBtn = isStandalonePwa()
    ? ""
    : `<button type="button" onclick="openPwaInstallModal()" class="w-full mt-4 py-3 bg-primary/10 text-primary rounded font-medium text-sm">${pwaInstallLabel()}</button>`;
  return `<div class="min-h-screen flex items-center justify-center p-4"><div class="w-full max-w-sm"><div class="mb-5"><h1 class="text-lg font-bold">Ажилчин нэвтрэх</h1><p class="text-sm text-muted-foreground mt-1">Админаас өгсөн нууц үгээ оруулна уу</p></div><form onsubmit="login(event)" class="bg-card rounded p-5 space-y-4"><input id="password" autofocus type="password" placeholder="Нууц үг" class="w-full px-4 py-3 bg-secondary rounded"><div id="loginError"></div><button class="w-full h-12 rounded text-base font-semibold bg-primary text-primary-foreground">Нэвтрэх</button>${installBtn}</form><div class="mt-5 text-center text-sm text-muted-foreground bg-card rounded p-3"><p>Борлуулалт: <b class="font-mono text-foreground">hasan</b></p><p>Админ: <b class="font-mono text-foreground">admin</b></p></div></div></div>`;
}
function workerOrdersList() {
  let list = state.orders.filter((o) => o.customerId === state.workerCustomer);
  if (!list.length) list = [...state.orders];
  const pay = state.filters.workerPay;
  if (pay === "paid") list = list.filter((o) => o.isPaid);
  if (pay === "unpaid") list = list.filter((o) => !o.isPaid);
  const day = state.filters.workerDate;
  if (day) list = list.filter((o) => isoDay(o.createdAt) === day);
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
  if (!state.filters.workerDate) state.filters.workerDate = tomorrowIso();
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
  return `<div class="space-y-4"><div><h2 class="text-lg font-bold">Агуулах</h2><p class="text-sm text-muted-foreground mt-1">Ажилтнаар шүүж захиалгын баримт, барааны нэгтгэл харна</p></div><div class="grid grid-cols-1 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.4fr)] gap-4 items-start">${workerChooser(orders)}${warehouseReceiptsButton()}</div></div>`;
}
function warehouseReceiptsView() {
  const employeeIds = state.selectedWorkers.length ? state.selectedWorkers : [];
  return `<div class="space-y-4">${orderReceiptsPanel({ employeeIds, compact: true })}</div>`;
}
function warehouseReceiptsButton() {
  const count = state.orders.length,
    total = state.orders.reduce((s, o) => s + o.total, 0);
  return `<button onclick="go('warehouseReceipts')" class="bg-card rounded p-5 text-left hover:bg-secondary/40 w-full"><div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p class="text-lg font-bold">Захиалгын баримтууд</p><p class="text-sm text-muted-foreground mt-1">Дэлгүүрийн захиалгуудыг харах</p></div><div class="text-left sm:text-right"><p class="text-sm text-muted-foreground">${count} захиалга</p><p class="font-semibold text-primary">${fmt(total)}</p></div></div></button>`;
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
  return `<section class="bg-card rounded p-4 space-y-3"><button onclick="workerSelectModal()" class="w-full text-left bg-secondary rounded p-3"><p class="font-semibold">Ажилтан сонгох</p><p class="text-sm text-muted-foreground mt-1">${names || "Сонгоогүй"}</p></button><div class="grid sm:grid-cols-2 gap-2 bg-secondary/50 rounded p-3"><label><span class="block text-xs text-muted-foreground mb-1">Түгээгчийн нэр</span><input value="${esc(state.deliveryName)}" oninput="state.deliveryName=this.value" placeholder="Нэр" class="w-full px-3 py-2 bg-card rounded text-sm"></label><label><span class="block text-xs text-muted-foreground mb-1">Түгээгчийн утас</span><input value="${esc(state.deliveryPhone)}" oninput="state.deliveryPhone=this.value" placeholder="Утас" class="w-full px-3 py-2 bg-card rounded text-sm"></label></div>${state.selectedWorkers.length ? `<div class="grid grid-cols-3 gap-2 text-sm bg-secondary/50 rounded p-3"><div><p class="text-muted-foreground">Ажилтан</p><b>${state.selectedWorkers.length}</b></div><div><p class="text-muted-foreground">Ширхэг</p><b>${qty}</b></div><div><p class="text-muted-foreground">Дүн</p><b class="text-primary">${fmt(total)}</b></div></div><div class="bg-secondary/50 rounded overflow-hidden"><div class="grid grid-cols-[54px_1fr_62px_82px_76px_56px] gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground"><span>Зураг</span><span>Нэр</span><span>Нэгж</span><span>Үнэ</span><span>Үлдэгдэл</span><span class="text-right">Тоо</span></div>${detail.length ? detail.map(detailRow).join("") : `<p class="p-3 text-sm text-muted-foreground">Сонгосон ажилтанд захиалга алга</p>`}</div><button onclick="employeeExcel()" class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">Excel татах</button>` : `<div class="p-6 text-center text-sm text-muted-foreground bg-secondary/50 rounded">Ажилтан сонгоно уу</div>`}</section>`;
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
  const p = x.product,
    img = `<img src="${productImage(p)}" class="w-10 h-10 rounded object-cover">`;
  return `<div class="grid grid-cols-[54px_1fr_62px_82px_76px_56px] gap-2 items-center px-3 py-2 border-t text-sm">${img}<div class="min-w-0"><p class="font-medium truncate">${p.name || "-"}</p><p class="text-xs text-muted-foreground truncate">${p.category || ""}</p></div><span>${p.unit || "-"}</span><span>${fmt(p.price)}</span><span>${p.stock ?? "-"}</span><b class="text-right">${x.qty}</b></div>`;
}
function workerStoreSummary(c) {
  if (!c) return `<p class="text-sm text-muted-foreground">Дэлгүүр сонгоогүй</p>`;
  const addr = [c.province, c.district, c.khoroo, c.address]
    .filter(Boolean)
    .join(", ");
  const link = mapsLink(c.latitude, c.longitude);
  return `<div class="rounded bg-primary/10 p-3 space-y-1 text-sm"><p class="font-semibold">${c.name}</p><p class="text-muted-foreground">${c.companyName || "-"}</p><p>${c.phone1 || "-"}</p><p class="text-xs">${addr || "-"}</p>${link ? `<a href="${link}" target="_blank" rel="noopener" class="text-primary text-xs underline">Байршил харах</a>` : ""}</div>`;
}
function filterWorkerStores() {
  const q = (state.searches.workerStore || "").toLowerCase();
  return state.customers.filter((c) =>
    [c.name, c.companyName, c.phone1, c.phone2, c.address, c.province, c.district]
      .some((v) => (v || "").toLowerCase().includes(q)),
  );
}
function workerStorePickStep() {
  const q = state.searches.workerStore || "",
    rows = filterWorkerStores();
  return `<div class="space-y-5 worker-store-step"><div><h2 class="text-lg font-bold">Дэлгүүр сонгох</h2><p class="text-muted-foreground mt-1">Захиалга авах дэлгүүрээ сонгоно уу</p></div><input data-focus="workerStore" value="${esc(q)}" oninput="search('workerStore',this.value)" placeholder="Нэр, компани, утасаар хайх..." class="w-full px-4 py-3 bg-card rounded"><div class="bg-card rounded overflow-hidden"><div class="hidden lg:grid grid-cols-[1.1fr_140px_1.4fr_190px] gap-3 px-4 py-3 bg-secondary/50 text-xs font-semibold text-muted-foreground"><span>Харилцагч</span><span>Дугаар</span><span>Хаяг</span><span class="text-right">Үйлдэл</span></div><div class="worker-store-list divide-y divide-border/60">${rows.length ? rows.map(workerStoreRow).join("") : `<div class="p-8 text-center text-sm text-muted-foreground">Дэлгүүр олдсонгүй</div>`}</div></div></div>`;
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
  return `<div class="worker-selected-row worker-promo-row"><img src="${productImage(p)}" class="product-thumb"><div class="min-w-0"><p class="font-medium truncate">${line.productName}</p><p class="text-xs text-emerald-600 mt-1">Урамшуулал · үнэгүй</p></div><b class="text-sm">${line.quantity} ш</b></div>`;
}
function paymentTermPicker() {
  const term = state.paymentTerm;
  return `<div><span class="block text-sm text-muted-foreground mb-2">Төлбөрийн нөхцөл</span><div class="grid grid-cols-2 gap-2"><button type="button" onclick="setPaymentTerm('cash')" class="py-3 rounded font-medium ${term === "cash" ? "bg-primary text-primary-foreground" : "bg-secondary/60"}">Бэлэн</button><button type="button" onclick="setPaymentTerm('credit')" class="py-3 rounded font-medium ${term === "credit" ? "bg-primary text-primary-foreground" : "bg-secondary/60"}">Зээлээр</button></div></div>`;
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
  return `<section class="bg-card rounded overflow-hidden"><div class="p-4 border-b border-border flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div class="flex-1">${workerStoreSummary(customer)}</div><button type="button" onclick="clearWorkerStore()" class="px-3 py-2 bg-secondary rounded text-sm whitespace-nowrap">Дэлгүүр солих</button></div><div class="p-4 space-y-4"><div class="flex items-stretch gap-3"><div class="grid grid-cols-3 gap-2 flex-1 text-sm rounded bg-secondary/50 p-3"><div><p class="text-muted-foreground">Бараа</p><p class="font-semibold">${cart.skuCount}</p></div><div><p class="text-muted-foreground">Ширхэг</p><p class="font-semibold">${cart.pieceQty}</p></div><div><p class="text-muted-foreground">Дүн</p><p class="font-semibold text-primary">${fmt(cart.total)}</p></div></div><button type="button" onclick="pickerModal()" class="worker-add-plus" aria-label="Бараа нэмэх" title="Бараа нэмэх">+</button></div>${cart.promo.length ? `<p class="text-xs text-emerald-600">Урамшууллаар ${cart.promo.reduce((s, l) => s + l.quantity, 0)} ш үнэгүй нэмэгдлээ.</p>` : ""}<label><span class="block text-sm text-muted-foreground mb-1">Хүргэлтийн огноо</span><input type="date" value="${deliveryDay}" onchange="state.deliveryDate=this.value;render()" class="w-full px-3 py-3 bg-secondary rounded"></label><label><span class="block text-sm text-muted-foreground mb-1">Захиалга авах ажилтан</span><select onchange="state.orderEmployee=this.value" class="w-full px-3 py-3 bg-secondary rounded">${state.employees
    .filter((e) => e.role === "sales")
    .map(
      (e) =>
        `<option value="${e.id}" ${state.orderEmployee === e.id ? "selected" : ""}>${e.name}</option>`,
    )
    .join("")}</select></label></div><div class="px-4 py-3 bg-secondary/50 text-sm"><span class="font-medium">Сонгосон бараа</span></div><div class="divide-y divide-border">${listHtml || `<div class="p-8 text-center text-sm text-muted-foreground"><p class="font-medium text-foreground mb-1">Бараа сонгоогүй байна</p><p>+ товч дээр дарж бараа нэмнэ үү.</p></div>`}</div><div class="sticky bottom-0 bg-card p-4 border-t border-border space-y-3">${paymentTermPicker()}<button onclick="saveWorker()" class="w-full py-3 bg-primary text-primary-foreground rounded font-medium ${cart.paid.length ? "" : "opacity-50"}">Захиалга хадгалах</button></div></section>`;
}
function workerSelectedRow(p) {
  return `<div class="worker-selected-row"><img src="${productImage(p)}" class="product-thumb"><div class="min-w-0"><p class="font-medium truncate">${p.name}</p><p class="text-xs text-muted-foreground mt-1">${p.category} · ${p.barcode} · ${fmt(p.price)} · Үлд ${p.stock - p.qty}</p><p class="text-sm font-semibold text-primary mt-1">${fmt(p.price * p.qty)}</p></div><div class="qty-stepper"><button onclick="setWorkerQty('${p.id}',${p.qty - 1})">-</button><input onchange="setWorkerQty('${p.id}',Number(this.value))" value="${p.qty}" type="number"><button onclick="setWorkerQty('${p.id}',${p.qty + 1})">+</button></div></div>`;
}
function workerOrders(orders) {
  const total = orders.reduce((s, o) => s + o.total, 0),
    paid = orders.filter((o) => o.isPaid).reduce((s, o) => s + o.total, 0),
    unpaid = total - paid,
    day = state.filters.workerDate || tomorrowIso(),
    pay = state.filters.workerPay;
  return `<section class="bg-card rounded p-5 space-y-4"><div class="grid grid-cols-3 gap-2 text-sm">${card("Нийт", fmt(total))}${card("Төлсөн", fmt(paid), "text-emerald-600")}${card("Төлөөгүй", fmt(unpaid), "text-red-600")}</div><div class="flex flex-col sm:flex-row gap-2"><input type="date" value="${day}" onchange="state.filters.workerDate=this.value;render();requestAnimationFrame(scrollWorkerOrdersToDate)" class="flex-1 px-3 py-2.5 bg-secondary rounded text-sm"><select onchange="state.filters.workerPay=this.value;render()" class="px-3 py-2.5 bg-secondary rounded text-sm"><option value="all" ${pay === "all" ? "selected" : ""}>Бүгд</option><option value="paid" ${pay === "paid" ? "selected" : ""}>Төлсөн</option><option value="unpaid" ${pay === "unpaid" ? "selected" : ""}>Төлөөгүй</option></select></div><p class="font-semibold">Өмнөх захиалгууд</p><div class="max-h-[55vh] overflow-y-auto space-y-2">${orders.length ? orders.map((o) => `<button data-order-day="${isoDay(o.createdAt)}" onclick="workerOrderDetail('${o.id}')" class="w-full text-left bg-secondary/50 rounded p-4"><div class="flex justify-between gap-2"><p class="font-medium">${o.customerName}</p><span class="text-xs font-medium ${o.isPaid ? "text-emerald-600" : "text-red-600"}">${o.isPaid ? "Төлсөн" : "Төлөөгүй"}</span></div><p class="text-sm text-muted-foreground mt-1">${dte(o.createdAt)} · ${o.items.length} бараа · ${fmt(o.total)} · ${status(o.status)}</p></button>`).join("") : `<p class="text-sm text-muted-foreground">Захиалга байхгүй</p>`}</div></section>`;
}
function workerOrderDetail(id) {
  const o = state.orders.find((x) => x.id === id);
  box(
    o.customerName,
    `<div class="p-6 space-y-4"><div class="grid grid-cols-2 gap-2 text-sm bg-secondary/50 rounded p-3"><div><p class="text-muted-foreground">Огноо</p><b>${dte(o.createdAt)}</b></div><div><p class="text-muted-foreground">Төлбөр</p><b>${o.paymentTerm === "credit" ? "Зээлээр" : "Бэлэн"}</b></div><div><p class="text-muted-foreground">Төлөв</p><b>${status(o.status)}</b></div><div><p class="text-muted-foreground">Дүн</p><b class="text-primary">${fmt(o.total)}</b></div></div><div class="bg-secondary/50 rounded overflow-hidden"><div class="grid grid-cols-[1fr_70px_100px] gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground"><span>Бараа</span><span class="text-right">Тоо</span><span class="text-right">Дүн</span></div>${o.items.map((i) => `<div class="grid grid-cols-[1fr_70px_100px] gap-2 px-3 py-3 border-t border-border text-sm"><span class="font-medium">${i.productName}</span><b class="text-right">${i.quantity}</b><span class="text-right">${fmt(i.total)}</span></div>`).join("")}</div></div>`,
    "max-w-2xl",
  );
}
function render() {
  if (!state.isLoggedIn) {
    app.innerHTML = loginView();
    return;
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
  state.promoPick = null;
  modal.innerHTML = "";
}
function field(name, label, value = "", type = "text") {
  return `<label><span class="block text-sm font-medium mb-2">${label}</span><input name="${name}" type="${type}" value="${esc(value)}" class="w-full px-4 py-3 bg-secondary rounded"></label>`;
}
function customerModal(id) {
  const c = state.customers.find((x) => x.id === id) || {};
  box(
    id ? "Харилцагч засах" : "Харилцагч бүртгэх",
    `<form onsubmit="saveCustomer(event,'${id || ""}')" class="p-6 space-y-4 modal-scroll overflow-y-auto"><div class="grid sm:grid-cols-2 gap-4">${field("name", "Нэр", c.name)}${field("registrationNumber", "Регистрийн дугаар", c.registrationNumber)}</div>${field("companyName", "Байгууллагын нэр", c.companyName)}<div class="grid sm:grid-cols-2 gap-4">${field("phone1", "Утас 1", c.phone1)}${field("phone2", "Утас 2", c.phone2)}</div><div class="grid sm:grid-cols-2 gap-4">${field("province", "Аймаг/Хот", c.province)}${field("district", "Дүүрэг/Сум", c.district)}</div>${field("khoroo", "Хороо", c.khoroo)}${field("address", "Дэлгэрэнгүй хаяг", c.address)}<div><div class="flex items-center justify-between gap-3 mb-2"><span class="block text-sm font-medium">Байршил</span><span id="customerMapStatus" class="text-xs text-muted-foreground">Map дээр дарж pin тавина</span></div><div id="customerMap" class="customer-map" style="height:360px;min-height:360px;width:100%;display:block;"></div></div><div class="grid sm:grid-cols-2 gap-4"><label><span class="block text-sm font-medium mb-2">Өргөрөг</span><input id="customerLat" name="latitude" value="${esc(c.latitude || "")}" readonly class="w-full px-4 py-3 bg-secondary rounded"></label><label><span class="block text-sm font-medium mb-2">Уртраг</span><input id="customerLng" name="longitude" value="${esc(c.longitude || "")}" readonly class="w-full px-4 py-3 bg-secondary rounded"></label></div>${field("locationText", "Location тайлбар", c.locationText || "")}<button class="w-full py-3 bg-primary text-primary-foreground rounded">Хадгалах</button></form>`,
    "max-w-3xl",
  );
  setTimeout(() => initCustomerMap(c.latitude, c.longitude), 50);
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
  if (window.customerMap?.remove) {
    try {
      window.customerMap.remove();
    } catch (e) {}
  }
  const has =
      lat !== undefined &&
      lng !== undefined &&
      lat !== "" &&
      lng !== "" &&
      !Number.isNaN(Number(lat)) &&
      !Number.isNaN(Number(lng)),
    start = [has ? Number(lat) : 47.9189, has ? Number(lng) : 106.9176];
  window.customerMap = L.map(el).setView(start, has ? 15 : 12);
  window.customerTileFallback = false;
  const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(window.customerMap);
  tiles.on("tileerror", () => {
    if (window.customerTileFallback) return;
    window.customerTileFallback = true;
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap &copy; CARTO",
    }).addTo(window.customerMap);
  });
  let marker;
  const setPoint = (la, ln) => {
    const fixedLat = Number(la).toFixed(6),
      fixedLng = Number(ln).toFixed(6);
    latInput.value = fixedLat;
    lngInput.value = fixedLng;
    if (marker) marker.setLatLng([fixedLat, fixedLng]);
    else marker = L.marker([fixedLat, fixedLng]).addTo(window.customerMap);
    if (status) status.textContent = `Pin: ${fixedLat}, ${fixedLng}`;
  };
  if (has) setPoint(start[0], start[1]);
  window.customerMap.on("click", (e) => setPoint(e.latlng.lat, e.latlng.lng));
  setTimeout(() => window.customerMap.invalidateSize(), 120);
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
    `<div class="p-6 space-y-4"><p class="text-muted-foreground">${c.companyName}</p><p><b>Дугаар:</b> ${c.phone1 || "-"}</p><p><b>Хаяг:</b> ${addr}</p><p><b>Байршил:</b> ${link ? `<a href="${link}" target="_blank" rel="noopener" class="text-primary underline">Google Maps дээр нээх</a>` : "-"}</p>${c.locationText ? `<p class="text-sm text-muted-foreground">${esc(c.locationText)}</p>` : ""}<button onclick="closeModal();customerModal('${id}')" class="w-full py-3 bg-primary text-primary-foreground rounded">Засах</button></div>`,
    "max-w-xl",
  );
}
function productModal(id) {
  const p = state.products.find((x) => x.id === id) || {
    unit: "ширхэг",
    boxQuantity: 1,
    price: 0,
    costPrice: 0,
    stock: 0,
    minStock: 10,
    country: "Монгол",
  };
  box(
    id ? "Бараа засах" : "Бараа бүртгэх",
    `<form onsubmit="saveProduct(event,'${id || ""}')" class="p-6 space-y-4 modal-scroll overflow-y-auto"><div class="grid sm:grid-cols-2 gap-4"><label><span class="block text-sm font-medium mb-2">Баркод</span><div class="barcode-input-row"><input id="productBarcodeInput" name="barcode" value="${esc(p.barcode || "")}" inputmode="numeric" onchange="fillProductFromBarcode(this.value)" class="w-full px-4 py-3 bg-secondary rounded"><button type="button" onclick="startBarcodeScan('product')" class="px-4 py-3 bg-primary text-primary-foreground rounded text-sm">Scan</button></div><p id="productBarcodeLookupStatus" class="text-xs text-muted-foreground mt-2"></p></label>${field("name", "Барааны нэр", p.name)}</div><div id="barcodeScanner" class="barcode-scanner" hidden><video id="barcodeVideo" playsinline muted></video><div class="barcode-scanner-actions"><span id="barcodeStatus">Баркодоо camera-д ойртуулна уу</span><button type="button" onclick="stopBarcodeScan()" class="px-3 py-2 bg-card rounded text-sm">Зогсоох</button></div></div><div class="grid sm:grid-cols-2 gap-4">${field("boxQuantity", "Хайрцаг (тоо)", p.boxQuantity, "number")}</div><label><span class="block text-sm font-medium mb-2">Төрөл</span><select name="category" class="category-scroll w-full px-4 py-2 bg-secondary rounded" size="6">${[...(p.category ? [p.category] : []), ...cats().filter((c) => c !== p.category)].map((c) => `<option ${p.category === c ? "selected" : ""}>${esc(c)}</option>`).join("")}<option value="__new__">+ Шинэ төрөл</option></select></label><label><span class="block text-sm font-medium mb-2">Хэмжих нэгж</span><select name="unit" class="w-full px-4 py-3 bg-secondary rounded">${["ширхэг", "KG", "метр"].map((u) => `<option ${p.unit === u ? "selected" : ""}>${u}</option>`).join("")}</select></label><div class="grid sm:grid-cols-2 gap-4">${field("price", "Үнэ", p.price, "number")}${field("costPrice", "Өртөг", p.costPrice, "number")}</div>${field("country", "Үйлдвэрлэсэн улс", p.country)}<div><span class="block text-sm font-medium mb-2">Зураг</span><div class="flex items-center gap-3 bg-secondary rounded p-3"><img id="productImagePreview" src="${productImage(p)}" class="w-20 h-20 rounded object-cover bg-card"><div class="flex-1"><input type="file" accept="image/*" onchange="handleProductImage(this)" class="w-full text-sm"><input id="productImageValue" name="image" type="hidden" value="${esc(p.image || "")}"><p class="text-xs text-muted-foreground mt-2">JPG, PNG, WEBP зураг сонгоно.</p></div></div></div>${field("stock", "Тоо ширхэг", p.stock, "number")}<button class="w-full py-3 bg-primary text-primary-foreground rounded">Хадгалах</button></form>`,
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
  return category
    ? category.charAt(0).toUpperCase() + category.slice(1)
    : "";
}
function productCountryFromBarcodeData(product) {
  const country = cleanExternalText(
    product.countries_tags?.[0] || product.countries,
  );
  return country
    ? country.charAt(0).toUpperCase() + country.slice(1)
    : "";
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
  box(
    "Төрөл нэмэх",
    `<form onsubmit="event.preventDefault();state.extraCategories.push(this.category.value);closeModal();render()" class="p-6 space-y-4"><input name="category" autofocus required class="w-full px-4 py-3 bg-secondary rounded"><button class="w-full py-3 bg-primary text-primary-foreground rounded">Нэмэх</button></form>`,
    "max-w-md",
  );
}
function employeeModal() {
  box(
    "Ажилтан нэмэх",
    `<form onsubmit="saveEmployee(event)" class="p-5 space-y-3"><input name="name" required placeholder="Нэр" class="w-full px-3 py-3 bg-secondary rounded"><input name="phone" placeholder="Утас" class="w-full px-3 py-3 bg-secondary rounded"><input name="password" required placeholder="Нууц үг" class="w-full px-3 py-3 bg-secondary rounded"><select name="role" class="w-full px-3 py-3 bg-secondary rounded"><option value="sales">Борлуулалт</option><option value="warehouse">Агуулах</option><option value="admin">Админ</option></select><button class="w-full py-3 bg-primary text-primary-foreground rounded">Нэмэх</button></form>`,
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
    isPaid: false,
    createdAt: new Date().toISOString(),
  });
  items.forEach((i) => stock(i.productId, i.quantity, "out"));
  closeModal();
  render();
}
function orderDetail(id) {
  const o = state.orders.find((x) => x.id === id);
  box(
    o.customerName,
    `<div class="p-6 no-print"><table class="w-full"><tbody>${o.items.map((i) => `<tr><td class="py-2">${i.productName}</td><td class="text-right">${i.quantity}</td><td class="text-right font-medium">${fmt(i.total)}</td></tr>`).join("")}</tbody></table><div class="flex justify-between border-t mt-4 pt-4"><span>Нийт</span><b class="text-primary">${fmt(o.total)}</b></div></div>`,
    "max-w-3xl",
  );
}
function receiptDetail(id) {
  const o = state.orders.find((x) => x.id === id);
  box(
    o.customerName,
    `<div class="p-6 no-print"><table class="w-full"><tbody>${o.items.map((i) => `<tr><td class="py-2">${i.productName}</td><td class="text-right">${i.quantity}</td><td class="text-right font-medium">${fmt(i.total)}</td></tr>`).join("")}</tbody></table><div class="flex justify-between border-t mt-4 pt-4"><span>Нийт</span><b class="text-primary">${fmt(o.total)}</b></div><button onclick="window.print()" class="mt-5 w-full py-3 bg-secondary rounded font-medium">Зарлагын баримт хэвлэх</button></div>${receipt(o)}`,
    "max-w-3xl",
  );
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
      state.deliveryName ||
      (state.currentEmployee?.role === "warehouse"
        ? state.currentEmployee.name
        : "-"),
    deliveryPhone =
      state.deliveryPhone ||
      (state.currentEmployee?.role === "warehouse"
        ? state.currentEmployee.phone
        : "-");
  return `<div class="print-receipt hidden"><div class="receipt-page"><header class="receipt-header"><div class="receipt-logo">TD</div><div class="receipt-company"><h1>ТОМУДА групп ХХК</h1><p>Хаяг: Улаанбаатар Баянзүрх, 26-р хороо, Олимп хороолол- 2 /13312/</p><p>Нийслэл хүрээ өргөн чөлөө 331-401. Утас: +976-75333357</p></div><div class="receipt-date"><p>Хүргэлтийн огноо:</p><b>${dte(o.createdAt)}</b></div></header><h2 class="receipt-title">ЗАРЛАГЫН БАРИМТ №${o.id}</h2><section class="receipt-info"><div><p><span>Худалдааны төлөөлөгч:</span><b>${salesName}</b></p><p><span>Худалдааны төлөөлөгчийн утас:</span><b>${salesPhone}</b></p><p><span>Түгээгчийн нэр:</span><b>${deliveryName}</b></p><p><span>Түгээгчийн утас:</span><b>${deliveryPhone}</b></p></div><div><p><span>Харилцагч:</span><b>${c.name || o.customerName}</b></p><p><span>Регистрийн дугаар:</span><b>${c.registrationNumber || "-"}</b></p><p><span>Компанийн нэр:</span><b>${c.companyName || "-"}</b></p><p><span>Утасны дугаар:</span><b>${c.phone1 || "-"}</b></p><p><span>Төлбөрийн нөхцөл:</span><b><span class="receipt-check">${paid ? "☑" : "☐"}</span> Бэлнээр&nbsp;&nbsp;<span class="receipt-check">${bank ? "☑" : "☐"}</span> Дансаар</b></p><p class="receipt-address"><span>Хүргэлтийн хаяг:</span><b>${addr}</b></p></div></section><section class="receipt-bank-grid"><div><p><span>Дансны нэр:</span><b>ТОМУДА групп</b></p><p><span>Регистрийн дугаар:</span><b>5397987</b></p><p><span>Банкны нэр:</span><b>Хаан банк</b></p><p><span>Дансны дугаар:</span><b>51333333307</b></p></div></section><table class="receipt-table"><thead><tr><th>№</th><th>Барааны нэр</th><th>Хэмжих нэгж</th><th>Баркод</th><th>Тоо/ш</th><th>Нэгж үнэ</th><th>Нийт үнэ</th></tr></thead><tbody>${o.items
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
  state.workerQty[id] = Math.max(0, Math.min(Number(qty) || 0, p.stock));
  if (!state.workerQty[id]) delete state.workerQty[id];
  render();
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
  if (barcodeScanTarget === "product") {
    const input = document.getElementById("productBarcodeInput");
    if (input) {
      input.value = code;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    fillProductFromBarcode(code);
    stopBarcodeScan();
    return;
  }
  applyPickerBarcode(code, true);
}
async function startBarcodeScan(target = "picker") {
  if (!navigator.mediaDevices?.getUserMedia)
    return alert("Энэ browser camera scan дэмжихгүй байна.");
  if (!("BarcodeDetector" in window))
    return alert("Энэ browser barcode scan дэмжихгүй байна. Баркодоо гараар оруулна уу.");
  stopBarcodeScan();
  barcodeScanTarget = target;
  const panel = document.getElementById("barcodeScanner");
  const video = document.getElementById("barcodeVideo");
  const status = document.getElementById("barcodeStatus");
  if (!panel || !video) return;
  panel.hidden = false;
  status.textContent = "Camera нээгдэж байна...";
  try {
    barcodeStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    video.srcObject = barcodeStream;
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
  } catch (e) {
    stopBarcodeScan();
    alert("Camera нээгдсэнгүй. Browser permission-оо зөвшөөрөөд дахин оролдоно уу.");
  }
}
function stopBarcodeScan() {
  barcodeScanning = false;
  if (barcodeScanFrame) cancelAnimationFrame(barcodeScanFrame);
  barcodeScanFrame = 0;
  if (barcodeStream) {
    barcodeStream.getTracks().forEach((track) => track.stop());
    barcodeStream = null;
  }
  const panel = document.getElementById("barcodeScanner");
  const video = document.getElementById("barcodeVideo");
  if (video) video.srcObject = null;
  if (panel) panel.hidden = true;
}
function pickerModal() {
  const cat = state.filters.workerCategory,
    q = (state.searches.workerProduct || "").toLowerCase(),
    selected = state.products
      .map((p) => ({ ...p, qty: state.workerQty[p.id] || 0 }))
      .filter((p) => p.qty > 0),
    selectedQty = selected.reduce((s, p) => s + p.qty, 0),
    selectedTotal = selected.reduce((s, p) => s + p.qty * p.price, 0),
    categories = cats(),
    products = state.products.filter(
      (p) =>
        (!cat || p.category === cat) &&
        (p.name.toLowerCase().includes(q) ||
          p.barcode.includes(q) ||
          p.category.toLowerCase().includes(q)),
    );
  box(
    "Бараа нэмэх",
    `<div class="p-5 space-y-4"><div class="picker-summary"><div><p>Сонгосон</p><b>${selected.length}</b></div><div><p>Ширхэг</p><b>${selectedQty}</b></div><div><p>Нийт дүн</p><b>${fmt(selectedTotal)}</b></div></div><div class="picker-search-tools"><input data-picker-search value="${esc(state.searches.workerProduct || "")}" oninput="pickerSearch(this.value)" placeholder="Нэр, баркод, төрлөөр хайх..." class="w-full px-3 py-3 bg-secondary rounded"><button type="button" onclick="clearPickerFilter()" class="px-4 py-3 bg-secondary rounded text-sm whitespace-nowrap">Цэвэрлэх</button></div>${state.pickerStatus ? `<div class="picker-status">${esc(state.pickerStatus)}</div>` : ""}<div class="picker-layout"><div class="picker-categories"><button type="button" onclick="setPickerCategory('')" class="picker-cat-btn ${cat ? "" : "is-active"}">Бүгд</button>${categories.map((c) => `<button type="button" onclick="setPickerCategory('${esc(c)}')" class="picker-cat-btn ${cat === c ? "is-active" : ""}">${c}</button>`).join("")}</div><div class="picker-list">${products.length ? products.map((p) => pickerRow(p)).join("") : `<div class="p-6 text-center text-sm text-muted-foreground bg-secondary/50 rounded">Бараа олдсонгүй</div>`}</div></div><div class="picker-footer"><button onclick="state.workerQty={};pickerModal()" class="py-3 bg-secondary rounded font-medium ${selected.length ? "" : "opacity-50"}">Цэвэрлэх</button><button onclick="closeModal();render()" class="py-3 bg-primary text-primary-foreground rounded font-medium">Дуусгах</button></div></div>`,
    "max-w-4xl",
  );
  const el = document.querySelector("[data-picker-search]");
  if (el) {
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }
}
function pickerRow(p) {
  const q = state.workerQty[p.id] || 0,
    left = p.stock - q;
  return `<div class="picker-row ${q ? "is-selected" : ""}"><img src="${productImage(p)}" class="product-thumb"><div class="min-w-0"><p class="text-sm font-medium truncate">${p.name}</p><p class="text-xs text-muted-foreground">${p.category} · ${p.barcode}</p><div class="flex flex-wrap gap-2 mt-2 text-xs"><span class="px-2 py-1 rounded bg-card font-semibold">${fmt(p.price)}</span><span class="px-2 py-1 rounded bg-card text-muted-foreground">Үлд ${left}</span>${q ? `<span class="px-2 py-1 rounded bg-primary text-primary-foreground">${fmt(q * p.price)}</span>` : ""}</div></div>${q ? `<div class="qty-stepper"><button onclick="setWorkerQty('${p.id}',${q - 1});pickerModal()">-</button><input onchange="setWorkerQty('${p.id}',Number(this.value));pickerModal()" value="${q}" type="number"><button onclick="setWorkerQty('${p.id}',${q + 1});pickerModal()">+</button></div>` : `<button onclick="setWorkerQty('${p.id}',1);pickerModal()" class="px-3 py-2 bg-primary text-primary-foreground rounded text-sm ${p.stock ? "" : "opacity-50"}">Нэмэх</button>`}</div>`;
}
function setPickerCategory(cat) {
  state.filters.workerCategory = cat;
  pickerModal();
}
function pickerSearch(value) {
  state.searches.workerProduct = value;
  if (!value.trim()) state.filters.workerCategory = "";
  pickerModal();
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
      const p = state.products.find((product) => product.id === x.productId) || {
        category: "",
        barcode: "",
      };
      return [i + 1, x.productName, p.category || "-", p.barcode || "", x.quantity, x.total];
    }),
  ];
  excel("ajiltny-zahialga.xls", sheetRows);
  alert("Excel файл татагдлаа");
}
function saveWorker() {
  if (!state.isLoggedIn) return alert("Захиалга хадгалахын өмнө нэвтэрнэ үү");
  const c = state.customers.find((x) => x.id === state.workerCustomer),
    e = state.employees.find((x) => x.id === state.orderEmployee),
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
    isPaid: false,
    paymentTerm: state.paymentTerm,
    deliveryDate: state.deliveryDate || tomorrowIso(),
    createdAt: new Date().toISOString(),
  });
  items.forEach((i) => stock(i.productId, i.quantity, "out"));
  state.workerQty = {};
  state.filters.worker = "orders";
  render();
}
function login(e) {
  e.preventDefault();
  const emp = state.employees.find(
    (x) => x.password === document.getElementById("password").value.trim(),
  );
  if (!emp)
    return (document.getElementById("loginError").innerHTML =
      `<div class="bg-red-100 text-red-700 text-sm p-3 rounded text-center">Нууц үг буруу байна</div>`);
  state.currentEmployee = emp;
  state.isLoggedIn = true;
  if (emp.role === "warehouse") {
    state.selectedWorkers = [];
    state.selectedWarehouseOrderId = "";
    state.deliveryName = "";
    state.deliveryPhone = "";
  }
  state.currentView =
    emp.role === "admin"
      ? "admin"
      : emp.role === "warehouse"
        ? "warehouse"
        : "worker";
  render();
}
function logout() {
  state.currentEmployee = null;
  state.isLoggedIn = false;
  render();
}
function saveEmployee(e) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  state.employees.push({
    id: "employee-" + Date.now(),
    ...f,
    totalSales: 0,
    commissionRate: 0,
  });
  closeModal();
  render();
}
function confirmDelete(type, id) {
  const item =
      type === "product"
        ? state.products.find((p) => p.id === id)
        : state.employees.find((e) => e.id === id),
    name = item?.name || "энэ мөр";
  box(
    "Устгах уу?",
    `<div class="p-5 space-y-4"><p class="text-sm text-muted-foreground"><b class="text-foreground">${name}</b> устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.</p><div class="grid grid-cols-2 gap-2"><button onclick="closeModal()" class="py-3 bg-secondary rounded">Болих</button><button onclick="deleteNow('${type}','${id}')" class="py-3 bg-red-600 text-white rounded font-medium">Устгах</button></div></div>`,
    "max-w-md",
  );
}
function deleteNow(type, id) {
  if (type === "product")
    state.products = state.products.filter((p) => p.id !== id);
  if (type === "employee")
    state.employees = state.employees.filter((e) => e.id !== id);
  closeModal();
  render();
}
function delEmployee(id) {
  state.employees = state.employees.filter((e) => e.id !== id);
  render();
}
function delProduct(id) {
  state.products = state.products.filter((p) => p.id !== id);
  render();
}
function setOrder(id, s) {
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
  receiptDetail,
  workerOrderDetail,
  applyStock,
  setInventoryCategory,
  setWorkerQty,
  pickerModal,
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
  saveBackendState,
  installPwaApp,
  dismissPwaInstall,
  openPwaInstallModal,
  openInChrome,
  copyAppLink,
});
boot();
