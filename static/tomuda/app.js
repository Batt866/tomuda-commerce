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
    countCategory: "all",
    worker: "new",
    workerCategory: "",
    workerPay: "all",
    workerDate: "",
    warehouseDate: "",
    reportDate: "",
    promotionTab: "price",
    promotionDetail: "",
  },
  promotionRules: { quantity: [], price: [], payment: [] },
  workerCustomer: "",
  workerStoreReady: false,
  deliveryStoreId: "",
  deliveryStoreReady: false,
  orderEmployee: "emp-hasan",
  deliveryDate: "",
  paymentTerm: "cash",
  isPaid: false,
  settlementAgreed: false,
  settlementMonth: "",
  settlementDay: "",
  applyPercentDiscount: false,
  selectedWorkers: [],
  selectedWarehouseOrderId: "",
  receiptPrintWorkerIds: [],
  receiptPrintWorkerPickerOpen: false,
  receiptPrintDeliveryId: "",
  receiptPrintOrderIds: [],
  receiptPrintWorkerSyncKey: "",
  selectedDeliveryId: "",
  deliveryName: "",
  deliveryPhone: "",
  workerQty: {},
  pickerActiveId: "",
  pickerQtyProductId: "",
  workerOrderActiveId: "",
  workerOrdersArrived: false,
  workerHighlightOrderId: "",
  receiptEditOrderId: "",
  receiptEditItems: null,
  receiptEditOriginalItems: null,
  extraCategories: [],
  inventoryLogs: [],
  countQty: {},
  countDone: false,
  countOpeningStock: {},
  countSessionStartedAt: null,
  settings: {
    stockAlertEnabled: true,
    stockAlertMin: 10,
    percentDiscountRate: 3,
  },
};
const API_BASE = window.TOMUDA_API_BASE || "/api";
const BRAND = {
  logoWhite: "/static/tomuda/branding/logo-white.png",
  logoBlue: "/static/tomuda/branding/logo-blue.png",
};
const MN_PROVINCES = [
  "Улаанбаатар",
  "Архангай",
  "Баян-Өлгий",
  "Баянхонгор",
  "Булган",
  "Говь-Алтай",
  "Говьсүмбэр",
  "Дорноговь",
  "Дорнод",
  "Дундговь",
  "Завхан",
  "Орхон",
  "Өвөрхангай",
  "Сэлэнгэ",
  "Сүхбаатар",
  "Төв",
  "Увс",
  "Ховд",
  "Хөвсгөл",
  "Хэнтий",
  "Дархан-Уул",
  "Өмнөговь",
];
let mnLocations = null;
let mnLocationsPromise = null;
function loadMnLocations() {
  if (mnLocations) return Promise.resolve(mnLocations);
  if (!mnLocationsPromise) {
    mnLocationsPromise = fetch("/static/tomuda/data/mn-locations.json", {
      cache: "force-cache",
    })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        mnLocations = data && typeof data === "object" ? data : {};
        return mnLocations;
      })
      .catch(() => {
        mnLocations = {};
        return mnLocations;
      });
  }
  return mnLocationsPromise;
}
function mnDistrictsForProvince(province) {
  if (!mnLocations || !province) return [];
  return Object.keys(mnLocations[province] || {}).sort((a, b) =>
    a.localeCompare(b, "mn"),
  );
}
function mnSubsForDistrict(province, district) {
  if (!mnLocations || !province || !district) return [];
  return mnLocations[province]?.[district] || [];
}
function customerLocationSelect(name, label, values, selected, opts = {}) {
  const { disabled = false, onchange = "", id = "" } = opts;
  const options = [`<option value="">Сонгох</option>`];
  const seen = new Set();
  if (selected && !values.includes(selected)) {
    options.push(
      `<option value="${esc(selected)}" selected>${esc(selected)}</option>`,
    );
    seen.add(selected);
  }
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    options.push(
      `<option value="${esc(value)}"${selected === value ? " selected" : ""}>${esc(value)}</option>`,
    );
  }
  return `<label><span class="block text-sm font-medium mb-2">${label}</span><select name="${name}"${id ? ` id="${id}"` : ""} class="w-full px-4 py-3 bg-secondary rounded app-input"${disabled ? " disabled" : ""}${onchange ? ` onchange="${onchange}"` : ""}>${options.join("")}</select></label>`;
}
function customerDistrictFieldHtml(province, district = "") {
  const districts = mnDistrictsForProvince(province);
  return `<div id="customer-district-field">${customerLocationSelect("district", "Дүүрэг/Сум", districts, district, { onchange: "onCustomerDistrictChange()", disabled: !province })}</div>`;
}
function customerKhorooFieldLabel(province, district) {
  const subs = mnSubsForDistrict(province, district);
  if (!subs.length) return province === "Улаанбаатар" ? "Хороо" : "Баг";
  return subs[0].includes("баг") ? "Баг" : "Хороо";
}
function customerKhorooFieldHtml(province, district = "", khoroo = "") {
  const subs = mnSubsForDistrict(province, district);
  return `<div id="customer-khoroo-field">${customerLocationSelect("khoroo", customerKhorooFieldLabel(province, district), subs, khoroo, { disabled: !district })}</div>`;
}
function initCustomerAddressFields(c = {}) {
  const province =
    document.querySelector('[name="province"]')?.value ||
    c.province ||
    "Улаанбаатар";
  const district =
    document.querySelector('[name="district"]')?.value || c.district || "";
  const khoroo =
    document.querySelector('[name="khoroo"]')?.value || c.khoroo || "";
  const districtField = document.getElementById("customer-district-field");
  const khorooField = document.getElementById("customer-khoroo-field");
  if (districtField)
    districtField.outerHTML = customerDistrictFieldHtml(province, district);
  if (khorooField)
    khorooField.outerHTML = customerKhorooFieldHtml(province, district, khoroo);
}
function onCustomerProvinceChange() {
  const province = document.querySelector('[name="province"]')?.value || "";
  const districtField = document.getElementById("customer-district-field");
  const khorooField = document.getElementById("customer-khoroo-field");
  if (districtField)
    districtField.outerHTML = customerDistrictFieldHtml(province, "");
  if (khorooField)
    khorooField.outerHTML = customerKhorooFieldHtml(province, "", "");
}
function onCustomerDistrictChange() {
  const province = document.querySelector('[name="province"]')?.value || "";
  const district = document.querySelector('[name="district"]')?.value || "";
  const khorooField = document.getElementById("customer-khoroo-field");
  if (khorooField)
    khorooField.outerHTML = customerKhorooFieldHtml(province, district, "");
}
const persistKeys = [
  "customers",
  "products",
  "employees",
  "orders",
  "extraCategories",
  "inventoryLogs",
  "countQty",
  "countDone",
  "countOpeningStock",
  "countSessionStartedAt",
  "workerCustomer",
  "orderEmployee",
  "paymentTerm",
  "promotionRules",
  "deliveryDate",
  "selectedDeliveryId",
  "deliveryName",
  "deliveryPhone",
  "settings",
];
let backendReady = false;
let backendSaveTimer = null;
let backendLastSaved = "";
let serverUpdatedAt = "";
let backendSaving = false;
let backendPollTimer = null;
let tombudaHistoryDepth = 0;
let tombudaSkipPopstate = false;
let suppressHistoryPush = false;
const BACKEND_POLL_MS = 4000;
const BOOT_WAKE_MAX = 18;
const BOOT_WAKE_BASE_MS = 5000;
const BOOT_STATE_MAX = 6;
const BOOT_STATE_BASE_MS = 3000;
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const BOOT_TITLE_TEXT = "Апп нээгдэж байна";
const BOOT_LOADING_TEXT = "Мэдээлэл татаж байна. Түр хүлээнэ үү";
function setBootStatus(title, detail) {
  const titleEl = document.getElementById("boot-title");
  const detailEl = document.getElementById("boot-detail");
  if (titleEl) {
    titleEl.textContent = title || BOOT_TITLE_TEXT;
    titleEl.hidden = false;
  }
  if (detailEl) detailEl.textContent = detail || BOOT_LOADING_TEXT;
}
async function fetchJsonWithTimeout(url, ms = 90000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}
async function wakeBackendWithRetry() {
  for (let attempt = 0; attempt < BOOT_WAKE_MAX; attempt++) {
    try {
      const payload = await fetchJsonWithTimeout(`${API_BASE}/health`, 90000);
      if (payload?.ok) return true;
    } catch (error) {
      console.warn("Backend wake failed", error, attempt + 1);
    }
    if (attempt < BOOT_WAKE_MAX - 1) {
      await sleep(BOOT_WAKE_BASE_MS + attempt * 800);
    }
  }
  return false;
}
async function fetchBackendStateWithRetry() {
  if (!(await wakeBackendWithRetry())) return null;
  for (let attempt = 0; attempt < BOOT_STATE_MAX; attempt++) {
    try {
      const payload = await fetchJsonWithTimeout(`${API_BASE}/state`, 90000);
      if (payload?.state) return payload;
    } catch (error) {
      console.warn("Backend state load failed", error, attempt + 1);
    }
    if (attempt < BOOT_STATE_MAX - 1) {
      await sleep(BOOT_STATE_BASE_MS + attempt * 1000);
    }
  }
  return null;
}
const fmt = (n) => "₮" + Number(n || 0).toLocaleString();
const RECEIPT_PERCENT_DISCOUNT = 3;
function ensureSettings() {
  if (!state.settings || typeof state.settings !== "object") {
    state.settings = {
      stockAlertEnabled: true,
      stockAlertMin: 10,
      percentDiscountRate: RECEIPT_PERCENT_DISCOUNT,
    };
    return;
  }
  if (state.settings.stockAlertEnabled == null)
    state.settings.stockAlertEnabled = true;
  if (state.settings.stockAlertMin == null) state.settings.stockAlertMin = 10;
  if (state.settings.percentDiscountRate == null)
    state.settings.percentDiscountRate = RECEIPT_PERCENT_DISCOUNT;
}
function percentDiscountRate() {
  ensureSettings();
  const n = Number(state.settings.percentDiscountRate);
  return Number.isFinite(n) && n >= 0 ? n : RECEIPT_PERCENT_DISCOUNT;
}
function canApplyPercentDiscount(emp = state.currentEmployee) {
  if (!emp) return false;
  if (emp.role === "admin") return percentDiscountRate() > 0;
  if (emp.role !== "sales") return false;
  if (emp.allowPercentDiscount === false) return false;
  if (emp.allowPercentDiscount == null) return percentDiscountRate() > 0;
  return !!emp.allowPercentDiscount && percentDiscountRate() > 0;
}
function isCashPayment(term = state.paymentTerm) {
  return (term || "cash") === "cash";
}
function workerPercentDiscountActive(term = state.paymentTerm) {
  return (
    !!state.applyPercentDiscount &&
    canApplyPercentDiscount() &&
    isCashPayment(term)
  );
}
function ensureEmployeePercentDiscount() {
  state.employees.forEach((e) => {
    if (e.role === "sales" && e.allowPercentDiscount == null)
      e.allowPercentDiscount = true;
  });
}
function stockAlertLevel(p) {
  return Math.max(0, Number(p?.minStock ?? 0));
}
function isLowStock(p) {
  if (state.settings?.stockAlertEnabled === false) return false;
  const limit = stockAlertLevel(p);
  if (limit <= 0) return false;
  return Number(p?.stock ?? 0) <= limit;
}
function lowStockProducts() {
  return state.products.filter(isLowStock);
}
const dte = (d) => new Date(d).toLocaleDateString("mn-MN");
const dteAt = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "-";
  const hh = String(x.getHours()).padStart(2, "0");
  const mm = String(x.getMinutes()).padStart(2, "0");
  return `${dte(d)} ${hh}:${mm}`;
};
const isoDay = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const todayIso = () => isoDay(new Date());
const isDayBeforeToday = (day) => !!(day && day < todayIso());
const tomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return isoDay(d);
};
function defaultDeliveryDate(from) {
  const base = new Date(from || Date.now());
  if (Number.isNaN(base.getTime())) return tomorrowIso();
  const d = new Date(base);
  d.setDate(d.getDate() + 1);
  return isoDay(d);
}
function orderDeliveryDay(o) {
  const stored = isoDay(o?.deliveryDate);
  if (stored) return stored;
  const created = isoDay(o?.createdAt);
  return created || todayIso();
}
const orderDay = (o) => orderDeliveryDay(o);
function todayNoonLocal() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}
function orderInWarehouseLiveSession(o) {
  const today = todayIso();
  if (isoDay(o.createdAt) === today) return true;
  return orderDay(o) === today;
}
function orderMatchesWarehouseDate(o, day = state.filters.warehouseDate) {
  if (!day) return orderInWarehouseLiveSession(o);
  return orderDay(o) === day;
}
function filterWarehouseOrders(orders) {
  return orders.filter((o) => orderMatchesWarehouseDate(o));
}
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
function receiptMonthKey(o) {
  const day = isoDay(o?.createdAt || o?.deliveryDate || "");
  return day ? day.slice(0, 7) : "";
}
function orderReceiptNum(o) {
  if (!o) return "";
  const seq = Number(o.receiptSeq);
  if (seq > 0) return seq;
  return o.id;
}
function formatReceiptNumber(o) {
  const seq = orderReceiptNum(o);
  const month = o.receiptMonth || receiptMonthKey(o);
  if (month) {
    const [y, m] = month.split("-");
    return `${String(y).slice(-2)}${m}-${seq}`;
  }
  return String(seq);
}
function receiptMoney(n) {
  return Number(n || 0).toLocaleString();
}
function orderGrossTotal(o) {
  if (o.grossTotal != null) return Number(o.grossTotal);
  return (o.items || [])
    .filter((i) => !i.isPromoFree)
    .reduce((s, i) => s + (i.total || 0), 0);
}
function orderDiscountAmount(o) {
  if (o.discountAmount != null) return Number(o.discountAmount);
  const gross = orderGrossTotal(o);
  const pct =
    o.applyPercentDiscount && isCashPayment(o.paymentTerm)
      ? Number(o.percentDiscount || RECEIPT_PERCENT_DISCOUNT)
      : 0;
  return Math.round((gross * pct) / 100);
}
function orderPayableTotal(o) {
  return orderAmount(o);
}
function orderGrossFromItems(o) {
  return (o.items || [])
    .filter((i) => !i.isPromoFree)
    .reduce((s, i) => s + (Number(i.total) || 0), 0);
}
function recalcOrderTotals(o) {
  if (!o) return o;
  const gross = orderGrossFromItems(o);
  const pctRate =
    o.applyPercentDiscount && isCashPayment(o.paymentTerm)
      ? Number(o.percentDiscount ?? percentDiscountRate())
      : 0;
  const employeeDiscount =
    pctRate > 0 ? Math.round((gross * pctRate) / 100) : 0;
  const term = o.paymentTerm || "cash";
  const priceRule = matchingPricePromotionRule(gross);
  const paymentRule = matchingPaymentPromotionRule(gross, term);
  const pricePromoDiscount = pricePromotionDiscountAmount(gross, priceRule);
  const paymentPromoDiscount = paymentPromotionDiscountAmount(
    gross,
    paymentRule,
  );
  const discountAmount = Math.min(
    gross,
    employeeDiscount + pricePromoDiscount + paymentPromoDiscount,
  );
  o.grossTotal = gross;
  o.discountAmount = discountAmount;
  o.total = gross - discountAmount;
  return o;
}
function orderAmount(o) {
  if (!o) return 0;
  const liveGross = orderGrossFromItems(o);
  const cachedGross = o.grossTotal != null ? Number(o.grossTotal) : null;
  const stored = Number(o.total);
  if (
    Number.isFinite(stored) &&
    (cachedGross == null || Math.abs(cachedGross - liveGross) < 0.01)
  ) {
    return stored;
  }
  recalcOrderTotals(o);
  return Number(o.total) || 0;
}
function orderCreatedDay(o) {
  const created = isoDay(o?.createdAt);
  if (created) return created;
  return orderDeliveryDay(o);
}
function settlementNoteText(o) {
  if (!o.settlementAgreed || !o.settlementMonth || !o.settlementDay) return "";
  return `${Number(o.settlementMonth)} сарын ${Number(o.settlementDay)}-ны дотор тооцоо нийлэхээр тохиролцов`;
}
function settlementMonthOptions(selected) {
  const cur = selected || String(new Date().getMonth() + 1);
  return Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1);
    return `<option value="${m}" ${cur === m ? "selected" : ""}>${m} сар</option>`;
  }).join("");
}
function settlementDayOptions(selected) {
  const cur = selected || String(new Date().getDate());
  return Array.from({ length: 31 }, (_, i) => {
    const d = String(i + 1);
    return `<option value="${d}" ${cur === d ? "selected" : ""}>${d}</option>`;
  }).join("");
}
function nextReceiptSeq(month) {
  let max = 0;
  for (const o of state.orders) {
    const m = o.receiptMonth || receiptMonthKey(o);
    if (m !== month) continue;
    const seq = Number(o.receiptSeq);
    if (seq > max) max = seq;
  }
  return max + 1;
}
function paidFromPaymentTerm(term) {
  return term === "cash";
}
function paymentTermLabel(term) {
  return term === "credit" ? "Зээлээр" : "Бэлнээр";
}
function orderIsPaid(o) {
  if (!o) return false;
  if (o.paymentTerm === "cash") return true;
  if (o.paymentTerm === "credit") return !!o.isPaid;
  return !!o.isPaid;
}
function normalizeOrderPayments() {
  if (!Array.isArray(state.orders)) return;
  for (const o of state.orders) {
    if (!o.paymentTerm) o.paymentTerm = "cash";
    if (o.paymentTerm === "cash") o.isPaid = true;
    else if (o.paymentTerm === "credit") o.isPaid = !!o.isPaid;
  }
}
function normalizeOrderDeliveryDates() {
  if (!Array.isArray(state.orders)) return;
  for (const o of state.orders) {
    if (!isoDay(o.deliveryDate))
      o.deliveryDate = isoDay(o.createdAt) || todayIso();
  }
}
function normalizeOrderTotals() {
  if (!Array.isArray(state.orders)) return;
  for (const o of state.orders) {
    const liveGross = orderGrossFromItems(o);
    const cachedGross = o.grossTotal != null ? Number(o.grossTotal) : null;
    if (
      !Number.isFinite(Number(o.total)) ||
      (cachedGross != null && Math.abs(cachedGross - liveGross) > 0.01)
    ) {
      recalcOrderTotals(o);
    }
  }
}
function normalizeOrderReceiptNumbers() {
  if (!Array.isArray(state.orders)) return;
  const sorted = [...state.orders].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );
  const byMonth = {};
  for (const o of sorted) {
    const month = receiptMonthKey(o);
    if (!month) continue;
    o.receiptMonth = month;
    const seq = Number(o.receiptSeq);
    if (seq > 0) byMonth[month] = Math.max(byMonth[month] || 0, seq);
  }
  for (const o of sorted) {
    const month = receiptMonthKey(o);
    if (!month) continue;
    if (Number(o.receiptSeq) > 0 && o.receiptMonth === month) continue;
    byMonth[month] = (byMonth[month] || 0) + 1;
    o.receiptSeq = byMonth[month];
    o.receiptMonth = month;
  }
}
function buildNewOrder(fields) {
  const createdAt = fields.createdAt || new Date().toISOString();
  const receiptMonth = receiptMonthKey({ createdAt });
  const created = isoDay(createdAt);
  const stored = isoDay(fields.deliveryDate);
  const deliveryDate = stored ? fields.deliveryDate : created || todayIso();
  return {
    id: String(state.orders.length + 1),
    receiptMonth,
    receiptSeq: nextReceiptSeq(receiptMonth),
    createdAt,
    ...fields,
    deliveryDate,
  };
}
function receiptNo(order, size = "md") {
  const n =
    typeof order === "object" && order !== null
      ? orderReceiptNum(order)
      : order;
  return `<span class="receipt-no receipt-no--${size}">№${esc(String(n))}</span>`;
}
const pickerOpen = () => !!modal.querySelector("[data-picker-root]");
const ORDER_PICKER_TITLE = "Захиалгад бараа сонгох";
const PRODUCT_NEW_TITLE = "Бараа нэмэх";
const PRODUCT_EDIT_TITLE = "Бараа засах";
const EXCEL_FILE_DOWNLOAD = "Excel файл татах";
function updateModalTitle(title) {
  const el = document.getElementById("modal-title");
  if (el) el.textContent = title;
}
function pickerModalCustomer() {
  return state.customers.find((c) => c.id === state.workerCustomer) || null;
}
function pickerModalTitleHtml() {
  const c = pickerModalCustomer();
  return c ? workerStoreSummary(c, true) : esc(ORDER_PICKER_TITLE);
}
function updatePickerModalTitle() {
  const el = document.getElementById("picker-order-title");
  if (!el) return;
  const c = pickerModalCustomer();
  if (c) el.innerHTML = workerStoreSummary(c, true);
  else el.textContent = ORDER_PICKER_TITLE;
}
const cats = () => [
  ...new Set([
    ...state.products.map((p) => p.category),
    ...state.extraCategories,
  ]),
];
const role = (r) =>
  ({
    admin: "Админ",
    sales: "Худалдааны төлөөлөгч",
    warehouse: "Агуулах",
    delivery: "Түгээгч",
  })[r] || "Ажилчин";
function deliveryEmployees() {
  return state.employees.filter((e) => e.role === "delivery");
}
function ensureDeliverySelection() {
  if (!state.selectedDeliveryId) return;
  const emp = state.employees.find((e) => e.id === state.selectedDeliveryId);
  if (emp?.role === "delivery") {
    state.deliveryName = emp.name;
    state.deliveryPhone = emp.phone || "";
    return;
  }
  state.selectedDeliveryId = "";
}
function resolveOrderDelivery(o = {}) {
  const id = o.deliveryEmployeeId || state.selectedDeliveryId || "",
    emp = id ? state.employees.find((e) => e.id === id) : null;
  return {
    deliveryEmployeeId: id,
    deliveryName: o.deliveryName || emp?.name || state.deliveryName || "-",
    deliveryPhone: o.deliveryPhone || emp?.phone || state.deliveryPhone || "-",
  };
}
function deliveryFieldsForNewOrder() {
  const d = resolveOrderDelivery();
  return {
    deliveryEmployeeId: state.selectedDeliveryId || "",
    deliveryName: d.deliveryName === "-" ? "" : d.deliveryName,
    deliveryPhone: d.deliveryPhone === "-" ? "" : d.deliveryPhone,
  };
}
function currentRole() {
  return state.currentEmployee?.role || "";
}
function isAdmin() {
  return currentRole() === "admin";
}
function canDelete() {
  return state.isLoggedIn && state.currentEmployee?.role === "admin";
}
function requireAdminDelete() {
  if (canDelete()) return true;
  alertModal("Эрхгүй", "Зөвхөн админ устгах эрхтэй.");
  return false;
}
function defaultViewForRole(r) {
  if (r === "admin") return "admin";
  if (r === "delivery") return "delivery";
  if (r === "warehouse") return "warehouse";
  return "worker";
}
function canAccessView(viewId, r = currentRole()) {
  if (r === "admin") return true;
  if (r === "delivery") return viewId === "delivery";
  if (r === "warehouse") return viewId === "warehouse";
  if (r === "sales")
    return ["worker", "customers", "products", "warehouse"].includes(viewId);
  return false;
}
function allowedNavIds(r = currentRole()) {
  if (r === "admin")
    return ["worker", "customers", "products", "warehouse", "count", "admin"];
  if (r === "warehouse") return ["warehouse"];
  if (r === "delivery") return ["delivery"];
  if (r === "sales") return ["worker", "customers", "products", "warehouse"];
  return ["worker", "customers", "products"];
}
const EMPLOYEE_EMAIL_DEFAULTS = {
  admin: "admin@tomuda.mn",
  "emp-dulam": "aguulah@tomuda.mn",
  "emp-hasan": "ht@tomuda.mn",
  "emp-galsan": "ht.galsan@tomuda.mn",
  "emp-munkh": "ht.munkh@tomuda.mn",
  "emp-tugeegch": "tugeegch@tomuda.mn",
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
function canTakeOrdersRole(r) {
  return r === "sales" || r === "admin";
}
function orderActor() {
  const cur = state.currentEmployee;
  if (!cur) return {};
  if (cur.role === "sales") return cur;
  if (
    cur.role === "admin" &&
    (!state.orderEmployee || state.orderEmployee === cur.id)
  )
    return cur;
  return state.employees.find((x) => x.id === state.orderEmployee) || cur || {};
}
function orderEmployeeChoices() {
  const sales = state.employees.filter((e) => e.role === "sales");
  if (!isAdmin()) return sales;
  const admins = state.employees.filter((e) => e.role === "admin");
  return [...admins, ...sales];
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
const metricsNotifyIcon = (active = false) =>
  `<span class="metrics-bar__notify${active ? " metrics-bar__notify--active" : ""}" aria-hidden="true"><svg class="ui-icon metrics-bar__notify-icon" viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></span>`;
const ADMIN_METRIC_ICONS = {
  stock:
    '<path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
  customers:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  employees:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
};
function adminMetricCard(
  label,
  value,
  tone = "",
  { active = false, action = "", icon = "stock" } = {},
) {
  const svg = ADMIN_METRIC_ICONS[icon] || ADMIN_METRIC_ICONS.stock;
  return `<button type="button" onclick="${action}" class="admin-metric-card${active ? " admin-metric-card--active" : ""}" aria-label="${esc(label)}: ${value}"><span class="admin-metric-card__icon-wrap${active ? " is-active" : ""}"><svg class="ui-icon admin-metric-card__icon" viewBox="0 0 24 24" aria-hidden="true">${svg}</svg>${active ? `<span class="admin-metric-card__dot" aria-hidden="true"></span>` : ""}</span><span class="admin-metric-card__label">${label}</span><b class="admin-metric-card__value ${tone}">${value}</b></button>`;
}
function adminMetricsBar(items) {
  return `<div class="admin-metrics">${items}</div>`;
}
const card = (l, v, t = "", opts = null) => {
  const notify = opts && opts.notify,
    notifyActive = notify && !!opts.active;
  return `<div class="metrics-bar__item${notify ? " metrics-bar__item--notify" : ""}">${notify ? metricsNotifyIcon(notifyActive) : ""}<span class="metrics-bar__label">${l}</span><b class="metrics-bar__value ${t}">${v}</b></div>`;
};
const metricsBar = (items, cols = "", modifier = "") =>
  `<div class="metrics-bar${cols ? ` metrics-bar--${cols}` : ""}${modifier ? ` metrics-bar--${modifier}` : ""}">${items}</div>`;
const pageHead = (title, action = "") =>
  action
    ? `<div class="page-head page-head--row"><h2 class="page-head__title">${title}</h2><div class="page-head__actions">${action}</div></div>`
    : `<h2 class="page-head__title">${title}</h2>`;
const MOBILE_NAV_SHORT = {
  worker: "Захиалга",
  customers: "Харилцагч",
  products: "Бараа",
  warehouse: "Агуулах",
  delivery: "Хүргэлт",
  count: "Тооллого",
  employees: "Ажилтан",
  inventory: "Бүртгэл",
  reports: "Тайлан",
  promotions: "Урамшуулал",
  admin: "Админ",
};
const MOBILE_NAV_SVG = {
  worker:
    '<path d="M6 6h15l-1.5 9h-12L6 6z"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
  customers: '<path d="M3 9h18v12H3z"/><path d="M7 9V6a5 5 0 0 1 10 0v3"/>',
  products:
    '<path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
  warehouse:
    '<path d="M9 5H5a2 2 0 0 0-2 2v12h16V7a2 2 0 0 0-2-2h-4"/><path d="M9 5a2 2 0 0 1 4 0v2H9V5z"/>',
  delivery:
    '<path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  count: '<path d="M4 7h16M4 12h10M4 17h16"/><path d="M18 10v6M15 13h6"/>',
  employees:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  inventory:
    '<path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3"/><path d="M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/><path d="M12 12v6"/>',
  reports:
    '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 17V9"/><path d="M12 17V7"/><path d="M16 17v-4"/>',
  promotions:
    '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  admin:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
};
function sidebarNavForRole(role) {
  if (role === "delivery") return [["delivery", "Хүргэлт"]];
  if (role === "admin")
    return [
      ["worker", "Захиалга үүсгэх"],
      ["customers", "Харилцагч"],
      ["products", "Бараа"],
      ["warehouse", "Агуулах"],
      ["count", "Тооллого"],
      ["employees", "Ажилтан"],
      ["inventory", "Агуулахын бүртгэл"],
      ["reports", "Тайлан"],
      ["promotions", "Урамшуулал"],
      ["admin", "Админ"],
    ];
  return [
    ["worker", "Захиалга үүсгэх"],
    ["customers", "Харилцагч"],
    ["products", "Бараа"],
    ["warehouse", "Агуулах"],
    ["count", "Тооллого"],
    ["admin", "Админ"],
  ].filter(([id]) => allowedNavIds(role).includes(id));
}
function bottomNavForRole(role) {
  const mobileIds = {
    admin: ["worker", "customers", "products", "warehouse", "count", "admin"],
    sales: ["worker", "customers", "products", "warehouse"],
    warehouse: ["warehouse"],
    delivery: ["delivery"],
  };
  const ids = mobileIds[role] || mobileIds.sales;
  return sidebarNavForRole(role).filter(([id]) => ids.includes(id));
}
function mobileNavIcon(id) {
  const paths = MOBILE_NAV_SVG[id];
  if (!paths)
    return '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2"/></svg>';
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}
function mobileNavActive(viewId, navId) {
  if (viewId === navId) return true;
  if (navId === "admin" && viewId === "warehouseReceipts") return true;
  return false;
}
function sidebarNavItems(nav) {
  return nav
    .map(([id, label]) => {
      const active = mobileNavActive(state.currentView, id);
      return `<button type="button" onclick="go('${id}');state.mobileOpen=false;render()" class="sidebar-nav-btn ${active ? "is-active" : ""}" aria-current="${active ? "page" : "false"}"><span class="sidebar-nav-btn__icon" aria-hidden="true">${mobileNavIcon(id)}</span><span class="sidebar-nav-btn__label">${esc(label)}</span></button>`;
    })
    .join("");
}
function mobileBottomNav(nav) {
  if (!nav.length) return "";
  return `<nav class="mobile-bottom-nav lg:hidden" aria-label="Үндсэн цэс">${nav
    .map(([id, label]) => {
      const active = mobileNavActive(state.currentView, id);
      return `<button type="button" onclick="go('${id}');state.mobileOpen=false;render()" class="mobile-bottom-nav__item ${active ? "is-active" : ""}" aria-current="${active ? "page" : "false"}"><span class="mobile-bottom-nav__icon" aria-hidden="true">${mobileNavIcon(id)}</span><span class="mobile-bottom-nav__label">${MOBILE_NAV_SHORT[id] || label}</span></button>`;
    })
    .join("")}</nav>`;
}
function currentPageTitle(nav) {
  if (state.currentView === "worker" && state.filters.worker === "orders") {
    return "Захиалгын жагсаалт";
  }
  if (
    state.currentView === "worker" &&
    state.filters.worker === "new" &&
    state.workerCustomer
  ) {
    const c = state.customers.find((x) => x.id === state.workerCustomer);
    if (c?.name) return c.name;
  }
  const hit = nav.find(([id]) => mobileNavActive(state.currentView, id));
  if (hit) return hit[1];
  if (state.currentView === "promotions" && state.filters.promotionDetail) {
    return promotionTypeLabel(state.filters.promotionDetail);
  }
  const extra = {
    employees: "Ажилтан",
    inventory: "Агуулах",
    reports: "Тайлан",
    promotions: "Урамшуулал",
    warehouseReceipts: "Баримтууд",
    delivery: "Хүргэлт",
  };
  return extra[state.currentView] || "ТОМУДА";
}
const productImage = (p) =>
  p.image ||
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="18" fill="${p.category === "Ундаа" ? "#dff5fb" : p.category === "Чихэр" ? "#fff0d8" : p.category === "Excel бүртгэл" ? "#eaf3e6" : "#eef2f5"}"/><circle cx="118" cy="34" r="24" fill="#16899a" opacity=".18"/><rect x="42" y="28" width="76" height="92" rx="14" fill="#fff" stroke="#16899a" stroke-width="4"/><rect x="55" y="45" width="50" height="28" rx="6" fill="#16899a" opacity=".85"/><text x="80" y="91" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#182032">${esc((p.name || "Бараа").slice(0, 12))}</text><text x="80" y="110" text-anchor="middle" font-family="Arial" font-size="11" fill="#687386">${esc(p.category || "")}</text></svg>`)}`;

function persistentState() {
  return persistKeys.reduce((data, key) => {
    data[key] = state[key];
    return data;
  }, {});
}
const MERGE_BY_ID_KEYS = ["customers", "products", "employees", "orders"];

function mergeArrayById(remote = [], local = []) {
  const map = new Map();
  (remote || []).forEach((item) => {
    if (item?.id != null) map.set(String(item.id), item);
  });
  (local || []).forEach((item) => {
    if (item?.id != null) map.set(String(item.id), item);
  });
  return Array.from(map.values());
}

function mergeRuleArrays(remote = [], local = []) {
  const seen = new Set();
  const merged = [];
  [...(remote || []), ...(local || [])].forEach((item) => {
    const key = JSON.stringify(item);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });
  return merged;
}

function mergePersistentStates(remote = {}, local = {}) {
  const merged = {};
  for (const key of MERGE_BY_ID_KEYS) {
    merged[key] = mergeArrayById(remote[key], local[key]);
  }
  for (const key of persistKeys) {
    if (MERGE_BY_ID_KEYS.includes(key)) continue;
    if (key === "promotionRules") {
      const remoteRules = remote.promotionRules || {};
      const localRules = local.promotionRules || {};
      merged.promotionRules = {
        quantity: mergeRuleArrays(remoteRules.quantity, localRules.quantity),
        price: mergeRuleArrays(remoteRules.price, localRules.price),
        payment: mergeRuleArrays(remoteRules.payment, localRules.payment),
      };
      continue;
    }
    if (key === "countQty") {
      merged.countQty = {
        ...(remote.countQty || {}),
        ...(local.countQty || {}),
      };
      continue;
    }
    if (key === "countOpeningStock") {
      merged.countOpeningStock = {
        ...(remote.countOpeningStock || {}),
        ...(local.countOpeningStock || {}),
      };
      continue;
    }
    if (key === "settings") {
      merged.settings = {
        ...(remote.settings || {}),
        ...(local.settings || {}),
      };
      continue;
    }
    if (key === "extraCategories") {
      merged.extraCategories = [
        ...new Set([
          ...(remote.extraCategories || []),
          ...(local.extraCategories || []),
        ]),
      ];
      continue;
    }
    if (key === "inventoryLogs") {
      merged.inventoryLogs = mergeArrayById(
        remote.inventoryLogs,
        local.inventoryLogs,
      );
      continue;
    }
    merged[key] =
      local[key] !== undefined && local[key] !== null
        ? local[key]
        : remote[key];
  }
  return merged;
}
function protectDeletionsForNonAdmin(data) {
  if (canDelete()) return data;
  let baseline = null;
  try {
    baseline = JSON.parse(backendLastSaved).state;
  } catch {
    return data;
  }
  if (!baseline) return data;
  const protectedData = { ...data };
  for (const key of ["customers", "products", "employees"]) {
    const current = protectedData[key] || [];
    const base = baseline[key] || [];
    const currentIds = new Set(current.map((x) => x.id));
    const restored = base.filter((x) => !currentIds.has(x.id));
    if (restored.length) protectedData[key] = [...current, ...restored];
  }
  const baseRules = baseline.promotionRules || {
    quantity: [],
    price: [],
    payment: [],
  };
  const nextRules = protectedData.promotionRules || {
    quantity: [],
    price: [],
    payment: [],
  };
  protectedData.promotionRules = {
    quantity:
      (nextRules.quantity || []).length < (baseRules.quantity || []).length
        ? [...(baseRules.quantity || [])]
        : [...(nextRules.quantity || [])],
    price:
      (nextRules.price || []).length < (baseRules.price || []).length
        ? [...(baseRules.price || [])]
        : [...(nextRules.price || [])],
    payment:
      (nextRules.payment || []).length < (baseRules.payment || []).length
        ? [...(baseRules.payment || [])]
        : [...(nextRules.payment || [])],
  };
  if (baseline.orders && protectedData.orders) {
    const baseMap = Object.fromEntries(baseline.orders.map((o) => [o.id, o]));
    protectedData.orders = protectedData.orders.map((o) => {
      const base = baseMap[o.id];
      if (base && base.status !== "cancelled" && o.status === "cancelled") {
        return { ...o, status: base.status };
      }
      return o;
    });
  }
  return protectedData;
}
function applyPersistentState(data) {
  if (!data || typeof data !== "object") return false;
  persistKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) state[key] = data[key];
  });
  if (!state.promotionRules?.quantity)
    state.promotionRules = { quantity: [], price: [], payment: [] };
  if (!Array.isArray(state.promotionRules.payment))
    state.promotionRules.payment = [];
  if (!state.workerQty || typeof state.workerQty !== "object")
    state.workerQty = {};
  ensureSettings();
  ensureEmployeePercentDiscount();
  ensureDeliverySelection();
  normalizeOrderReceiptNumbers();
  normalizeOrderPayments();
  normalizeOrderDeliveryDates();
  normalizeOrderTotals();
  return true;
}
function localStateDirty() {
  return JSON.stringify({ state: persistentState() }) !== backendLastSaved;
}
function captureSessionSnapshot() {
  return {
    isLoggedIn: state.isLoggedIn,
    currentEmployee: state.currentEmployee,
    currentView: state.currentView,
    mobileOpen: state.mobileOpen,
    searches: { ...state.searches },
    filters: { ...state.filters },
    selectedWorkers: [...(state.selectedWorkers || [])],
    selectedWarehouseOrderId: state.selectedWarehouseOrderId,
    receiptPrintWorkerIds: [...(state.receiptPrintWorkerIds || [])],
    receiptPrintWorkerPickerOpen: !!state.receiptPrintWorkerPickerOpen,
    receiptPrintDeliveryId: state.receiptPrintDeliveryId || "",
    receiptPrintOrderIds: [...(state.receiptPrintOrderIds || [])],
    receiptPrintWorkerSyncKey: state.receiptPrintWorkerSyncKey || "",
    selectedDeliveryId: state.selectedDeliveryId,
    workerStoreReady: state.workerStoreReady,
    pickerStatus: state.pickerStatus,
    pickerBarcode: state.pickerBarcode,
    deliveryName: state.deliveryName,
    deliveryPhone: state.deliveryPhone,
  };
}
function restoreSessionSnapshot(session) {
  Object.assign(state, session);
}
function syncBackendMarkers(payload, stateData) {
  if (stateData) applyPersistentState(stateData);
  backendLastSaved = JSON.stringify({ state: persistentState() });
  if (payload?.updatedAt) serverUpdatedAt = payload.updatedAt;
}
function applyRemoteState(payload) {
  if (!payload?.state) return false;
  const session = captureSessionSnapshot();
  const pickerCategory = state.filters.workerCategory;
  const reopenPicker = pickerOpen();
  const merged = mergePersistentStates(payload.state, persistentState());
  applyPersistentState(merged);
  restoreSessionSnapshot(session);
  ensureEmployeeEmails();
  ensureEmployeePercentDiscount();
  normalizeOrderReceiptNumbers();
  normalizeOrderPayments();
  normalizeOrderDeliveryDates();
  normalizeOrderTotals();
  backendLastSaved = JSON.stringify({ state: persistentState() });
  if (payload.updatedAt) serverUpdatedAt = payload.updatedAt;
  render();
  if (reopenPicker && pickerCategory) {
    state.filters.workerCategory = pickerCategory;
    pickerModal();
  }
  return true;
}
async function fetchBackendPayload() {
  const res = await fetch(`${API_BASE}/state`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}
async function pollBackendState() {
  if (!backendReady || backendSaving || backendSaveTimer) return;
  try {
    const payload = await fetchBackendPayload();
    if (!payload?.updatedAt) return;
    if (!serverUpdatedAt) {
      serverUpdatedAt = payload.updatedAt;
      return;
    }
    if (payload.updatedAt === serverUpdatedAt) return;
    applyRemoteState(payload);
  } catch (error) {
    console.warn("Backend poll failed", error);
  }
}
function startBackendPoll() {
  stopBackendPoll();
  backendPollTimer = setInterval(pollBackendState, BACKEND_POLL_MS);
  document.addEventListener("visibilitychange", onVisibilityPoll);
  window.addEventListener("focus", onVisibilityPoll);
}
function stopBackendPoll() {
  if (backendPollTimer) clearInterval(backendPollTimer);
  backendPollTimer = null;
  document.removeEventListener("visibilitychange", onVisibilityPoll);
  window.removeEventListener("focus", onVisibilityPoll);
}
function onVisibilityPoll() {
  if (document.visibilityState === "visible") pollBackendState();
}
function bootScreenHtml(message = BOOT_LOADING_TEXT, showRetry = false) {
  return `<div class="boot-screen${showRetry ? " boot-screen--error" : ""}" aria-live="polite"><div class="boot-screen__card" role="status"><div class="boot-screen__brand"><img src="${BRAND.logoBlue}" alt="" class="boot-screen__logo" width="52" height="52" decoding="async"><div class="boot-screen__brand-copy"><p class="boot-screen__brand-name">ТОМУДА</p><p class="boot-screen__brand-sub">Борлуулалт, агуулах</p></div></div><div class="boot-screen__copy"><p id="boot-title" class="boot-screen__title">${BOOT_TITLE_TEXT}</p><p id="boot-detail" class="boot-screen__detail">${esc(message)}</p></div><div class="boot-screen__progress" aria-hidden="true"><span></span></div><div class="boot-screen__status-row" aria-hidden="true"><span class="boot-screen__pulse"></span><span>Сервертэй холбогдож байна</span></div><div class="boot-screen__preview" aria-hidden="true"><span class="boot-screen__preview-row"></span><span class="boot-screen__preview-row"></span><span class="boot-screen__preview-row"></span></div><button type="button" id="boot-retry" class="boot-screen__retry${showRetry ? "" : " hidden"}" onclick="location.reload()">Дахин оролдох</button></div></div>`;
}
function showBootRetry() {
  document.querySelector(".boot-screen")?.classList.add("boot-screen--error");
  document.getElementById("boot-retry")?.classList.remove("hidden");
}
async function boot() {
  try {
    app.innerHTML = bootScreenHtml();
    const payload = await fetchBackendStateWithRetry();
    if (payload?.state) {
      syncBackendMarkers(payload, payload.state);
    } else {
      setBootStatus(
        "Холбогдож чадсангүй",
        "Сервер асаж дуусаагүй байж болно. 2 минут хүлээгээд «Дахин оролдох» дарна уу.",
      );
      showBootRetry();
      return;
    }
    backendReady = true;
    ensureEmployeeEmails();
    ensureSettings();
    ensureEmployeePercentDiscount();
    ensureDeliverySelection();
    normalizeOrderReceiptNumbers();
    normalizeOrderPayments();
    normalizeOrderDeliveryDates();
    normalizeOrderTotals();
    state.workerQty = {};
    restoreAuthSession();
    initNoZoom();
    initPickerModalActions();
    initEmployeeModalActions();
    initQtyStepperButtons();
    initConfirmCard();
    initConfirmDeleteActions();
    initAppBack();
    window.__tomudaBooted = true;
    render();
    initPwa();
    startBackendPoll();
  } catch (err) {
    console.error("Boot failed", err);
    setBootStatus(
      "Алдаа гарлаа",
      "Хуудсыг дахин ачаална уу. Асуудал үргэлжилбэл интернет холболтоо шалгана уу.",
    );
    showBootRetry();
  }
}
function canAppBack() {
  if (!state.isLoggedIn) return false;
  const confirmOverlay = document.getElementById("confirm-card-overlay");
  if (confirmOverlay && !confirmOverlay.hidden) return true;
  if (barcodeScanning) return true;
  if (modal.innerHTML.trim()) return true;
  if (state.mobileOpen) return true;
  if (
    state.currentView === "worker" &&
    state.filters.worker === "new" &&
    state.workerStoreReady
  ) {
    return true;
  }
  if (
    state.currentView === "worker" &&
    state.filters.worker === "new" &&
    state.workerCustomer
  ) {
    return true;
  }
  if (state.currentView === "delivery" && state.deliveryStoreReady) {
    return true;
  }
  if (state.currentView === "promotions" && state.filters.promotionDetail) {
    return true;
  }
  const subAdminViews = [
    "employees",
    "inventory",
    "reports",
    "promotions",
    "warehouseReceipts",
  ];
  if (subAdminViews.includes(state.currentView)) return true;
  const defaultView = defaultViewForRole(currentRole());
  if (state.currentView !== defaultView) return true;
  if (state.currentView === "worker" && state.filters.worker === "orders") {
    return true;
  }
  return false;
}
function leaveWorkerOrdersTab() {
  if (state.currentView !== "worker" || state.filters.worker !== "orders") {
    return false;
  }
  clearWorkerOrderHighlight();
  state.filters.worker = "new";
  render();
  return true;
}
function handleAppBack() {
  if (!state.isLoggedIn) return false;

  const confirmOverlay = document.getElementById("confirm-card-overlay");
  if (confirmOverlay && !confirmOverlay.hidden) {
    closeConfirmCard();
    return true;
  }

  if (barcodeScanning) {
    stopBarcodeScan();
    if (pickerOpen()) pickerModal();
    else render();
    return true;
  }

  if (modal.innerHTML.trim()) {
    closeModal();
    return true;
  }

  if (state.mobileOpen) {
    state.mobileOpen = false;
    render();
    return true;
  }

  if (leaveWorkerOrdersTab()) return true;

  if (
    state.currentView === "worker" &&
    state.filters.worker === "new" &&
    state.workerStoreReady
  ) {
    state.workerStoreReady = false;
    state.workerCustomer = "";
    state.searches.workerStore = "";
    resetWorkerCart();
    render();
    return true;
  }

  if (
    state.currentView === "worker" &&
    state.filters.worker === "new" &&
    state.workerCustomer &&
    !state.workerStoreReady
  ) {
    state.workerCustomer = "";
    render();
    return true;
  }

  if (state.currentView === "delivery" && state.deliveryStoreReady) {
    clearDeliveryStore();
    return true;
  }

  if (state.currentView === "promotions" && state.filters.promotionDetail) {
    state.filters.promotionDetail = "";
    render();
    return true;
  }

  const subAdminViews = [
    "employees",
    "inventory",
    "reports",
    "promotions",
    "warehouseReceipts",
  ];
  if (subAdminViews.includes(state.currentView)) {
    go("admin", { silent: true });
    return true;
  }

  const defaultView = defaultViewForRole(currentRole());
  if (state.currentView !== defaultView) {
    go(defaultView, { silent: true });
    return true;
  }

  return false;
}
function pushAppHistory() {
  if (suppressHistoryPush || !state.isLoggedIn) return;
  history.pushState({ tomudaNav: 1 }, "");
  tombudaHistoryDepth++;
}
function armAppBackGuard() {
  pushAppHistory();
}
function appBack() {
  if (!handleAppBack()) return;
  if (tombudaHistoryDepth > 0) {
    tombudaSkipPopstate = true;
    history.back();
  } else {
    armAppBackGuard();
  }
}
function onAppPopState() {
  if (tombudaSkipPopstate) {
    tombudaSkipPopstate = false;
    tombudaHistoryDepth = Math.max(0, tombudaHistoryDepth - 1);
    return;
  }
  tombudaHistoryDepth = Math.max(0, tombudaHistoryDepth - 1);
  if (handleAppBack()) {
    if (tombudaHistoryDepth === 0) armAppBackGuard();
  } else {
    tryExitApp();
  }
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
  history.replaceState({ tomudaRoot: 1 }, "");
  armAppBackGuard();
  window.addEventListener("popstate", onAppPopState);
  bindCapacitorBackButton();
}
function bindCapacitorBackButton() {
  const cap = window.Capacitor;
  if (!cap?.isNativePlatform?.()) return;
  const App = cap.Plugins?.App;
  if (!App?.addListener) return;
  App.addListener("backButton", () => {
    appBack();
  });
}
function qtyStepperApply(btn) {
  const action = btn.getAttribute("data-qty-action");
  const id = btn.getAttribute("data-product-id");
  if (!action || !id) return;
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const inPicker = !!btn.closest("[data-picker-root]");
  const min = Number(btn.closest(".qty-stepper")?.dataset?.qtyMin || 0);
  let q = getWorkerQty(id);
  if (action === "inc") {
    if (q >= p.stock) {
      if (inPicker) showStockLimitToast();
      return;
    }
    q = Math.min(p.stock, q + 1);
  } else if (action === "dec") q = Math.max(min, q - 1);
  else return;
  if (inPicker) pickerQtyChange(id, q);
  else setWorkerQty(id, q);
}
function productPackSize(p) {
  const n = Number(p?.boxQuantity);
  return Number.isFinite(n) && n > 1 ? Math.floor(n) : 0;
}
function pickerQtyFromParts(packs, pieces, p) {
  const packSize = productPackSize(p);
  const pk = Math.max(0, Math.floor(Number(packs) || 0));
  const pc = Math.max(0, Math.floor(Number(pieces) || 0));
  const total = packSize ? pk * packSize + pc : pc;
  return Math.min(p.stock, total);
}
function pickerQtyToParts(q, p) {
  const packSize = productPackSize(p);
  const total = Math.max(0, Math.floor(Number(q) || 0));
  if (!packSize) return { packs: 0, pieces: total };
  return { packs: Math.floor(total / packSize), pieces: total % packSize };
}
function pickerPackMax(p, pieces) {
  const packSize = productPackSize(p);
  if (!packSize) return 0;
  const pc = Math.max(0, Math.floor(Number(pieces) || 0));
  return Math.floor(Math.max(0, p.stock - pc) / packSize);
}
function pickerPieceMax(p, packs) {
  const packSize = productPackSize(p);
  const pk = Math.max(0, Math.floor(Number(packs) || 0));
  if (!packSize) return p.stock;
  return Math.max(0, p.stock - pk * packSize);
}
function readPickerQtyParts(id) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return { packs: 0, pieces: 0 };
  const packSize = productPackSize(p);
  const fallback = pickerQtyToParts(getWorkerQty(id), p);
  if (!packSize) {
    const input = document.querySelector(
      `[data-picker-qty-input][data-product-id="${id}"]`,
    );
    return {
      packs: 0,
      pieces: input
        ? Number(String(input.value).replace(/\D/g, "")) || 0
        : fallback.pieces,
    };
  }
  const packInput = document.querySelector(
    `[data-picker-pack-input][data-product-id="${id}"]`,
  );
  const pieceInput = document.querySelector(
    `[data-picker-piece-input][data-product-id="${id}"]`,
  );
  return {
    packs: packInput
      ? Number(String(packInput.value).replace(/\D/g, "")) || 0
      : fallback.packs,
    pieces: pieceInput
      ? Number(String(pieceInput.value).replace(/\D/g, "")) || 0
      : fallback.pieces,
  };
}
function pickerPartStepperHtml(
  p,
  value,
  { kind, min = 0, max, sheet = false },
) {
  const idAttr = esc(p.id);
  const v = Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
  const decDisabled = v <= min;
  const incDisabled = v >= max;
  const actionAttr =
    kind === "pack" ? "data-picker-pack-action" : "data-picker-piece-action";
  const inputAttr =
    kind === "pack" ? "data-picker-pack-input" : "data-picker-piece-input";
  const draftFn = kind === "pack" ? "pickerPackDraft" : "pickerPieceDraft";
  const commitFn = kind === "pack" ? "pickerPackCommit" : "pickerPieceCommit";
  const label = kind === "pack" ? "Багц" : "Тоо ширхэг";
  const stepperCls = sheet
    ? "picker-qty-stepper--sheet"
    : "picker-qty-stepper--compact";
  return `<div class="qty-stepper picker-qty-stepper ${stepperCls}" data-qty-min="${min}"><button type="button" class="qty-stepper__btn qty-stepper__btn--dec" ${actionAttr}="dec" data-product-id="${idAttr}" ${decDisabled ? "disabled" : ""} aria-label="${label} багасгах">−</button><input ${inputAttr} data-product-id="${idAttr}" oninput="${draftFn}(this)" onblur="${commitFn}(this)" value="${v}" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" class="app-input qty-stepper__input" aria-label="${label}"><button type="button" class="qty-stepper__btn qty-stepper__btn--inc" ${actionAttr}="inc" data-product-id="${idAttr}" ${incDisabled ? "disabled" : ""} aria-label="${label} нэмэх">+</button></div>`;
}
function pickerPartStepperApply(btn, kind) {
  const action = btn.getAttribute(
    kind === "pack" ? "data-picker-pack-action" : "data-picker-piece-action",
  );
  const id = btn.getAttribute("data-product-id");
  if (!action || !id) return;
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  let { packs, pieces } = readPickerQtyParts(id);
  const currentTotal = pickerQtyFromParts(packs, pieces, p);
  if (kind === "pack") {
    if (action === "inc") {
      const max = pickerPackMax(p, pieces);
      if (packs >= max) {
        showStockLimitToast();
        return;
      }
      packs = Math.min(max, packs + 1);
    } else if (action === "dec") packs = Math.max(0, packs - 1);
    else return;
  } else if (action === "inc") {
    const max = pickerPieceMax(p, packs);
    if (pieces >= max) {
      showStockLimitToast();
      return;
    }
    pieces = Math.min(max, pieces + 1);
  } else if (action === "dec") pieces = Math.max(0, pieces - 1);
  else return;
  const nextTotal = pickerQtyFromParts(packs, pieces, p);
  if (nextTotal <= currentTotal && action === "inc") {
    showStockLimitToast();
    return;
  }
  pickerQtyChange(id, nextTotal);
}
function pickerPartDraft(el, kind) {
  const id = el.getAttribute("data-product-id") || "";
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const digits = String(el.value || "").replace(/\D/g, "");
  if (digits !== el.value) el.value = digits;
  let { packs, pieces } = readPickerQtyParts(id);
  const n = digits ? Number(digits) : 0;
  if (kind === "pack") {
    const max = pickerPackMax(p, pieces);
    if (n > max) showStockLimitToast();
    packs = Math.min(max, n);
  } else {
    const max = pickerPieceMax(p, packs);
    if (n > max) showStockLimitToast();
    pieces = Math.min(max, n);
  }
  const total = pickerQtyFromParts(packs, pieces, p);
  if (total > 0) state.workerQty[id] = total;
  else delete state.workerQty[id];
  el.value = String(kind === "pack" ? packs : pieces);
  syncPickerQtySheetUi(id);
}
function pickerPartCommit(el, kind) {
  const id = el.getAttribute("data-product-id") || "";
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  let { packs, pieces } = readPickerQtyParts(id);
  const digits = String(el.value || "").replace(/\D/g, "");
  const n = digits ? Number(digits) : 0;
  if (kind === "pack") {
    const max = pickerPackMax(p, pieces);
    if (n > max) showStockLimitToast();
    packs = Math.min(max, n);
  } else {
    const max = pickerPieceMax(p, packs);
    if (n > max) showStockLimitToast();
    pieces = Math.min(max, n);
  }
  pickerQtyChange(id, pickerQtyFromParts(packs, pieces, p));
}
function pickerPackDraft(el) {
  pickerPartDraft(el, "pack");
}
function pickerPieceDraft(el) {
  pickerPartDraft(el, "piece");
}
function pickerPackCommit(el) {
  pickerPartCommit(el, "pack");
}
function pickerPieceCommit(el) {
  pickerPartCommit(el, "piece");
}
function syncPickerQtySheetUi(id) {
  const totalEl = document.querySelector("[data-picker-qty-total]");
  if (totalEl) totalEl.textContent = `${getWorkerQty(id)} ш`;
  if (pickerOpen()) {
    refreshPickerList();
    updatePickerClearBtn();
  }
}
function pickerQtyStepperHtml(p, q, { min = 0, sheet = false } = {}) {
  const idAttr = esc(p.id);
  const nameLabel = esc(p.name);
  const groupId = `picker-qty-label-${idAttr}`;
  const decDisabled = q <= min;
  const incDisabled = q >= p.stock;
  const stepperCls = sheet
    ? "picker-qty-stepper--sheet"
    : "picker-qty-stepper--compact";
  return `<div class="qty-stepper picker-qty-stepper ${stepperCls}" data-qty-min="${min}" role="group" aria-labelledby="${groupId}"><span id="${groupId}" class="sr-only">${nameLabel} — тоо ширхэг сонгох</span><button type="button" class="qty-stepper__btn qty-stepper__btn--dec" data-qty-action="dec" data-product-id="${idAttr}" ${decDisabled ? "disabled" : ""} aria-label="${nameLabel} багасгах">−</button><input data-picker-qty-input data-product-id="${idAttr}" oninput="qtyDraft(this)" onblur="qtyCommit(this)" value="${q}" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" class="app-input qty-stepper__input" aria-label="${nameLabel} тоо ширхэг" aria-valuenow="${q}" aria-valuemin="${min}" aria-valuemax="${p.stock}"><button type="button" class="qty-stepper__btn qty-stepper__btn--inc" data-qty-action="inc" data-product-id="${idAttr}" ${incDisabled ? "disabled" : ""} aria-label="${nameLabel} нэмэх">+</button></div>`;
}
function ensurePickerActiveId() {
  if (
    state.pickerActiveId &&
    !state.products.some((p) => p.id === state.pickerActiveId)
  ) {
    state.pickerActiveId = "";
  }
}
function finishPickerEditFor(id) {
  if (!id) return;
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  if (productPackSize(p)) {
    const { packs, pieces } = readPickerQtyParts(id);
    setWorkerQty(id, pickerQtyFromParts(packs, pieces, p));
  } else {
    const input = document.querySelector(
      `[data-picker-qty-input][data-product-id="${id}"]`,
    );
    if (input) qtyCommit(input);
  }
  if (state.pickerActiveId === id) state.pickerActiveId = "";
}
function workerQtyStepperHtml(p, q) {
  const idAttr = esc(p.id);
  const decDisabled = q <= 1;
  const incDisabled = q >= p.stock;
  return `<div class="qty-stepper worker-order-qty-stepper" data-qty-min="1"><button type="button" class="qty-stepper__btn qty-stepper__btn--dec" data-qty-action="dec" data-product-id="${idAttr}" ${decDisabled ? "disabled" : ""} aria-label="Багасгах">−</button><input data-product-id="${idAttr}" oninput="qtyDraft(this)" onblur="qtyCommit(this)" value="${q}" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" class="app-input qty-stepper__input" aria-label="Тоо ширхэг"><button type="button" class="qty-stepper__btn qty-stepper__btn--inc" data-qty-action="inc" data-product-id="${idAttr}" ${incDisabled ? "disabled" : ""} aria-label="Нэмэх">+</button></div>`;
}
function setWorkerOrderActive(id) {
  if (!id) return;
  state.workerOrderActiveId = id;
  render();
}
function finishWorkerOrderEdit() {
  const id = state.workerOrderActiveId;
  if (id) {
    const input = document.querySelector(
      `.worker-order-qty-stepper input[data-product-id="${id}"]`,
    );
    if (input) qtyCommit(input);
    else if (!getWorkerQty(id)) {
      const p = state.products.find((x) => x.id === id);
      if (p) state.workerQty[id] = 1;
    }
  }
  state.workerOrderActiveId = "";
  render();
}
function finishPickerEdit() {
  if (state.pickerActiveId) finishPickerEditFor(state.pickerActiveId);
  if (pickerOpen() && refreshPickerList()) return;
  render();
  if (pickerOpen()) pickerModal();
}
function workerOrderQtyHtml(p, q) {
  const id = esc(p.id);
  if (state.workerOrderActiveId === p.id)
    return `<div class="worker-row-edit">${workerQtyStepperHtml(p, q)}<button type="button" class="worker-row-done-link" onclick="finishWorkerOrderEdit()">Болсон</button></div>`;
  return `<button type="button" class="worker-row-qty" onclick="setWorkerOrderActive('${id}')"><span class="worker-row-qty__n">${q}</span><span class="worker-row-qty__unit">ш</span></button>`;
}
function qtyDraft(el) {
  const id = el.getAttribute("data-product-id") || "";
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const min = Number(el.closest(".qty-stepper")?.dataset?.qtyMin ?? 0);
  const digits = String(el.value || "").replace(/\D/g, "");
  if (digits !== el.value) el.value = digits;
  if (!digits) return;
  const n = Number(digits);
  if (n > p.stock && el.hasAttribute("data-picker-qty-input"))
    showStockLimitToast();
  const capped = Math.min(n, p.stock);
  if (capped < min) return;
  state.workerQty[id] = capped;
  if (String(capped) !== digits) el.value = String(capped);
  el.setAttribute("aria-valuenow", String(capped));
  if (pickerOpen()) {
    if (el.hasAttribute("data-picker-qty-input")) syncPickerQtySheetUi(id);
    else updatePickerClearBtn();
  }
}
function qtyCommit(el) {
  const id = el.getAttribute("data-product-id") || "";
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const min = Number(el.closest(".qty-stepper")?.dataset?.qtyMin ?? 0);
  const digits = String(el.value || "").replace(/\D/g, "");
  let v = digits ? Number(digits) : 0;
  if (v > p.stock && el.hasAttribute("data-picker-qty-input"))
    showStockLimitToast();
  if (v < min) v = min;
  v = Math.min(v, p.stock);
  el.value = String(v);
  el.setAttribute("aria-valuenow", String(v));
  setWorkerQty(id, v);
}
function initQtyStepperButtons() {
  if (document.documentElement.dataset.qtyStepperBound) return;
  document.documentElement.dataset.qtyStepperBound = "1";
  document.addEventListener(
    "pointerdown",
    (e) => {
      const btn = e.target.closest?.(".qty-stepper__btn[data-qty-action]");
      if (!btn) return;
      if (btn.disabled) {
        if (
          btn.getAttribute("data-qty-action") === "inc" &&
          btn.closest("[data-picker-root]")
        ) {
          showStockLimitToast();
        }
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      qtyStepperApply(btn);
    },
    true,
  );
}
function initEmployeeModalActions() {
  if (modal.dataset.employeeFormBound) return;
  modal.dataset.employeeFormBound = "1";
  modal.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-employee-form]");
    if (!form) return;
    saveEmployee(e);
  });
}
function initPickerModalActions() {
  if (modal.dataset.pickerBound) return;
  modal.dataset.pickerBound = "1";
  modal.addEventListener(
    "pointerdown",
    (e) => {
      const packBtn = e.target.closest("[data-picker-pack-action]");
      if (packBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (
          packBtn.disabled &&
          packBtn.getAttribute("data-picker-pack-action") === "inc"
        ) {
          showStockLimitToast();
        } else if (!packBtn.disabled) {
          pickerPartStepperApply(packBtn, "pack");
        }
        return;
      }
      const pieceBtn = e.target.closest("[data-picker-piece-action]");
      if (pieceBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (
          pieceBtn.disabled &&
          pieceBtn.getAttribute("data-picker-piece-action") === "inc"
        ) {
          showStockLimitToast();
        } else if (!pieceBtn.disabled) {
          pickerPartStepperApply(pieceBtn, "piece");
        }
      }
    },
    true,
  );
  modal.addEventListener("click", (e) => {
    const catBtn = e.target.closest("[data-picker-cat]");
    if (catBtn) {
      setPickerCategory(catBtn.getAttribute("data-picker-cat") || "");
      return;
    }
    const clearCartBtn = e.target.closest("[data-picker-clear-cart]");
    if (clearCartBtn) {
      clearPickerCart();
      return;
    }
    const openBtn = e.target.closest("[data-picker-open]");
    if (openBtn) {
      const id = openBtn.getAttribute("data-picker-open") || "";
      if (id) openPickerQtySheet(id);
      return;
    }
    const qtyClose = e.target.closest("[data-picker-qty-close]");
    if (qtyClose) {
      closePickerQtySheet();
      return;
    }
    const qtyDone = e.target.closest("[data-picker-qty-done]");
    if (qtyDone) {
      const id =
        qtyDone.getAttribute("data-product-id") || state.pickerQtyProductId;
      if (id) finishPickerEditFor(id);
      state.pickerQtyProductId = "";
      if (pickerOpen()) pickerModal();
      return;
    }
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
let pwaBannerScheduled = false;
function maybeShowPwaInstallBanner() {
  if (pwaBannerScheduled || isNativeApp() || !state.isLoggedIn) return;
  const dismissed = Number(localStorage.getItem("pwa-install-dismissed") || 0);
  if (Date.now() - dismissed < 7 * 86400000) return;
  pwaBannerScheduled = true;
  setTimeout(showUnifiedInstallBanner, 3000);
}
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
function showStockLimitToast() {
  showInstallToast("Үлдэгдэл хүрэхгүй байна");
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
    maybeShowPwaInstallBanner();
  });
  window.addEventListener("appinstalled", () => {
    dismissPwaInstall(false);
    dismissInstallCoach();
    showInstallToast("App амжилттай суулгагдлаа!");
  });
  checkPendingApkInstallCoach();
  tryAutoInstallFromRedirect();
}
function pwaInstallSidebarBtn() {
  if (isNativeApp()) return "";
  return `<button type="button" onclick="installAppOnPhone()" class="sidebar-pwa-btn"><span>${pwaInstallLabel()}</span></button>`;
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
  backendSaveTimer = null;
  let data = persistentState();
  const protectedData = protectDeletionsForNonAdmin(data);
  if (JSON.stringify(protectedData) !== JSON.stringify(data)) {
    const session = captureSessionSnapshot();
    applyPersistentState(protectedData);
    restoreSessionSnapshot(session);
    render();
    data = protectedData;
  }
  try {
    const latest = await fetchBackendPayload();
    if (latest?.state) {
      const merged = mergePersistentStates(latest.state, data);
      if (JSON.stringify(merged) !== JSON.stringify(data)) {
        const session = captureSessionSnapshot();
        applyPersistentState(merged);
        restoreSessionSnapshot(session);
        render();
        data = merged;
      } else {
        data = merged;
      }
    }
  } catch (error) {
    console.warn("Backend pre-save merge failed", error);
  }
  const body = JSON.stringify({ state: data });
  if (body === backendLastSaved) return;
  backendSaving = true;
  try {
    const res = await fetch(`${API_BASE}/state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    });
    if (res.ok) {
      const payload = await res.json();
      backendLastSaved = body;
      if (payload.updatedAt) serverUpdatedAt = payload.updatedAt;
    }
  } catch (error) {
    console.warn("Backend state save failed", error);
  } finally {
    backendSaving = false;
  }
}

function go(view, opts = {}) {
  if (!canAccessView(view)) return;
  const changed = state.currentView !== view;
  const wasWorkerOrders =
    state.currentView === "worker" && state.filters.worker === "orders";
  if (
    view === "worker" &&
    state.currentView === "worker" &&
    state.filters.worker === "orders"
  ) {
    clearWorkerOrderHighlight();
    state.filters.worker = "new";
    state.mobileOpen = false;
    saveAuthSession();
    render();
    if (!opts.silent && !suppressHistoryPush) pushAppHistory();
    return;
  }
  if (changed && wasWorkerOrders) clearWorkerOrderHighlight();
  state.currentView = view;
  state.mobileOpen = false;
  if (changed && view !== "promotions") state.filters.promotionDetail = "";
  if (changed && view === "promotions") state.filters.promotionDetail = "";
  saveAuthSession();
  render();
  if (changed && !opts.silent && !suppressHistoryPush) pushAppHistory();
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
function scrollAppMainToTop() {
  requestAnimationFrame(() => {
    document.querySelector(".app-main")?.scrollTo({ top: 0, left: 0 });
  });
}
function shell(content) {
  const userRole = currentRole();
  const sidebarNav = sidebarNavForRole(userRole);
  const bottomNav = bottomNavForRole(userRole);
  const emp = state.currentEmployee,
    useBottomNav = bottomNav.length >= 2,
    pageTitle = currentPageTitle(sidebarNav),
    workerOrdersList =
      state.currentView === "worker" && state.filters.worker === "orders",
    workerOrdersArrived = workerOrdersList && state.workerOrdersArrived;
  const backBtn = canAppBack()
    ? `<button type="button" class="mobile-top-bar__back" onclick="appBack()" aria-label="Буцах"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>`
    : `<span class="mobile-top-bar__back-spacer" aria-hidden="true"></span>`;
  return `<div class="app-shell min-h-screen bg-background flex ${useBottomNav ? "app-shell--bottom-nav" : ""}${workerOrdersList ? " app-shell--worker-orders" : ""}"><button type="button" onclick="state.mobileOpen=!state.mobileOpen;render()" class="mobile-menu-button lg:hidden fixed z-50 bg-sidebar text-sidebar-foreground rounded ${state.mobileOpen ? "mobile-menu-button--open" : ""} ${useBottomNav ? "mobile-menu-button--sheet" : ""}" aria-label="${state.mobileOpen ? "Цэс хаах" : "Цэс нээх"}">${state.mobileOpen ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>` : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`}</button>${state.mobileOpen ? `<div onclick="state.mobileOpen=false;render()" class="mobile-menu-overlay lg:hidden fixed inset-0 bg-black/50 z-30"></div>` : ""}<header class="mobile-top-bar lg:hidden${workerOrdersList ? " mobile-top-bar--worker-orders" : ""}${workerOrdersArrived ? " mobile-top-bar--worker-orders-arrived" : ""}">${backBtn}<p class="mobile-top-bar__title">${esc(pageTitle)}</p>${emp ? `<button type="button" class="mobile-top-bar__user" onclick="state.mobileOpen=true;render()" aria-label="Профайл, гарах">${employeeAvatarHtml(emp, "mobile-top-bar__user-avatar")}</button>` : ""}</header><aside class="app-sidebar mobile-sidebar fixed lg:sticky lg:top-0 inset-y-0 left-0 z-40 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 ${state.mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} flex flex-col"><div class="sidebar-brand p-6 border-b border-sidebar-border"><div class="sidebar-brand__row flex items-center gap-3 min-w-0"><img src="${BRAND.logoWhite}" alt="ТОМУДА" class="tomuda-logo" width="44" height="44" decoding="async"><div class="min-w-0"><h1 class="text-lg font-bold text-sidebar-primary truncate">ТОМУДА</h1><p class="sidebar-brand__tag hidden lg:block">Борлуулалт · Агуулах</p></div></div></div><nav class="app-sidebar-nav flex-col flex-1 min-h-0 overflow-y-auto p-3 lg:p-4 gap-1" aria-label="Үндсэн цэс"><p class="sidebar-nav-section hidden lg:block">Цэс</p>${sidebarNavItems(sidebarNav)}${pwaInstallSidebarBtn()}</nav><div class="sidebar-foot p-4 border-t border-sidebar-border">${emp ? `<div class="sidebar-user">${employeeAvatarHtml(emp, "sidebar-user__avatar")}<div class="sidebar-user__meta"><p class="sidebar-user__name">${esc(emp.name)}</p><p class="sidebar-user__role">${esc(role(emp.role))}</p></div><button type="button" onclick="confirmLogout()" class="btn btn--sidebar shrink-0">Гарах</button></div>` : ""}</div></aside><main class="app-main flex-1 overflow-auto"><div class="app-main__inner max-w-7xl mx-auto">${content}</div></main>${mobileBottomNav(bottomNav)}</div>`;
}
function adminHubCard(view, label, iconKey) {
  const svg =
    ADMIN_METRIC_ICONS[iconKey] ||
    MOBILE_NAV_SVG[view] ||
    ADMIN_METRIC_ICONS.stock;
  return `<button type="button" onclick="go('${view}')" class="admin-hub-card"><span class="admin-hub-card__icon" aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24">${svg}</svg></span><span class="admin-hub-card__label">${esc(label)}</span><svg class="ui-icon admin-hub-card__chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>`;
}
function adminHubActionCard(action, label, iconKey) {
  const svg = ADMIN_METRIC_ICONS[iconKey] || ADMIN_METRIC_ICONS.stock;
  return `<button type="button" onclick="${action}" class="admin-hub-card admin-hub-card--settings"><span class="admin-hub-card__icon" aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24">${svg}</svg></span><span class="admin-hub-card__label">${esc(label)}</span><svg class="ui-icon admin-hub-card__chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>`;
}
function adminHubHtml() {
  const main = [
    ["employees", "Ажилтан", "employees"],
    ["inventory", "Агуулах", "inventory"],
    ["reports", "Тайлан", "reports"],
    ["promotions", "Урамшуулал", "promotions"],
    ["warehouseReceipts", "Баримтууд", "stock"],
  ];
  const settings = [
    ["stockAlertModal()", "ҮЛДЭГДЭЛ САНУУЛАХ", "stock"],
    [
      "percentDiscountSettingsModal()",
      `Хувь тооцох (${percentDiscountRate()}%)`,
      "employees",
    ],
  ];
  return `<section class="admin-hub"><h3 class="admin-hub__heading">Удирдлага</h3><div class="admin-hub__grid">${main.map(([id, label, icon]) => adminHubCard(id, label, icon)).join("")}</div><h3 class="admin-hub__heading admin-hub__heading--settings">Тохиргоо</h3><div class="admin-hub__settings">${settings.map(([action, label, icon]) => adminHubActionCard(action, label, icon)).join("")}</div></section>`;
}
function adminView() {
  ensureSettings();
  const lowList = lowStockProducts(),
    low = lowList.length,
    sales = state.employees.length;
  const alertOn = state.settings.stockAlertEnabled !== false;
  const metrics = adminMetricsBar(
    adminMetricCard(
      "Таталт хийх шаардлагатай бараа",
      low,
      low && alertOn ? "text-tone-warning" : "text-tone-success",
      {
        active: low > 0 && alertOn,
        action: "stockAlertModal()",
        icon: "stock",
      },
    ) +
      adminMetricCard("Харилцагч", state.customers.length, "", {
        active: state.customers.length > 0,
        action: "go('customers')",
        icon: "customers",
      }) +
      adminMetricCard("Ажилтан", sales, "", {
        active: sales > 0,
        action: "go('employees')",
        icon: "employees",
      }),
  );
  return `<div class="admin-page space-y-4">${pageHead("Админ")}${metrics}${adminHubHtml()}</div>`;
}
function percentDiscountSettingsModal() {
  if (!isAdmin()) return;
  ensureSettings();
  const rate = percentDiscountRate();
  box(
    "Хувь тооцох тохиргоо",
    `<form onsubmit="savePercentDiscountSettings(event)" class="p-5 space-y-4"><p class="text-sm text-muted-foreground">Захиалга дээр «Хувь тооцох» сонголтын хувь. Ажилтан бүрт зөвшөөрөл нь Ажилтан цэснээс тохируулна.</p><label class="block text-sm font-medium">Хөнгөлөлтийн хувь (%)</label><input name="percentDiscountRate" type="number" min="0" max="100" step="0.1" required value="${rate}" class="w-full px-3 py-3 bg-secondary rounded app-input"><div class="grid grid-cols-2 gap-2 pt-1"><button type="button" onclick="closeModal()" class="py-2.5 bg-secondary rounded font-medium text-sm">Болих</button><button type="submit" class="py-2.5 bg-primary text-primary-foreground rounded font-medium text-sm">Хадгалах</button></div></form>`,
    "max-w-md",
  );
}
function savePercentDiscountSettings(e) {
  if (!isAdmin()) return;
  e.preventDefault();
  ensureSettings();
  const raw = Number(new FormData(e.target).get("percentDiscountRate"));
  state.settings.percentDiscountRate = Math.min(
    100,
    Math.max(0, Number.isFinite(raw) ? raw : RECEIPT_PERCENT_DISCOUNT),
  );
  if (!canApplyPercentDiscount()) state.applyPercentDiscount = false;
  closeModal();
  scheduleBackendSave();
  render();
  showInstallToast("Хувь тооцох тохиргоо хадгалагдлаа");
}
function stockAlertModal() {
  if (!isAdmin()) return;
  ensureSettings();
  const q = (state.searches.stockAlert || "").toLowerCase().trim();
  const alertOn = state.settings.stockAlertEnabled !== false;
  const products = state.products
    .filter(
      (p) =>
        !q ||
        (p.name || "").toLowerCase().includes(q) ||
        String(p.barcode || "").includes(q) ||
        (p.category || "").toLowerCase().includes(q),
    )
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "mn"));
  const low = products.filter(isLowStock);
  const rows = products.length
    ? products
        .map((p) => {
          const limit = stockAlertLevel(p);
          const lowNow = isLowStock(p);
          const limitAttr = limit > 0 ? `value="${limit}" ` : "";
          return `<div class="stock-alert-row ${lowNow ? "stock-alert-row--low" : ""}"><img src="${productImage(p)}" alt="" class="stock-alert-thumb" width="44" height="44" loading="lazy" decoding="async"><div class="stock-alert-row__info min-w-0"><p class="stock-alert-row__name">${esc(p.name)}</p><p class="stock-alert-row__sub">Үлд <b class="${lowNow ? "text-tone-warning" : ""}">${p.stock ?? 0}</b>${limit > 0 ? ` · доод ${limit}` : ""}</p></div><label class="stock-alert-row__limit shrink-0"><span class="stock-alert-row__limit-label">Доод</span><input type="number" name="minStock_${esc(p.id)}" min="0" step="1" ${limitAttr}placeholder="0" class="stock-alert-row__input app-input" aria-label="${esc(p.name)} доод үлдэгдэл"></label></div>`;
        })
        .join("")
    : `<p class="text-sm text-muted-foreground text-center py-6">Бараа олдсонгүй</p>`;
  box(
    "Үлдэгдэл сануулах",
    `<form onsubmit="saveStockAlertSettings(event)" class="stock-alert-form p-5 flex flex-col min-h-0 max-h-[85vh]"><div class="stock-alert-form__head shrink-0 flex items-center justify-between gap-3 mb-2"><label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" name="stockAlertEnabled" ${alertOn ? "checked" : ""} class="w-4 h-4 rounded"><span>Идэвхтэй</span></label>${low.length ? `<span class="text-sm font-semibold text-tone-warning">Таталт: ${low.length}</span>` : ""}</div><input type="search" value="${esc(state.searches.stockAlert || "")}" oninput="search('stockAlert',this.value);stockAlertModal()" placeholder="Хайх..." class="stock-alert-form__search shrink-0 w-full px-3 py-2 bg-secondary rounded text-sm mb-2"><div class="stock-alert-list modal-scroll flex-1 min-h-0 overflow-y-auto -mx-1 px-1">${rows}</div><div class="stock-alert-form__foot shrink-0 pt-3 mt-2 border-t border-border grid grid-cols-2 gap-2"><button type="button" onclick="closeModal()" class="py-2.5 bg-secondary rounded font-medium text-sm">Болих</button><button type="submit" class="py-2.5 bg-primary text-primary-foreground rounded font-medium text-sm">Хадгалах</button></div></form>`,
    "max-w-xl",
  );
}
function saveStockAlertSettings(e) {
  if (!isAdmin()) return;
  e.preventDefault();
  ensureSettings();
  const data = new FormData(e.target);
  const summary = stockAlertChangeSummary(data);
  if (!summary.changed) {
    closeModal();
    return;
  }
  confirmModal("Үлдэгдэл сануулах хадгалах", summary.html, {
    confirmLabel: "Хадгалах",
    onConfirm: () => applyStockAlertSettings(data),
  });
}
function stockAlertChangeSummary(data) {
  const lines = [];
  const alertEnabled = data.get("stockAlertEnabled") === "on";
  const wasEnabled = state.settings.stockAlertEnabled !== false;
  if (alertEnabled !== wasEnabled) {
    lines.push(
      `<p>Сануулга: <b>${alertEnabled ? "идэвхтэй" : "унтраах"}</b></p>`,
    );
  }
  state.products.forEach((p) => {
    const raw = data.get(`minStock_${p.id}`);
    if (raw == null) return;
    const next = Math.max(0, Number(raw) || 0);
    const prev = stockAlertLevel(p);
    if (next !== prev) {
      lines.push(
        `<p><b>${esc(p.name)}</b> — доод үлдэгдэл: ${prev} → ${next}</p>`,
      );
    }
  });
  return {
    changed: lines.length > 0,
    html:
      lines.join("") ||
      `<p class="text-sm text-muted-foreground">Өөрчлөлт олдсонгүй.</p>`,
  };
}
function applyStockAlertSettings(data) {
  if (!isAdmin()) return;
  ensureSettings();
  state.settings.stockAlertEnabled = data.get("stockAlertEnabled") === "on";
  state.products.forEach((p) => {
    const raw = data.get(`minStock_${p.id}`);
    if (raw == null) return;
    p.minStock = Math.max(0, Number(raw) || 0);
  });
  closeModal();
  scheduleBackendSave();
  render();
  showInstallToast("Үлдэгдэл сануулах хадгалагдлаа");
}
function orderReceiptRowsFiltered(
  searchKey = "warehouseOrders",
  employeeIds = [],
  opts = {},
) {
  const q = (state.searches[searchKey] || "").toLowerCase();
  const workerIds = idList(opts.workerIds || employeeIds),
    deliveryIds = idList(opts.deliveryIds);
  const rows = filterWarehouseOrders(
    state.orders.filter(
      (o) =>
        (!workerIds.length || workerIds.includes(o.employeeId)) &&
        (!deliveryIds.length ||
          deliveryIds.includes(orderDeliveryEmployeeId(o))) &&
        orderReceiptMatchesQuery(o, q) &&
        (state.filters.order === "all" || o.status === state.filters.order),
    ),
  );
  return sortOrdersBySelectedPeople(rows, workerIds, deliveryIds);
}
function buildOrderReceiptExcelRows(o) {
  const c = state.customers.find((x) => x.id === o.customerId) || {},
    sales = state.employees.find((e) => e.id === o.employeeId) || {},
    delivery = resolveOrderDelivery(o),
    addr = customerAddress(c),
    gross = orderGrossTotal(o),
    discount = orderDiscountAmount(o),
    payable = orderPayableTotal(o),
    sub = Math.round(payable / 1.1),
    vat = Math.round(payable - sub),
    pct =
      o.applyPercentDiscount && isCashPayment(o.paymentTerm)
        ? Number(o.percentDiscount || RECEIPT_PERCENT_DISCOUNT)
        : 0,
    paid = o.paymentTerm === "cash" || o.isPaid,
    rows = [
      ["ТОМУДА групп ХХК"],
      ["ЗАРЛАГЫН БАРИМТ", `№${formatReceiptNumber(o)}`],
      ["Захиалгын огноо", dte(o.createdAt)],
      [],
      ["Худалдааны төлөөлөгч", o.employeeName || sales.name || "-"],
      ["Төлөөлөгчийн утас", o.employeePhone || sales.phone || "-"],
      ["Түгээгч", delivery.deliveryName],
      ["Түгээгчийн утас", delivery.deliveryPhone],
      [],
      ["Харилцагч", c.name || o.customerName],
      ["Регистр", c.registrationNumber || "-"],
      ["Компани", c.companyName || "-"],
      ["Утас", c.phone1 || "-"],
      ["Хаяг", addr === "-" ? "" : addr],
      ["Төлбөр", paid ? "Бэлнээр" : "Дансаар"],
      ["Төлөв", status(o.status)],
      [],
      ["№", "Барааны нэр", "Нэгж", "Баркод", "Тоо/ш", "Нэгж үнэ", "Нийт үнэ"],
    ];
  (o.items || [])
    .filter((i) => !i.isPromoFree)
    .forEach((i, n) => {
      const p = state.products.find((x) => x.id === i.productId) || {};
      rows.push([
        n + 1,
        i.productName,
        p.unit || "ш",
        p.barcode || "-",
        i.quantity,
        i.price,
        i.total,
      ]);
    });
  const promoItems = (o.items || []).filter((i) => i.isPromoFree);
  if (promoItems.length) {
    rows.push([]);
    rows.push(["Урамшуулал", "Бараа", "Тоо", "Дүн"]);
    promoItems.forEach((i) => rows.push(["", i.productName, i.quantity, 0]));
  }
  rows.push([], ["Хувь хасагдаагүй нийт үнийн дүн", "", "", "", "", "", gross]);
  if (discount)
    rows.push([`Хөнгөлөлт (${pct}%)`, "", "", "", "", "", -discount]);
  rows.push(
    ["Бараа ажил үйлчилгээний дүн", "", "", "", "", "", sub],
    ["НӨАТ", "", "", "", "", "", vat],
    ["Нийт төлөх дүн", "", "", "", "", "", payable],
  );
  const settlement = settlementNoteText(o);
  if (settlement) rows.push([], [settlement]);
  return rows;
}
function orderReceiptSnapshot(o) {
  return {
    ...o,
    items: (o.items || []).map((i) => ({ ...i })),
  };
}
const RECEIPT_EXCEL_STYLES = `
body { margin: 0; padding: 0; background: #fff; color: #111; font-family: Arial, sans-serif; }
.print-receipt { display: block; background: #fff; color: #111; }
.print-receipt + .print-receipt { page-break-before: always; mso-page-break-before: always; }
.receipt-page { width: 720px; margin: 0 auto; padding: 12px 10px; font-size: 11px; line-height: 1.25; }
.receipt-header { display: table; width: 100%; margin-bottom: 8px; }
.receipt-logo { width: 64px; height: 64px; object-fit: contain; display: inline-block; vertical-align: top; }
.receipt-company { display: inline-block; vertical-align: top; width: calc(100% - 72px); padding-left: 8px; }
.receipt-company h1 { font-size: 16px; margin: 0 0 4px; font-weight: 800; }
.receipt-company p { margin: 2px 0; }
.receipt-title { text-align: center; font-family: Georgia, "Times New Roman", serif; font-size: 18px; margin: 10px 0 14px; font-weight: 900; }
.receipt-info { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
.receipt-info td { vertical-align: top; width: 50%; padding: 0 10px 0 0; }
.receipt-info p { margin: 3px 0; }
.receipt-info span { display: inline-block; min-width: 150px; color: #444; }
.receipt-info b { font-weight: 800; }
.receipt-address b { display: inline-block; max-width: 320px; }
.receipt-check { font-size: 13px; }
.receipt-table { width: 100%; border-collapse: collapse; margin-bottom: 0; table-layout: fixed; }
.receipt-table th, .receipt-table td { border: 1px solid #777; padding: 4px 5px; text-align: left; vertical-align: middle; }
.receipt-table th { font-weight: 800; text-align: center; background: #f3f3f3; }
.receipt-table th:nth-child(1), .receipt-table td:nth-child(1) { width: 28px; text-align: right; }
.receipt-table th:nth-child(n+5), .receipt-table td:nth-child(n+5) { text-align: right; }
.receipt-gross-bar { background: #e8ebee; padding: 6px 8px; font-weight: 800; margin-bottom: 4px; }
.receipt-gross-bar table { width: 100%; border-collapse: collapse; }
.receipt-gross-bar td { border: none; padding: 0; }
.receipt-gross-bar td:last-child { text-align: right; font-size: 14px; white-space: nowrap; }
.receipt-settlement-note { background: #fff3cd; text-align: center; padding: 6px 8px; font-weight: 700; margin-bottom: 6px; }
.receipt-promo-block { margin-bottom: 8px; padding: 4px 6px; border: 1.2px solid #16899a; background: #e8f6f3; color: #0f5f68; font-size: 11px; }
.receipt-promo-head, .receipt-promo-row { display: table; width: 100%; border-bottom: 1px dotted #6fb6ac; padding: 2px 0; }
.receipt-promo-head b { font-size: 14px; }
.receipt-promo-row span, .receipt-promo-row strong { display: table-cell; }
.receipt-promo-row strong { text-align: right; font-weight: 800; width: 90px; }
.receipt-totals { margin-top: 6px; }
.receipt-total-line { border-bottom: 1px dotted #999; padding: 3px 0; font-size: 12px; }
.receipt-total-line table { width: 100%; border-collapse: collapse; }
.receipt-total-line td { border: none; padding: 0; }
.receipt-total-line td:last-child { text-align: right; font-weight: 800; white-space: nowrap; }
.receipt-grand-total { background: #5f6b78; color: #fff; padding: 8px 10px; margin-top: 4px; font-weight: 800; }
.receipt-grand-total table { width: 100%; border-collapse: collapse; color: #fff; }
.receipt-grand-total td { border: none; padding: 0; vertical-align: middle; }
.receipt-grand-total__label { font-size: 12px; line-height: 1.35; }
.receipt-grand-total__amount { text-align: right; font-size: 22px; font-weight: 900; white-space: nowrap; }
.receipt-warning { background: #edf0f2; text-align: center; padding: 8px 12px; margin: 10px 0; font-size: 11px; }
.receipt-warning p { margin: 3px 0; }
.receipt-sign { margin-top: 12px; font-size: 12px; }
.receipt-sign p { margin: 6px 0; }
.receipt-sign span { display: inline-block; min-width: 220px; }
.receipt-sign b { display: inline-block; min-width: 280px; border-bottom: 1px dotted #111; min-height: 18px; }
`;
let receiptExcelLogoDataUri = "";
async function getReceiptExcelLogoDataUri() {
  if (receiptExcelLogoDataUri) return receiptExcelLogoDataUri;
  try {
    const res = await fetch(BRAND.logoBlue);
    if (!res.ok) throw new Error("logo missing");
    const blob = await res.blob();
    receiptExcelLogoDataUri = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || BRAND.logoBlue));
      reader.onerror = () => reject(new Error("logo read failed"));
      reader.readAsDataURL(blob);
    });
    return receiptExcelLogoDataUri;
  } catch {
    return BRAND.logoBlue;
  }
}
function receiptExcelInfoGridHtml(o) {
  const c = state.customers.find((x) => x.id === o.customerId) || {},
    sales = state.employees.find((e) => e.id === o.employeeId) || {},
    delivery = resolveOrderDelivery(o),
    addr =
      [c.province, c.district, c.khoroo, c.address]
        .filter(Boolean)
        .join(", ") || "-",
    paid = o.paymentTerm === "cash" || o.isPaid,
    bank = o.paymentTerm === "credit" && !o.isPaid,
    salesName = esc(o.employeeName || sales.name || "-"),
    salesPhone = esc(o.employeePhone || sales.phone || "-"),
    deliveryName = esc(delivery.deliveryName),
    deliveryPhone = esc(delivery.deliveryPhone);
  return `<table class="receipt-info" role="presentation"><tr><td><p><span>Худалдааны төлөөлөгч:</span><b>${salesName}</b></p><p><span>Худалдааны төлөөлөгчийн утас:</span><b>${salesPhone}</b></p><p><span>Түгээгчийн нэр:</span><b>${deliveryName}</b></p><p><span>Түгээгчийн утас:</span><b>${deliveryPhone}</b></p><p><span>Дансны нэр:</span><b>ТОМУДА групп</b></p><p><span>Регистрийн дугаар:</span><b>5397987</b></p><p><span>Банкны нэр:</span><b>Хаан банк</b></p><p><span>Дансны дугаар:</span><b>51333333307</b></p></td><td><p><span>Харилцагч:</span><b>${esc(c.name || o.customerName)}</b></p><p><span>Регистрийн дугаар:</span><b>${esc(c.registrationNumber || "-")}</b></p><p><span>Компанийн нэр:</span><b>${esc(c.companyName || "-")}</b></p><p><span>Утасны дугаар:</span><b>${esc(c.phone1 || "-")}</b></p><p><span>Төлбөрийн нөхцөл:</span><b><span class="receipt-check">${paid ? "☑" : "☐"}</span> Бэлнээр&nbsp;&nbsp;<span class="receipt-check">${bank ? "☑" : "☐"}</span> Дансаар</b></p><p class="receipt-address"><span>Хаяг:</span><b>${esc(addr)}</b></p></td></tr></table>`;
}
function receiptExcelTotalsHtml(o) {
  const gross = orderGrossTotal(o),
    discount = orderDiscountAmount(o),
    payable = orderPayableTotal(o),
    sub = payable / 1.1,
    vat = payable - sub,
    settlement = settlementNoteText(o),
    promoItems = (o.items || []).filter((i) => i.isPromoFree),
    pct =
      o.applyPercentDiscount && isCashPayment(o.paymentTerm)
        ? Number(o.percentDiscount || RECEIPT_PERCENT_DISCOUNT)
        : 0,
    grandLabel = pct
      ? `Таны нийт төлөх дүн (Бэлэн төлөлтийн ${pct}% хасагдав)`
      : "Таны нийт төлөх дүн",
    promoRows = promoItems.length
      ? promoItems
          .map(
            (i) =>
              `<div class="receipt-promo-row"><span>${esc(i.productName)}</span><span>${i.quantity} ш</span><strong>0</strong></div>`,
          )
          .join("")
      : `<div class="receipt-promo-row receipt-promo-row--empty"><span></span><span></span><strong>0</strong></div>`;
  return `<div class="receipt-gross-bar"><table role="presentation"><tr><td>Хувь хасагдаагүй нийт үнийн дүн</td><td><strong>${receiptMoney(gross)}</strong></td></tr></table></div>${settlement ? `<div class="receipt-settlement-note">${esc(settlement)}</div>` : ""}<section class="receipt-promo-block"><div class="receipt-promo-head"><b>Урамшуулал</b><span>Үнэтрүүлэгч</span><span>Дүн</span></div>${promoRows}</section><section class="receipt-totals"><div class="receipt-total-line"><table role="presentation"><tr><td><b>Бараа ажил үйлчилгээний дүн</b></td><td><strong>${receiptMoney(sub)}</strong></td></tr></table></div><div class="receipt-total-line"><table role="presentation"><tr><td><b>НӨАТ</b></td><td><strong>${receiptMoney(vat)}</strong></td></tr></table></div>${discount ? `<div class="receipt-total-line"><table role="presentation"><tr><td><b>Хөнгөлөлт (${pct}%)</b></td><td><strong>-${receiptMoney(discount)}</strong></td></tr></table></div>` : ""}<div class="receipt-grand-total"><table role="presentation"><tr><td class="receipt-grand-total__label">${grandLabel}</td><td class="receipt-grand-total__amount"><strong>${receiptMoney(payable)}</strong></td></tr></table></div></section><section class="receipt-warning"><p>Эрхэм харилцагч та төлбөрөө заавал баримт дээрх компанийн дансанд шилжүүлнэ үү.</p><p><b>Хувь хүний дансанд шилжүүлэхгүй байхыг анхаарна уу.</b></p><p>Өөр дансруу шилжүүлсэн төлбөрийг нийлүүлэгч компани хариуцахгүй болно</p><p><b>Барааг сайтар шалгаж тоо ширхэгийг тулгаж хүлээн авахыг анхаарна уу!</b></p></section><footer class="receipt-sign"><p><span>Хүлээлгэн өгсөн ажилтны гарын үсэг:</span><b></b></p><p><span>Хүлээн авсан ажилтны гарын үсэг:</span><b></b></p></footer>`;
}
function receiptExcelPage(o, logoSrc) {
  const itemRows = (o.items || [])
    .filter((i) => !i.isPromoFree)
    .map((i, n) => {
      const p = state.products.find((x) => x.id === i.productId) || {};
      return `<tr><td>${n + 1}</td><td>${esc(i.productName)}</td><td>${esc(p.unit || "ш")}</td><td>${esc(p.barcode || "-")}</td><td>${i.quantity}</td><td>${receiptMoney(i.price)}</td><td>${receiptMoney(i.total)}</td></tr>`;
    })
    .join("");
  return `<div class="print-receipt"><div class="receipt-page"><header class="receipt-header"><img src="${logoSrc}" alt="ТОМУДА" class="receipt-logo"><div class="receipt-company"><h1>ТОМУДА групп ХХК</h1><p>Хаяг: Улаанбаатар Баянзүрх, 26-р хороо, Олимп хороолол- 2 /13312/</p><p>Нийслэл хүрээ өргөн чөлөө 331-401. Утас: +976-75333357</p></div></header><h2 class="receipt-title">ЗАРЛАГЫН БАРИМТ №${formatReceiptNumber(o)}</h2>${receiptExcelInfoGridHtml(o)}<table class="receipt-table"><thead><tr><th>№</th><th>Барааны нэр</th><th>Хэмжих нэгж</th><th>Баркод</th><th>Тоо/ш</th><th>Нэгж үнэ</th><th>Нийт үнэ</th></tr></thead><tbody>${itemRows}</tbody></table><section class="receipt-footer-block">${receiptExcelTotalsHtml(o)}</section></div></div>`;
}
function buildReceiptExcelDocument(orders, logoSrc) {
  const pages = orders
    .map((o) => receiptExcelPage(orderReceiptSnapshot(o), logoSrc))
    .join("");
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Баримт</x:Name><x:WorksheetOptions><x:DisplayGridlines/><x:Print><x:ValidPrinterInfo/></x:Print></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>${RECEIPT_EXCEL_STYLES}</style>
</head>
<body>${pages}</body>
</html>`;
}
function receiptExcelFileName(orders) {
  const stamp = new Date().toISOString().slice(0, 10);
  if (orders.length === 1) {
    return `zarlagyn-barimt-${formatReceiptNumber(orders[0])}.xls`;
  }
  return `zarlagyn-barimt-${stamp}.xls`;
}
function downloadReceiptExcelBlob(name, html) {
  const blob = new Blob(["\uFEFF" + html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function exportOrderReceiptsExcelCsv(orders) {
  const stamp = new Date().toISOString().slice(0, 10),
    sheetRows = [
      ["ТОМУДА — Захиалгын баримтууд"],
      [`Тайлан огноо: ${dte(new Date())}`],
      [`Баримтын тоо: ${orders.length}`],
      [],
    ];
  orders.forEach((o, idx) => {
    if (idx > 0) sheetRows.push([], ["--------------------"], []);
    sheetRows.push(...buildOrderReceiptExcelRows(o));
  });
  excel(`zahialgiin-barimt-${stamp}.csv`, sheetRows);
}
async function exportOrderReceiptsExcel(orders) {
  if (!orders.length) return;
  try {
    const logoSrc = await getReceiptExcelLogoDataUri();
    const html = buildReceiptExcelDocument(orders, logoSrc);
    downloadReceiptExcelBlob(receiptExcelFileName(orders), html);
  } catch {
    exportOrderReceiptsExcelCsv(orders);
  }
}
function confirmVisibleOrderReceiptsExcel(searchKey = "warehouseOrders") {
  confirmOrderReceiptsExcel(searchKey, [], receiptFilterOptions());
}
function confirmOrderReceiptsExcel(
  searchKey = "warehouseOrders",
  employeeIds = [],
  opts = {},
) {
  const rows = orderReceiptRowsFiltered(searchKey, employeeIds, opts).map(
    orderReceiptSnapshot,
  );
  if (!rows.length) return alert("Захиалга олдсонгүй");
  confirmDataExport("Excel татах", () => exportOrderReceiptsExcel(rows));
}
function confirmSingleOrderReceiptExcel(orderId) {
  const o = state.orders.find((x) => x.id === orderId);
  if (!o) return alert("Захиалга олдсонгүй");
  confirmDataExport("Excel татах", () =>
    exportOrderReceiptsExcel([orderReceiptSnapshot(o)]),
  );
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
    filters = compact ? receiptFilterOptions() : {},
    rows = orderReceiptRowsFiltered(searchKey, employeeIds, filters);
  if (compact)
    return warehouseReceiptsPanel(rows, { title, searchKey, employeeIds });
  const exportBtn = `<button type="button" onclick="confirmOrderReceiptsExcel('${esc(searchKey)}', ${JSON.stringify(employeeIds)})" class="px-3 py-2 bg-secondary rounded text-sm shrink-0">${EXCEL_FILE_DOWNLOAD}</button>`;
  return `<section class="bg-card rounded overflow-hidden"><div class="p-3 border-b border-border flex items-center justify-between gap-2"><h2 class="page-head__title">${title}</h2><div class="flex items-center gap-2 shrink-0">${exportBtn}${showCreate ? `<button onclick="orderModal()" class="px-3 py-2 bg-primary text-primary-foreground rounded text-sm">+ Шинэ</button>` : ""}</div></div><div class="p-3 flex flex-col sm:flex-row gap-2"><input data-focus="${searchKey}" value="${esc(q)}" oninput="search('${searchKey}',this.value)" placeholder="Хайх..." class="flex-1 px-3 py-2.5 bg-secondary rounded text-sm"><select onchange="state.filters.order=this.value;render()" class="px-4 py-2.5 bg-secondary rounded text-sm"><option value="all">Бүгд</option>${["pending", "confirmed", "delivered", "cancelled"].map((s) => `<option value="${s}" ${state.filters.order === s ? "selected" : ""}>${status(s)}</option>`).join("")}</select></div><div class="overflow-x-auto"><table class="w-full"><thead class="bg-secondary/50"><tr><th class="px-4 py-3 text-left text-xs font-semibold">Захиалга</th><th class="px-4 py-3 text-left text-xs font-semibold">Ажилтан</th><th class="px-4 py-3 text-left text-xs font-semibold">Бараа</th><th class="px-4 py-3 text-left text-xs font-semibold">Төлөв</th><th class="px-4 py-3 text-right text-xs font-semibold">Дүн</th><th class="px-4 py-3 text-right text-xs font-semibold">Үйлдэл</th></tr></thead><tbody class="divide-y divide-border">${rows.map(orderRow).join("")}</tbody></table></div>${rows.length ? "" : `<div class="p-12 text-center text-muted-foreground">Захиалга олдсонгүй</div>`}</section>`;
}
function warehouseOrderStatusActions(o) {
  if (o.status === "pending") {
    let html = `<button type="button" onclick="setOrder('${o.id}','confirmed')" class="btn btn--sm tone tone--success">Батлах</button>`;
    if (canDelete())
      html += `<button type="button" onclick="confirmCancelOrder('${o.id}')" class="btn btn--sm tone tone--danger">Цуцлах</button>`;
    return html;
  }
  if (o.status === "confirmed")
    return `<button type="button" onclick="setOrder('${o.id}','delivered')" class="btn btn--sm tone tone--info">Хүргэсэн</button>`;
  return "";
}
function warehouseReceiptListItem(o) {
  const active = state.selectedWarehouseOrderId === o.id;
  return `<button type="button" onclick="selectWarehouseOrder('${esc(o.id)}')" class="wh-receipt-list__item${active ? " is-active" : ""}">${receiptNo(o, "sm")}<span class="wh-receipt-list__body"><span class="wh-receipt-list__name">${esc(o.customerName)}</span><span class="wh-receipt-list__meta">${fmt(orderAmount(o))} · ${dte(o.createdAt)}</span></span></button>`;
}
function warehouseReceiptPrintListItem(o) {
  const active = state.selectedWarehouseOrderId === o.id,
    checked = idList(state.receiptPrintOrderIds).includes(o.id);
  return `<div class="wh-receipt-list__item wh-receipt-list__item--selectable${active ? " is-active" : ""}"><label class="wh-receipt-list__check"><input type="checkbox"${checked ? " checked" : ""} onchange="toggleReceiptPrintOrder('${esc(o.id)}')" aria-label="Захиалга ${esc(formatReceiptNumber(o))} сонгох"><span class="sr-only">${esc(o.customerName)}</span></label><button type="button" onclick="selectWarehouseOrder('${esc(o.id)}')" class="wh-receipt-list__body-btn">${receiptNo(o, "sm")}<span class="wh-receipt-list__body"><span class="wh-receipt-list__name">${esc(o.customerName)}</span><span class="wh-receipt-list__meta">${fmt(orderAmount(o))} · ${dte(o.createdAt)}</span></span></button></div>`;
}
function warehouseReceiptStatusOptions() {
  return ["pending", "confirmed", "delivered", "cancelled"];
}
function warehouseReceiptsPanel(rows, { title, searchKey, employeeIds }) {
  if (
    !["all", ...warehouseReceiptStatusOptions()].includes(state.filters.order)
  )
    state.filters.order = "all";
  const workerIds = receiptPrintWorkerIds(),
    displayRows = workerIds.length ? receiptPrintWorkerOrders(workerIds) : rows;
  if (workerIds.length) syncReceiptPrintSelection(displayRows);
  else {
    state.receiptPrintOrderIds = [];
    state.receiptPrintWorkerSyncKey = "";
  }
  if (
    displayRows.length &&
    !displayRows.some((o) => o.id === state.selectedWarehouseOrderId)
  )
    state.selectedWarehouseOrderId = displayRows[0].id;
  if (!displayRows.length) state.selectedWarehouseOrderId = "";
  const selected = displayRows.find(
      (o) => o.id === state.selectedWarehouseOrderId,
    ),
    listHtml = displayRows.length
      ? displayRows
          .map(
            workerIds.length
              ? warehouseReceiptPrintListItem
              : warehouseReceiptListItem,
          )
          .join("")
      : `<p class="wh-receipt-list__empty">Захиалга олдсонгүй</p>`,
    detailHtml = selected
      ? warehouseOrderDetail(selected)
      : `<div class="wh-receipt-detail wh-receipt-detail--empty"><p>Баримт сонгоно уу</p></div>`;
  return `<section class="wh-receipts"><header class="wh-receipts__head"><h2 class="wh-receipts__title">${title}</h2><div class="wh-receipts__head-filters">${receiptPrintWorkerSelectHtml()}${receiptPrintDeliverySelectHtml()}</div></header><div class="wh-receipts__filters">${warehouseDateFiltersHtml()}<select onchange="state.filters.order=this.value;render()" class="wh-receipts__filter app-input"><option value="all">Бүгд</option>${warehouseReceiptStatusOptions()
    .map(
      (s) =>
        `<option value="${s}" ${state.filters.order === s ? "selected" : ""}>${status(s)}</option>`,
    )
    .join(
      "",
    )}</select></div><div class="wh-receipts__layout"><div class="wh-receipt-list">${listHtml}</div><div class="wh-receipt-detail-wrap">${detailHtml}</div></div></section>`;
}
function warehouseOrderDetail(o) {
  const actions = warehouseOrderStatusActions(o),
    c = state.customers.find((x) => x.id === o.customerId) || {},
    delivery = resolveOrderDelivery(o),
    addr = customerAddress(c),
    gross = orderGrossTotal(o),
    discount = orderDiscountAmount(o),
    payable = orderPayableTotal(o),
    pct =
      o.applyPercentDiscount && isCashPayment(o.paymentTerm)
        ? Number(o.percentDiscount || RECEIPT_PERCENT_DISCOUNT)
        : 0,
    paid = o.paymentTerm === "cash" || o.isPaid,
    itemRows = (o.items || [])
      .map((i) => {
        const isPromo = !!i.isPromoFree;
        return `<tr class="wh-receipt-sheet__row${isPromo ? " wh-receipt-sheet__row--promo" : ""}"><td class="wh-receipt-sheet__name">${esc(i.productName)}${isPromo ? `<span class="wh-receipt-sheet__promo-tag">Үнэгүй</span>` : ""}</td><td class="wh-receipt-sheet__qty">${i.quantity} ш</td><td class="wh-receipt-sheet__sum">${isPromo ? "0 ₮" : fmt(i.total)}</td></tr>`;
      })
      .join("");
  return `<div class="wh-receipt-detail wh-receipt-sheet"><div class="wh-receipt-sheet__brand"><img src="${BRAND.logoBlue}" alt="" class="wh-receipt-sheet__logo" width="40" height="40"><div><p class="wh-receipt-sheet__company">ТОМУДА групп ХХК</p><p class="wh-receipt-sheet__doc">ЗАРЛАГЫН БАРИМТ ${formatReceiptNumber(o)}</p></div><span class="wh-receipt-detail__pill ${badge(o.status)}">${status(o.status)}</span></div><div class="wh-receipt-sheet__meta"><div class="wh-receipt-sheet__col"><p><span>Харилцагч</span><b>${esc(c.name || o.customerName)}</b></p><p><span>Регистр</span><b>${esc(c.registrationNumber || "-")}</b></p><p><span>Хаяг</span><b>${esc(addr === "-" ? "" : addr)}</b></p></div><div class="wh-receipt-sheet__col"><p><span>Төлөөлөгч</span><b>${esc(o.employeeName || "-")}</b></p><p><span>Түгээгч</span><b>${esc(delivery.deliveryName)}</b></p><p><span>Захиалгын огноо</span><b>${dte(o.createdAt)}</b></p></div></div><table class="wh-receipt-sheet__table"><thead><tr><th>Бараа</th><th>Тоо</th><th>Дүн</th></tr></thead><tbody>${itemRows}</tbody></table><div class="wh-receipt-sheet__totals"><div class="wh-receipt-sheet__total-line"><span>Нийт (хөнгөлөлтгүй)</span><b>${fmt(gross)}</b></div>${discount ? `<div class="wh-receipt-sheet__total-line wh-receipt-sheet__total-line--discount"><span>Хөнгөлөлт${pct ? ` (${pct}%)` : ""}</span><b>-${fmt(discount)}</b></div>` : ""}<div class="wh-receipt-sheet__total-line wh-receipt-sheet__total-line--pay"><span>Төлөх дүн</span><b>${fmt(payable)}</b></div><p class="wh-receipt-sheet__pay-term">${paid ? "Бэлнээр" : "Дансаар"}</p></div><div class="wh-receipt-detail__bar"><div class="wh-receipt-detail__btns"><button type="button" onclick="printOrderReceipt('${esc(o.id)}')" class="btn btn--secondary btn--sm">Хэвлэх</button><button type="button" onclick="downloadOrderReceiptExcel('${esc(o.id)}')" class="btn btn--primary btn--sm">${EXCEL_FILE_DOWNLOAD}</button></div></div></div>`;
}
function orderRow(o) {
  return `<tr class="hover:bg-secondary/30"><td class="px-4 py-3"><div class="flex flex-wrap items-center gap-2"><p class="font-medium">${esc(o.customerName)}</p>${receiptNo(o, "xs")}</div><p class="text-xs text-muted-foreground mt-0.5">${dte(o.createdAt)}</p></td><td class="px-4 py-3 text-sm">${o.employeeName || "-"}</td><td class="px-4 py-3 text-sm">${o.items.length} бараа</td><td class="px-4 py-3"><span class="inline-flex px-2.5 py-1 rounded text-xs font-medium ${badge(o.status)}">${status(o.status)}</span></td><td class="px-4 py-3 text-right text-sm font-semibold">${fmt(orderAmount(o))}</td><td class="px-4 py-3"><div class="flex justify-end gap-2 whitespace-nowrap"><button onclick="orderReceiptModal('${o.id}')" class="px-3 py-1.5 bg-secondary rounded text-sm">Баримт</button><button onclick="printOrderReceipt('${o.id}')" class="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm">Хэвлэх</button>${warehouseOrderStatusActions(o)}</div></td></tr>`;
}
function customerAvatarHtml(c, className = "customer-card__avatar") {
  if (c?.image) {
    return `<img src="${esc(c.image)}" alt="" class="${className} customer-card__avatar-img">`;
  }
  return `<span class="${className}" aria-hidden="true">${esc(deliveryInitial(c.name))}</span>`;
}
function customerImageField(c) {
  const preview = c.image || customerStoreImage(c);
  return `<div class="customer-image-field"><span class="block text-sm font-medium mb-2">Зураг</span><div class="customer-image-upload customer-image-upload--stack"><img id="customerImagePreview" src="${preview}" alt="" class="customer-image-upload__preview"><div class="customer-image-upload__body"><input id="customerImageFile" type="file" accept="image/jpeg,image/png,image/webp,image/*" onchange="handleCustomerImage(this)" hidden><div class="customer-image-upload__actions"><button type="button" onclick="document.getElementById('customerImageFile').click()" class="btn btn--primary btn--sm customer-image-upload__pick">Зураг оруулах</button>${c.image ? `<button type="button" onclick="clearCustomerImage()" class="btn btn--secondary btn--sm">Зураг арилгах</button>` : ""}</div><input id="customerImageValue" name="image" type="hidden" value=""><p class="customer-image-upload__hint">Дэлгүүрийн зураг оруулна. JPG, PNG, WEBP.</p></div></div></div>`;
}
function initCustomerImageField(c) {
  const value = document.getElementById("customerImageValue"),
    preview = document.getElementById("customerImagePreview");
  if (value) value.value = c.image || "";
  if (preview) preview.src = c.image || customerStoreImage(c);
}
function handleCustomerImage(input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const value = document.getElementById("customerImageValue"),
      preview = document.getElementById("customerImagePreview");
    if (value) value.value = reader.result;
    if (preview) preview.src = reader.result;
    const removeBtn = input
      .closest(".customer-image-upload__actions")
      ?.querySelector('[onclick="clearCustomerImage()"]');
    if (!removeBtn) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--secondary btn--sm";
      btn.textContent = "Зураг арилгах";
      btn.onclick = clearCustomerImage;
      input.closest(".customer-image-upload__actions")?.appendChild(btn);
    }
  };
  reader.readAsDataURL(file);
}
function clearCustomerImage() {
  const value = document.getElementById("customerImageValue"),
    preview = document.getElementById("customerImagePreview"),
    fileInput = document.getElementById("customerImageFile");
  if (value) value.value = "";
  if (fileInput) fileInput.value = "";
  if (preview) {
    const name = document.querySelector('[name="name"]')?.value || "Дэлгүүр";
    preview.src = customerStoreImage({ name });
  }
  document
    .querySelector(
      '.customer-image-upload__actions [onclick="clearCustomerImage()"]',
    )
    ?.remove();
}
function customerDetailIdIcon() {
  return `<svg class="ui-icon customer-detail__icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h5M7 13h8"/></svg>`;
}
function customerDetailRow(label, valueHtml, iconHtml) {
  return `<div class="customer-detail__row">${iconHtml}<div class="customer-detail__row-body"><span class="customer-detail__label">${label}</span><div class="customer-detail__value">${valueHtml}</div></div></div>`;
}
function customerDetailPhonesHtml(c) {
  const phones = [c.phone1, c.phone2]
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  if (!phones.length) return `<span class="customer-detail__muted">—</span>`;
  return phones
    .map(
      (phone) =>
        `<a href="tel:${encodeURIComponent(phone)}" class="customer-detail__phone">${esc(phone)}</a>`,
    )
    .join('<span class="customer-detail__sep" aria-hidden="true">·</span>');
}
function customerDetailHtml(c, id) {
  const addr = [c.province, c.district, c.khoroo, c.address]
      .filter(Boolean)
      .join(", "),
    link = mapsLink(c.latitude, c.longitude),
    rd = customerRegistrationDisplay(c);
  const rows = [
    customerDetailRow(
      "Регистр",
      rd ? esc(rd) : `<span class="customer-detail__muted">—</span>`,
      customerDetailIdIcon(),
    ),
    customerDetailRow(
      "Утас",
      customerDetailPhonesHtml(c),
      customerCardPhoneIcon(),
    ),
    customerDetailRow(
      "Хаяг",
      addr ? esc(addr) : `<span class="customer-detail__muted">—</span>`,
      customerCardPinIcon(),
    ),
    customerDetailRow(
      "Байршил",
      link
        ? `<a href="${link}" target="_blank" rel="noopener" class="customer-detail__maps">Google Maps дээр нээх</a>`
        : `<span class="customer-detail__muted">Бүртгэгдээгүй</span>`,
      customerCardPinIcon(),
    ),
  ].join("");
  return `<div class="customer-detail"><header class="customer-detail__hero">${customerAvatarHtml(c, "customer-detail__avatar")}<div class="customer-detail__hero-text">${c.companyName ? `<p class="customer-detail__company">${esc(c.companyName)}</p>` : ""}${rd ? `<span class="customer-detail__badge">РД ${esc(rd)}</span>` : ""}</div></header><div class="customer-detail__panel">${rows}${c.locationText ? `<p class="customer-detail__note">${esc(c.locationText)}</p>` : ""}</div><footer class="customer-detail__actions"><button type="button" onclick="confirmEditCustomer('${esc(id)}')" class="btn btn--primary btn--block">Засах</button></footer></div>`;
}
function customerSubtitle(c) {
  const name = String(c.name || "").trim();
  const company = String(c.companyName || "").trim();
  const rd = customerRegistrationDisplay(c);
  const parts = [];
  if (rd) parts.push(`РД: ${rd}`);
  if (company && company !== name) parts.push(company);
  return parts.join(" · ");
}
function customerRegistrationDisplay(c) {
  return String(c?.registrationNumber || "").trim();
}
function customerRegistrationDigits(c) {
  return customerRegistrationDisplay(c).replace(/\D/g, "");
}
function customerMatchesQuery(c, q) {
  const needle = String(q || "")
    .trim()
    .toLowerCase();
  if (!needle) return true;
  const nameMatch = String(c.name || "")
    .toLowerCase()
    .includes(needle);
  const rdNeedle = needle.replace(/\D/g, "");
  const rdMatch =
    !!rdNeedle && customerRegistrationDigits(c).includes(rdNeedle);
  return nameMatch || rdMatch;
}
function sortCustomersByName(customers) {
  return [...(customers || [])].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "mn"),
  );
}
function customerCardPhoneIcon() {
  return `<svg class="ui-icon customer-card__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
}
function customerCardPinIcon() {
  return `<svg class="ui-icon customer-card__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;
}
function customerCardPhonesHtml(c) {
  const phones = [c.phone1, c.phone2]
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  if (!phones.length) {
    return `<span class="customer-card__muted customer-card__phones">Утасгүй</span>`;
  }
  return `<div class="customer-card__phones">${phones
    .map(
      (phone) =>
        `<a href="tel:${encodeURIComponent(phone)}" class="customer-card__phone-link">${customerCardPhoneIcon()}<span>${esc(phone)}</span></a>`,
    )
    .join("")}</div>`;
}
function customerListHead() {
  return `<div class="customer-list__head" aria-hidden="true"><span>Харилцагч</span><span>Хаяг</span><span class="customer-list__head-actions">Үйлдэл</span></div>`;
}
function customerListRow(c, actionsHtml, active = false) {
  const addr = customerAddress(c);
  const sub = customerSubtitle(c);
  return `<article class="customer-card ${active ? "customer-card--active" : ""}"><header class="customer-card__head">${customerAvatarHtml(c)}<div class="customer-card__identity"><div class="customer-card__title-row"><h3 class="customer-card__name">${esc(c.name)}</h3>${customerCardPhonesHtml(c)}</div>${sub ? `<p class="customer-card__sub">${esc(sub)}</p>` : ""}</div></header><div class="customer-card__addr"><p class="customer-card__line" title="${esc(addr)}">${customerCardPinIcon()}<span>${esc(addr)}</span></p></div><footer class="customer-card__actions">${actionsHtml}</footer></article>`;
}
function customersView() {
  const q = state.searches.customers || "",
    rows = sortCustomersByName(state.customers.filter((c) => customerMatchesQuery(c, q))),
    downloadBtn = isAdmin()
      ? `<button type="button" onclick="confirmCustomerExcel()" class="btn btn--sm btn--secondary shrink-0">${EXCEL_FILE_DOWNLOAD}</button>`
      : "";
  return `<div class="space-y-4">${pageHead("Харилцагч", `${downloadBtn}<button type="button" onclick="customerModal()" class="btn btn--sm btn--primary shrink-0">Харилцагч нэмэх</button>`)}<div class="list-panel"><div class="list-panel__toolbar"><input data-focus="customers" value="${esc(q)}" oninput="search('customers',this.value)" placeholder="Нэр, РД-ээр хайх..." class="list-panel__search app-input" autocomplete="off"></div><div class="list-panel__table">${customerListHead()}<div class="list-panel__body customer-list">${rows.length ? rows.map(customerRow).join("") : `<div class="list-panel__empty">Харилцагч олдсонгүй</div>`}</div></div></div></div>`;
}
function confirmDataExport(title, onConfirm) {
  confirmModal(title, "Та үүнийг хэвлэх үү?", {
    confirmLabel: "Тийм",
    onConfirm,
  });
}
function orderReceiptSearchText(o) {
  const customer = state.customers.find((x) => x.id === o.customerId) || {};
  return [
    o.id,
    formatReceiptNumber(o),
    o.customerName,
    customer.name,
    customer.companyName,
    customer.phone1,
    customer.phone2,
    o.employeeName,
    o.employeePhone,
    o.status,
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");
}
function orderReceiptMatchesQuery(o, q) {
  const needle = String(q || "")
    .trim()
    .toLowerCase();
  if (!needle) return true;
  return orderReceiptSearchText(o).includes(needle);
}
function idList(value) {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
}
function receiptWorkerIds() {
  return idList(state.searches.receiptWorkerIds);
}
function receiptDeliveryIds() {
  return idList(state.searches.receiptDeliveryIds);
}
function receiptPrintWorkerIds() {
  return idList(state.receiptPrintWorkerIds);
}
function receiptSalesEmployees() {
  return state.employees
    .filter((e) => e.role === "sales" || e.role === "admin")
    .sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), "mn"),
    );
}
function receiptPrintWorkerRoleLabel(role) {
  return role === "admin" ? "Админ" : "ХТ";
}
function receiptPrintWorkerSummary(selected = receiptPrintWorkerIds()) {
  if (!selected.length) return "Сонгох";
  if (selected.length === 1) {
    const emp = state.employees.find((e) => e.id === selected[0]);
    return emp?.name || "1 сонгосон";
  }
  return `${selected.length} сонгосон`;
}
function receiptPrintWorkerSyncToken() {
  return receiptPrintWorkerIds().slice().sort().join("|");
}
function receiptFilterOptions() {
  const workerIds = receiptPrintWorkerIds(),
    deliveryId = state.receiptPrintDeliveryId || "";
  return {
    workerIds: workerIds.length ? workerIds : receiptWorkerIds(),
    deliveryIds: deliveryId ? [deliveryId] : receiptDeliveryIds(),
  };
}
function receiptPrintDeliveryIds() {
  const id = state.receiptPrintDeliveryId || "";
  return id ? [id] : receiptDeliveryIds();
}
function receiptPrintWorkerOrders(workerIds = receiptPrintWorkerIds()) {
  const ids = new Set(workerIds);
  if (!ids.size) return [];
  const deliveryIds = receiptPrintDeliveryIds();
  const rows = filterWarehouseOrders(
    state.orders.filter(
      (o) =>
        ids.has(o.employeeId) &&
        (!deliveryIds.length ||
          deliveryIds.includes(orderDeliveryEmployeeId(o))) &&
        (state.filters.order === "all" || o.status === state.filters.order),
    ),
  );
  return sortOrdersBySelectedPeople(rows, workerIds, deliveryIds);
}
function syncReceiptPrintSelection(orders) {
  const workerIds = receiptPrintWorkerIds();
  if (!workerIds.length) {
    state.receiptPrintOrderIds = [];
    state.receiptPrintWorkerSyncKey = "";
    return;
  }
  const key = receiptPrintWorkerSyncToken();
  if (state.receiptPrintWorkerSyncKey !== key) {
    state.receiptPrintWorkerSyncKey = key;
    const pick = orders.length > 10 ? orders.slice(0, 10) : orders;
    state.receiptPrintOrderIds = pick.map((o) => o.id);
    return;
  }
  const valid = new Set(orders.map((o) => o.id));
  state.receiptPrintOrderIds = idList(state.receiptPrintOrderIds).filter((id) =>
    valid.has(id),
  );
}
function receiptPrintWorkerSelectHtml() {
  const people = receiptSalesEmployees(),
    selected = receiptPrintWorkerIds(),
    open = !!state.receiptPrintWorkerPickerOpen,
    summary = receiptPrintWorkerSummary(selected);
  return `<div class="wh-receipt-field wh-receipt-field--picker"><span class="wh-receipt-field__label">Худалдааны төлөөлөгч</span><div class="wh-receipt-picker${open ? " is-open" : ""}" data-receipt-worker-picker><button type="button" class="wh-receipt-picker__trigger" onclick="toggleReceiptPrintWorkerPicker(event)" aria-expanded="${open ? "true" : "false"}" aria-haspopup="listbox"><span class="wh-receipt-picker__icon" aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"/><path d="M4 20a8 8 0 0 1 16 0"/></svg></span><span class="wh-receipt-picker__value${selected.length ? "" : " is-placeholder"}">${esc(summary)}</span><svg class="wh-receipt-picker__chev ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>${open ? `<div class="wh-receipt-picker__panel" role="listbox" aria-label="Худалдааны төлөөлөгч" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><div class="wh-receipt-picker__head"><span class="wh-receipt-picker__head-title">Сонгох</span>${selected.length ? `<button type="button" class="wh-receipt-picker__clear" onclick="clearReceiptPrintWorkers(event)">Цэвэрлэх</button>` : ""}</div><div class="wh-receipt-picker__list">${people.length ? people.map((e) => `<label class="wh-receipt-picker__item${selected.includes(e.id) ? " is-active" : ""}" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><input type="checkbox"${selected.includes(e.id) ? " checked" : ""} onchange="toggleReceiptPrintWorker('${esc(e.id)}', event)"><span class="wh-receipt-picker__avatar-wrap">${employeeAvatarHtml(e, "wh-receipt-picker__avatar")}</span><span class="wh-receipt-picker__meta"><span class="wh-receipt-picker__name">${esc(e.name)}</span><span class="wh-receipt-picker__role wh-receipt-picker__role--${esc(e.role)}">${receiptPrintWorkerRoleLabel(e.role)}</span></span></label>`).join("") : `<p class="wh-receipt-picker__empty">Ажилтан олдсонгүй</p>`}</div><div class="wh-receipt-picker__foot"><button type="button" class="btn btn--primary btn--sm btn--block" onclick="closeReceiptPrintWorkerPicker(event)">Болсон</button></div></div>` : ""}</div></div>`;
}
function receiptPrintDeliverySelectHtml() {
  const deliveries = deliveryEmployees(),
    deliveryId = state.receiptPrintDeliveryId || "";
  return `<label class="wh-receipt-field"><span class="wh-receipt-field__label">Түгээгч</span><span class="wh-receipt-field__control"><svg class="wh-receipt-field__icon ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h11v8H3z"/><path d="M14 10h4l3 4v5h-7v-9z"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="17.5" cy="18" r="1.5"/></svg><select onchange="setReceiptPrintDelivery(this.value)" class="wh-receipt-field__select app-input" aria-label="Түгээгч"><option value=""${deliveryId ? "" : " selected"}>Бүгд</option>${deliveries.map((e) => `<option value="${esc(e.id)}"${deliveryId === e.id ? " selected" : ""}>${esc(e.name)}</option>`).join("")}</select><svg class="wh-receipt-field__chev ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span></label>`;
}
let receiptPrintWorkerPickerDismissBound = false;
function toggleReceiptPrintWorkerPicker(ev) {
  if (ev?.stopPropagation) ev.stopPropagation();
  state.receiptPrintWorkerPickerOpen = !state.receiptPrintWorkerPickerOpen;
  render();
}
function closeReceiptPrintWorkerPicker(ev) {
  if (ev?.stopPropagation) ev.stopPropagation();
  state.receiptPrintWorkerPickerOpen = false;
  render();
}
function toggleReceiptPrintWorker(id, ev) {
  if (ev?.stopPropagation) ev.stopPropagation();
  const current = receiptPrintWorkerIds();
  state.receiptPrintWorkerIds = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id];
  state.receiptPrintWorkerSyncKey = "";
  state.selectedWarehouseOrderId = "";
  state.receiptPrintWorkerPickerOpen = true;
  render();
}
function clearReceiptPrintWorkers(ev) {
  if (ev?.stopPropagation) ev.stopPropagation();
  state.receiptPrintWorkerIds = [];
  state.receiptPrintWorkerSyncKey = "";
  state.receiptPrintOrderIds = [];
  state.selectedWarehouseOrderId = "";
  state.receiptPrintWorkerPickerOpen = true;
  render();
}
function setReceiptPrintDelivery(id) {
  const next = id || "";
  if (state.receiptPrintDeliveryId === next) return;
  state.receiptPrintDeliveryId = next;
  state.receiptPrintWorkerSyncKey = "";
  state.selectedWarehouseOrderId = "";
  render();
}
function bindReceiptPrintWorkerPickerDismiss() {
  if (receiptPrintWorkerPickerDismissBound) return;
  receiptPrintWorkerPickerDismissBound = true;
  document.addEventListener(
    "click",
    (ev) => {
      if (!state.receiptPrintWorkerPickerOpen) return;
      const picker = document.querySelector("[data-receipt-worker-picker]");
      if (picker?.contains(ev.target)) return;
      state.receiptPrintWorkerPickerOpen = false;
      render();
    },
    true,
  );
}
function toggleReceiptPrintOrder(id) {
  const current = idList(state.receiptPrintOrderIds);
  state.receiptPrintOrderIds = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id];
  render();
}
function orderDeliveryEmployeeId(o = {}) {
  if (o.deliveryEmployeeId) return String(o.deliveryEmployeeId);
  const name = String(o.deliveryName || "")
    .trim()
    .toLowerCase();
  if (!name) return "";
  return (
    deliveryEmployees().find(
      (e) =>
        String(e.name || "")
          .trim()
          .toLowerCase() === name,
    )?.id || ""
  );
}
function sortOrdersBySelectedPeople(orders, workerIds = [], deliveryIds = []) {
  const workerRank = new Map(workerIds.map((id, idx) => [id, idx]));
  const deliveryRank = new Map(deliveryIds.map((id, idx) => [id, idx]));
  return [...orders].sort((a, b) => {
    if (workerRank.size) {
      const ar = workerRank.has(a.employeeId)
          ? workerRank.get(a.employeeId)
          : Number.MAX_SAFE_INTEGER,
        br = workerRank.has(b.employeeId)
          ? workerRank.get(b.employeeId)
          : Number.MAX_SAFE_INTEGER;
      if (ar !== br) return ar - br;
    }
    if (deliveryRank.size) {
      const ad = orderDeliveryEmployeeId(a),
        bd = orderDeliveryEmployeeId(b),
        ar = deliveryRank.has(ad)
          ? deliveryRank.get(ad)
          : Number.MAX_SAFE_INTEGER,
        br = deliveryRank.has(bd)
          ? deliveryRank.get(bd)
          : Number.MAX_SAFE_INTEGER;
      if (ar !== br) return ar - br;
    }
    const at = new Date(a.createdAt || 0).getTime(),
      bt = new Date(b.createdAt || 0).getTime();
    if (at !== bt) return at - bt;
    return String(a.id || "").localeCompare(String(b.id || ""), "mn");
  });
}
function warehouseOrdersForSelectedWorkers() {
  const ids = new Set(state.selectedWorkers || []);
  if (!ids.size) return [];
  const orders = filterWarehouseOrders(
    state.orders.filter((o) => ids.has(o.employeeId)),
  );
  return sortOrdersBySelectedPeople(orders, state.selectedWorkers || []);
}
function warehouseActiveWorkerIds(orders) {
  const hasOrder = new Set((orders || []).map((o) => o.employeeId));
  return (state.selectedWorkers || []).filter((id) => hasOrder.has(id));
}
function warehouseDateFiltersHtml() {
  const day = state.filters.warehouseDate || "",
    today = todayIso(),
    displayDay = day || today,
    live = !day;
  return `<div class="wh-date-filters"><button type="button" onclick="clearWarehouseDate()" class="wh-date-filters__live${live ? " is-active" : ""}">Одоогийн</button><input type="date" value="${displayDay}" onchange="setWarehouseDate(this.value)" class="wh-date-filters__date app-input" aria-label="Огноо сонгох"><span class="wh-date-filters__hint">${live ? "Өнөөдрийн захиалга" : "Сонгосон өдрийн захиалга"}</span></div>`;
}
function clearWarehouseDate() {
  state.filters.warehouseDate = "";
  render();
}
function setWarehouseDate(day) {
  state.filters.warehouseDate = day || "";
  render();
}
function receiptFilterToggle(kind, id) {
  const key =
    kind === "delivery" ? "receiptDeliveryIds" : "receiptWorkerIds";
  const current = idList(state.searches[key]);
  state.searches[key] = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id];
  state.selectedWarehouseOrderId = "";
  render();
}
function receiptFilterClear(kind = "") {
  if (!kind || kind === "worker") state.searches.receiptWorkerIds = [];
  if (!kind || kind === "delivery") state.searches.receiptDeliveryIds = [];
  state.selectedWarehouseOrderId = "";
  render();
}
function receiptFilterChip(kind, item, selectedIds) {
  const active = selectedIds.includes(item.id);
  return `<button type="button" onclick="receiptFilterToggle(${jsStringArg(kind)},${jsStringArg(item.id)})" class="receipt-filter-chip${active ? " is-active" : ""}" aria-pressed="${active ? "true" : "false"}">${esc(item.name)}</button>`;
}
function receiptFilterGroup(kind, title, items, selectedIds) {
  if (!items.length) return "";
  const clear =
    selectedIds.length > 0
      ? `<button type="button" onclick="receiptFilterClear(${jsStringArg(kind)})" class="receipt-filter-clear">Цэвэрлэх</button>`
      : "";
  return `<div class="receipt-filter-group"><div class="receipt-filter-group__head"><span>${esc(title)}</span>${clear}</div><div class="receipt-filter-chips">${items.map((item) => receiptFilterChip(kind, item, selectedIds)).join("")}</div></div>`;
}
function receiptPeopleFiltersHtml() {
  const deliveries = deliveryEmployees(),
    deliveryIds = receiptDeliveryIds(),
    clearAll = deliveryIds.length
      ? `<button type="button" onclick="receiptFilterClear('delivery')" class="receipt-filter-clear receipt-filter-clear--all">Бүгдийг цэвэрлэх</button>`
      : "";
  return `<div class="receipt-people-filters">${clearAll}${receiptFilterGroup("delivery", "Түгээгч", deliveries, deliveryIds)}</div>`;
}
function confirmCustomerExcel() {
  if (!isAdmin()) return;
  if (!state.customers.length) return alert("Харилцагч байхгүй");
  confirmDataExport("Excel татах", customerExcel);
}
function confirmProductsExport() {
  confirmDataExport("Excel татах", () => {
    csv(
      "products.csv",
      state.products.map((p) => [
        p.barcode,
        p.name,
        p.category,
        p.price,
        p.stock,
        p.unit,
      ]),
    );
  });
}
function confirmInventoryExport() {
  confirmDataExport("Excel татах", () => {
    csv(
      "inventory.csv",
      state.inventoryLogs.map((l) => [
        dte(l.date),
        l.productName,
        l.type,
        l.quantity,
        l.employeeName,
      ]),
    );
  });
}
function confirmReportExport() {
  confirmDataExport("Excel татах", () => {
    const orders = reportOrdersFiltered(),
      total = orders.reduce((s, o) => s + orderAmount(o), 0),
      paid = orders
        .filter((o) => orderIsPaid(o))
        .reduce((s, o) => s + orderAmount(o), 0);
    csv("report.csv", [[total, paid]]);
  });
}
function confirmEmployeeExcel() {
  if (!state.selectedWorkers.length) return alert("Ажилтан сонгоно уу");
  confirmDataExport("Excel татах", employeeExcel);
}
function customerExcel() {
  if (!isAdmin()) return;
  if (!state.customers.length) return alert("Харилцагч байхгүй");
  const rows = [
    [
      "№",
      "Нэр",
      "РД",
      "Байгууллагын нэр",
      "Утас 1",
      "Утас 2",
      "Аймаг/Хот",
      "Дүүрэг/Сум",
      "Хороо",
      "Дэлгэрэнгүй хаяг",
      "Бүрэн хаяг",
    ],
    ...[...state.customers]
      .sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), "mn"),
      )
      .map((c, i) => {
        const fullAddr = customerAddress(c);
        return [
          i + 1,
          c.name || "",
          c.registrationNumber || "",
          c.companyName || "",
          c.phone1 || "",
          c.phone2 || "",
          c.province || "",
          c.district || "",
          c.khoroo || "",
          c.address || "",
          fullAddr === "-" ? "" : fullAddr,
        ];
      }),
  ];
  excel("hariltsagch.xls", rows);
}
function customerAddress(c) {
  return (
    [c.province, c.district, c.khoroo, c.address].filter(Boolean).join(", ") ||
    "-"
  );
}
function customerRow(c) {
  const deleteBtn = canDelete()
    ? `<button type="button" data-confirm-delete="customer" data-id="${esc(c.id)}" class="customer-card__btn customer-card__btn--danger">Устгах</button>`
    : "";
  return customerListRow(
    c,
    `<button type="button" onclick="customerDetail('${c.id}')" class="customer-card__btn customer-card__btn--ghost">Харах</button><button type="button" onclick="confirmEditCustomer('${c.id}')" class="customer-card__btn customer-card__btn--primary">Засах</button>${deleteBtn}`,
  );
}
function workerPickCard(c) {
  const active = state.workerCustomer === c.id;
  const sub = customerSubtitle(c);
  const phone = (c.phone1 || "").trim();
  const reg = customerRegistrationDisplay(c);
  const initial = deliveryInitial(c.name);
  const id = esc(c.id);
  const line2 = sub || reg || phone;
  return `<button type="button" class="worker-pick-card${active ? " is-selected" : ""}" onclick="pickWorkerStore('${id}')" aria-pressed="${active ? "true" : "false"}"><span class="worker-pick-card__avatar">${esc(initial)}</span><span class="worker-pick-card__text"><span class="worker-pick-card__name">${esc(c.name)}</span>${line2 ? `<span class="worker-pick-card__sub">${esc(line2)}</span>` : ""}</span>${active ? `<span class="worker-pick-card__check" aria-hidden="true">✓</span>` : ""}</button>`;
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
  return `<div class="space-y-4">${pageHead("Бараа", `<button onclick="confirmProductsExport()" class="px-3 py-2 bg-secondary rounded text-sm shrink-0">${EXCEL_FILE_DOWNLOAD}</button>`)}${metricsBar(`${card("Бараа", state.products.length)}${card("Төрөл", cats().length)}${card("Үлд", low, low ? "text-tone-warning" : "text-tone-success")}`, 3)}<div class="line-panel"><div class="line-panel__toolbar products-toolbar"><input data-focus="products" value="${esc(q)}" oninput="search('products',this.value)" placeholder="Хайх..." class="flex-1 px-3 py-2.5 bg-secondary rounded app-input"><select onchange="state.filters.category=this.value;render()" class="px-3 py-2.5 bg-secondary rounded app-input"><option value="all">Бүх төрөл</option>${cats()
    .map((c) => `<option ${cat === c ? "selected" : ""}>${c}</option>`)
    .join(
      "",
    )}</select>${isAdmin() ? `<div class="products-toolbar__actions"><button type="button" onclick="categoryModal()" class="px-4 py-3 bg-secondary rounded">Төрөл</button><button type="button" onclick="productModal()" class="px-4 py-3 bg-primary text-primary-foreground rounded">Бараа нэмэх</button></div>` : ""}</div><div class="product-list${isAdmin() ? "" : " product-list--readonly"}">${list.length ? `${productListHead()}${list.map(productCard).join("")}` : `<div class="line-panel__empty">Бараа олдсонгүй</div>`}</div></div></div>`;
}
function productListHead() {
  const actions = isAdmin();
  return `<div class="product-list__head"><span class="product-list__col product-list__col--name">Бараа</span><span class="product-list__col product-list__col--cat">Төрөл</span><span class="product-list__col product-list__col--price">Үнэ</span><span class="product-list__col product-list__col--stock">Үлдэгдэл</span><span class="product-list__col product-list__col--barcode">Баркод</span>${actions ? `<span class="product-list__col product-list__col--actions">Үйлдэл</span>` : ""}</div>`;
}
function productCard(p) {
  const adminActions = isAdmin()
    ? `<div class="product-card__actions"><button type="button" onclick="confirmEditProduct('${p.id}')" class="product-card__action-btn product-card__action-btn--edit">Засах</button><button type="button" data-confirm-delete="product" data-id="${esc(p.id)}" class="product-card__action-btn product-card__action-btn--delete">Устгах</button></div>`
    : "";
  const catLine = [p.category, p.country].filter(Boolean).join(" · ") || "-";
  return `<article class="product-card"><div class="product-card__lead"><img src="${productImage(p)}" alt="" class="product-card__img" loading="lazy" decoding="async"><p class="product-card__title">${esc(p.name)}</p></div><p class="product-card__cat">${esc(catLine)}</p><div class="product-card__meta"><span class="product-card__price">${fmt(p.price)}</span><span class="product-card__badge ${isLowStock(p) ? "product-card__badge--low" : ""}">Үлд: ${p.stock ?? 0}</span></div><span class="product-card__barcode">${esc(p.barcode || "-")}</span>${adminActions}</article>`;
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
  return `<div class="space-y-4">${pageHead("Агуулах", `<button type="button" onclick="confirmInventoryExport()" class="btn btn--sm btn--secondary shrink-0">${EXCEL_FILE_DOWNLOAD}</button>`)}<div class="seg-tabs seg-tabs--3">${[
    ["stock", "Үлдэгдэл"],
    ["in", "Орлого авах"],
    ["out", "Зарлага гаргах"],
  ]
    .map(
      (t) =>
        `<button type="button" onclick="setInventoryTab('${t[0]}')" class="seg-tab ${tab === t[0] ? "is-active" : ""}">${t[1]}</button>`,
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
  return `<button type="button" onclick="inventoryStockModal('${esc(p.id)}','${tab}')" class="inventory-stock-row"><img src="${productImage(p)}" alt="${esc(p.name)}" class="product-thumb inventory-stock-row__thumb"><div class="inventory-stock-row__info min-w-0"><p class="inventory-stock-row__name">${esc(p.name)}</p><p class="inventory-stock-row__barcode">${esc(p.barcode || "-")}</p><span class="inventory-stock-row__stock">Үлдэгдэл: <b>${p.stock} ${esc(p.unit || "ш")}</b></span></div></button>`;
}
function inventoryStockModal(id, tab) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const isIn = tab === "in",
    title = isIn ? "Орлого авах" : "Зарлага гаргах",
    actionLabel = isIn ? "Орлого" : "Зарлага",
    btnClass = isIn ? "btn--primary" : "btn--danger";
  box(
    title,
    `<form onsubmit="applyStockFromModal(event,'${esc(id)}','${tab}')" class="inventory-stock-modal p-5 space-y-4"><div class="inventory-stock-modal__product"><img src="${productImage(p)}" alt="" class="product-thumb inventory-stock-modal__thumb"><div class="inventory-stock-modal__info"><p class="inventory-stock-modal__name">${esc(p.name)}</p><p class="inventory-stock-modal__barcode">${esc(p.barcode || "-")}</p><p class="inventory-stock-modal__stock">Үлдэгдэл: <b>${p.stock} ${esc(p.unit || "ш")}</b></p></div></div><label class="block"><span class="field-label">Тоо</span><input name="quantity" type="number" min="1" placeholder="1" required inputmode="numeric" autofocus class="field-input app-input"></label><div class="grid grid-cols-2 gap-2 pt-1"><button type="button" onclick="closeModal()" class="btn btn--secondary">Болих</button><button type="submit" class="btn ${btnClass}">${actionLabel}</button></div></form>`,
    "max-w-md",
  );
}
function applyStockFromModal(e, id, type) {
  e.preventDefault();
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const q = Number(new FormData(e.target).get("quantity") || 0);
  if (!Number.isFinite(q) || q < 1) {
    alert("Тоо оруулна уу");
    return;
  }
  if (type === "out" && q > p.stock) {
    alert("Үлдэгдэл хүрэлцэхгүй байна!");
    return;
  }
  const isIn = type === "in",
    title = isIn ? "Орлого авах" : "Зарлага гаргах",
    actionLabel = isIn ? "орлого" : "зарлага",
    afterStock = isIn ? p.stock + q : p.stock - q,
    summaryHtml = `<p><b>${esc(p.name)}</b> — <b>${q}</b> ${esc(p.unit || "ш")} ${actionLabel} хийх үү?</p><p class="text-sm text-muted-foreground mt-2">Одоо: ${p.stock} ${esc(p.unit || "ш")} → Дараа: ${afterStock} ${esc(p.unit || "ш")}</p>`,
    finalMessage = `<p><strong>${esc(p.name)}</strong>-д <strong>${q}</strong> ${esc(p.unit || "ш")} ${actionLabel} бүртгэхдээ итгэлтэй байна уу?</p><p class="text-sm text-muted-foreground mt-2">Үлдэгдэл: ${p.stock} ${esc(p.unit || "ш")} → ${afterStock} ${esc(p.unit || "ш")}</p>`;
  confirmModal(title, summaryHtml, {
    confirmLabel: "Тийм",
    danger: !isIn,
    onConfirm: () => {
      confirmModal("Баталгаажуулах", finalMessage, {
        confirmLabel: "Батлах",
        onConfirm: () => {
          if (applyStock(id, type, q)) closeModal();
        },
        danger: !isIn,
        closable: true,
      });
    },
  });
}
function stockActionList(list, tab) {
  const hint =
    tab === "in"
      ? "Орлого авах бараагаа сонгоно уу."
      : "Зарлага гаргах бараагаа сонгоно уу.";

  return `<div class="bg-card rounded overflow-hidden inventory-stock-panel"><div class="inventory-stock-panel__hint px-4 py-3 text-sm text-muted-foreground bg-secondary/40 border-b border-border">${hint}</div><div class="divide-y divide-border">${list.length ? list.map((p) => stockActionRow(p, tab)).join("") : `<div class="p-8 text-center text-sm text-muted-foreground">Бараа олдсонгүй</div>`}</div></div>`;
}
function stockGrid(list) {
  return `<div class="bg-card rounded overflow-hidden"><div class="hidden md:grid grid-cols-[48px_minmax(0,1fr)_140px_140px_120px] gap-3 px-4 py-3 bg-secondary/50 text-xs font-semibold text-muted-foreground"><span>Зураг</span><span>Бараа</span><span>Төрөл</span><span>Баркод</span><span class="text-right">Үлдэгдэл</span></div><div class="divide-y divide-border">${list.length ? list.map((p) => `<div class="p-4 flex items-center gap-3 md:grid md:grid-cols-[48px_minmax(0,1fr)_140px_140px_120px] md:items-center md:gap-3"><img src="${productImage(p)}" alt="${esc(p.name)}" class="product-thumb shrink-0" loading="lazy" decoding="async"><div class="min-w-0 flex-1 md:flex-none"><p class="font-medium truncate">${esc(p.name)}</p><p class="md:hidden text-xs text-muted-foreground mt-1">${esc(p.category || "-")} · ${esc(p.barcode || "-")}</p></div><span class="hidden md:block text-sm">${esc(p.category || "-")}</span><span class="hidden md:block text-sm font-mono">${esc(p.barcode || "-")}</span><b class="shrink-0 ml-auto whitespace-nowrap md:ml-0 md:text-right">${p.stock} ${esc(p.unit || "ш")}</b></div>`).join("") : `<div class="p-8 text-center text-sm text-muted-foreground">Бараа олдсонгүй</div>`}</div></div>`;
}
function countFilteredProducts() {
  const q = (state.searches.count || "").toLowerCase().trim(),
    cat = state.filters.countCategory || "all";
  return state.products.filter((p) => {
    if (cat !== "all" && p.category !== cat) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) || String(p.barcode || "").includes(q)
    );
  });
}
function countCategoryLabel(cat = state.filters.countCategory || "all") {
  return cat === "all" ? "Бүх бараа" : cat;
}
function setCountCategory(cat) {
  state.filters.countCategory = cat || "all";
  state.countDone = false;
  render();
}
function countSessionSinceMs() {
  const t = state.countSessionStartedAt;
  if (!t) return 0;
  const ms = new Date(t).getTime();
  return Number.isFinite(ms) ? ms : 0;
}
function inventoryLogProductId(log) {
  const name = String(log.productName || "")
    .trim()
    .toLowerCase();
  if (!name) return "";
  const hit = state.products.find(
    (p) => String(p.name || "").trim().toLowerCase() === name,
  );
  return hit?.id || "";
}
function countInventoryQty(productId, type) {
  const since = countSessionSinceMs();
  return state.inventoryLogs
    .filter((l) => l.type === type)
    .filter((l) => inventoryLogProductId(l) === productId)
    .filter((l) => {
      if (!since) return true;
      const ms = new Date(l.date).getTime();
      return Number.isFinite(ms) ? ms >= since : true;
    })
    .reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
}
function countSoldQty(productId) {
  const since = countSessionSinceMs();
  let total = 0;
  for (const o of state.orders) {
    if (String(o.status || "").toLowerCase() === "cancelled") continue;
    if (since) {
      const ms = new Date(o.createdAt).getTime();
      if (Number.isFinite(ms) && ms < since) continue;
    }
    for (const item of o.items || []) {
      if (item.productId === productId) {
        total += Number(item.quantity) || 0;
      }
    }
  }
  return total;
}
function countProductStats(p) {
  const id = p.id;
  const opening = Number(state.countOpeningStock?.[id] ?? p.stock) || 0;
  const sold = countSoldQty(id);
  const expended = countInventoryQty(id, "out");
  const income = countInventoryQty(id, "in");
  const system = Number(p.stock) || 0;
  const expected = opening + income - sold - expended;
  const final = countValue(id);
  return { opening, sold, expended, income, system, expected, final };
}
function countMetricsTotals(products) {
  let opening = 0,
    sold = 0,
    expended = 0,
    final = 0;
  for (const p of products) {
    const stats = countProductStats(p);
    if (stats.final === null) continue;
    opening += stats.opening;
    sold += stats.sold;
    expended += stats.expended;
    final += stats.final;
  }
  return { opening, sold, expended, final };
}
function snapshotCountOpeningStock() {
  const opening = {};
  for (const p of state.products) {
    opening[p.id] = Number(p.stock) || 0;
  }
  state.countOpeningStock = opening;
}
function ensureCountSession() {
  if (!state.countSessionStartedAt) {
    state.countSessionStartedAt = new Date().toISOString();
    snapshotCountOpeningStock();
  } else if (
    !state.countOpeningStock ||
    !Object.keys(state.countOpeningStock).length
  ) {
    snapshotCountOpeningStock();
  }
}
function countView() {
  ensureCountSession();
  const q = state.searches.count || "",
    cat = state.filters.countCategory || "all",
    list = countFilteredProducts(),
    counted = list.filter((p) => countValue(p.id) !== null).length,
    mismatches = countMismatchesForList(list),
    countedProducts = list.filter((p) => countValue(p.id) !== null),
    metricsHtml = state.countDone
      ? (() => {
          const t = countMetricsTotals(countedProducts);
          return metricsBar(
            `${card("Эхний үлдэгдэл", t.opening)}${card("Борлуулсан", t.sold)}${card("Зарлагдсан", t.expended)}${card("Эцсийн үлдэгдэл", t.final)}`,
            "4",
            "count",
          );
        })()
      : metricsBar(
          `${card("Тоолсон", counted)}${card("Бараа", list.length)}`,
          "2",
          "count",
        );
  return `<div class="space-y-4 count-view">${pageHead("Тооллого")}${metricsHtml}<div class="line-panel"><div class="inventory-categories flex flex-wrap gap-2 mb-3"><button type="button" onclick="setCountCategory('all')" class="px-3 py-2 rounded text-sm ${cat === "all" ? "bg-primary text-primary-foreground" : "bg-secondary"}">Бүх бараа</button>${cats()
    .map(
      (c) =>
        `<button type="button" onclick="setCountCategory('${esc(c)}')" class="px-3 py-2 rounded text-sm ${cat === c ? "bg-primary text-primary-foreground" : "bg-secondary"}">${esc(c)}</button>`,
    )
    .join(
      "",
    )}</div><input data-focus="count" value="${esc(q)}" oninput="search('count',this.value)" placeholder="Хайх..." class="line-panel__search app-input"><div class="count-list">${list.length ? list.map(countRow).join("") : `<p class="line-panel__empty">Бараа олдсонгүй</p>`}</div></div><div class="grid grid-cols-2 gap-2"><button onclick="finishCount()" class="py-3 bg-primary text-primary-foreground rounded font-medium">Дуусгах</button><button type="button" onclick="confirmNewCount()" class="py-3 bg-secondary rounded font-medium">Шинэ</button></div>${state.countDone ? countResult(mismatches) : ""}</div>`;
}
function countRow(p) {
  const stats = countProductStats(p),
    value = stats.final,
    diff = value === null ? null : value - stats.expected,
    diffText = diff === null ? "-" : diff > 0 ? `+${diff}` : String(diff),
    diffClass =
      diff === null || diff === 0
        ? "text-muted-foreground"
        : "text-tone-danger font-semibold";
  return `<div class="count-row"><img src="${productImage(p)}" class="count-row__thumb product-thumb" alt="${esc(p.name)}"><div class="count-row__info"><p class="count-row__name">${esc(p.name)}</p><p class="count-row__meta count-row__stats"><span>Эхний: <b>${stats.opening}</b></span><span>Борлуулсан: <b>${stats.sold}</b></span><span>Зарлага: <b>${stats.expended}</b></span></p></div><div class="count-row__actions"><input onchange="setCountQty('${p.id}',this.value)" value="${value ?? ""}" placeholder="0" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" class="count-row__input app-input" aria-label="${esc(p.name)} эцсийн үлдэгдэл"><span class="count-row__diff ${diffClass}" title="Зөрүү">${diffText}</span></div></div>`;
}
function countValue(id) {
  const value = state.countQty[id];
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function setCountQty(id, value) {
  ensureCountSession();
  if (value === "") delete state.countQty[id];
  else state.countQty[id] = Number(value);
  state.countDone = false;
  render();
}
function countMismatches() {
  return state.products
    .map((p) => {
      const stats = countProductStats(p);
      if (stats.final === null) return null;
      const diff = stats.final - stats.expected;
      return diff === 0
        ? null
        : { product: p, stats, counted: stats.final, diff };
    })
    .filter(Boolean);
}
function countMismatchesForList(list) {
  const ids = new Set(list.map((p) => p.id));
  return countMismatches().filter((row) => ids.has(row.product.id));
}
function countResult(mismatches) {
  const list = countFilteredProducts().filter((p) => countValue(p.id) !== null);
  const rowHtml = list
    .map((p) => {
      const stats = countProductStats(p),
        diff = stats.final - stats.expected,
        diffClass =
          diff === 0 ? "text-muted-foreground" : "text-tone-danger font-semibold",
        diffText = diff > 0 ? `+${diff}` : String(diff);
      return `<div class="px-4 py-3 grid grid-cols-2 sm:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(56px,1fr))_minmax(56px,1fr)] gap-x-2 gap-y-1 text-sm count-result-row"><span class="font-medium col-span-2 sm:col-span-1">${esc(p.name)}</span><span class="count-result-row__cell"><span class="text-muted-foreground sm:hidden">Эхний: </span><b>${stats.opening}</b></span><span class="count-result-row__cell"><span class="text-muted-foreground sm:hidden">Борлуулсан: </span><b>${stats.sold}</b></span><span class="count-result-row__cell"><span class="text-muted-foreground sm:hidden">Зарлагдсан: </span><b>${stats.expended}</b></span><span class="count-result-row__cell"><span class="text-muted-foreground sm:hidden">Эцсийн: </span><b>${stats.final}</b></span><span class="${diffClass} count-result-row__cell"><span class="text-muted-foreground sm:hidden">Зөрүү: </span><b>${diffText}</b></span></div>`;
    })
    .join("");
  return `<div class="bg-card rounded overflow-hidden"><div class="px-4 py-3 bg-secondary/50"><p class="font-semibold">Тооллого хадгалагдлаа</p><p class="text-sm text-muted-foreground mt-1">Зөрүүтэй бараа: ${mismatches.length}</p></div>${list.length ? `<div class="hidden sm:grid grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(56px,1fr))_minmax(56px,1fr)] gap-2 px-4 py-2 bg-secondary/30 text-xs font-semibold text-muted-foreground border-b border-border"><span>Бараа</span><span class="text-center">Эхний үлдэгдэл</span><span class="text-center">Борлуулсан</span><span class="text-center">Зарлагдсан</span><span class="text-center">Эцсийн үлдэгдэл</span><span class="text-center">Зөрүү</span></div><div class="divide-y divide-border">${rowHtml}</div>` : `<div class="p-4 text-sm text-muted-foreground">Тоолсон бараа байхгүй</div>`}${mismatches.length === 0 && list.length ? `<div class="p-4 text-sm text-tone-success font-medium border-t border-border">Зөрүүтэй бараа байхгүй</div>` : ""}<div class="p-4 border-t border-border"><button type="button" onclick="confirmCountExcel()" class="w-full py-3 bg-secondary rounded font-medium">${EXCEL_FILE_DOWNLOAD}</button></div></div>`;
}
function countExcelRows() {
  const ids = new Set(countFilteredProducts().map((p) => p.id));
  return state.products
    .filter((p) => ids.has(p.id))
    .map((p) => {
      const stats = countProductStats(p);
      if (stats.final === null) return null;
      const diff = stats.final - stats.expected;
      return [
        p.barcode || "-",
        p.name,
        p.category || "-",
        stats.opening,
        stats.sold,
        stats.expended,
        stats.final,
        diff,
        p.unit || "ш",
      ];
    })
    .filter(Boolean);
}
function countSheetProductsGrouped() {
  const ids = new Set(countFilteredProducts().map((p) => p.id));
  const products = state.products
    .filter((p) => ids.has(p.id) && countValue(p.id) !== null)
    .sort(
      (a, b) =>
        String(a.category || "").localeCompare(
          String(b.category || ""),
          "mn",
        ) || String(a.name || "").localeCompare(String(b.name || ""), "mn"),
    );
  const groups = [];
  let cur = "";
  for (const p of products) {
    const cat = p.category || "Бусад";
    if (cat !== cur) {
      groups.push({ type: "cat", name: cat });
      cur = cat;
    }
    groups.push({ type: "product", product: p });
  }
  return groups;
}
function countSheetDateLabel() {
  const d = new Date();
  return `Огноо: ${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}
function xlsxXmlEsc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function xlsxColName(n) {
  let s = "";
  let num = n;
  while (num > 0) {
    const mod = (num - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}
function xlsxSharedStringsXml(strings) {
  const items = strings.map((s) => `<si><t>${xlsxXmlEsc(s)}</t></si>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${items}</sst>`;
}
function xlsxCellXml(ref, styleId, value, kind) {
  if (kind === "n") {
    return `<c r="${ref}" s="${styleId}"><v>${value}</v></c>`;
  }
  if (kind === "s") {
    return `<c r="${ref}" s="${styleId}" t="s"><v>${value}</v></c>`;
  }
  return `<c r="${ref}" s="${styleId}"/>`;
}
function xlsxRowXml(rowNum, height, cells) {
  const ht = height ? ` ht="${height}" customHeight="1"` : "";
  const body = cells.join("");
  return `<row r="${rowNum}" spans="1:8"${ht}>${body}</row>`;
}
function buildCountSheetXml() {
  const strings = [];
  const strIndex = new Map();
  const si = (text) => {
    const key = String(text ?? "");
    if (strIndex.has(key)) return strIndex.get(key);
    const idx = strings.length;
    strings.push(key);
    strIndex.set(key, idx);
    return idx;
  };
  const emp = state.currentEmployee?.name || "-";
  const dateLabel = countSheetDateLabel();
  const groups = countSheetProductsGrouped();
  const rows = [];
  const merges = ["A1:F1", "E2:F2"];
  let rowNum = 1;
  const pushRow = (height, cells) => {
    rows.push(xlsxRowXml(rowNum, height, cells));
    rowNum += 1;
  };
  pushRow(43.5, [
    xlsxCellXml("A1", 13, si("Бараа бэлдэх хуудас"), "s"),
    xlsxCellXml("B1", 13, null, "empty"),
    xlsxCellXml("C1", 13, null, "empty"),
    xlsxCellXml("D1", 13, null, "empty"),
    xlsxCellXml("E1", 13, null, "empty"),
    xlsxCellXml("F1", 13, null, "empty"),
    xlsxCellXml("G1", 1, null, "empty"),
    xlsxCellXml("H1", 1, null, "empty"),
  ]);
  pushRow(28.5, [
    xlsxCellXml("A2", 3, si("Агуулахын ажилтан:"), "s"),
    xlsxCellXml("B2", 4, si(emp), "s"),
    xlsxCellXml("C2", 5, null, "empty"),
    xlsxCellXml("D2", 6, null, "empty"),
    xlsxCellXml("E2", 14, si(dateLabel), "s"),
    xlsxCellXml("F2", 14, null, "empty"),
    xlsxCellXml("G2", 1, null, "empty"),
    xlsxCellXml("H2", 1, null, "empty"),
  ]);
  pushRow(20.25, [
    xlsxCellXml("A3", 3, si("Захиалга авсан ажилтан:"), "s"),
    xlsxCellXml("B3", 4, si(""), "s"),
    xlsxCellXml("C3", 5, null, "empty"),
    xlsxCellXml("D3", 6, null, "empty"),
    xlsxCellXml("E3", 5, null, "empty"),
    xlsxCellXml("F3", 6, null, "empty"),
    xlsxCellXml("G3", 1, null, "empty"),
    xlsxCellXml("H3", 1, null, "empty"),
  ]);
  pushRow(16.5, [
    xlsxCellXml("A4", 6, null, "empty"),
    xlsxCellXml("B4", 4, si(""), "s"),
    xlsxCellXml("C4", 5, null, "empty"),
    xlsxCellXml("D4", 6, null, "empty"),
    xlsxCellXml("E4", 5, null, "empty"),
    xlsxCellXml("F4", 6, null, "empty"),
    xlsxCellXml("G4", 1, null, "empty"),
    xlsxCellXml("H4", 1, null, "empty"),
  ]);
  pushRow(16.5, [
    xlsxCellXml("A5", 6, null, "empty"),
    xlsxCellXml("B5", 6, null, "empty"),
    xlsxCellXml("C5", 5, null, "empty"),
    xlsxCellXml("D5", 6, null, "empty"),
    xlsxCellXml("E5", 5, null, "empty"),
    xlsxCellXml("F5", 6, null, "empty"),
    xlsxCellXml("G5", 1, null, "empty"),
    xlsxCellXml("H5", 1, null, "empty"),
  ]);
  pushRow(30.75, [
    xlsxCellXml("A6", 7, si("Барааны нэр төрөл"), "s"),
    xlsxCellXml("B6", 7, si("Хэмжих нэгж"), "s"),
    xlsxCellXml("C6", 7, si("Баркод"), "s"),
    xlsxCellXml("D6", 7, si("Багц"), "s"),
    xlsxCellXml("E6", 7, si("Ширхэг"), "s"),
    xlsxCellXml("F6", 7, si("Үлдэгдэл"), "s"),
  ]);
  for (const item of groups) {
    if (item.type === "cat") {
      const r = rowNum;
      merges.push(`A${r}:F${r}`);
      pushRow(24, [
        xlsxCellXml(`A${r}`, 15, si(item.name), "s"),
        xlsxCellXml(`B${r}`, 15, null, "empty"),
        xlsxCellXml(`C${r}`, 15, null, "empty"),
        xlsxCellXml(`D${r}`, 15, null, "empty"),
        xlsxCellXml(`E${r}`, 15, null, "empty"),
        xlsxCellXml(`F${r}`, 15, null, "empty"),
      ]);
      continue;
    }
    const p = item.product;
    const counted = countValue(p.id);
    const { packs, pieces } = pickerQtyToParts(counted, p);
    const r = rowNum;
    const packCell =
      packs > 0
        ? xlsxCellXml(`D${r}`, 10, String(packs), "n")
        : xlsxCellXml(`D${r}`, 10, null, "empty");
    const pieceCell =
      pieces > 0
        ? xlsxCellXml(`E${r}`, 10, String(pieces), "n")
        : xlsxCellXml(`E${r}`, 10, null, "empty");
    pushRow(15.75, [
      xlsxCellXml(`A${r}`, 8, si(p.name), "s"),
      xlsxCellXml(`B${r}`, 8, si(p.unit || "ш"), "s"),
      xlsxCellXml(`C${r}`, 9, si(p.barcode || ""), "s"),
      packCell,
      pieceCell,
      xlsxCellXml(`F${r}`, 8, String(counted), "n"),
    ]);
  }
  pushRow(47.25, [
    xlsxCellXml(`A${rowNum}`, 1, null, "empty"),
    xlsxCellXml(`B${rowNum}`, 1, null, "empty"),
    xlsxCellXml(`C${rowNum}`, 1, null, "empty"),
    xlsxCellXml(`D${rowNum}`, 1, null, "empty"),
    xlsxCellXml(`E${rowNum}`, 1, null, "empty"),
    xlsxCellXml(`F${rowNum}`, 1, null, "empty"),
  ]);
  rowNum += 1;
  pushRow(null, [
    xlsxCellXml(`A${rowNum}`, 1, null, "empty"),
    xlsxCellXml(`B${rowNum}`, 1, null, "empty"),
    xlsxCellXml(`C${rowNum}`, 1, null, "empty"),
    xlsxCellXml(`D${rowNum}`, 1, null, "empty"),
    xlsxCellXml(`E${rowNum}`, 1, null, "empty"),
    xlsxCellXml(`F${rowNum}`, 1, null, "empty"),
  ]);
  rowNum += 1;
  const sign1 = rowNum;
  merges.push(`A${sign1}:B${sign1}`, `C${sign1}:E${sign1}`);
  pushRow(null, [
    xlsxCellXml(`A${sign1}`, 17, si("Хүлээлгэн өгсөн ажилтан:"), "s"),
    xlsxCellXml(`B${sign1}`, 17, null, "empty"),
    xlsxCellXml(
      `C${sign1}`,
      18,
      si("/...................................................../"),
      "s",
    ),
    xlsxCellXml(`D${sign1}`, 18, null, "empty"),
    xlsxCellXml(`E${sign1}`, 18, null, "empty"),
  ]);
  rowNum += 1;
  const sign2 = rowNum;
  merges.push(`C${sign2}:E${sign2}`);
  pushRow(null, [
    xlsxCellXml(`A${sign2}`, 12, null, "empty"),
    xlsxCellXml(`B${sign2}`, 12, null, "empty"),
    xlsxCellXml(`C${sign2}`, 16, si("гарын үсэг"), "s"),
    xlsxCellXml(`D${sign2}`, 16, null, "empty"),
    xlsxCellXml(`E${sign2}`, 16, null, "empty"),
  ]);
  rowNum += 1;
  const sign3 = rowNum;
  merges.push(`A${sign3}:B${sign3}`, `C${sign3}:E${sign3}`);
  pushRow(null, [
    xlsxCellXml(`A${sign3}`, 17, si("Хүлээн авсан ажилтан:"), "s"),
    xlsxCellXml(`B${sign3}`, 17, null, "empty"),
    xlsxCellXml(
      `C${sign3}`,
      18,
      si("/...................................................../"),
      "s",
    ),
    xlsxCellXml(`D${sign3}`, 18, null, "empty"),
    xlsxCellXml(`E${sign3}`, 18, null, "empty"),
  ]);
  rowNum += 1;
  const sign4 = rowNum;
  merges.push(`C${sign4}:E${sign4}`);
  pushRow(null, [
    xlsxCellXml(`C${sign4}`, 16, si("гарын үсэг"), "s"),
    xlsxCellXml(`D${sign4}`, 16, null, "empty"),
    xlsxCellXml(`E${sign4}`, 16, null, "empty"),
  ]);
  const lastRow = rowNum;
  const mergeXml = merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("");
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:H${lastRow}"/><sheetViews><sheetView workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="13.5"/><cols><col min="1" max="1" width="25.12890625" customWidth="1"/><col min="2" max="2" width="12.74609375" customWidth="1"/><col min="3" max="3" width="13.73046875" customWidth="1"/><col min="4" max="4" width="7.35546875" customWidth="1"/><col min="5" max="5" width="8.08984375" customWidth="1"/><col min="6" max="6" width="14.5859375" customWidth="1"/></cols><sheetData>${rows.join("")}</sheetData><mergeCells count="${merges.length}">${mergeXml}</mergeCells><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
  return { sharedStringsXml: xlsxSharedStringsXml(strings), sheetXml };
}
const COUNT_SHEET_TEMPLATE =
  "/static/tomuda/templates/count-sheet-template.xls";
async function exportCountExcelXlsx() {
  if (typeof JSZip === "undefined") {
    throw new Error("JSZip missing");
  }
  const rows = countExcelRows();
  if (!rows.length) return alert("Тоолсон бараа байхгүй");
  const stamp = new Date().toISOString().slice(0, 10);
  const { sharedStringsXml, sheetXml } = buildCountSheetXml();
  const tpl = await fetch(COUNT_SHEET_TEMPLATE).then((r) => {
    if (!r.ok) throw new Error("template missing");
    return r.arrayBuffer();
  });
  const zip = await JSZip.loadAsync(tpl);
  zip.file("xl/sharedStrings.xml", sharedStringsXml);
  zip.file("xl/worksheets/sheet1.xml", sheetXml);
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `toollogo-${stamp}.xls`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function exportCountExcelFallback() {
  const rows = countExcelRows();
  if (!rows.length) return alert("Тоолсон бараа байхгүй");
  const stamp = new Date().toISOString().slice(0, 10);
  excel(`toollogo-${stamp}.csv`, [
    ["Бараа бэлдэх хуудас"],
    [`Агуулахын ажилтан: ${state.currentEmployee?.name || "-"}`],
    [countSheetDateLabel()],
    [],
    [
      "Барааны нэр төрөл",
      "Хэмжих нэгж",
      "Баркод",
      "Эхний үлдэгдэл",
      "Борлуулсан",
      "Зарлагдсан",
      "Эцсийн үлдэгдэл",
      "Зөрүү",
    ],
    ...rows.map(([barcode, name, , opening, sold, expended, final, diff]) => {
      const p = state.products.find(
        (x) => x.barcode === barcode || x.name === name,
      );
      return [
        name,
        p?.unit || "ш",
        barcode,
        opening,
        sold,
        expended,
        final,
        diff,
      ];
    }),
  ]);
}
function exportCountExcel() {
  if (!countExcelRows().length) return alert("Тоолсон бараа байхгүй");
  exportCountExcelXlsx().catch(() => exportCountExcelFallback());
}
function confirmCountExcel() {
  if (!state.countDone) return alert("Эхлээд тооллогоо дуусгана уу");
  if (!countExcelRows().length) return alert("Тоолсон бараа байхгүй");
  confirmDataExport("Excel татах", exportCountExcel);
}
function finishCount() {
  ensureCountSession();
  if (!Object.keys(state.countQty).some((id) => countValue(id) !== null)) {
    return alert("Тоолсон тоо оруулна уу");
  }
  state.countDone = true;
  render();
  confirmCountExcel();
}
function resetCountSession() {
  state.countQty = {};
  state.countDone = false;
  state.countSessionStartedAt = new Date().toISOString();
  snapshotCountOpeningStock();
  render();
}
function confirmNewCount() {
  const hasData =
    state.countDone ||
    Object.keys(state.countQty).some((id) => countValue(id) !== null);
  if (!hasData) {
    resetCountSession();
    return;
  }
  confirmModal(
    "Шинэ тооллого",
    "Та шинэ тооллого эхлүүлэх гэж байна уу? Одоогийн тооллогын өгөгдөл арилна.",
    {
      confirmLabel: "Тийм",
      danger: true,
      onConfirm: resetCountSession,
    },
  );
}
function setInventoryCategory(cat) {
  state.filters.inventoryCategory = cat;
  render();
  scrollAppMainToTop();
}
function setInventoryTab(tab) {
  state.filters.inventory = tab;
  render();
  scrollAppMainToTop();
}
function reportOrdersFiltered() {
  const day = state.filters.reportDate || "";
  let list = state.orders.filter((o) => o.status !== "cancelled");
  if (day) list = list.filter((o) => orderCreatedDay(o) === day);
  return list;
}
function reportDateFiltersHtml() {
  const day = state.filters.reportDate || "",
    today = todayIso(),
    hint = day ? `Захиалга: ${dte(day)}` : "Бүх захиалга";
  return `<div class="line-panel__toolbar report-date-filters"><button type="button" onclick="clearReportDate()" class="px-3 py-2 rounded text-sm ${!day ? "bg-primary text-primary-foreground" : "bg-secondary"}">Бүгд</button><button type="button" onclick="setReportDate('${today}')" class="px-3 py-2 rounded text-sm ${day === today ? "bg-primary text-primary-foreground" : "bg-secondary"}">Өнөөдөр</button><input type="date" value="${day}" onchange="setReportDate(this.value)" class="flex-1 min-w-[140px] px-3 py-2 bg-secondary rounded text-sm app-input" aria-label="Огноо сонгох"><span class="report-date-filters__hint">${hint}</span></div>`;
}
function clearReportDate() {
  state.filters.reportDate = "";
  render();
}
function setReportDate(day) {
  state.filters.reportDate = day || "";
  render();
}
function reportsView() {
  const orders = reportOrdersFiltered(),
    total = orders.reduce((s, o) => s + orderAmount(o), 0),
    paid = orders
      .filter((o) => orderIsPaid(o))
      .reduce((s, o) => s + orderAmount(o), 0),
    unpaid = total - paid;
  const sales = state.employees
    .filter((e) => e.role === "sales")
    .map((e) => {
      const empOrders = orders.filter((o) => o.employeeId === e.id);
      const sum = empOrders.reduce((s, o) => s + orderAmount(o), 0);
      return {
        ...e,
        count: empOrders.length,
        sum,
        commission: (sum * e.commissionRate) / 100,
      };
    });
  return `<div class="space-y-4">${pageHead("Тайлан", `<button onclick="confirmReportExport()" class="px-3 py-2 bg-primary text-primary-foreground rounded text-sm shrink-0">${EXCEL_FILE_DOWNLOAD}</button>`)}${reportDateFiltersHtml()}${metricsBar(`${card("Борлуулалт", fmt(total))}${card("Төлсөн", fmt(paid), "text-tone-success")}${card("Төлөөгүй", fmt(unpaid), "text-tone-danger")}`, 3)}<div class="line-panel"><div class="line-panel__section-title">Төлбөр</div><div class="line-list">${orders.length ? orders.map(paymentRow).join("") : `<div class="line-panel__empty">Захиалга байхгүй</div>`}</div></div><div class="line-panel"><div class="line-panel__section-title">Тооцооны үлдэгдэл</div><div class="line-list">${sales.map((e, i) => `<div class="line-list__row line-list__row--static"><span>${i + 1}. ${e.name}</span><b>${fmt(e.sum)}</b></div>`).join("")}</div></div>`;
}
function paymentRow(o) {
  const paid = orderIsPaid(o),
    amount = orderAmount(o),
    term = paymentTermLabel(o.paymentTerm),
    actions = paid
      ? ""
      : `<button type="button" onclick="confirmSetPaid('${esc(o.id)}')" class="px-3 py-2 rounded text-sm bg-primary text-primary-foreground">Тооцоо дууссан</button>`;
  return `<div class="line-list__row line-list__row--static payment-row"><div class="payment-row__main"><div class="payment-row__title-row"><span class="payment-row__customer">${esc(o.customerName)}</span>${receiptNo(o, "xs")}</div><p class="line-list__meta">${esc(o.employeeName || "-")} · ${term} · Хүргэлт ${dte(orderDeliveryDay(o))}</p></div><b class="line-list__amount">${fmt(amount)}</b><span class="text-sm font-medium ${paid ? "text-tone-success" : "text-tone-danger"}">${paid ? "Төлсөн" : "Төлөөгүй"}</span><div class="payment-row__actions">${actions}</div></div>`;
}
function confirmSetPaid(id) {
  const o = state.orders.find((x) => x.id === id);
  if (!o || orderIsPaid(o)) return;
  confirmModal(
    "Тооцоо баталгаажуулах",
    `<b>${esc(o.customerName)}</b> захиалгыг (<b>${fmt(orderAmount(o))}</b>) тооцоо дууссан болгох уу?`,
    {
      confirmLabel: "Тооцоо дууссан",
      onConfirm: () => setPaid(id, true),
    },
  );
}
function promotionTypeLabel(type) {
  return (
    {
      quantity: "Багцын хөнгөлөлт",
      price: "Нийт үнийн дүнгээс хөнгөлөлт олгох",
      payment: "Төлбөрийн урамшуулал",
    }[type] || "Урамшуулал"
  );
}
function promotionMenuHtml() {
  const items = [
    ["price", "Нийт үнийн дүнгээс хөнгөлөлт олгох"],
    ["quantity", "Багцын хөнгөлөлт"],
    ["payment", "Төлбөрийн урамшуулал"],
  ];
  return `<nav class="admin-menu promo-type-menu" aria-label="Урамшууллын төрөл">${items
    .map(([id, label]) => {
      const count = (state.promotionRules[id] || []).length;
      const badge = count
        ? `<span class="promo-type-menu__count">${count}</span>`
        : "";
      return `<button type="button" onclick="openPromotionPage('${id}')" class="admin-menu__item promo-type-menu__item"><span class="promo-type-menu__label">${esc(label)}</span>${badge}</button>`;
    })
    .join("")}</nav>`;
}
function openPromotionPage(type) {
  if (!["price", "quantity", "payment"].includes(type)) return;
  state.filters.promotionTab = type;
  state.filters.promotionDetail = type;
  render();
  pushAppHistory();
}
function promotionsView() {
  const detail = state.filters.promotionDetail;
  if (!detail) {
    return `<div class="space-y-4">${pageHead("Урамшуулал")}${promotionMenuHtml()}</div>`;
  }
  const qty = state.promotionRules.quantity || [],
    price = state.promotionRules.price || [],
    payment = state.promotionRules.payment || [],
    panel =
      detail === "quantity"
        ? promotionQuantityPanel(qty)
        : detail === "payment"
          ? promotionPaymentPanel(payment)
          : promotionPricePanel(price);
  return `<div class="space-y-4">${pageHead(promotionTypeLabel(detail))}${panel}</div>`;
}
function productLabel(id) {
  return state.products.find((p) => p.id === id)?.name || "-";
}
function promotionSearchQtyRow(searchInputHtml, qtyOpts) {
  const qtyHtml = qtyOpts
    ? promotionQtyField(qtyOpts.name, qtyOpts.label, qtyOpts.defaultValue, true)
    : "";
  return qtyHtml
    ? `<div class="promo-input-row">${searchInputHtml}${qtyHtml}</div>`
    : `<div class="mb-2">${searchInputHtml}</div>`;
}
function promoFormDraftVal(name, fallback = "") {
  const v = state.promoFormDraft?.[name];
  return v !== undefined && v !== null ? String(v) : String(fallback ?? "");
}
function capturePromoFormDraft() {
  const form = document.querySelector("[data-promo-modal]");
  if (!form) return;
  state.promoFormDraft = state.promoFormDraft || {};
  form.querySelectorAll("input[name]").forEach((el) => {
    if (el.type === "hidden" || el.type === "checkbox") return;
    state.promoFormDraft[el.name] = el.value;
  });
}
function promoFormDraftField(el) {
  state.promoFormDraft = state.promoFormDraft || {};
  let v = el.value;
  if (el.dataset.promoDigits === "1" || el.type === "tel") {
    v = v.replace(/\D/g, "");
    if (el.value !== v) el.value = v;
  }
  state.promoFormDraft[el.name] = v;
}
function promoAmountInputHtml(
  name,
  { required = false, placeholder = "", value = "" } = {},
) {
  const req = required ? " required" : "";
  const v = String(value ?? "").trim();
  const valAttr = v ? ` value="${esc(v)}"` : "";
  return `<input name="${name}" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-promo-digits="1"${req} placeholder="${esc(placeholder)}"${valAttr} oninput="promoFormDraftField(this)" class="w-full px-3 py-3 bg-secondary rounded app-input">`;
}
function jsStringArg(value) {
  return `'${esc(
    String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n"),
  )}'`;
}
function promoPickSearchKey(pickKey) {
  const map = {
    buyProductIds: "promo_buyProductIds",
    freeProductIds: "promo_freeProductIds",
    priceFreeProductIds: "promo_priceFreeProductIds",
    paymentFreeProductIds: "promo_paymentFreeProductIds",
  };
  return map[pickKey] || `promo_${pickKey}`;
}
function promoPickCategoryKey(pickKey) {
  return `${promoPickSearchKey(pickKey)}_category`;
}
function promoPickCategory(pickKey) {
  return state.searches[promoPickCategoryKey(pickKey)] || "all";
}
function promoFilteredProducts(pickKey, excludeIds = []) {
  const searchKey = promoPickSearchKey(pickKey),
    rawQ = (searchKey && state.searches[searchKey]) || "",
    q = rawQ.toLowerCase().trim(),
    category = promoPickCategory(pickKey),
    exclude = new Set(excludeIds.filter(Boolean));
  return state.products.filter((p) => {
    if (exclude.has(p.id)) return false;
    if (category !== "all" && p.category !== category) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      String(p.barcode || "").includes(q) ||
      String(p.category || "")
        .toLowerCase()
        .includes(q)
    );
  });
}
function promoCategoryFilterHtml(pickKey) {
  const active = promoPickCategory(pickKey);
  const btn = (value, label) =>
    `<button type="button" onclick="setPromoPickCategory(${jsStringArg(pickKey)},${jsStringArg(value)})" class="promo-category-chip ${active === value ? "is-active" : ""}">${esc(label)}</button>`;
  return `<div class="promo-category-scroll">${btn("all", "Бүх төрөл")}${cats()
    .map((cat) => btn(cat, cat))
    .join("")}</div>`;
}
function promoProductSearchListHtml({
  pickKey,
  selectedIds = [],
  excludeIds = [],
  addAction,
  selectedId = "",
}) {
  const exclude = [...excludeIds, ...selectedIds].filter(Boolean),
    products = promoFilteredProducts(pickKey, exclude),
    shown = products.slice(0, 40),
    more = Math.max(0, products.length - shown.length);
  if (!shown.length) {
    return `<p class="promo-product-empty">Бараа олдсонгүй</p>`;
  }
  return `<div class="promo-product-list promo-product-list--search">${shown
    .map((p) => {
      const onclick =
        addAction === "select"
          ? `selectPromoProduct(${jsStringArg(pickKey)},${jsStringArg(p.id)})`
          : `addPromoPickProduct(${jsStringArg(pickKey)},${jsStringArg(p.id)})`;
      return `<button type="button" onclick="${onclick}" class="promo-product-row ${selectedId === p.id ? "is-active" : ""}"><img src="${productImage(p)}" class="product-thumb" alt=""><div class="min-w-0 text-left"><p class="text-sm font-medium truncate">${esc(p.name)}</p><p class="text-xs text-muted-foreground">${esc(p.category)} · ${esc(p.barcode)}</p><p class="text-xs font-semibold text-primary mt-1">${fmt(p.price)} · үлд ${p.stock} ${esc(p.unit || "ш")}</p></div></button>`;
    })
    .join(
      "",
    )}${more ? `<p class="promo-product-more">+${more} бараа. Хайлтаа нарийсгана уу.</p>` : ""}</div>`;
}
function promotionProductPickerBlock(
  fieldName,
  title,
  selectedId = "",
  opts = null,
) {
  const variant = opts?.variant || "",
    excludeRaw = opts?.excludeIds || opts?.excludeId || "",
    excludeIds = new Set(
      (Array.isArray(excludeRaw) ? excludeRaw : [excludeRaw]).filter(Boolean),
    ),
    placeholder = opts?.placeholder || "Нэр, баркод бичээд хайна уу...",
    hint = opts?.hint || "",
    searchKey = promoPickSearchKey(fieldName),
    rawQ = state.searches[searchKey] || "",
    selected = state.products.find((p) => p.id === selectedId),
    duplicate = selectedId && excludeIds.has(selectedId),
    selectedHtml = selected
      ? `<div class="promo-product-list promo-product-list--selected">${promotionProductPickRow(selected, fieldName, selectedId)}</div>`
      : "",
    listHtml = promoProductSearchListHtml({
      pickKey: fieldName,
      excludeIds: [...excludeIds],
      addAction: "select",
      selectedId,
    }),
    searchInput = `<input data-promo-search="${fieldName}" value="${esc(rawQ)}" oninput="promoProductSearch('${fieldName}',this.value)" placeholder="${esc(placeholder)}" class="promo-search-input px-3 py-2 bg-secondary rounded text-sm">`,
    inputRow = promotionSearchQtyRow(searchInput, opts?.qty || null),
    badge = variant === "buy" ? "1" : variant === "free" ? "2" : "",
    head = badge
      ? `<div class="promo-section-head"><span class="promo-section-badge">${badge}</span><div><p class="promo-section-title">${title}</p>${hint ? `<p class="promo-section-hint">${hint}</p>` : ""}</div></div>`
      : `<span class="block text-sm font-medium mb-2">${title}</span>`,
    warn = duplicate
      ? `<p class="promo-section-warn">Энэ барааг аль хэдийн нөгөө талд сонгосон байна. Өөр бараа сонгоно уу.</p>`
      : "";
  return `<div class="promo-section${variant ? ` promo-section--${variant}` : ""}"><div class="promo-product-block"><input type="hidden" name="${fieldName}" id="promo-${fieldName}" value="${esc(selectedId)}" required>${head}${inputRow}${promoCategoryFilterHtml(fieldName)}${warn}${selectedHtml}${listHtml}</div></div>`;
}
function promoSectionArrow() {
  return `<div class="promo-section-arrow" aria-hidden="true"><span class="promo-section-arrow-icon"><svg class="ui-icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg></span><span class="promo-section-arrow-text">үнэгүй өгнө</span></div>`;
}
function promotionQtyField(name, label, defaultValue, inline = false) {
  const draftVal = promoFormDraftVal(name, "");
  const val = draftVal !== "" ? ` value="${esc(draftVal)}"` : "";
  const ph =
    defaultValue !== undefined && defaultValue !== ""
      ? String(defaultValue)
      : "1";
  const cls = inline
    ? "promo-qty-field promo-qty-field--inline"
    : "promo-qty-field";
  const wrap = inline ? "" : `<div class="promo-qty-inline">`;
  const wrapEnd = inline ? "" : `</div>`;
  const labelHtml = inline
    ? ""
    : `<span class="block text-xs text-muted-foreground mb-1">${label}</span>`;
  const aria = inline ? ` aria-label="${label}"` : "";
  return `${wrap}<label class="${cls}">${labelHtml}<input name="${name}" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-promo-digits="1" required${val} placeholder="${esc(ph)}"${aria} oninput="promoFormDraftField(this)" class="promo-qty-input bg-secondary rounded"></label>${wrapEnd}`;
}
function promotionProductPickRow(p, fieldName, selectedId) {
  const active = selectedId === p.id;
  return `<button type="button" onclick="selectPromoProduct('${fieldName}','${p.id}')" class="promo-product-row ${active ? "is-active" : ""}"><img src="${productImage(p)}" class="product-thumb" alt=""><div class="min-w-0 text-left"><p class="text-sm font-medium truncate">${p.name}</p><p class="text-xs text-muted-foreground">${p.category} · ${p.barcode}</p><p class="text-xs font-semibold text-primary mt-1">${fmt(p.price)} · үлд ${p.stock} ${p.unit}</p></div></button>`;
}
function promotionBuyProductIds(rule) {
  if (Array.isArray(rule.buyProductIds) && rule.buyProductIds.length) {
    return rule.buyProductIds.filter(Boolean);
  }
  if (rule.buyProductId) return [rule.buyProductId];
  return [];
}
function promotionFreeProductIds(rule) {
  if (Array.isArray(rule.freeProductIds) && rule.freeProductIds.length) {
    return rule.freeProductIds.filter(Boolean);
  }
  if (rule.freeProductId) return [rule.freeProductId];
  return [];
}
function promotionPickIds(pick, key) {
  const raw = pick?.[key];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (key === "freeProductIds" && pick?.freeProductId)
    return [pick.freeProductId];
  if (key === "priceFreeProductIds" && pick?.priceFreeProductId) {
    return [pick.priceFreeProductId];
  }
  if (key === "paymentFreeProductIds" && pick?.paymentFreeProductId) {
    return [pick.paymentFreeProductId];
  }
  return [];
}
function promotionProductLabels(ids) {
  return (Array.isArray(ids) ? ids : [])
    .map((id) => productLabel(id))
    .filter(Boolean)
    .join(", ");
}
function promotionMultiProductPickerBlock({
  pickKey,
  fieldName,
  selectedIds,
  excludeIds = [],
  title,
  hint,
  placeholder,
  variant = "",
  badge = "",
  qty = null,
}) {
  const ids = Array.isArray(selectedIds) ? selectedIds : [],
    exclude = new Set([...excludeIds, ...ids].filter(Boolean)),
    searchKey = promoPickSearchKey(pickKey),
    rawQ = (searchKey && state.searches[searchKey]) || "",
    selectedProducts = ids
      .map((id) => state.products.find((p) => p.id === id))
      .filter(Boolean),
    selectedHtml = selectedProducts.length
      ? `<div class="promo-product-list promo-product-list--selected">${selectedProducts.map((p) => `<div class="promo-product-row promo-product-row--selected"><img src="${productImage(p)}" class="product-thumb" alt=""><div class="min-w-0 flex-1"><p class="text-sm font-medium truncate">${esc(p.name)}</p><p class="text-xs text-muted-foreground">${esc(p.category)}</p></div><button type="button" onclick="removePromoPickProduct('${pickKey}','${esc(p.id)}')" class="promo-product-row__remove" aria-label="Хасах">×</button></div>`).join("")}</div>`
      : `<p class="promo-section-hint">Хайлтаар бараа нэмнэ</p>`,
    searchHtml = promoProductSearchListHtml({
      pickKey,
      selectedIds: ids,
      excludeIds: [...exclude],
      addAction: "add",
    }),
    hiddenInputs = ids
      .map(
        (id) => `<input type="hidden" name="${fieldName}" value="${esc(id)}">`,
      )
      .join(""),
    searchInput = `<input data-promo-pick="${pickKey}" value="${esc(rawQ)}" oninput="promoPickSearch('${pickKey}',this.value)" placeholder="${esc(placeholder)}" class="promo-search-input px-3 py-2 bg-secondary rounded text-sm">`,
    head = badge
      ? `<div class="promo-section-head"><span class="promo-section-badge">${badge}</span><div><p class="promo-section-title">${title}</p>${hint ? `<p class="promo-section-hint">${hint}</p>` : ""}</div></div>`
      : `<span class="block text-sm font-medium mb-2">${title}</span>`;
  return `<div class="promo-section${variant ? ` promo-section--${variant}` : ""}"><div class="promo-product-block">${hiddenInputs}${head}${promotionSearchQtyRow(searchInput, qty)}${promoCategoryFilterHtml(pickKey)}${selectedHtml}${searchHtml}</div></div>`;
}
function promotionMultiBuyPickerBlock(selectedIds, freeIds) {
  const freeList = Array.isArray(freeIds) ? freeIds : freeIds ? [freeIds] : [];
  return promotionMultiProductPickerBlock({
    pickKey: "buyProductIds",
    fieldName: "buyProductIds",
    selectedIds,
    excludeIds: freeList,
    title: "Авах бараа",
    hint: "Олон бараа сонгож болно · нийт тоо шалгана",
    placeholder: "Бараа хайж нэмэх...",
    variant: "buy",
    badge: "1",
    qty: { name: "buyQty", label: "Ширхэг" },
  });
}
function promotionMultiFreePickerBlock({
  pickKey,
  fieldName,
  selectedIds,
  excludeIds = [],
  title,
  hint,
  placeholder,
  badge,
  qty,
}) {
  return promotionMultiProductPickerBlock({
    pickKey,
    fieldName,
    selectedIds,
    excludeIds,
    title,
    hint,
    placeholder,
    variant: "free",
    badge,
    qty,
  });
}
function promoPickSearch(pickKey, value) {
  const key = promoPickSearchKey(pickKey);
  if (!key) return;
  state.searches[key] = value;
  refreshPromoModal();
  if (value.trim()) {
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-promo-pick="${pickKey}"]`);
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }
}
function setPromoPickCategory(pickKey, category) {
  state.searches[promoPickCategoryKey(pickKey)] = category || "all";
  refreshPromoModal();
}
function promoBuyProductSearch(value) {
  promoPickSearch("buyProductIds", value);
}
function promoPickConflict(pickKey, id) {
  const pick = state.promoPick || {};
  if (pickKey === "buyProductIds") {
    const freeIds = promotionPickIds(pick, "freeProductIds");
    if (freeIds.includes(id)) {
      return "Үнэгүй өгөх бараатай ижил байж болохгүй.";
    }
  }
  if (pickKey === "freeProductIds") {
    const buyIds = promotionPickIds(pick, "buyProductIds");
    if (buyIds.includes(id)) {
      return "Авах бараатай ижил байж болохгүй. Өөр бараа сонгоно уу.";
    }
  }
  return "";
}
function addPromoPickProduct(pickKey, id) {
  const conflict = promoPickConflict(pickKey, id);
  if (conflict) return alert(conflict);
  const pick = state.promoPick || {},
    ids = [...promotionPickIds(pick, pickKey)];
  if (ids.includes(id)) return;
  state.promoPick = { ...pick, [pickKey]: [...ids, id] };
  const searchKey = promoPickSearchKey(pickKey);
  if (searchKey) state.searches[searchKey] = "";
  refreshPromoModal();
}
function removePromoPickProduct(pickKey, id) {
  const pick = state.promoPick || {},
    ids = promotionPickIds(pick, pickKey).filter((x) => x !== id);
  state.promoPick = { ...pick, [pickKey]: ids };
  refreshPromoModal();
}
function addPromoBuyProduct(id) {
  addPromoPickProduct("buyProductIds", id);
}
function removePromoBuyProduct(id) {
  removePromoPickProduct("buyProductIds", id);
}
function promoProductSearch(fieldName, value) {
  promoPickSearch(fieldName, value);
}
function refreshPromoModal() {
  capturePromoFormDraft();
  if (state.promoModalKind === "price") promotionPriceModal();
  else if (state.promoModalKind === "payment") promotionPaymentModal();
  else promotionQtyModal();
}
function selectPromoProduct(fieldName, id) {
  addPromoPickProduct(fieldName, id);
}
function promotionQtyRuleText(r) {
  const buyIds = promotionBuyProductIds(r),
    freeIds = promotionFreeProductIds(r);
  if (buyIds.length && freeIds.length) {
    const buyNames = promotionProductLabels(buyIds),
      freeNames = promotionProductLabels(freeIds);
    return `${buyNames}-аас нийт ${r.buyQty} ш авахад → ${freeNames} ${r.freeQty || 1} ш үнэгүй`;
  }
  return `${r.minQty || 0} ширхэг · ${r.discountPercent || 0}% (хуучин дүрэм)`;
}
function promotionQuantityPanel(rows) {
  return `<div class="space-y-3"><p class="text-sm text-muted-foreground">Сонгосон бараануудаас нийт тодорхой тоо авахад өөр барааг үнэгүй өгнө.</p><button onclick="openPromotionQtyModal()" class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Дүрэм нэмэх</button><div class="bg-card rounded overflow-hidden divide-y divide-border">${rows.length ? rows.map((r, i) => promotionQtyRuleCard(r, i)).join("") : `<div class="p-6 text-sm text-muted-foreground">Багцын хөнгөлөлтийн дүрэм байхгүй</div>`}</div></div>`;
}
function promotionQtyRuleCard(r, i) {
  const buyIds = promotionBuyProductIds(r),
    buyProducts = buyIds
      .map((id) => state.products.find((p) => p.id === id))
      .filter(Boolean),
    freeProducts = promotionFreeProductIds(r)
      .map((id) => state.products.find((p) => p.id === id))
      .filter(Boolean),
    buyLabel =
      buyProducts.length > 2
        ? `${buyProducts
            .slice(0, 2)
            .map((p) => p.name)
            .join(", ")} +${buyProducts.length - 2}`
        : buyProducts.map((p) => p.name).join(", ") || "-",
    freeLabel =
      freeProducts.length > 2
        ? `${freeProducts
            .slice(0, 2)
            .map((p) => p.name)
            .join(", ")} +${freeProducts.length - 2}`
        : freeProducts.map((p) => p.name).join(", ") || "-",
    buyThumbs = buyProducts
      .slice(0, 3)
      .map(
        (p) =>
          `<img src="${productImage(p)}" class="product-thumb promo-qty-rule-thumb" alt="">`,
      )
      .join(""),
    freeThumbs = freeProducts
      .slice(0, 3)
      .map(
        (p) =>
          `<img src="${productImage(p)}" class="product-thumb promo-qty-rule-thumb" alt="">`,
      )
      .join("");
  return `<div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"><div class="flex items-center gap-3 min-w-0 flex-1"><div class="promo-qty-rule-buys">${buyThumbs}</div><div class="min-w-0"><p class="text-xs text-muted-foreground">Дүрэм ${i + 1}</p><p class="font-medium truncate">${esc(buyLabel)}</p><p class="text-muted-foreground">нийт ${r.buyQty} ш авахад</p></div><span class="text-muted-foreground shrink-0">→</span><div class="promo-qty-rule-buys">${freeThumbs}</div><div class="min-w-0"><p class="font-medium truncate">${esc(freeLabel)}</p><p class="text-tone-success">${r.freeQty || 1} ш үнэгүй</p></div></div>${canDelete() ? `<button onclick="confirmRemovePromotionRule('quantity',${i})" class="px-3 py-2 tone tone--danger rounded text-sm shrink-0">Устгах</button>` : ""}</div>`;
}
function promotionPriceRuleText(r) {
  if (r.minAmount == null && r.discountPercent && !r.freeProductId) {
    return `${r.category ? "Ангилал: " + r.category + " · " : "Бүх ангилал · "}${r.discountPercent}% (хуучин дүрэм)`;
  }
  const min = fmt(Number(r.minAmount) || 0),
    max = Number(r.maxAmount) > 0 ? fmt(Number(r.maxAmount)) : "",
    range = max ? `${min} – ${max}` : `${min}-с дээш`;
  if (
    r.type === "percent" ||
    (r.discountPercent && !promotionFreeProductIds(r).length)
  ) {
    return `${range} · ${r.discountPercent}% хөнгөлөлт`;
  }
  const freeNames = promotionProductLabels(promotionFreeProductIds(r));
  return `${range} · ${freeNames || "-"} ${r.freeQty || 1} ш үнэгүй`;
}
function promotionPricePanel(rows) {
  const sorted = [...rows].sort(
    (a, b) => (Number(a.minAmount) || 0) - (Number(b.minAmount) || 0),
  );
  return `<div class="space-y-3"><p class="text-sm text-muted-foreground">Захиалгын нийт дүнгийн хүрээнд үнэгүй бараа эсвэл хувийн хөнгөлөлт олгоно.</p><button onclick="openPromotionPriceModal()" class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Дүрэм нэмэх</button><div class="bg-card rounded overflow-hidden divide-y divide-border">${sorted.length ? sorted.map((r, i) => promotionPriceRuleCard(r, rows.indexOf(r))).join("") : `<div class="p-6 text-sm text-muted-foreground">Нийт үнийн дүнгийн хөнгөлөлтийн дүрэм байхгүй</div>`}</div></div>`;
}
function promotionPaymentRuleText(r) {
  const term = r.paymentTerm === "credit" ? "Дансаар" : "Бэлнээр",
    min = Number(r.minAmount) || 0,
    minText = min > 0 ? ` · ${fmt(min)}-с дээш` : "";
  if (
    r.type === "percent" ||
    (r.discountPercent && !promotionFreeProductIds(r).length)
  ) {
    return `${term}${minText} · ${r.discountPercent}% хөнгөлөлт`;
  }
  const freeNames = promotionProductLabels(promotionFreeProductIds(r));
  return `${term}${minText} · ${freeNames || "-"} ${r.freeQty || 1} ш үнэгүй`;
}
function promotionPaymentPanel(rows) {
  return `<div class="space-y-3"><p class="text-sm text-muted-foreground">Төлбөрийн хэлбэр (бэлэн эсвэл дансаар) сонгосон үед хөнгөлөлт эсвэл үнэгүй бараа олгоно.</p><button onclick="openPromotionPaymentModal()" class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Дүрэм нэмэх</button><div class="bg-card rounded overflow-hidden divide-y divide-border">${rows.length ? rows.map((r, i) => promotionPaymentRuleCard(r, i)).join("") : `<div class="p-6 text-sm text-muted-foreground">Төлбөрийн урамшууллын дүрэм байхгүй</div>`}</div></div>`;
}
function promotionPaymentRuleCard(r, i) {
  return `<div class="p-4 flex justify-between gap-3 text-sm"><div class="min-w-0"><p class="font-medium">Дүрэм ${i + 1}</p><p class="text-muted-foreground mt-1">${promotionPaymentRuleText(r)}</p></div>${canDelete() ? `<button onclick="confirmRemovePromotionRule('payment',${i})" class="px-3 py-2 tone tone--danger rounded text-sm shrink-0">Устгах</button>` : ""}</div>`;
}
function promotionPriceRuleCard(r, i) {
  return `<div class="p-4 flex justify-between gap-3 text-sm"><div class="min-w-0"><p class="font-medium">Дүрэм ${i + 1}</p><p class="text-muted-foreground mt-1">${promotionPriceRuleText(r)}</p></div>${canDelete() ? `<button onclick="confirmRemovePromotionRule('price',${i})" class="px-3 py-2 tone tone--danger rounded text-sm shrink-0">Устгах</button>` : ""}</div>`;
}
function openPromotionQtyModal() {
  state.promoModalKind = "qty";
  state.promoPick = { buyProductIds: [], freeProductIds: [] };
  state.promoFormDraft = {};
  state.searches.promo_buyProductIds = "";
  state.searches.promo_freeProductIds = "";
  state.searches.promo_buyProductIds_category = "all";
  state.searches.promo_freeProductIds_category = "all";
  promotionQtyModal();
}
function promotionQtyModal() {
  state.promoModalKind = "qty";
  state.promoPick = state.promoPick || {
    buyProductIds: [],
    freeProductIds: [],
  };
  if (!Array.isArray(state.promoPick.buyProductIds)) {
    state.promoPick.buyProductIds = state.promoPick.buyProductId
      ? [state.promoPick.buyProductId]
      : [];
  }
  if (!Array.isArray(state.promoPick.freeProductIds)) {
    state.promoPick.freeProductIds = promotionPickIds(
      state.promoPick,
      "freeProductIds",
    );
  }
  const buyIds = state.promoPick.buyProductIds,
    freeIds = state.promoPick.freeProductIds;
  box(
    "Багцын хөнгөлөлт",
    `<form data-promo-modal="qty" onsubmit="savePromotionQty(event)" class="p-5 flex flex-col max-h-[85vh]"><div class="modal-scroll overflow-y-auto space-y-3 flex-1">${promotionMultiBuyPickerBlock(buyIds, freeIds)}${promoSectionArrow()}${promotionMultiFreePickerBlock({ pickKey: "freeProductIds", fieldName: "freeProductIds", selectedIds: freeIds, excludeIds: buyIds, title: "Үнэгүй өгөх бараа", hint: "Олон бараа сонгож болно", placeholder: "Үнэгүй бараа хайж нэмэх...", badge: "2", qty: { name: "freeQty", label: "Ширхэг", defaultValue: "1" } })}</div><div class="pt-4 mt-2 border-t border-border"><button class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">Хадгалах</button></div></form>`,
    "max-w-2xl",
  );
}
function openPromotionPriceModal() {
  state.promoModalKind = "price";
  state.promoPriceRuleType = "free";
  state.promoPick = { priceFreeProductIds: [] };
  state.promoFormDraft = {};
  state.searches.promo_priceFreeProductIds = "";
  state.searches.promo_priceFreeProductIds_category = "all";
  promotionPriceModal();
}
function setPromotionPriceRuleType(type) {
  capturePromoFormDraft();
  state.promoPriceRuleType = type === "percent" ? "percent" : "free";
  promotionPriceModal();
}
function promotionPriceModal() {
  state.promoModalKind = "price";
  state.promoPick = state.promoPick || {};
  if (!Array.isArray(state.promoPick.priceFreeProductIds)) {
    state.promoPick.priceFreeProductIds = promotionPickIds(
      state.promoPick,
      "priceFreeProductIds",
    );
  }
  const type = state.promoPriceRuleType === "percent" ? "percent" : "free",
    freeIds = state.promoPick.priceFreeProductIds || [],
    typeToggle = `<div class="seg-tabs promo-type-tabs"><button type="button" onclick="setPromotionPriceRuleType('free')" class="seg-tab ${type === "free" ? "is-active" : ""}">Үнэгүй бараа</button><button type="button" onclick="setPromotionPriceRuleType('percent')" class="seg-tab ${type === "percent" ? "is-active" : ""}">Хувийн хөнгөлөлт</button></div>`,
    amountFields = `<div class="grid grid-cols-2 gap-3"><label class="block"><span class="block text-sm font-medium mb-2">Доод дүн (₮)</span>${promoAmountInputHtml("minAmount", { required: true, placeholder: "200000", value: promoFormDraftVal("minAmount") })}</label><label class="block"><span class="block text-sm font-medium mb-2">Дээд дүн (₮)</span>${promoAmountInputHtml("maxAmount", { placeholder: "400000", value: promoFormDraftVal("maxAmount") })}<span class="text-xs text-muted-foreground mt-1 block">Хоосон = хязгааргүй</span></label></div>`,
    freeBlock =
      type === "free"
        ? promotionMultiFreePickerBlock({
            pickKey: "priceFreeProductIds",
            fieldName: "priceFreeProductIds",
            selectedIds: freeIds,
            title: "Үнэгүй өгөх бараа",
            hint: "Олон бараа сонгож болно",
            placeholder: "Бараа хайж нэмэх...",
            qty: { name: "freeQty", label: "Ширхэг", defaultValue: "1" },
          })
        : "",
    percentBlock =
      type === "percent"
        ? `<label class="block"><span class="block text-sm font-medium mb-2">Хөнгөлөлтийн хувь (%)</span>${promoAmountInputHtml("discountPercent", { required: true, placeholder: "5", value: promoFormDraftVal("discountPercent") })}</label>`
        : "";
  box(
    "Нийт үнийн дүнгээс хөнгөлөлт олгох",
    `<form data-promo-modal="price" onsubmit="savePromotionPrice(event)" class="p-5 flex flex-col max-h-[85vh]"><input type="hidden" name="type" value="${type}"><div class="modal-scroll overflow-y-auto space-y-4 flex-1">${amountFields}${typeToggle}${freeBlock}${percentBlock}</div><div class="pt-4 mt-2 border-t border-border"><button class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">Хадгалах</button></div></form>`,
    "max-w-2xl",
  );
}
function openPromotionPaymentModal() {
  state.promoModalKind = "payment";
  state.promoPaymentRuleType = "free";
  state.promoPaymentTerm = "cash";
  state.promoPick = { paymentFreeProductIds: [] };
  state.promoFormDraft = {};
  state.searches.promo_paymentFreeProductIds = "";
  state.searches.promo_paymentFreeProductIds_category = "all";
  promotionPaymentModal();
}
function setPromotionPaymentRuleType(type) {
  capturePromoFormDraft();
  state.promoPaymentRuleType = type === "percent" ? "percent" : "free";
  promotionPaymentModal();
}
function setPromotionPaymentTerm(term) {
  capturePromoFormDraft();
  state.promoPaymentTerm = term === "credit" ? "credit" : "cash";
  promotionPaymentModal();
}
function promotionPaymentModal() {
  state.promoModalKind = "payment";
  state.promoPick = state.promoPick || {};
  if (!Array.isArray(state.promoPick.paymentFreeProductIds)) {
    state.promoPick.paymentFreeProductIds = promotionPickIds(
      state.promoPick,
      "paymentFreeProductIds",
    );
  }
  const term = state.promoPaymentTerm === "credit" ? "credit" : "cash",
    type = state.promoPaymentRuleType === "percent" ? "percent" : "free",
    freeIds = state.promoPick.paymentFreeProductIds || [],
    termToggle = `<div class="seg-tabs"><button type="button" onclick="setPromotionPaymentTerm('cash')" class="seg-tab ${term === "cash" ? "is-active" : ""}">Бэлнээр</button><button type="button" onclick="setPromotionPaymentTerm('credit')" class="seg-tab ${term === "credit" ? "is-active" : ""}">Дансаар</button></div>`,
    typeToggle = `<div class="seg-tabs promo-type-tabs"><button type="button" onclick="setPromotionPaymentRuleType('free')" class="seg-tab ${type === "free" ? "is-active" : ""}">Үнэгүй бараа</button><button type="button" onclick="setPromotionPaymentRuleType('percent')" class="seg-tab ${type === "percent" ? "is-active" : ""}">Хувь тооцох</button></div>`,
    minField = `<label class="block"><span class="block text-sm font-medium mb-2">Доод дүн (₮)</span>${promoAmountInputHtml("minAmount", { placeholder: "0", value: promoFormDraftVal("minAmount") })}<span class="text-xs text-muted-foreground mt-1 block">Хоосон = хязгааргүй</span></label>`,
    freeBlock =
      type === "free"
        ? promotionMultiFreePickerBlock({
            pickKey: "paymentFreeProductIds",
            fieldName: "paymentFreeProductIds",
            selectedIds: freeIds,
            title: "Үнэгүй өгөх бараа",
            hint: "Олон бараа сонгож болно",
            placeholder: "Бараа хайх...",
            qty: { name: "freeQty", label: "Ширхэг", defaultValue: "1" },
          })
        : "",
    percentBlock =
      type === "percent"
        ? `<label class="block"><span class="block text-sm font-medium mb-2">Хөнгөлөлтийн хувь (%)</span>${promoAmountInputHtml("discountPercent", { required: true, placeholder: "5", value: promoFormDraftVal("discountPercent") })}</label>`
        : "";
  box(
    "Төлбөрийн урамшуулал",
    `<form data-promo-modal="payment" onsubmit="savePromotionPayment(event)" class="p-5 flex flex-col max-h-[85vh]"><input type="hidden" name="type" value="${type}"><input type="hidden" name="paymentTerm" value="${term}"><div class="modal-scroll overflow-y-auto space-y-4 flex-1">${termToggle}${minField}${typeToggle}${freeBlock}${percentBlock}</div><div class="pt-4 mt-2 border-t border-border"><button class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">Хадгалах</button></div></form>`,
    "max-w-2xl",
  );
}
function savePromotionQty(e) {
  e.preventDefault();
  const f = new FormData(e.target),
    buyProductIds = f.getAll("buyProductIds").filter(Boolean),
    freeProductIds = f.getAll("freeProductIds").filter(Boolean);
  if (!buyProductIds.length || !freeProductIds.length)
    return alert("Авах болон үнэгүй бараа сонгоно уу");
  if (buyProductIds.some((id) => freeProductIds.includes(id)))
    return alert("Авах болон үнэгүй бараа өөр байх ёстой");
  state.promotionRules.quantity.push({
    buyProductIds,
    buyQty: Number(f.get("buyQty")),
    freeProductIds,
    freeProductId: freeProductIds[0],
    freeQty: Number(f.get("freeQty")) || 1,
  });
  state.promoPick = null;
  state.promoFormDraft = null;
  state.promoModalKind = "";
  state.searches.promo_buyProductIds = "";
  state.searches.promo_freeProductIds = "";
  state.searches.promo_buyProductIds_category = "all";
  state.searches.promo_freeProductIds_category = "all";
  closeModal();
  render();
}
function matchingPricePromotionRule(gross) {
  let best = null;
  (state.promotionRules.price || []).forEach((r) => {
    if (r.minAmount == null) return;
    const min = Number(r.minAmount) || 0,
      max = Number(r.maxAmount) || 0;
    if (gross < min) return;
    if (max > 0 && gross > max) return;
    if (!best || min > (Number(best.minAmount) || 0)) best = r;
  });
  return best;
}
function pricePromotionDiscountAmount(gross, rule) {
  if (!rule) return 0;
  const isPercent =
    rule.type === "percent" ||
    (rule.discountPercent && !promotionFreeProductIds(rule).length);
  if (!isPercent) return 0;
  return Math.round((gross * Number(rule.discountPercent || 0)) / 100);
}
function appendPromoFreeLines(result, freeIds, freeQty, extra = {}) {
  const grant = Number(freeQty) || 1;
  (Array.isArray(freeIds) ? freeIds : []).forEach((freeId) => {
    const product = state.products.find((p) => p.id === freeId);
    if (!product) return;
    const existing = result.find(
      (l) => l.productId === freeId && l.isPromoFree,
    );
    if (existing) {
      existing.quantity += grant;
    } else {
      result.push({
        productId: freeId,
        productName: product.name,
        quantity: grant,
        price: 0,
        total: 0,
        isPromoFree: true,
        ...extra,
      });
    }
  });
  return result;
}
function applyPricePromotions(lines, gross) {
  const rule = matchingPricePromotionRule(gross);
  if (!rule) return lines;
  const freeIds = promotionFreeProductIds(rule);
  const isFree =
    rule.type === "free" || (freeIds.length && !rule.discountPercent);
  if (!isFree) return lines;
  const result = lines.map((line) => ({ ...line }));
  return appendPromoFreeLines(result, freeIds, rule.freeQty, {
    isPricePromo: true,
  });
}
function matchingPaymentPromotionRule(gross, paymentTerm) {
  let best = null;
  (state.promotionRules.payment || []).forEach((r) => {
    if (r.paymentTerm !== paymentTerm) return;
    const min = Number(r.minAmount) || 0;
    if (gross < min) return;
    if (!best || min > (Number(best.minAmount) || 0)) best = r;
  });
  return best;
}
function paymentPromotionDiscountAmount(gross, rule) {
  if (!rule) return 0;
  const isPercent =
    rule.type === "percent" ||
    (rule.discountPercent && !promotionFreeProductIds(rule).length);
  if (!isPercent) return 0;
  return Math.round((gross * Number(rule.discountPercent || 0)) / 100);
}
function applyPaymentPromotions(lines, gross, paymentTerm) {
  const rule = matchingPaymentPromotionRule(gross, paymentTerm);
  if (!rule) return lines;
  const freeIds = promotionFreeProductIds(rule);
  const isFree =
    rule.type === "free" || (freeIds.length && !rule.discountPercent);
  if (!isFree) return lines;
  const result = lines.map((line) => ({ ...line }));
  return appendPromoFreeLines(result, freeIds, rule.freeQty, {
    isPaymentPromo: true,
  });
}
function workerPaidLines() {
  return state.products
    .map((p) => {
      const q = getWorkerQty(p.id);
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
function workerPaidProductsInCart() {
  return state.products
    .map((p) => ({ ...p, qty: getWorkerQty(p.id) }))
    .filter((p) => p.qty > 0);
}
function applyQuantityPromotions(lines) {
  const result = lines.map((line) => ({ ...line }));
  const qtyByProduct = {};
  result.forEach((line) => {
    qtyByProduct[line.productId] =
      (qtyByProduct[line.productId] || 0) + line.quantity;
  });
  (state.promotionRules.quantity || []).forEach((rule) => {
    const buyIds = promotionBuyProductIds(rule),
      freeIds = promotionFreeProductIds(rule),
      buyQty = Number(rule.buyQty) || 0,
      freeQty = Number(rule.freeQty) || 1;
    if (!buyIds.length || !freeIds.length || buyQty < 1) return;
    const combinedQty = buyIds.reduce(
      (sum, id) => sum + (qtyByProduct[id] || 0),
      0,
    );
    const sets = Math.floor(combinedQty / buyQty);
    if (sets < 1) return;
    const grant = sets * freeQty;
    freeIds.forEach((freeId) => {
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
    });
  });
  return result;
}
function workerOrderLines() {
  const paid = workerPaidLines(),
    gross = paid.reduce((s, l) => s + l.total, 0);
  return applyPaymentPromotions(
    applyPricePromotions(applyQuantityPromotions(paid), gross),
    gross,
    state.paymentTerm,
  );
}
function workerCartSummary() {
  const paid = workerPaidLines(),
    gross = paid.reduce((s, l) => s + l.total, 0),
    priceRule = matchingPricePromotionRule(gross),
    paymentRule = matchingPaymentPromotionRule(gross, state.paymentTerm),
    pricePromoDiscount = pricePromotionDiscountAmount(gross, priceRule),
    paymentPromoDiscount = paymentPromotionDiscountAmount(gross, paymentRule),
    all = workerOrderLines(),
    promo = all.filter((l) => l.isPromoFree),
    employeeDiscount = workerPercentDiscountActive()
      ? Math.round((gross * percentDiscountRate()) / 100)
      : 0,
    discount = Math.min(
      gross,
      employeeDiscount + pricePromoDiscount + paymentPromoDiscount,
    );
  return {
    paid,
    all,
    promo,
    gross,
    priceRule,
    paymentRule,
    pricePromoDiscount,
    paymentPromoDiscount,
    employeeDiscount,
    discount,
    total: gross - discount,
    skuCount: paid.length,
    pieceQty: all.reduce((s, l) => s + l.quantity, 0),
  };
}
function savePromotionPrice(e) {
  e.preventDefault();
  const form = new FormData(e.target),
    f = Object.fromEntries(form),
    minAmount = Number(f.minAmount),
    maxAmount = Number(f.maxAmount) || 0;
  if (!Number.isFinite(minAmount) || minAmount < 0)
    return alert("Доод дүн оруулна уу");
  if (maxAmount > 0 && maxAmount <= minAmount)
    return alert("Дээд дүн доод дүнээс их байх ёстой");
  const type = f.type === "percent" ? "percent" : "free",
    rule = { minAmount, maxAmount, type };
  if (type === "free") {
    const freeProductIds = form.getAll("priceFreeProductIds").filter(Boolean);
    if (!freeProductIds.length) return alert("Үнэгүй бараа сонгоно уу");
    rule.freeProductIds = freeProductIds;
    rule.freeProductId = freeProductIds[0];
    rule.freeQty = Number(f.freeQty) || 1;
  } else {
    const pct = Number(f.discountPercent);
    if (!pct || pct < 1 || pct > 100)
      return alert("Хөнгөлөлтийн хувь 1-100 хооронд байна");
    rule.discountPercent = pct;
  }
  state.promotionRules.price.push(rule);
  state.promoPick = null;
  state.promoFormDraft = null;
  state.promoModalKind = "";
  state.searches.promo_priceFreeProductIds = "";
  state.searches.promo_priceFreeProductIds_category = "all";
  closeModal();
  render();
}
function savePromotionPayment(e) {
  e.preventDefault();
  const form = new FormData(e.target),
    f = Object.fromEntries(form),
    minAmount = f.minAmount === "" ? 0 : Number(f.minAmount);
  if (!Number.isFinite(minAmount) || minAmount < 0)
    return alert("Доод дүн зөв оруулна уу");
  const type = f.type === "percent" ? "percent" : "free",
    rule = {
      paymentTerm: f.paymentTerm === "credit" ? "credit" : "cash",
      minAmount,
      type,
    };
  if (type === "free") {
    const freeProductIds = form.getAll("paymentFreeProductIds").filter(Boolean);
    if (!freeProductIds.length) return alert("Үнэгүй бараа сонгоно уу");
    rule.freeProductIds = freeProductIds;
    rule.freeProductId = freeProductIds[0];
    rule.freeQty = Number(f.freeQty) || 1;
  } else {
    const pct = Number(f.discountPercent);
    if (!pct || pct < 1 || pct > 100)
      return alert("Хөнгөлөлтийн хувь 1-100 хооронд байна");
    rule.discountPercent = pct;
  }
  if (!Array.isArray(state.promotionRules.payment))
    state.promotionRules.payment = [];
  state.promotionRules.payment.push(rule);
  state.promoPick = null;
  state.promoFormDraft = null;
  state.promoModalKind = "";
  state.searches.promo_paymentFreeProductIds = "";
  state.searches.promo_paymentFreeProductIds_category = "all";
  closeModal();
  render();
}
function removePromotionRule(type, index) {
  if (!requireAdminDelete()) return;
  if (!Array.isArray(state.promotionRules[type]))
    state.promotionRules[type] = [];
  state.promotionRules[type].splice(index, 1);
  render();
}
function confirmRemovePromotionRule(type, index) {
  if (!canDelete()) {
    alertModal("Эрхгүй", "Зөвхөн админ устгах эрхтэй.");
    return;
  }
  const label = promotionTypeLabel(type);
  confirmModal(
    "Устгах уу?",
    `<b class="text-foreground">${label}</b> дүрмийг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.`,
    {
      confirmLabel: "Устгах",
      onConfirm: () => removePromotionRule(type, index),
      danger: true,
    },
  );
}
function removePromotionRuleNow(type, index) {
  removePromotionRule(type, index);
  closeModal();
}
function employeePercentDiscountToggle(e) {
  if (e.role !== "sales") return "";
  const on = !!e.allowPercentDiscount;
  return `<label class="employee-pct-toggle shrink-0 flex items-center gap-1.5 text-xs cursor-pointer" title="Хувь тооцох зөвшөөрөл"><input type="checkbox" ${on ? "checked" : ""} onchange="toggleEmployeePercentDiscount('${e.id}',this.checked)" class="w-4 h-4 rounded"><span class="${on ? "text-tone-success" : "text-muted-foreground"}">Хувь</span></label>`;
}
function toggleEmployeePercentDiscount(id, allowed) {
  if (!isAdmin()) return;
  const emp = state.employees.find((e) => e.id === id);
  if (!emp || emp.role !== "sales") return;
  emp.allowPercentDiscount = !!allowed;
  if (state.currentEmployee?.id === id) {
    state.currentEmployee.allowPercentDiscount = !!allowed;
    if (!allowed) state.applyPercentDiscount = false;
  }
  scheduleBackendSave();
  render();
}
function employeePlaceholderImage(e = {}) {
  if (e?.image) return e.image;
  const initial = deliveryInitial(e.name);
  const hue =
    [...String(e?.name || "A")].reduce((s, ch) => s + ch.charCodeAt(0), 0) %
    360;
  const bg = `hsl(${hue} 48% 90%)`;
  const accent = `hsl(${hue} 58% 40%)`;
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 88 88"><rect width="88" height="88" rx="14" fill="${bg}"/><text x="44" y="54" text-anchor="middle" font-family="Arial,sans-serif" font-size="32" font-weight="800" fill="${accent}">${initial}</text></svg>`)}`;
}
function employeeAvatarHtml(e, className = "employee-card__avatar") {
  if (e?.image) {
    return `<img src="${esc(e.image)}" alt="" class="${className} employee-card__avatar-img">`;
  }
  return `<span class="${className}" aria-hidden="true">${esc(deliveryInitial(e?.name))}</span>`;
}
function employeeImageField(e = {}) {
  const preview = e.image || employeePlaceholderImage(e);
  return `<div class="customer-image-field"><span class="block text-sm font-medium mb-2">Зураг</span><div class="customer-image-upload customer-image-upload--stack"><img id="employeeImagePreview" src="${preview}" alt="" class="customer-image-upload__preview"><div class="customer-image-upload__body"><input id="employeeImageFile" type="file" accept="image/jpeg,image/png,image/webp,image/*" onchange="handleEmployeeImage(this)" hidden><div class="customer-image-upload__actions"><button type="button" onclick="document.getElementById('employeeImageFile').click()" class="btn btn--primary btn--sm customer-image-upload__pick">Зураг оруулах</button>${e.image ? `<button type="button" onclick="clearEmployeeImage()" class="btn btn--secondary btn--sm">Зураг арилгах</button>` : ""}</div><input id="employeeImageValue" name="image" type="hidden" value=""><p class="customer-image-upload__hint">Ажилтны зураг оруулна. JPG, PNG, WEBP.</p></div></div></div>`;
}
function initEmployeeImageField(e = {}) {
  const value = document.getElementById("employeeImageValue"),
    preview = document.getElementById("employeeImagePreview");
  if (value) value.value = e.image || "";
  if (preview) preview.src = e.image || employeePlaceholderImage(e);
}
function handleEmployeeImage(input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const value = document.getElementById("employeeImageValue"),
      preview = document.getElementById("employeeImagePreview");
    if (value) value.value = reader.result;
    if (preview) preview.src = reader.result;
    const removeBtn = input
      .closest(".customer-image-upload__actions")
      ?.querySelector('[onclick="clearEmployeeImage()"]');
    if (!removeBtn) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--secondary btn--sm";
      btn.textContent = "Зураг арилгах";
      btn.onclick = clearEmployeeImage;
      input.closest(".customer-image-upload__actions")?.appendChild(btn);
    }
  };
  reader.readAsDataURL(file);
}
function clearEmployeeImage() {
  const value = document.getElementById("employeeImageValue"),
    preview = document.getElementById("employeeImagePreview"),
    fileInput = document.getElementById("employeeImageFile");
  if (value) value.value = "";
  if (fileInput) fileInput.value = "";
  if (preview) {
    const name = document.querySelector('[name="name"]')?.value || "Ажилтан";
    preview.src = employeePlaceholderImage({ name });
  }
  document
    .querySelector(
      '.customer-image-upload__actions [onclick="clearEmployeeImage()"]',
    )
    ?.remove();
}
function employeesView() {
  const editBtn = (e) =>
    isAdmin()
      ? `<button type="button" onclick="confirmEditEmployee('${esc(e.id)}')" class="px-3 py-2 bg-secondary rounded text-sm shrink-0">Засах</button>`
      : "";
  return `<div class="space-y-4">${pageHead("Ажилтан", `<button onclick="employeeModal()" class="px-3 py-2 bg-primary text-primary-foreground rounded text-sm shrink-0">+ Нэмэх</button>`)}<div class="line-panel"><div class="line-list employee-list">${state.employees.map((e) => `<div class="line-list__row line-list__row--static employee-row">${employeeAvatarHtml(e)}<div class="min-w-0 flex-1"><p class="font-medium truncate">${e.name}</p><p class="line-list__meta">${role(e.role)} · ${e.email || "-"}</p></div><div class="flex items-center gap-2 shrink-0">${editBtn(e)}${isAdmin() ? employeePercentDiscountToggle(e) : ""}${canDelete() ? `<button type="button" data-confirm-delete="employee" data-id="${esc(e.id)}" class="px-3 py-2 tone tone--danger rounded text-sm">×</button>` : ""}</div></div>`).join("")}</div></div></div>`;
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
const AUTH_SESSION_KEY = "tomuda-session";
function syncEmployeePctField() {
  const roleEl = document.getElementById("employeeRoleSelect");
  const field = document.getElementById("employeePctField");
  if (!roleEl || !field) return;
  field.classList.toggle("hidden", roleEl.value !== "sales");
}
function applyLoginRoleDefaults(emp) {
  if (!emp) return;
  if (!canApplyPercentDiscount(emp)) state.applyPercentDiscount = false;
  if (emp.role === "warehouse" || emp.role === "delivery") {
    state.selectedWorkers = [];
    state.selectedWarehouseOrderId = "";
    if (emp.role === "delivery") {
      state.selectedDeliveryId = emp.id;
      state.deliveryName = emp.name;
      state.deliveryPhone = emp.phone || "";
      state.deliveryStoreId = "";
      state.deliveryStoreReady = false;
    } else {
      state.selectedDeliveryId = "";
      state.deliveryName = "";
      state.deliveryPhone = "";
    }
  }
}
function saveAuthSession() {
  if (!state.isLoggedIn || !state.currentEmployee?.id) {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }
  localStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify({
      employeeId: state.currentEmployee.id,
      currentView: state.currentView,
    }),
  );
}
function restoreAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    const emp = state.employees.find((e) => e.id === data.employeeId);
    if (!emp) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return false;
    }
    state.currentEmployee = emp;
    state.isLoggedIn = true;
    state.orderEmployee = emp.id;
    const view = data.currentView;
    state.currentView =
      view && canAccessView(view, emp.role)
        ? view
        : defaultViewForRole(emp.role);
    applyLoginRoleDefaults(emp);
    return true;
  } catch {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return false;
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
function togglePasswordField(inputId, btnId) {
  const input = document.getElementById(inputId),
    btn = document.getElementById(btnId);
  if (!input || !btn) return;
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  btn.textContent = show ? "Нуух" : "Харах";
  btn.setAttribute("aria-label", show ? "Нууц үг нуух" : "Нууц үг харах");
}
function toggleLoginPassword() {
  togglePasswordField("loginPassword", "loginPasswordToggle");
}
function loginView() {
  const saved = getSavedLogin();
  const remember = !!saved?.remember;
  const installBtn = isNativeApp()
    ? ""
    : `<button type="button" onclick="installAppOnPhone()" class="btn btn--secondary btn--block">${pwaInstallLabel()}</button>`;
  return `<div class="auth-screen"><div class="auth-card"><div class="auth-card__brand"><img src="${BRAND.logoBlue}" alt="ТОМУДА" class="auth-card__logo" width="72" height="72" decoding="async"><h1 class="auth-card__title">ТОМУДА</h1><p class="auth-card__subtitle">Борлуулалт, агуулах удирдлага</p></div><form onsubmit="login(event)" class="auth-form" aria-label="Нэвтрэх"><label class="field-label" for="loginEmail">Email</label><input id="loginEmail" type="email" inputmode="email" autocomplete="username" autofocus placeholder="name@company.mn" value="${esc(saved?.email || "")}" class="field-input app-input"><label class="field-label" for="loginPassword">Нууц үг</label><div class="login-password-wrap"><input id="loginPassword" type="password" autocomplete="current-password" placeholder="••••••••" value="${esc(saved?.password || "")}" class="field-input app-input"><button type="button" id="loginPasswordToggle" onclick="toggleLoginPassword()" class="login-password-toggle" aria-label="Нууц үг харах">Харах</button></div><label class="login-remember"><input id="loginRemember" type="checkbox" ${remember ? "checked" : ""}><span>Нэвтрэх мэдээлэл санах</span></label><div id="loginError" class="auth-form__error" role="alert"></div><button type="submit" class="btn btn--primary btn--lg btn--block">Нэвтрэх</button>${installBtn}</form></div></div>`;
}
function workerOrdersList() {
  let list = state.orders.filter((o) => o.status !== "cancelled");
  if (state.currentEmployee?.role === "sales") {
    list = list.filter((o) => o.employeeId === state.currentEmployee.id);
  }
  const pay = state.filters.workerPay;
  if (pay === "paid") list = list.filter((o) => orderIsPaid(o));
  if (pay === "unpaid") list = list.filter((o) => !orderIsPaid(o));
  const day = state.filters.workerDate;
  if (day) list = list.filter((o) => orderCreatedDay(o) === day);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
function workerViewTabsHtml(tab) {
  return `<div class="seg-tabs worker-view__tabs" role="tablist" aria-label="Захиалга"><button type="button" role="tab" onclick="openWorkerNewTab()" class="seg-tab${tab === "new" ? " is-active" : ""}" aria-selected="${tab === "new" ? "true" : "false"}">Захиалга үүсгэх</button><button type="button" role="tab" onclick="openWorkerOrdersTab()" class="seg-tab${tab === "orders" ? " is-active" : ""}" aria-selected="${tab === "orders" ? "true" : "false"}">Жагсаалт</button></div>`;
}
function workerView() {
  const tab = state.filters.worker,
    cart = workerCartSummary(),
    orders = workerOrdersList(),
    inActiveOrder =
      tab === "new" && state.workerStoreReady && !!state.workerCustomer;
  return `<div class="worker-view space-y-3${tab === "orders" ? " worker-view--orders" : ""}${state.workerOrdersArrived && tab === "orders" ? " worker-view--orders-arrived" : ""}${inActiveOrder ? " worker-view--ordering" : ""}">${workerViewTabsHtml(tab)}${tab === "new" ? workerNew(cart) : workerOrders(orders)}</div>`;
}
function clearWorkerOrderHighlight() {
  state.workerOrdersArrived = false;
  state.workerHighlightOrderId = "";
}
function openWorkerNewTab() {
  if (state.filters.worker === "new") return;
  clearWorkerOrderHighlight();
  state.filters.worker = "new";
  render();
  pushAppHistory();
}
function openWorkerOrdersTab() {
  if (state.filters.worker === "orders") return;
  state.filters.worker = "orders";
  render();
  pushAppHistory();
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
  const orders = warehouseOrdersForSelectedWorkers();
  return `<div class="space-y-3">${pageHead("Агуулах")}<div class="grid grid-cols-1 gap-3">${workerChooser(orders)}</div></div>`;
}
function deliveryRelevantOrders() {
  const empId = state.currentEmployee?.id || "";
  return state.orders.filter((o) => {
    if (o.status === "cancelled" || o.status === "delivered") return false;
    const delId = o.deliveryEmployeeId || "";
    if (empId && delId && delId !== empId) return false;
    return !!o.customerId;
  });
}
function deliveryStoresWithOrders() {
  const byCustomer = {};
  deliveryRelevantOrders().forEach((o) => {
    const cid = o.customerId;
    if (!byCustomer[cid]) byCustomer[cid] = { orderCount: 0, total: 0 };
    byCustomer[cid].orderCount += 1;
    byCustomer[cid].total += orderAmount(o);
  });
  return Object.entries(byCustomer)
    .map(([id, meta]) => {
      const customer = state.customers.find((c) => c.id === id);
      if (!customer) return null;
      return { customer, ...meta };
    })
    .filter(Boolean)
    .sort((a, b) =>
      String(a.customer.name || "").localeCompare(
        String(b.customer.name || ""),
        "mn",
      ),
    );
}
function filterDeliveryStores(rows, q) {
  const query = String(q || "")
    .trim()
    .toLowerCase();
  if (!query) return rows;
  return rows.filter(({ customer: c }) =>
    [
      c.name,
      c.companyName,
      c.registrationNumber,
      c.phone1,
      c.phone2,
      c.address,
      c.province,
      c.district,
      c.locationText,
    ].some((v) =>
      String(v || "")
        .toLowerCase()
        .includes(query),
    ),
  );
}
function customerHasCoords(c) {
  const lat = Number(c?.latitude),
    lng = Number(c?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}
function customerStoreImage(c) {
  if (c?.image) return c.image;
  const name = String(c?.name || "Дэлгүүр").slice(0, 16);
  const hue =
    [...String(c?.name || "Д")].reduce((s, ch) => s + ch.charCodeAt(0), 0) %
    360;
  const bg = `hsl(${hue} 48% 90%)`;
  const accent = `hsl(${hue} 58% 40%)`;
  const safe = name.replace(/[<>&"]/g, "");
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="220" viewBox="0 0 400 220"><rect width="400" height="220" fill="${bg}"/><circle cx="320" cy="44" r="58" fill="${accent}" opacity=".14"/><path d="M200 168c0 0 74-47 74-110a74 74 0 1 0-148 0c0 63 74 110 74 110z" fill="${accent}"/><circle cx="200" cy="58" r="24" fill="#fff"/><text x="200" y="200" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#182032">${safe}</text></svg>`)}`;
}
function deliveryStoreCard(entry, active = false) {
  const c = entry.customer,
    id = esc(c.id),
    addr = customerAddress(c),
    meta = [c.phone1, addr !== "-" ? addr : ""].filter(Boolean).join(" · ");
  return `<button type="button" class="delivery-store-card${active ? " is-active" : ""}" onclick="pickDeliveryStore('${id}')" aria-pressed="${active ? "true" : "false"}"><div class="delivery-store-card__media"><img src="${customerStoreImage(c)}" alt="" class="delivery-store-card__img" loading="lazy" decoding="async"><span class="delivery-store-card__pin" aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg></span>${entry.orderCount ? `<span class="delivery-store-card__badge">${entry.orderCount} захиалга</span>` : ""}</div><div class="delivery-store-card__body"><p class="delivery-store-card__name">${esc(c.name)}</p>${c.companyName ? `<p class="delivery-store-card__company">${esc(c.companyName)}</p>` : ""}<p class="delivery-store-card__meta">${esc(meta || "—")}</p><p class="delivery-store-card__total">${fmt(entry.total)}</p></div></button>`;
}
function deliveryStorePickStep() {
  const q = state.searches.deliveryStore || "",
    rows = filterDeliveryStores(deliveryStoresWithOrders(), q);
  return `<section class="delivery-view"><div class="delivery-view__head">${pageHead("Хүргэлт")}<p class="delivery-view__lead">Захиалгатай дэлгүүр сонгоно уу</p></div><div class="delivery-view__toolbar"><input data-focus="deliveryStore" type="search" inputmode="search" value="${esc(q)}" oninput="search('deliveryStore',this.value)" placeholder="Нэр, утас, хаягаар хайх..." class="delivery-view__search app-input" autocomplete="off" aria-label="Дэлгүүр хайх"></div>${rows.length ? `<div class="delivery-store-grid">${rows.map((entry) => deliveryStoreCard(entry, state.deliveryStoreId === entry.customer.id)).join("")}</div>` : `<p class="delivery-view__empty">${q ? "Олдсонгүй" : "Захиалгатай дэлгүүр байхгүй"}</p>`}</section>`;
}
function deliveryOrdersForStore(customerId) {
  return deliveryRelevantOrders()
    .filter((o) => o.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
function deliveryStoreMapStep() {
  const selected = state.customers.find((c) => c.id === state.deliveryStoreId),
    q = state.searches.deliveryStore || "",
    rows = filterDeliveryStores(deliveryStoresWithOrders(), q),
    orders = selected ? deliveryOrdersForStore(selected.id) : [],
    addr = selected ? customerAddress(selected) : "-",
    maps =
      selected && customerHasCoords(selected)
        ? mapsLink(selected.latitude, selected.longitude)
        : "";
  if (!selected) {
    state.deliveryStoreReady = false;
    state.deliveryStoreId = "";
    return deliveryStorePickStep();
  }
  const selectedEntry =
    rows.find((r) => r.customer.id === selected.id) ||
    deliveryStoresWithOrders().find((r) => r.customer.id === selected.id);
  const orderList = orders.length
    ? orders
        .map(
          (o) =>
            `<button type="button" class="delivery-order-row" onclick="orderReceiptModal('${esc(o.id)}')"><div class="delivery-order-row__main"><span class="delivery-order-row__no">${receiptNo(o, "xs")}</span><span class="delivery-order-row__meta">${dte(orderDeliveryDay(o))} · ${o.items.length} бараа</span></div><b class="delivery-order-row__total">${fmt(orderAmount(o))}</b></button>`,
        )
        .join("")
    : `<p class="delivery-view__empty">Захиалга алга</p>`;
  const otherStores = rows
    .filter((entry) => entry.customer.id !== selected.id)
    .map((entry) => deliveryStoreCard(entry, false))
    .join("");
  return `<section class="delivery-view delivery-view--map"><div class="delivery-view__head delivery-view__head--row"><button type="button" onclick="clearDeliveryStore()" class="btn btn--secondary btn--sm">← Дэлгүүр солих</button><h2 class="delivery-view__title">${esc(selected.name)}</h2></div><div id="deliveryMap" class="delivery-map" role="region" aria-label="Дэлгүүрийн байршил"></div><p id="deliveryMapStatus" class="delivery-map__status"></p><div class="delivery-view__toolbar"><input type="search" inputmode="search" value="${esc(q)}" oninput="search('deliveryStore',this.value)" placeholder="Бусад дэлгүүр хайх..." class="delivery-view__search app-input" autocomplete="off"></div><article class="delivery-store-detail">${selectedEntry ? deliveryStoreCard(selectedEntry, true) : ""}<div class="delivery-store-detail__extra"><p class="delivery-store-detail__addr">${esc(addr)}</p>${selected.locationText ? `<p class="delivery-store-detail__hint">${esc(selected.locationText)}</p>` : ""}${maps ? `<a href="${maps}" target="_blank" rel="noopener noreferrer" class="delivery-store-detail__maps">Google Maps нээх</a>` : `<p class="delivery-store-detail__hint">Байршил бүртгэгдээгүй</p>`}</div></article><div class="delivery-orders"><h3 class="delivery-orders__title">Захиалга (${orders.length})</h3><div class="delivery-orders__list">${orderList}</div></div>${otherStores ? `<div class="delivery-other-stores"><h3 class="delivery-other-stores__title">Бусад дэлгүүр</h3><div class="delivery-store-grid delivery-store-grid--compact">${otherStores}</div></div>` : ""}</section>`;
}
function deliveryView() {
  if (!state.deliveryStoreReady || !state.deliveryStoreId) {
    return deliveryStorePickStep();
  }
  return deliveryStoreMapStep();
}
function pickDeliveryStore(id) {
  if (!id) return;
  state.deliveryStoreId = id;
  state.deliveryStoreReady = true;
  render();
}
function clearDeliveryStore() {
  state.deliveryStoreId = "";
  state.deliveryStoreReady = false;
  destroyDeliveryMap();
  render();
}
function cleanupDeliveryMapInstance() {
  if (window.deliveryMapMarkers) {
    window.deliveryMapMarkers.forEach((m) => {
      try {
        m.remove();
      } catch (e) {}
    });
  }
  window.deliveryMapMarkers = [];
  if (window.deliveryUserMarker) {
    try {
      window.deliveryUserMarker.remove();
    } catch (e) {}
  }
  window.deliveryUserMarker = null;
  if (window.deliveryMap?.remove) {
    try {
      window.deliveryMap.off();
      window.deliveryMap.remove();
    } catch (e) {}
  }
  window.deliveryMap = null;
}
function destroyDeliveryMap() {
  if (window.deliveryMapInitTimer) {
    clearTimeout(window.deliveryMapInitTimer);
    window.deliveryMapInitTimer = null;
  }
  if (window.deliveryMapResizeTimer) {
    clearTimeout(window.deliveryMapResizeTimer);
    window.deliveryMapResizeTimer = null;
  }
  cleanupDeliveryMapInstance();
  const el = document.getElementById("deliveryMap");
  if (el) {
    el.removeAttribute("data-leaflet-id");
    el._leaflet_id = undefined;
    el.innerHTML = "";
  }
}
function scheduleDeliveryMapResize() {
  const fix = () => {
    if (window.deliveryMap) window.deliveryMap.invalidateSize(true);
  };
  fix();
  requestAnimationFrame(fix);
  clearTimeout(window.deliveryMapResizeTimer);
  window.deliveryMapResizeTimer = setTimeout(fix, 150);
}
function initDeliveryRouteMap(stores, selectedId) {
  const el = document.getElementById("deliveryMap"),
    status = document.getElementById("deliveryMapStatus");
  if (!el) return;
  if (!window.L) {
    el.innerHTML =
      '<div class="delivery-map__loading">Газрын зураг ачаалж байна...</div>';
    loadLeaflet(() => initDeliveryRouteMap(stores, selectedId));
    return;
  }
  cleanupDeliveryMapInstance();
  if (!document.getElementById("deliveryMap")) return;
  const mapEl = document.getElementById("deliveryMap");
  mapEl.removeAttribute("data-leaflet-id");
  mapEl._leaflet_id = undefined;
  mapEl.innerHTML = "";
  const points = stores
    .map(({ customer: c }) => c)
    .filter(customerHasCoords)
    .map((c) => ({
      id: c.id,
      lat: Number(c.latitude),
      lng: Number(c.longitude),
      name: c.name,
    }));
  const selected = points.find((p) => p.id === selectedId) || points[0],
    start = selected ? [selected.lat, selected.lng] : [47.9189, 106.9176];
  window.deliveryMap = L.map(mapEl, { tap: true, zoomControl: true }).setView(
    start,
    selected ? 15 : 12,
  );
  window.deliveryTileLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { maxZoom: 19, attribution: "&copy; OpenStreetMap" },
  ).addTo(window.deliveryMap);
  window.deliveryMapMarkers = [];
  const bounds = [];
  points.forEach((p) => {
    const isActive = p.id === selectedId;
    const icon = L.divIcon({
      className: `delivery-map-pin${isActive ? " delivery-map-pin--active" : ""}`,
      html: `<span class="delivery-map-pin__dot" aria-hidden="true"></span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
    const marker = L.marker([p.lat, p.lng], { icon })
      .addTo(window.deliveryMap)
      .bindTooltip(String(p.name || ""), { direction: "top" });
    marker.on("click", () => pickDeliveryStore(p.id));
    window.deliveryMapMarkers.push(marker);
    bounds.push([p.lat, p.lng]);
  });
  if (bounds.length > 1) {
    window.deliveryMap.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
    if (selected) window.deliveryMap.setView([selected.lat, selected.lng], 15);
  }
  if (status) {
    status.textContent = points.length
      ? `${points.length} дэлгүүр газрын зураг дээр`
      : "Байршил бүртгэлтэй дэлгүүр байхгүй";
  }
  showDeliveryUserLocation(!!selected);
  scheduleDeliveryMapResize();
}
function showDeliveryUserLocation(hasStorePin) {
  if (!window.deliveryMap || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (!window.deliveryMap) return;
      const la = pos.coords.latitude,
        ln = pos.coords.longitude;
      if (window.deliveryUserMarker) window.deliveryUserMarker.remove();
      window.deliveryUserMarker = L.circleMarker([la, ln], {
        radius: 9,
        fillColor: "#16899a",
        color: "#ffffff",
        weight: 3,
        fillOpacity: 0.95,
      })
        .addTo(window.deliveryMap)
        .bindTooltip("Таны байршил", { direction: "top" });
      if (!hasStorePin) window.deliveryMap.setView([la, ln], 14);
    },
    () => {},
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
  );
}
function warehouseReceiptsView() {
  return `<div class="space-y-4">${orderReceiptsPanel({ compact: true, employeeIds: [] })}</div>`;
}
function workerChooser(orders) {
  const qty = orders
      .flatMap((o) => o.items)
      .reduce((s, i) => s + i.quantity, 0),
    total = orders.reduce((s, o) => s + orderAmount(o), 0),
    activeWorkerIds = warehouseActiveWorkerIds(orders),
    names = state.employees
      .filter((e) => activeWorkerIds.includes(e.id))
      .map((e) => e.name)
      .join(", "),
    detail = qtyDetail(orders);
  return `<section class="bg-card rounded p-3 space-y-3">${warehouseDateFiltersHtml()}<button onclick="workerSelectModal()" class="w-full text-left bg-secondary rounded p-3 flex items-center justify-between gap-2"><span class="font-semibold">Худалдааны төлөөлөгч</span><span class="text-sm truncate ${names ? "" : "text-muted-foreground"}">${names || (state.selectedWorkers.length ? "Захиалга алга" : "Сонгох")}</span></button>${state.selectedWorkers.length ? `<div class="grid grid-cols-3 gap-2 text-sm bg-secondary/50 rounded p-2 text-center"><div><b>${activeWorkerIds.length}</b><p class="text-xs text-muted-foreground">Ажилтан</p></div><div><b>${qty}</b><p class="text-xs text-muted-foreground">Ширхэг</p></div><div><b class="text-primary">${fmt(total)}</b><p class="text-xs text-muted-foreground">Дүн</p></div></div><div class="divide-y divide-border">${detail.length ? detail.map(detailRow).join("") : `<p class="p-3 text-sm text-muted-foreground text-center">Сонгосон ХТ дээр захиалга алга</p>`}</div><button onclick="confirmEmployeeExcel()" class="w-full py-2.5 bg-primary text-primary-foreground rounded font-medium"${orders.length ? "" : " disabled"}>${EXCEL_FILE_DOWNLOAD}</button>` : `<div class="p-4 text-center text-sm text-muted-foreground bg-secondary/50 rounded">Худалдааны төлөөлөгчөө сонгоно уу</div>`}</section>`;
}
function deliveryInitial(name) {
  const n = String(name || "").trim();
  return (n[0] || "?").toUpperCase();
}
function deliveryOptionId(empId) {
  return `delivery-opt-${String(empId || "").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
function deliveryPickerOption(e, selected) {
  const active = selected === e.id,
    optId = deliveryOptionId(e.id);
  return `<button type="button" role="option" id="${optId}" data-delivery-id="${esc(e.id)}" aria-selected="${active}" onclick="selectDeliveryEmployee(this.getAttribute('data-delivery-id'))" class="delivery-picker-option ${active ? "is-active" : ""}">${employeeAvatarHtml(e, "delivery-picker-option__avatar")}<span class="delivery-picker-option__main"><span class="delivery-picker-option__name">${esc(e.name)}</span><span class="delivery-picker-option__phone">${esc(e.phone || "Утасгүй")}</span></span><span class="delivery-picker-option__check" aria-hidden="true">${active ? "✓" : ""}</span></button>`;
}
function deliveryPickerRows(selected = "", q = "") {
  const query = String(q || "")
    .trim()
    .toLowerCase();
  const list = deliveryEmployees().filter((e) => {
    if (!query) return true;
    return (
      e.name.toLowerCase().includes(query) ||
      String(e.phone || "").includes(query)
    );
  });
  if (!list.length)
    return `<p class="delivery-picker-empty" role="status">Түгээгч олдсонгүй</p>`;
  return list.map((e) => deliveryPickerOption(e, selected)).join("");
}
function warehouseDeliveryField() {
  const name = state.deliveryName || "",
    has = !!name;
  return `<button type="button" id="warehouse-delivery-trigger" class="w-full text-left bg-secondary rounded p-3 flex items-center justify-between gap-2" onclick="deliveryPickerModal()" aria-labelledby="warehouse-delivery-value" aria-haspopup="listbox" aria-expanded="false" aria-controls="delivery-picker-list"><span class="font-semibold">Түгээгч</span><span id="warehouse-delivery-value" class="text-sm truncate${has ? "" : " text-muted-foreground"}">${has ? esc(name) : "Сонгох"}</span></button>`;
}
function deliveryPickerSearch(value) {
  state.searches.deliveryPick = value;
  const list = document.querySelector("[data-delivery-list]");
  if (!list) {
    deliveryPickerModal();
    return;
  }
  list.innerHTML = deliveryPickerRows(
    state.selectedDeliveryId,
    state.searches.deliveryPick || "",
  );
  const el = document.querySelector('[data-focus="deliveryPick"]');
  if (el) {
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }
}
function deliveryPickerModal() {
  const list = deliveryEmployees(),
    selected = state.selectedDeliveryId,
    q = state.searches.deliveryPick || "",
    activeDesc = selected ? deliveryOptionId(selected) : "";
  const body = list.length
    ? `<div class="p-5 delivery-picker modal-scroll max-h-[75vh] overflow-y-auto"><p id="delivery-picker-desc" class="delivery-picker__desc">Хүргэлт хийх түгээгчийг сонгоно уу.</p><label class="sr-only" for="delivery-picker-search">Түгээгч хайх</label><div class="delivery-picker__search-wrap"><input id="delivery-picker-search" data-focus="deliveryPick" type="search" inputmode="search" autocomplete="off" value="${esc(q)}" oninput="deliveryPickerSearch(this.value)" placeholder="Нэр, утсаар хайх..." class="delivery-picker__search app-input" aria-describedby="delivery-picker-desc"><span class="delivery-picker__search-icon" aria-hidden="true">⌕</span></div><div role="listbox" id="delivery-picker-list" class="delivery-picker-list" aria-label="Түгээгчүүд"${activeDesc ? ` aria-activedescendant="${activeDesc}"` : ""} data-delivery-list>${deliveryPickerRows(selected, q)}</div><div class="delivery-picker-footer"><button type="button" onclick="clearDeliveryEmployee();render();deliveryPickerModal()" class="delivery-picker-footer__btn delivery-picker-footer__btn--secondary" aria-label="Сонголтыг цэвэрлэх">Цэвэрлэх</button><button type="button" onclick="closeModal();render()" class="delivery-picker-footer__btn delivery-picker-footer__btn--primary">Хаах</button></div></div>`
    : `<div class="p-5 delivery-picker modal-scroll"><div class="delivery-picker-empty-state" role="status"><span class="delivery-picker-empty-state__icon" aria-hidden="true"><svg class="ui-icon ui-icon--lg" viewBox="0 0 24 24"><path d="M3 7h11v8H3z"/><path d="M14 10h4l3 4v5h-7v-9z"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="17.5" cy="18" r="1.5"/></svg></span><p class="delivery-picker-empty-state__title">Түгээгч бүртгэлгүй</p><p class="delivery-picker-empty-state__text">Админ → Ажилтан → «Түгээгч» эрхээр нэмнэ.</p></div><button type="button" onclick="closeModal();render()" class="delivery-picker-footer__btn delivery-picker-footer__btn--primary w-full">Хаах</button></div>`;
  box("Түгээгч сонгох", body, "max-w-md", {
    dialog: true,
    titleId: "delivery-picker-title",
    closeLabel: "Түгээгч сонгох цонхыг хаах",
  });
  requestAnimationFrame(() => {
    const trigger = document.getElementById("warehouse-delivery-trigger");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
    const search = document.getElementById("delivery-picker-search");
    if (search) search.focus();
  });
}
function selectDeliveryEmployee(id) {
  const emp = state.employees.find((e) => e.id === id && e.role === "delivery");
  if (!emp) return;
  state.selectedDeliveryId = emp.id;
  state.deliveryName = emp.name;
  state.deliveryPhone = emp.phone || "";
  closeModal();
  scheduleBackendSave();
  render();
}
function clearDeliveryEmployee() {
  state.selectedDeliveryId = "";
  state.deliveryName = "";
  state.deliveryPhone = "";
  scheduleBackendSave();
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
  return `<div class="detail-row flex items-center gap-3 px-3 py-2"><img src="${productImage(p)}" class="product-thumb shrink-0" alt=""><div class="min-w-0 flex-1"><p class="font-medium truncate text-sm">${p.name || "-"}</p></div><b class="text-sm shrink-0">${x.qty} ш</b></div>`;
}
function workerStoreSummary(c, compact = false) {
  if (!c)
    return `<p class="text-sm text-muted-foreground">Харилцагч сонгоогүй</p>`;
  const addr = [c.province, c.district, c.khoroo, c.address]
    .filter(Boolean)
    .join(", ");
  const reg = customerRegistrationDisplay(c) || "—";
  if (compact)
    return `<div class="worker-order-store"><p class="worker-order-store__name">${esc(c.name)}</p><p class="worker-order-store__reg"><span class="worker-order-store__reg-label">Регистр</span> ${esc(reg)}</p></div>`;
  return `<div class="rounded bg-primary/10 p-3 text-sm space-y-0.5"><p class="font-semibold">${esc(c.name)}</p><p><span class="text-muted-foreground">Регистр:</span> ${esc(reg)}</p><p class="text-xs text-muted-foreground worker-store-extra truncate">${esc(addr || "")}</p></div>`;
}
function workerOrderAgentField() {
  const canSelf =
    state.currentEmployee && canTakeOrdersRole(state.currentEmployee.role);
  if (!canSelf) {
    return `<label class="worker-order-field"><span class="worker-order-field__label">Худалдааны төлөөлөгч</span><select onchange="state.orderEmployee=this.value;render()" class="field-input app-input">${orderEmployeeChoices()
      .map(
        (e) =>
          `<option value="${e.id}" ${state.orderEmployee === e.id ? "selected" : ""}>${esc(e.name)} (${role(e.role)})</option>`,
      )
      .join("")}</select></label>`;
  }
  return `<p class="worker-order-sales">${esc(state.currentEmployee.name)}</p>`;
}
function workerOrderEmptyState() {
  return `<div class="worker-order-empty"><p class="worker-order-empty__text">Бараа байхгүй</p></div>`;
}
function filterWorkerStores() {
  const q = state.searches.workerStore || "";
  return sortCustomersByName(
    state.customers.filter((c) => customerMatchesQuery(c, q)),
  );
}
function workerStorePickStep() {
  const q = state.searches.workerStore || "",
    rows = filterWorkerStores(),
    selected = state.workerCustomer
      ? state.customers.find((c) => c.id === state.workerCustomer)
      : null;
  const selectedBanner = selected
    ? `<div class="worker-pick-selected"><p class="worker-pick-selected__label">Харилцагч</p><div class="worker-pick-selected__store">${workerStoreSummary(selected, true)}</div><button type="button" onclick="confirmWorkerStore()" class="btn btn--primary btn--block btn--lg">Захиалга үргэлжлүүлэх</button></div>`
    : `<p class="worker-pick__hint">Дэлгүүр / харилцагч сонгоно уу</p>`;
  return `<section class="worker-pick"><div class="worker-pick__toolbar"><input data-focus="workerStore" type="search" inputmode="search" value="${esc(q)}" oninput="search('workerStore',this.value)" placeholder="Нэр, РД-ээр хайх..." class="worker-pick__search" autocomplete="off" aria-label="Харилцагч хайх"></div>${selectedBanner}${rows.length ? `<div class="worker-pick-list">${rows.map(workerPickCard).join("")}</div>` : `<p class="worker-pick__empty">${q ? "Олдсонгүй" : "Харилцагч байхгүй"}</p>`}</section>`;
}
function pickWorkerStore(id) {
  state.workerCustomer = state.workerCustomer === id ? "" : id;
  render();
}
function confirmWorkerStore() {
  if (!state.workerCustomer) return;
  state.workerStoreReady = true;
  state.deliveryDate = todayIso();
  resetWorkerCart();
  render();
  pushAppHistory();
}
function clearWorkerStore() {
  state.workerStoreReady = false;
  state.workerCustomer = "";
  state.deliveryDate = "";
  state.searches.workerStore = "";
  state.settlementAgreed = false;
  state.settlementMonth = "";
  state.settlementDay = "";
  state.applyPercentDiscount = false;
  resetWorkerCart();
  render();
}
function workerNew(cart) {
  if (!state.workerStoreReady || !state.workerCustomer)
    return workerStorePickStep();
  return workerNewOrderStep(cart);
}
function workerPromoRow(line) {
  const p = state.products.find((x) => x.id === line.productId) || {};
  return `<div class="worker-selected-row worker-promo-row"><img src="${productImage(p)}" class="product-thumb"><div class="min-w-0"><p class="font-medium truncate">${esc(line.productName)}</p><p class="worker-promo-row__label">Урамшуулал · үнэгүй</p></div><b class="text-sm">${line.quantity} ш</b></div>`;
}
function paymentTermPicker() {
  const term = state.paymentTerm;
  return `<div class="seg-tabs worker-payment-tabs"><button type="button" onclick="setPaymentTerm('cash')" class="seg-tab ${term === "cash" ? "is-active" : ""}">${paymentTermLabel("cash")}</button><button type="button" onclick="setPaymentTerm('credit')" class="seg-tab ${term === "credit" ? "is-active" : ""}">${paymentTermLabel("credit")}</button></div>`;
}
function workerOrderOptionsHtml(cart) {
  const sm = state.settlementMonth || String(new Date().getMonth() + 1),
    sd = state.settlementDay || String(new Date().getDate()),
    pct = percentDiscountRate(),
    pctAllowed = canApplyPercentDiscount(),
    cashOnly = isCashPayment(),
    settlementBody = state.settlementAgreed
      ? `<div class="worker-order-opt__body"><div class="worker-order-opt__fields"><label class="worker-order-opt__field"><span class="worker-order-opt__field-label">Сар</span><select class="app-input" aria-label="Сар" onchange="state.settlementMonth=this.value;render()">${settlementMonthOptions(state.settlementMonth || sm)}</select></label><label class="worker-order-opt__field"><span class="worker-order-opt__field-label">Өдөр</span><select class="app-input" aria-label="Өдөр" onchange="state.settlementDay=this.value;render()">${settlementDayOptions(state.settlementDay || sd)}</select></label></div></div>`
      : "",
    pctBody = workerPercentDiscountActive()
      ? `<div class="worker-order-opt__body"><div class="worker-order-discount-preview"><span>Хөнгөлөлт</span><strong>${fmt(cart.employeeDiscount)}</strong><span class="worker-order-discount-preview__sep">·</span><span>Төлөх</span><strong class="worker-order-discount-preview__total">${fmt(cart.total)}</strong></div></div>`
      : "",
    pctRow = pctAllowed
      ? `<div class="worker-order-opt${workerPercentDiscountActive() ? " is-open" : ""}${cashOnly ? "" : " worker-order-opt--disabled"}" aria-expanded="${workerPercentDiscountActive() ? "true" : "false"}"><label class="worker-order-opt__head"><input type="checkbox" ${workerPercentDiscountActive() ? "checked" : ""}${cashOnly ? "" : " disabled"} onchange="state.applyPercentDiscount=this.checked;render()" aria-label="Хувь тооцох идэвхжүүлэх"><span class="worker-order-opt__title">Хувь тооцох</span><span class="worker-order-opt__badge${cashOnly ? "" : " worker-order-opt__badge--muted"}" aria-hidden="true">${pct}%</span></label>${pctBody}</div>`
      : "";
  return `<div class="worker-order-options" role="group" aria-label="Захиалгын нэмэлт сонголт"><div class="worker-order-opt${state.settlementAgreed ? " is-open" : ""}" aria-expanded="${state.settlementAgreed ? "true" : "false"}"><label class="worker-order-opt__head"><input type="checkbox" ${state.settlementAgreed ? "checked" : ""} onchange="state.settlementAgreed=this.checked;if(this.checked&&!state.settlementMonth){state.settlementMonth='${sm}';state.settlementDay='${sd}'}render()" aria-label="Тооцоо нийлэх өдөр идэвхжүүлэх"><span class="worker-order-opt__title">Тооцоо нийлэх өдөр</span></label>${settlementBody}</div>${pctRow}</div>`;
}
function setPaymentTerm(term) {
  state.paymentTerm = term;
  state.isPaid = paidFromPaymentTerm(term);
  if (term === "credit") state.applyPercentDiscount = false;
  render();
}
function workerOrderStatsHtml(cart) {
  if (!cart.skuCount) return "";
  return `<div class="worker-order-stats"><div class="worker-order-stat"><span class="worker-order-stat__value">${cart.skuCount}</span><span class="worker-order-stat__label">Бараа</span></div><div class="worker-order-stat"><span class="worker-order-stat__value">${cart.pieceQty}</span><span class="worker-order-stat__label">Ширхэг</span></div><div class="worker-order-stat worker-order-stat--total"><span class="worker-order-stat__value">${fmt(cart.total)}</span><span class="worker-order-stat__label">Дүн</span></div></div>${cart.discount > 0 ? `<p class="worker-order-stats__note">Хөнгөлөлт ${fmt(cart.discount)} · Үндсэн дүн ${fmt(cart.gross)}</p>` : ""}`;
}
function workerNewOrderStep(cart) {
  state.deliveryDate = todayIso();
  const customer = state.customers.find((c) => c.id === state.workerCustomer),
    canSelf =
      state.currentEmployee && canTakeOrdersRole(state.currentEmployee.role),
    agentMetaHtml = canSelf
      ? ""
      : `<div class="worker-order-meta">${workerOrderAgentField()}</div>`,
    paidProducts = workerPaidProductsInCart(),
    hasItems = paidProducts.length > 0,
    listHtml = hasItems
      ? paidProducts.map(workerSelectedRow).join("") +
        (cart.promo.length ? cart.promo.map(workerPromoRow).join("") : "")
      : "";
  return `<section class="worker-order-card"><header class="worker-order-card__head"><div class="worker-order-card__store-wrap">${workerStoreSummary(customer, true)}</div><button type="button" onclick="clearWorkerStore()" class="btn btn--secondary btn--sm shrink-0">Солих</button></header><div class="worker-order-card__body">${hasItems ? workerOrderStatsHtml(cart) : ""}<div class="worker-order-card__tools"><button type="button" onclick="openPickerModal()" class="worker-order-add-btn" aria-label="Бараа сонгох"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Бараа сонгох</span></button>${agentMetaHtml}</div><div class="worker-order-lines-wrap"><div class="worker-order-lines divide-y divide-border">${listHtml || workerOrderEmptyState()}</div></div></div><footer class="worker-order-card__foot">${workerOrderOptionsHtml(cart)}${paymentTermPicker()}<button type="button" onclick="saveWorker()" class="btn btn--primary btn--lg btn--block${hasItems ? "" : " is-disabled"}" ${hasItems ? "" : "disabled"}>Хадгалах</button></footer></section>`;
}
function workerSelectedRow(p) {
  const editing = state.workerOrderActiveId === p.id;
  return `<div class="worker-selected-row${editing ? " is-editing" : ""}"><img src="${productImage(p)}" class="product-thumb" alt=""><div class="min-w-0 flex-1"><p class="font-medium truncate">${esc(p.name)}</p><p class="worker-row-meta text-xs text-muted-foreground">${esc(p.category)} · ${fmt(p.price)} · Үлд ${p.stock - p.qty}</p><p class="worker-row-compact text-sm font-semibold text-primary">${fmt(p.price * p.qty)}</p></div>${workerOrderQtyHtml(p, p.qty)}</div>`;
}
function workerOrders(orders) {
  const total = orders.reduce((s, o) => s + orderAmount(o), 0),
    paid = orders
      .filter((o) => orderIsPaid(o))
      .reduce((s, o) => s + orderAmount(o), 0),
    unpaid = total - paid,
    day = state.filters.workerDate || "",
    pay = state.filters.workerPay,
    today = todayIso(),
    todayPastDisabled = isDayBeforeToday(day),
    todayBtnClass = `worker-orders-filters__chip${day === today ? " is-active" : ""}${todayPastDisabled ? " is-disabled" : ""}`;
  return `<section class="worker-orders-panel">${metricsBar(`${card("Нийт", fmt(total))}${card("Төлсөн", fmt(paid), "text-tone-success")}${card("Төлөөгүй", fmt(unpaid), "text-tone-danger")}`, 3)}<div class="line-panel__toolbar worker-orders-filters"><button type="button" onclick="clearWorkerOrderDate()" class="worker-orders-filters__chip${!day ? " is-active" : ""}">Бүгд</button><button type="button" onclick="setWorkerOrderDate('${today}')" class="${todayBtnClass}"${todayPastDisabled ? " disabled" : ""}>Өнөөдөр</button><input type="date" value="${day}" onchange="setWorkerOrderDate(this.value)" class="flex-1 min-w-[140px] px-3 py-2 bg-secondary rounded text-sm app-input"><select onchange="state.filters.workerPay=this.value;render()" class="px-3 py-2 bg-secondary rounded text-sm app-input"><option value="all" ${pay === "all" ? "selected" : ""}>Бүгд</option><option value="paid" ${pay === "paid" ? "selected" : ""}>Төлсөн</option><option value="unpaid" ${pay === "unpaid" ? "selected" : ""}>Төлөөгүй</option></select></div><div class="line-list line-list--scroll">${orders.length ? orders.map((o) => `<button type="button" data-order-id="${esc(o.id)}" data-order-day="${orderCreatedDay(o)}" onclick="workerOrderDetail('${o.id}')" class="line-list__row${state.workerHighlightOrderId === o.id ? " line-list__row--new" : ""}"><div class="line-list__main"><div class="line-list__title-row">${receiptNo(o, "xs")}<span class="line-list__title">${esc(o.customerName)}</span><b class="line-list__amount">${fmt(orderAmount(o))}</b></div><p class="line-list__meta">Захиалга ${dte(o.createdAt)} · Хүргэлт ${dte(orderDeliveryDay(o))} · ${o.items.length} бараа · <span class="${o.paymentTerm === "credit" ? "text-tone-danger" : "text-tone-success"}">${paymentTermLabel(o.paymentTerm)}</span></p></div></button>`).join("") : `<p class="line-panel__empty">Захиалга байхгүй</p>`}</div></section>`;
}
function workerOrderDetail(id) {
  orderReceiptModal(id);
}
function render() {
  if (!window.__tomudaBooted) {
    if (!app.querySelector(".boot-screen")) app.innerHTML = bootScreenHtml();
    return;
  }
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
    delivery: deliveryView,
    count: countView,
  };
  const view = map[state.currentView] || workerView;
  app.innerHTML = shell(view());
  scheduleBackendSave();
  maybeShowPwaInstallBanner();
  if (state.currentView === "delivery" && state.deliveryStoreReady) {
    requestAnimationFrame(() => {
      initDeliveryRouteMap(deliveryStoresWithOrders(), state.deliveryStoreId);
    });
  } else {
    destroyDeliveryMap();
  }
  if (state.filters.worker === "orders")
    requestAnimationFrame(scrollWorkerOrdersToDate);
  bindReceiptPrintWorkerPickerDismiss();
}
function box(title, body, max = "max-w-2xl", opts = {}) {
  const titleId = opts.titleId || "modal-title",
    dialogAttr = opts.dialog
      ? ` role="dialog" aria-modal="true" aria-labelledby="${titleId}"`
      : "",
    closeLabel = esc(opts.closeLabel || "Цонхыг хаах"),
    titleHtml = opts.titleHtml ? title : esc(title),
    panelExtra = opts.panelClass ? ` ${opts.panelClass}` : "";
  const wasOpen = !!modal.innerHTML.trim();
  modal.innerHTML = `<div class="modal-backdrop fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-modal-backdrop><div class="modal-panel bg-card rounded w-full ${max} max-h-[90vh] overflow-hidden shadow-lg${panelExtra}"${dialogAttr}><div class="modal-panel__head p-4 sm:p-6 border-b border-border flex justify-between items-center gap-3"><h3 id="${titleId}" class="modal-panel__title text-lg font-semibold">${titleHtml}</h3><button type="button" onclick="closeModal()" class="modal-close btn btn--secondary btn--sm" aria-label="${closeLabel}"><span aria-hidden="true">✕</span></button></div>${body}</div></div>`;
  if (!wasOpen) pushAppHistory();
}
function closeModal() {
  closeConfirmCard();
  stopBarcodeScan();
  if (state.pickerActiveId) finishPickerEditFor(state.pickerActiveId);
  state.pickerActiveId = "";
  state.pickerQtyProductId = "";
  destroyCustomerMap();
  state.promoPick = null;
  state.promoFormDraft = null;
  state.customerFormDraft = null;
  state.searches.deliveryPick = "";
  const deliveryTrigger = document.getElementById("warehouse-delivery-trigger");
  if (deliveryTrigger) deliveryTrigger.setAttribute("aria-expanded", "false");
  state.filters.workerCategory = "";
  state.searches.workerProduct = "";
  state.pickerStatus = "";
  clearReceiptEdit();
  const syncWorkerSelect = !!document.querySelector(
    "[data-worker-select-modal]",
  );
  modal.innerHTML = "";
  if (syncWorkerSelect) render();
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
  window.customerUserMarker = null;
  window.customerUserAccuracy = null;
  window.customerUserCoords = null;
  window.customerTileLayer = null;
  window.customerTileFallback = false;
}
function showCustomerUserLocation(hasCustomerPin) {
  const status = document.getElementById("customerMapStatus");
  if (!window.customerMap) return;
  if (!navigator.geolocation) {
    if (status && !hasCustomerPin)
      status.textContent = "Энэ төхөөрөмж GPS дэмжихгүй байна";
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (!window.customerMap) return;
      const la = pos.coords.latitude,
        ln = pos.coords.longitude;
      window.customerUserCoords = [la, ln];
      if (window.customerUserMarker) window.customerUserMarker.remove();
      window.customerUserMarker = L.circleMarker([la, ln], {
        radius: 9,
        fillColor: "#16899a",
        color: "#ffffff",
        weight: 3,
        fillOpacity: 0.95,
      })
        .addTo(window.customerMap)
        .bindTooltip("Таны байршил", { direction: "top" });
      if (window.customerUserAccuracy) window.customerUserAccuracy.remove();
      const acc = pos.coords.accuracy;
      if (acc && acc < 500) {
        window.customerUserAccuracy = L.circle([la, ln], {
          radius: acc,
          color: "#16899a",
          fillColor: "#16899a",
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(window.customerMap);
      }
      if (!hasCustomerPin) {
        window.customerMap.setView([la, ln], 16);
      }
    },
    () => {
      if (status && !hasCustomerPin)
        status.textContent =
          "Байршил авахын тулд GPS зөвшөөрөл өгнө үү (тохиргоо)";
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
  );
}
function centerCustomerMapOnUser() {
  const status = document.getElementById("customerMapStatus");
  if (window.customerUserCoords && window.customerMap) {
    window.customerMap.setView(window.customerUserCoords, 16);

    return;
  }
  const latInput = document.getElementById("customerLat"),
    lngInput = document.getElementById("customerLng");
  const hasPin = !!(latInput?.value && lngInput?.value);
  if (status) status.textContent = "Байршил татаж байна...";
  showCustomerUserLocation(hasPin);
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
function inputAttrs(
  value,
  placeholder = "",
  { treatZeroAsEmpty = false } = {},
) {
  const v = value === null || value === undefined ? "" : String(value);
  const ph = placeholder || "";
  const empty = v === "" || (treatZeroAsEmpty && v === "0");
  if (empty) return ph ? `placeholder="${esc(ph)}"` : "";
  return `value="${esc(v)}"${ph ? ` placeholder="${esc(ph)}"` : ""}`;
}
function field(name, label, value = "", type = "text", placeholder = "") {
  const ph = placeholder || label;
  const attrs = inputAttrs(value, ph, { treatZeroAsEmpty: type === "number" });
  return `<label><span class="block text-sm font-medium mb-2">${label}</span><input name="${name}" type="${type}" ${attrs} class="w-full px-4 py-3 bg-secondary rounded app-input"></label>`;
}
function customerRegistrationField(value = "") {
  const attrs = inputAttrs(value, "Регистрийн дугаар");
  return `<label><span class="block text-sm font-medium mb-2">Регистрийн дугаар</span><input id="customerRegistrationInput" name="registrationNumber" type="text" inputmode="numeric" autocomplete="off" ${attrs} oninput="scheduleCustomerRegistryLookup(this.value)" class="w-full px-4 py-3 bg-secondary rounded app-input"><p id="customerRegistryLookupStatus" class="text-xs text-muted-foreground mt-2"></p></label>`;
}
function customerProvinceField(value = "") {
  const selected = (value || "").trim() || "Улаанбаатар";
  const options = MN_PROVINCES.map(
    (p) =>
      `<option value="${esc(p)}" ${selected === p ? "selected" : ""}>${esc(p)}</option>`,
  ).join("");
  return `<label><span class="block text-sm font-medium mb-2">Аймаг/Хот</span><select name="province" onchange="onCustomerProvinceChange()" class="w-full px-4 py-3 bg-secondary rounded app-input customer-province-select">${options}</select></label>`;
}
function captureCustomerForm() {
  const form = modal.querySelector("form[data-customer-form]");
  if (!form) return null;
  const data = Object.fromEntries(new FormData(form));
  data.latitude =
    document.getElementById("customerLat")?.value || data.latitude || "";
  data.longitude =
    document.getElementById("customerLng")?.value || data.longitude || "";
  return data;
}
function customerFromDraft(id, draft) {
  const saved = state.customers.find((x) => x.id === id) || {};
  if (!draft) return { ...saved };
  return {
    ...saved,
    name: draft.name ?? saved.name,
    registrationNumber: draft.registrationNumber ?? saved.registrationNumber,
    companyName: draft.companyName ?? saved.companyName,
    phone1: draft.phone1 ?? saved.phone1,
    phone2: draft.phone2 ?? saved.phone2,
    province: draft.province ?? saved.province,
    district: draft.district ?? saved.district,
    khoroo: draft.khoroo ?? saved.khoroo,
    address: draft.address ?? saved.address,
    image: draft.image ?? saved.image,
    latitude: draft.latitude ?? saved.latitude,
    longitude: draft.longitude ?? saved.longitude,
    locationText: draft.locationText ?? saved.locationText,
  };
}
function confirmEditCustomer(id) {
  const c = state.customers.find((x) => x.id === id);
  if (!c) return alert("Харилцагч олдсонгүй");
  const name = c.name || c.companyName || "Харилцагч";
  confirmModal("Харилцагч засах", `<p><b>${esc(name)}</b> засах уу?</p>`, {
    confirmLabel: "Тийм",
    closable: true,
    onConfirm: () => {
      closeModal();
      customerModal(id);
    },
  });
}
function confirmEditProduct(id) {
  if (!isAdmin()) return;
  const p = state.products.find((x) => x.id === id);
  if (!p) return alert("Бараа олдсонгүй");
  confirmModal(
    "Бараа засах",
    `<p><b>${esc(p.name || "Бараа")}</b> засах уу?</p>`,
    {
      confirmLabel: "Тийм",
      closable: true,
      onConfirm: () => productModal(id),
    },
  );
}
function confirmEditEmployee(id) {
  if (!isAdmin()) return;
  const e = state.employees.find((x) => x.id === id);
  if (!e) return alert("Ажилтан олдсонгүй");
  confirmModal(
    "Ажилтан засах",
    `<p><b>${esc(e.name || "Ажилтан")}</b> засах уу?</p>`,
    {
      confirmLabel: "Тийм",
      closable: true,
      onConfirm: () => employeeModal(id),
    },
  );
}
function customerModal(id, draft = null) {
  destroyCustomerMap();
  const useDraft = draft || null;
  if (useDraft)
    state.customerFormDraft = {
      ...useDraft,
      customerId: id || useDraft.customerId || "",
    };
  else state.customerFormDraft = null;
  const c = customerFromDraft(id, useDraft);
  const cid = esc(id || "");
  box(
    id ? "Харилцагч засах" : "Харилцагч бүртгэх",
    `<form data-customer-form onsubmit="saveCustomer(event,'${cid}')" class="p-6 space-y-4 modal-scroll overflow-y-auto">${customerImageField(c)}<div class="grid sm:grid-cols-2 gap-4">${field("name", "Нэр", c.name)}${customerRegistrationField(c.registrationNumber)}</div>${field("companyName", "Байгууллагын нэр", c.companyName)}<div class="grid sm:grid-cols-2 gap-4">${field("phone1", "Утас 1", c.phone1)}${field("phone2", "Утас 2", c.phone2)}</div><div class="grid sm:grid-cols-2 gap-4">${customerProvinceField(c.province)}${customerDistrictFieldHtml(c.province, c.district)}</div>${customerKhorooFieldHtml(c.province, c.district, c.khoroo)}${field("address", "Дэлгэрэнгүй хаяг", c.address)}<div><div class="customer-map-head"><span class="block text-sm font-medium">Байршил</span><div class="customer-map-head__actions"><button type="button" onclick="centerCustomerMapOnUser()" class="customer-map-locate">📍 Миний байршил</button><span id="customerMapStatus" class="text-xs text-muted-foreground"></span></div></div><div id="customerMap" class="customer-map" style="height:360px;min-height:360px;width:100%;display:block;"></div></div><div class="grid sm:grid-cols-2 gap-4"><label><span class="block text-sm font-medium mb-2">Өргөрөг</span><input id="customerLat" name="latitude" value="${esc(c.latitude || "")}" readonly class="w-full px-4 py-3 bg-secondary rounded"></label><label><span class="block text-sm font-medium mb-2">Уртраг</span><input id="customerLng" name="longitude" value="${esc(c.longitude || "")}" readonly class="w-full px-4 py-3 bg-secondary rounded"></label></div><button class="w-full py-3 bg-primary text-primary-foreground rounded">Хадгалах</button></form>`,
    "max-w-3xl",
  );
  initCustomerImageField(c);
  window.customerMapInitTimer = setTimeout(() => {
    window.customerMapInitTimer = null;
    initCustomerMap(c.latitude, c.longitude);
  }, 120);
  loadMnLocations().then(() => {
    if (modal.querySelector("form[data-customer-form]"))
      initCustomerAddressFields(c);
  });
  loadLesRegistryIndex();
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
  showCustomerUserLocation(has);
  scheduleCustomerMapResize();
}
function applyCustomerSave(data, id) {
  if (id) {
    const existing = state.customers.find((c) => c.id === id);
    if (existing) Object.assign(existing, data);
  } else {
    state.customers.push({ ...data, id: String(Date.now()) });
  }
  closeModal();
  render();
  scheduleBackendSave();
}
function saveCustomer(e, id) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  if (id) {
    const existing = state.customers.find((c) => c.id === id);
    if (!existing) return alert("Харилцагч олдсонгүй");
    const name = data.name || data.companyName || existing.name || "Харилцагч";
    confirmModal(
      "Засвар хадгалах",
      `<p><b>${esc(name)}</b> засаж дууслаа. Хадгалах уу?</p>`,
      {
        confirmLabel: "Хадгалах",
        cancelLabel: "Үгүй",
        closable: true,
        onConfirm: () => applyCustomerSave(data, id),
      },
    );
    return;
  }
  applyCustomerSave(data, id);
}
function customerDetail(id) {
  const c = state.customers.find((x) => x.id === id);
  if (!c) return;
  box(c.name, customerDetailHtml(c, id), "max-w-xl");
}
function productModal(id) {
  if (!isAdmin()) return;
  const isNew = !id;
  const p = state.products.find((x) => x.id === id) || {
    unit: "ширхэг",
    boxQuantity: 1,
    price: 0,
    costPrice: 0,
    stock: 0,
    minStock: 0,
    country: "Монгол",
  };
  const barcodeAttrs = inputAttrs(p.barcode || "", "Баркод");
  box(
    id ? PRODUCT_EDIT_TITLE : PRODUCT_NEW_TITLE,
    `<form onsubmit="saveProduct(event,'${id || ""}')" class="p-6 space-y-4 modal-scroll overflow-y-auto"><div class="grid sm:grid-cols-2 gap-4"><label><span class="block text-sm font-medium mb-2">Баркод</span><div class="barcode-input-row"><input id="productBarcodeInput" name="barcode" ${barcodeAttrs} inputmode="numeric" onchange="fillProductFromBarcode(this.value)" class="w-full px-4 py-3 bg-secondary rounded"><button type="button" onclick="startBarcodeScan('product')" class="px-4 py-3 bg-primary text-primary-foreground rounded text-sm">Scan</button></div><p id="productBarcodeLookupStatus" class="text-xs text-muted-foreground mt-2"></p></label>${field("name", "Барааны нэр", p.name)}</div><div id="barcodeScanner" class="barcode-scanner" hidden><video id="barcodeVideo" playsinline webkit-playsinline muted autoplay></video><div class="barcode-scanner-actions"><span id="barcodeStatus">Баркодоо camera-д ойртуулна уу</span><button type="button" onclick="stopBarcodeScan()" class="px-3 py-2 bg-card rounded text-sm text-foreground">Зогсоох</button></div></div><label><span class="block text-sm font-medium mb-2">Төрөл</span><select name="category" required class="w-full px-4 py-3 bg-secondary rounded app-input"><option value="" disabled ${p.category ? "" : "selected"}>Төрөл сонгох</option>${cats()
      .map(
        (c) =>
          `<option value="${esc(c)}" ${p.category === c ? "selected" : ""}>${esc(c)}</option>`,
      )
      .join(
        "",
      )}<option value="__new__">+ Шинэ төрөл</option></select></label><label><span class="block text-sm font-medium mb-2">Хэмжих нэгж</span><select name="unit" class="w-full px-4 py-3 bg-secondary rounded">${["ширхэг", "KG", "метр"].map((u) => `<option ${p.unit === u ? "selected" : ""}>${u}</option>`).join("")}</select></label><div class="grid sm:grid-cols-2 gap-4">${field("price", "Үнэ", isNew ? "" : p.price, "number", "0")}${field("costPrice", "Өртөг", isNew ? "" : p.costPrice, "number", "0")}</div>${field("country", "Үйлдвэрлэсэн улс", isNew ? "" : p.country, "text", "Монгол")}<div><span class="block text-sm font-medium mb-2">Зураг</span><div class="flex items-center gap-3 bg-secondary rounded p-3"><img id="productImagePreview" src="${productImage(p)}" class="product-thumb product-thumb--preview"><div class="flex-1"><input type="file" accept="image/*" onchange="handleProductImage(this)" class="w-full text-sm"><input id="productImageValue" name="image" type="hidden" value="${esc(p.image || "")}"><p class="text-xs text-muted-foreground mt-2">JPG, PNG, WEBP зураг сонгоно.</p></div></div></div><p class="text-xs text-muted-foreground">Үлдэгдэл нь зөвхөн <b>Агуулах → Орлого авах</b> цэснээс нэмэгдэнэ.</p><button class="w-full py-3 bg-primary text-primary-foreground rounded">Хадгалах</button></form>`,
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
let lesRegistryIndex = null;
let lesRegistryLoadPromise = null;
let customerRegistryLookupId = 0;
let customerRegistryLookupTimer = null;

function normalizeRegistrationNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

async function loadLesRegistryIndex() {
  if (lesRegistryIndex) return lesRegistryIndex;
  if (!lesRegistryLoadPromise) {
    lesRegistryLoadPromise = fetch(
      "/static/tomuda/data/les-registry-index.json",
      { cache: "force-cache" },
    )
      .then((res) => {
        if (!res.ok) throw new Error("registry load failed");
        return res.json();
      })
      .then((data) => {
        lesRegistryIndex = data && typeof data === "object" ? data : {};
        return lesRegistryIndex;
      })
      .catch((err) => {
        console.warn("LES registry index load failed", err);
        lesRegistryIndex = {};
        return lesRegistryIndex;
      });
  }
  return lesRegistryLoadPromise;
}

function scheduleCustomerRegistryLookup(value) {
  clearTimeout(customerRegistryLookupTimer);
  customerRegistryLookupTimer = setTimeout(
    () => fillCustomerFromRegistration(value),
    350,
  );
}

async function fillCustomerFromRegistration(code) {
  const input = document.getElementById("customerRegistrationInput"),
    form = input?.closest("form"),
    status = document.getElementById("customerRegistryLookupStatus"),
    reg = normalizeRegistrationNumber(code),
    lookupId = ++customerRegistryLookupId;
  if (!form) return;
  if (!reg) {
    if (status) status.textContent = "";
    return;
  }
  if (reg.length < 6) {
    if (status) status.textContent = "";
    return;
  }
  if (status) status.textContent = "Регистрээр хайж байна...";
  try {
    const index = await loadLesRegistryIndex();
    if (lookupId !== customerRegistryLookupId) return;
    const companyName =
      index[reg] ||
      index[String(Number(reg))] ||
      index[reg.replace(/^0+/, "")] ||
      "";
    if (!companyName) {
      if (status) status.textContent = "Энэ регистрээр олдсонгүй";
      return;
    }
    const nameEl = form.elements.name,
      companyEl = form.elements.companyName;
    if (companyEl) companyEl.value = companyName;
    if (nameEl && !String(nameEl.value || "").trim())
      nameEl.value = companyName;
    if (status) status.textContent = "";
  } catch (error) {
    console.warn("Registry lookup failed", error);
    if (lookupId === customerRegistryLookupId && status)
      status.textContent = "Регистрийн жагсаалт ачаалж чадсангүй";
  }
}
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
function buildProductDataFromForm(form) {
  const data = Object.fromEntries(new FormData(form));
  if (!data.category?.trim()) return { error: "Төрөл сонгоно уу" };
  if (data.category === "__new__") {
    const custom = prompt("Шинэ төрлийн нэр");
    if (!custom?.trim()) return { error: "Төрөл сонгоно уу" };
    data.category = custom.trim();
    if (!state.extraCategories.includes(data.category))
      state.extraCategories.push(data.category);
  }
  ["price", "costPrice"].forEach((k) => (data[k] = Number(data[k] || 0)));
  data.country = String(data.country || "").trim() || "Монгол";
  return { data };
}
function applyProductSave(data, id) {
  if (id) {
    const existing = state.products.find((p) => p.id === id);
    if (existing) Object.assign(existing, data);
  } else {
    state.products.push({
      ...data,
      id: String(Date.now()),
      stock: 0,
      minStock: 0,
      boxQuantity: 1,
    });
  }
  closeModal();
  render();
  scheduleBackendSave();
}
function saveProduct(e, id) {
  if (!isAdmin()) return;
  e.preventDefault();
  const built = buildProductDataFromForm(e.target);
  if (built.error) return alert(built.error);
  applyProductSave(built.data, id);
}
function categoryProductCount(name) {
  return state.products.filter((p) => p.category === name).length;
}
function categoryModal() {
  if (!isAdmin()) return;
  const rows = cats()
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b), "mn"))
    .map((cat) => {
      const count = categoryProductCount(cat);
      const action =
        count > 0
          ? `<span class="category-row__meta">${count} бараа</span>`
          : `<button type="button" onclick="confirmDeleteCategory('${esc(cat)}')" class="category-row__delete">Устгах</button>`;
      return `<div class="category-row"><span class="category-row__name">${esc(cat)}</span>${action}</div>`;
    })
    .join("");
  box(
    "Төрөл удирдах",
    `<form onsubmit="addCategory(event)" class="category-form p-5 flex flex-col min-h-0 max-h-[85vh]"><div class="category-form__add shrink-0"><label class="block text-sm font-medium mb-2">Шинэ төрөл</label><div class="category-form__add-row"><input name="category" autofocus required placeholder="Төрөлийн нэр" class="flex-1 px-4 py-3 bg-secondary rounded app-input"><button type="submit" class="btn btn--primary shrink-0">Нэмэх</button></div></div><div class="category-form__list modal-scroll flex-1 min-h-0 overflow-y-auto mt-4">${rows || `<p class="category-form__empty">Төрөл байхгүй</p>`}</div></form>`,
    "max-w-lg",
  );
}
function addCategory(e) {
  e.preventDefault();
  if (!isAdmin()) return;
  const name = String(new FormData(e.target).get("category") || "").trim();
  if (!name) return alert("Төрөлийн нэр оруулна уу");
  if (cats().includes(name))
    return alert("Энэ төрөл аль хэдийн бүртгэгдсэн байна");
  state.extraCategories.push(name);
  scheduleBackendSave();
  closeModal();
  render();
  scheduleBackendSave();
  showInstallToast("Төрөл нэмэгдлээ");
}
function confirmDeleteCategory(name) {
  if (!isAdmin()) return;
  const count = categoryProductCount(name);
  if (count > 0) {
    alertModal(
      "Устгах боломжгүй",
      `<p><strong>${esc(name)}</strong> төрөлд <strong>${count}</strong> бараа байна.</p><p class="text-sm text-muted-foreground mt-2">Эхлээд барааны төрлийг өөрчилнө үү.</p>`,
    );
    return;
  }
  confirmModal(
    "Төрөл устгах уу?",
    `<strong>${esc(name)}</strong> төрлийг устгах гэж байна.`,
    {
      confirmLabel: "Тийм",
      danger: true,
      onConfirm: () => {
        confirmModal(
          "Баталгаажуулах",
          `<strong>${esc(name)}</strong> төрлийг бүрмөсөн устгахдаа итгэлтэй байна уу?`,
          {
            confirmLabel: "Батлах",
            danger: true,
            closable: true,
            onConfirm: () => deleteCategoryNow(name),
          },
        );
      },
    },
  );
}
function deleteCategoryNow(name) {
  if (!isAdmin()) return;
  state.extraCategories = state.extraCategories.filter((c) => c !== name);
  if (state.filters.category === name) state.filters.category = "all";
  if (state.filters.inventoryCategory === name)
    state.filters.inventoryCategory = "all";
  if (state.filters.countCategory === name) state.filters.countCategory = "all";
  if (state.filters.workerCategory === name) state.filters.workerCategory = "";
  scheduleBackendSave();
  closeModal();
  render();
  showInstallToast("Төрөл устгагдлаа");
}
function employeeModal(id) {
  if (!isAdmin()) return;
  const editId = id ? String(id) : "";
  const e = editId ? state.employees.find((x) => x.id === editId) : null;
  if (editId && !e) return alert("Ажилтан олдсонгүй");
  const isEdit = !!editId;
  const roleOptions = ["sales", "warehouse", "delivery", "admin"]
    .map(
      (r) =>
        `<option value="${r}" ${(e?.role || "sales") === r ? "selected" : ""}>${role(r)}</option>`,
    )
    .join("");
  const pctChecked =
    isEdit && e?.role === "sales" ? e.allowPercentDiscount !== false : !isEdit;
  const passwordAttrs = isEdit
    ? `placeholder="Шинэ нууц үг (хоосон = өөрчлөхгүй)" autocomplete="new-password"`
    : `required placeholder="Нууц үг" autocomplete="new-password"`;
  box(
    isEdit ? "Ажилтан засах" : "Ажилтан нэмэх",
    `<form data-employee-form data-employee-id="${esc(editId)}" class="employee-form p-5 flex flex-col min-h-0 max-h-[85vh]"><div class="employee-form__body modal-scroll overflow-y-auto space-y-3 flex-1 min-h-0">${employeeImageField(e || {})}<input name="name" required placeholder="Нэр" value="${esc(e?.name || "")}" class="w-full px-3 py-3 bg-secondary rounded app-input"><input name="email" type="email" required placeholder="Email" value="${esc(e?.email || "")}" class="w-full px-3 py-3 bg-secondary rounded app-input"><input name="phone" placeholder="Утас" inputmode="tel" value="${esc(e?.phone || "")}" class="w-full px-3 py-3 bg-secondary rounded app-input"><div class="login-password-wrap"><input id="employeePassword" name="password" type="password" ${passwordAttrs} class="w-full px-3 py-3 bg-secondary rounded app-input"><button type="button" id="employeePasswordToggle" onclick="togglePasswordField('employeePassword','employeePasswordToggle')" class="login-password-toggle" aria-label="Нууц үг харах">Харах</button></div><select name="role" id="employeeRoleSelect" onchange="syncEmployeePctField()" class="w-full px-3 py-3 bg-secondary rounded app-input">${roleOptions}</select><label id="employeePctField" class="flex items-center gap-2 text-sm cursor-pointer"><input name="allowPercentDiscount" type="checkbox" class="w-4 h-4 rounded"${pctChecked ? " checked" : ""}><span>Хувь тооцох зөвшөөрөх (${percentDiscountRate()}%)</span></label></div><div class="employee-form__foot shrink-0 pt-3 mt-2 border-t border-border"><button type="submit" class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">${isEdit ? "Хадгалах" : "Нэмэх"}</button></div></form>`,
    "max-w-md",
  );
  setTimeout(() => {
    syncEmployeePctField();
    initEmployeeImageField(e || {});
  }, 0);
}
function buildEmployeeDataFromForm(form, editId = "") {
  const f = Object.fromEntries(new FormData(form));
  const name = String(f.name || "").trim();
  const email = normalizeEmail(f.email);
  const password = String(f.password || "");
  if (!name) return { error: "Нэр оруулна уу" };
  if (!email) return { error: "Email оруулна уу" };
  if (!editId && !password) return { error: "Нууц үг оруулна уу" };
  if (
    state.employees.some(
      (emp) => normalizeEmail(emp.email) === email && emp.id !== editId,
    )
  ) {
    return { error: "Энэ email аль хэдийн бүртгэгдсэн байна" };
  }
  return {
    data: {
      name,
      email,
      phone: String(f.phone || "").trim(),
      password,
      role: f.role || "sales",
      image: String(f.image || ""),
      allowPercentDiscount:
        (f.role || "sales") === "sales" && f.allowPercentDiscount === "on",
    },
  };
}
function applyEmployeeSave(data, editId = "") {
  if (editId) {
    const existing = state.employees.find((e) => e.id === editId);
    if (!existing) return alert("Ажилтан олдсонгүй");
    existing.name = data.name;
    existing.email = data.email;
    existing.phone = data.phone;
    existing.role = data.role;
    existing.image = data.image;
    existing.allowPercentDiscount = data.allowPercentDiscount;
    if (data.password) existing.password = data.password;
    if (state.currentEmployee?.id === editId) {
      state.currentEmployee = existing;
      applyLoginRoleDefaults(existing);
      saveAuthSession();
    }
    showInstallToast("Ажилтан шинэчлэгдлээ");
  } else {
    state.employees.push({
      id: "employee-" + Date.now(),
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      role: data.role,
      image: data.image,
      totalSales: 0,
      commissionRate: 0,
      allowPercentDiscount: data.allowPercentDiscount,
    });
    showInstallToast("Ажилтан нэмэгдлээ");
  }
  closeModal();
  scheduleBackendSave();
  render();
}
function orderModal() {
  box(
    "Шинэ захиалга",
    `<form onsubmit="saveOrder(event)" class="p-5 space-y-4 modal-scroll overflow-y-auto"><select name="customerId" class="w-full px-3 py-3 bg-secondary rounded">${sortCustomersByName(state.customers).map((c) => `<option value="${c.id}">${c.companyName}</option>`).join("")}</select><div class="grid md:grid-cols-2 gap-3">${state.products.map((p) => `<label class="rounded bg-secondary/50 p-3 grid grid-cols-[1fr_80px] gap-2"><span><b>${p.name}</b><small class="block text-muted-foreground">${fmt(p.price)} · Үлд ${p.stock}</small></span><input name="${p.id}" type="number" min="0" placeholder="0" class="px-2 py-2 bg-card rounded text-center"></label>`).join("")}</div><button class="w-full py-3 bg-primary text-primary-foreground rounded">Хадгалах</button></form>`,
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
  state.orders.push(
    buildNewOrder({
      customerId: c.id,
      customerName: c.companyName,
      items,
      total: items.reduce((s, i) => s + i.total, 0),
      status: "pending",
      employeeId: emp.id || "",
      employeeName: emp.name || "",
      employeePhone: emp.phone || "",
      ...orderEmailFields(emp),
      paymentTerm: "credit",
      isPaid: false,
      ...deliveryFieldsForNewOrder(),
    }),
  );
  items.forEach((i) => stock(i.productId, i.quantity, "out"));
  closeModal();
  render();
}
function clearReceiptEdit() {
  state.receiptEditOrderId = "";
  state.receiptEditItems = null;
  state.receiptEditOriginalItems = null;
  receiptEditQtyConfirmOpen = false;
  receiptEditQtyTimers.clear();
}
function receiptEditHasChanges() {
  const orig = state.receiptEditOriginalItems;
  const cur = state.receiptEditItems;
  if (!orig || !cur) return false;
  if (orig.length !== cur.length) return true;
  return cur.some((item, i) => {
    const o = orig[i];
    return (
      item.productId !== o.productId ||
      item.quantity !== o.quantity ||
      item.total !== o.total
    );
  });
}
function receiptEditDraftOrder() {
  const o = state.orders.find((x) => x.id === state.receiptEditOrderId);
  if (!o || !state.receiptEditItems) return o;
  const draft = { ...o, items: state.receiptEditItems };
  return recalcOrderTotals(draft);
}
function orderReceiptEditRows() {
  return (state.receiptEditItems || [])
    .map((i, idx) => {
      if (i.isPromoFree) {
        return `<tr class="receipt-edit-row receipt-edit-row--promo"><td class="receipt-edit-row__name">${esc(i.productName)}</td><td class="receipt-edit-row__qty">${i.quantity}</td><td class="receipt-edit-row__sum">0</td></tr>`;
      }
      return `<tr class="receipt-edit-row"><td class="receipt-edit-row__name">${esc(i.productName)}</td><td class="receipt-edit-row__qty"><input type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" class="receipt-edit-qty app-input" data-receipt-qty="${idx}" value="${i.quantity}" onfocus="receiptEditQtyFocus(this)" oninput="receiptEditQtyDraft(this)" onkeydown="receiptEditQtyKeydown(event, this)" onblur="receiptEditQtyCommit(this)" aria-label="${esc(i.productName)} тоо"></td><td class="receipt-edit-row__sum" data-receipt-line-total="${idx}">${fmt(i.total)}</td></tr>`;
    })
    .join("");
}
function refreshReceiptEditTotals() {
  const draft = receiptEditDraftOrder();
  if (!draft) return;
  (state.receiptEditItems || []).forEach((item, idx) => {
    const el = document.querySelector(`[data-receipt-line-total="${idx}"]`);
    if (el) el.textContent = item.isPromoFree ? "0" : fmt(item.total);
  });
  const totalEl = document.getElementById("receipt-edit-total");
  if (totalEl) totalEl.textContent = fmt(orderPayableTotal(draft));
}
let receiptEditQtyConfirmOpen = false;
const receiptEditQtyTimers = new Map();
function receiptEditQtyFocus(el) {
  const idx = el.getAttribute("data-receipt-qty");
  if (idx != null) receiptEditQtyTimers.delete(String(idx));
}
function receiptEditQtyKeydown(e, el) {
  if (e.key === "Enter") {
    e.preventDefault();
    const idx = el.getAttribute("data-receipt-qty");
    if (idx != null) receiptEditQtyTimers.delete(String(idx));
    receiptEditQtyCommit(el);
  }
}
function receiptEditQtyDraft(el) {
  const digits = String(el.value || "").replace(/\D/g, "");
  if (digits !== el.value) el.value = digits;
  const idx = el.getAttribute("data-receipt-qty");
  if (idx == null) return;
  const key = String(idx);
  clearTimeout(receiptEditQtyTimers.get(key));
  receiptEditQtyTimers.set(
    key,
    setTimeout(() => {
      receiptEditQtyTimers.delete(key);
      receiptEditQtyCommit(el);
    }, 400),
  );
}
function receiptEditQtyCommit(el) {
  if (receiptEditQtyConfirmOpen) return;
  const idx = Number(el.getAttribute("data-receipt-qty"));
  const item = state.receiptEditItems?.[idx];
  if (!item || item.isPromoFree) return;
  const oldQ = item.quantity;
  const q = Math.max(
    0,
    Math.floor(Number(String(el.value || "").replace(/\D/g, "")) || 0),
  );
  if (q === oldQ) return;
  const name = esc(item.productName);
  const oldTotal = oldQ * (item.price || 0);
  const newTotal = q * (item.price || 0);
  receiptEditQtyConfirmOpen = true;
  confirmModal(
    "Тоо өөрчлөх",
    `<p><b>${name}</b></p><p class="text-sm text-muted-foreground mt-2">Тоо: <b>${oldQ}</b> → <b>${q}</b> ш</p><p class="text-sm text-muted-foreground">Мөрний дүн: ${fmt(oldTotal)} → <b>${fmt(newTotal)}</b></p>`,
    {
      confirmLabel: "Тийм",
      onConfirm: () => {
        receiptEditQtyConfirmOpen = false;
        item.quantity = q;
        item.total = newTotal;
        el.value = String(q);
        refreshReceiptEditTotals();
      },
      onCancel: () => {
        receiptEditQtyConfirmOpen = false;
        el.value = String(oldQ);
      },
    },
  );
}
function adjustReceiptEditStock(beforeItems, afterItems) {
  const qtyByProduct = (items) => {
    const map = {};
    (items || []).forEach((i) => {
      if (!i?.productId) return;
      map[i.productId] = (map[i.productId] || 0) + (Number(i.quantity) || 0);
    });
    return map;
  };
  const before = qtyByProduct(beforeItems);
  const after = qtyByProduct(afterItems);
  const ids = new Set([...Object.keys(before), ...Object.keys(after)]);
  ids.forEach((id) => {
    const delta = (after[id] || 0) - (before[id] || 0);
    if (delta > 0) stock(id, delta, "out");
    else if (delta < 0) stock(id, -delta, "in");
  });
}
function applyReceiptEditToOrder() {
  const o = state.orders.find((x) => x.id === state.receiptEditOrderId);
  if (!o || !state.receiptEditItems) return false;
  const orig = state.receiptEditOriginalItems || o.items;
  adjustReceiptEditStock(orig, state.receiptEditItems);
  o.items = state.receiptEditItems.map((i) => ({ ...i }));
  recalcOrderTotals(o);
  scheduleBackendSave();
  return true;
}
function orderReceiptModal(id, keepDraft = false) {
  const o = state.orders.find((x) => x.id === id);
  if (!o) return;
  state.receiptEditOrderId = id;
  if (!keepDraft || !state.receiptEditItems) {
    state.receiptEditOriginalItems = o.items.map((i) => ({ ...i }));
    state.receiptEditItems = o.items.map((i) => ({ ...i }));
  }
  const draft = receiptEditDraftOrder();
  box(
    `<span class="receipt-edit-head"><span>Зарлагын баримт</span>${receiptNo(o, "sm")}</span>`,
    `<div class="receipt-edit-modal"><div class="receipt-edit-store"><p class="receipt-edit-store__name">${esc(o.customerName)}</p><p class="receipt-edit-store__meta">${esc(o.employeeName || "-")} · Захиалга ${dteAt(o.createdAt)}</p><span class="receipt-edit-store__pill ${badge(o.status)}">${status(o.status)}</span></div><table class="receipt-edit-table"><tbody>${orderReceiptEditRows()}</tbody></table><div class="receipt-edit-total"><span>Нийт</span><strong id="receipt-edit-total">${fmt(orderPayableTotal(draft))}</strong></div></div>`,
    "max-w-lg",
    { titleId: "receipt-edit-title", dialog: true, titleHtml: true },
  );
}
function orderReceiptModalKeepDraft(id) {
  orderReceiptModal(id, true);
}
function receiptEditConfirmModal(id) {
  const o = state.orders.find((x) => x.id === id);
  const draft = receiptEditDraftOrder();
  const oldTotal = o ? orderPayableTotal(o) : 0;
  const newTotal = draft ? orderPayableTotal(draft) : oldTotal;
  confirmModal(
    "Батлах",
    `<p>Захиалгын дүнг хадгалж баримт хэвлэх үү?</p><p class="text-sm text-muted-foreground mt-2">Нийт: ${fmt(oldTotal)} → <b>${fmt(newTotal)}</b></p>`,
    {
      confirmLabel: "Тийм",
      onConfirm: () => printOrderReceiptNow(id),
      onCancel: () => orderReceiptModalKeepDraft(id),
    },
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
async function downloadOrderReceiptExcelNow(id) {
  const hadChanges =
    state.receiptEditOrderId === id &&
    state.receiptEditItems &&
    receiptEditHasChanges();
  if (hadChanges) {
    applyReceiptEditToOrder();
    clearReceiptEdit();
    render();
  }
  const o = state.orders.find((x) => x.id === id);
  if (!o) return alert("Захиалга олдсонгүй");
  const exportOrder =
    !hadChanges && state.receiptEditOrderId === id && state.receiptEditItems
      ? receiptEditDraftOrder()
      : o;
  await exportOrderReceiptsExcel([exportOrder || o]);
  showInstallToast("Excel файл татагдлаа");
}
function downloadOrderReceiptExcel(id) {
  if (
    state.receiptEditOrderId === id &&
    state.receiptEditItems &&
    receiptEditHasChanges()
  ) {
    const draft = receiptEditDraftOrder();
    const o = state.orders.find((x) => x.id === id);
    const oldTotal = o ? orderPayableTotal(o) : 0;
    const newTotal = draft ? orderPayableTotal(draft) : oldTotal;
    confirmModal(
      "Excel татах",
      `<p>Захиалгын дүнг хадгалж Excel татах уу?</p><p class="text-sm text-muted-foreground mt-2">Нийт: ${fmt(oldTotal)} → <b>${fmt(newTotal)}</b></p>`,
      {
        confirmLabel: "Тийм",
        onConfirm: () => downloadOrderReceiptExcelNow(id),
        onCancel: () => orderReceiptModalKeepDraft(id),
      },
    );
    return;
  }
  downloadOrderReceiptExcelNow(id);
}
function printOrderReceipt(id) {
  if (
    state.receiptEditOrderId === id &&
    state.receiptEditItems &&
    receiptEditHasChanges()
  ) {
    receiptEditConfirmModal(id);
    return;
  }
  printOrderReceiptNow(id);
}
function printOrderReceiptNow(id) {
  if (state.receiptEditOrderId === id && state.receiptEditItems) {
    applyReceiptEditToOrder();
    clearReceiptEdit();
    render();
  }
  const o = state.orders.find((x) => x.id === id);
  if (!o) return;
  printOrderReceiptsNow([id]);
}
function printOrderReceiptsNow(ids) {
  const idOrder = idList(ids);
  const orders = idOrder
    .map((id) => state.orders.find((o) => o.id === id))
    .filter(Boolean);
  if (!orders.length) return alert("Захиалга олдсонгүй");
  closeModal();
  const root = printRootEl();
  root.innerHTML = orders.map((o) => receipt(o)).join("");
  const cleanup = () => {
    root.innerHTML = "";
  };
  window.addEventListener("afterprint", cleanup, { once: true });
  setTimeout(() => {
    window.print();
    setTimeout(cleanup, 1500);
  }, 120);
}
function printSelectedOrderReceipts() {
  const ids = idList(state.receiptPrintOrderIds);
  if (!receiptPrintWorkerIds().length) return alert("Худалдааны төлөөлөгч сонгоно уу");
  if (!ids.length) return alert("Хэвлэх захиалга сонгоно уу");
  confirmDataExport("Баримт хэвлэх", () => printOrderReceiptsNow(ids));
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
    gross = orderGrossTotal(o),
    discount = orderDiscountAmount(o),
    payable = orderPayableTotal(o),
    sub = payable / 1.1,
    vat = payable - sub,
    addr =
      [c.province, c.district, c.khoroo, c.address]
        .filter(Boolean)
        .join(", ") || "-",
    paid = o.paymentTerm === "cash" || o.isPaid,
    bank = o.paymentTerm === "credit" && !o.isPaid,
    salesName = esc(o.employeeName || sales.name || "-"),
    salesPhone = esc(o.employeePhone || sales.phone || "-"),
    delivery = resolveOrderDelivery(o),
    deliveryName = esc(delivery.deliveryName),
    deliveryPhone = esc(delivery.deliveryPhone),
    settlement = settlementNoteText(o),
    promoItems = (o.items || []).filter((i) => i.isPromoFree),
    pct =
      o.applyPercentDiscount && isCashPayment(o.paymentTerm)
        ? Number(o.percentDiscount || RECEIPT_PERCENT_DISCOUNT)
        : 0,
    grandLabel = pct
      ? `Таны нийт төлөх дүн (Бэлэн төлөлтийн ${pct}% хасагдав)`
      : "Таны нийт төлөх дүн",
    itemRows = (o.items || [])
      .filter((i) => !i.isPromoFree)
      .map((i, n) => {
        const p = state.products.find((x) => x.id === i.productId) || {};
        return `<tr><td>${n + 1}</td><td>${esc(i.productName)}</td><td>${esc(p.unit || "ш")}</td><td>${esc(p.barcode || "-")}</td><td>${i.quantity}</td><td>${receiptMoney(i.price)}</td><td>${receiptMoney(i.total)}</td></tr>`;
      })
      .join(""),
    promoRows = promoItems.length
      ? promoItems
          .map(
            (i) =>
              `<div class="receipt-promo-row"><span>${esc(i.productName)}</span><span>${i.quantity} ш</span><strong>0</strong></div>`,
          )
          .join("")
      : `<div class="receipt-promo-row receipt-promo-row--empty"><span></span><span></span><strong>0</strong></div>`;
  return `<div class="print-receipt"><div class="receipt-page"><header class="receipt-header"><img src="${BRAND.logoBlue}" alt="ТОМУДА" class="receipt-logo"><div class="receipt-company"><h1>ТОМУДА групп ХХК</h1><p>Хаяг: Улаанбаатар Баянзүрх, 26-р хороо, Олимп хороолол- 2 /13312/</p><p>Нийслэл хүрээ өргөн чөлөө 331-401. Утас: +976-75333357</p></div></header><h2 class="receipt-title">ЗАРЛАГЫН БАРИМТ №${formatReceiptNumber(o)}</h2><section class="receipt-info"><div class="receipt-info__col"><p><span>Худалдааны төлөөлөгч:</span><b>${salesName}</b></p><p><span>Худалдааны төлөөлөгчийн утас:</span><b>${salesPhone}</b></p><p><span>Түгээгчийн нэр:</span><b>${deliveryName}</b></p><p><span>Түгээгчийн утас:</span><b>${deliveryPhone}</b></p><p><span>Дансны нэр:</span><b>ТОМУДА групп</b></p><p><span>Регистрийн дугаар:</span><b>5397987</b></p><p><span>Банкны нэр:</span><b>Хаан банк</b></p><p><span>Дансны дугаар:</span><b>51333333307</b></p></div><div class="receipt-info__col"><p><span>Харилцагч:</span><b>${esc(c.name || o.customerName)}</b></p><p><span>Регистрийн дугаар:</span><b>${esc(c.registrationNumber || "-")}</b></p><p><span>Компанийн нэр:</span><b>${esc(c.companyName || "-")}</b></p><p><span>Утасны дугаар:</span><b>${esc(c.phone1 || "-")}</b></p><p><span>Төлбөрийн нөхцөл:</span><b><span class="receipt-check">${paid ? "☑" : "☐"}</span> Бэлнээр&nbsp;&nbsp;<span class="receipt-check">${bank ? "☑" : "☐"}</span> Дансаар</b></p><p class="receipt-address"><span>Хаяг:</span><b>${esc(addr)}</b></p></div></section><table class="receipt-table"><thead><tr><th>№</th><th>Барааны нэр</th><th>Хэмжих нэгж</th><th>Баркод</th><th>Тоо/ш</th><th>Нэгж үнэ</th><th>Нийт үнэ</th></tr></thead><tbody>${itemRows}</tbody></table><section class="receipt-footer-block"><div class="receipt-gross-bar"><span>Хувь хасагдаагүй нийт үнийн дүн</span><strong>${receiptMoney(gross)}</strong></div>${settlement ? `<div class="receipt-settlement-note">${esc(settlement)}</div>` : ""}<section class="receipt-promo-block"><div class="receipt-promo-head"><b>Урамшуулал</b><span>Үнэтрүүлэгч</span><span>Дүн</span></div>${promoRows}</section><section class="receipt-totals"><div class="receipt-total-line"><b>Бараа ажил үйлчилгээний дүн</b><strong>${receiptMoney(sub)}</strong></div><div class="receipt-total-line"><b>НӨАТ</b><strong>${receiptMoney(vat)}</strong></div>${discount ? `<div class="receipt-total-line"><b>Хөнгөлөлт (${pct}%)</b><strong>-${receiptMoney(discount)}</strong></div>` : ""}<div class="receipt-grand-total"><span class="receipt-grand-total__label">${grandLabel}</span><strong class="receipt-grand-total__amount">${receiptMoney(payable)}</strong></div></section><section class="receipt-warning"><p>Эрхэм харилцагч та төлбөрөө заавал баримт дээрх компанийн дансанд шилжүүлнэ үү.</p><p><b>Хувь хүний дансанд шилжүүлэхгүй байхыг анхаарна уу.</b></p><p>Өөр дансруу шилжүүлсэн төлбөрийг нийлүүлэгч компани хариуцахгүй болно</p><p><b>Барааг сайтар шалгаж тоо ширхэгийг тулгаж хүлээн авахыг анхаарна уу!</b></p></section><footer class="receipt-sign"><p><span>Хүлээлгэн өгсөн ажилтны гарын үсэг:</span><b></b></p><p><span>Хүлээн авсан ажилтны гарын үсэг:</span><b></b></p></footer></section></div></div>`;
}
function stock(id, qty, type) {
  const p = state.products.find((x) => x.id === id);
  if (p) p.stock += type === "in" ? qty : -qty;
}
function applyStock(id, type, qty) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return false;
  const q =
    qty != null
      ? Number(qty)
      : Number(document.getElementById(`qty-${id}`)?.value || 0);
  if (!Number.isFinite(q) || q < 1) {
    alert("Тоо оруулна уу");
    return false;
  }
  if (type === "out" && q > p.stock) {
    alert("Үлдэгдэл хүрэлцэхгүй байна!");
    return false;
  }
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
  return true;
}
function pickerProductsInView() {
  const cat = state.filters.workerCategory || "";
  return state.products
    .filter((p) => !cat || p.category === cat)
    .sort((a, b) => {
      const byCat = (a.category || "").localeCompare(b.category || "", "mn");
      if (byCat) return byCat;
      return (a.name || "").localeCompare(b.name || "", "mn");
    });
}
function pickerCategoryChipsHtml() {
  const active = state.filters.workerCategory || "",
    categories = cats();
  return `<div class="picker-cat-chips" role="tablist" aria-label="Төрөлөөр шүүх"><button type="button" data-picker-cat="" class="picker-cat-chip${active ? "" : " is-active"}" role="tab" aria-selected="${active ? "false" : "true"}">Бүгд</button>${categories.map((c) => `<button type="button" data-picker-cat="${esc(c)}" class="picker-cat-chip${active === c ? " is-active" : ""}" role="tab" aria-selected="${active === c ? "true" : "false"}">${esc(c)}</button>`).join("")}</div>`;
}
function updatePickerClearBtn() {
  const clearBtn = modal.querySelector("[data-picker-clear-cart]");
  if (!clearBtn) return;
  const hasSelected = state.products.some(
    (p) => (state.workerQty[p.id] || 0) > 0,
  );
  clearBtn.classList.toggle("is-disabled", !hasSelected);
  clearBtn.disabled = !hasSelected;
}
function refreshPickerList() {
  const list = modal.querySelector("[data-picker-products]");
  if (!list || !pickerOpen()) return false;
  ensurePickerActiveId();
  updatePickerModalTitle();
  const chips = modal.querySelector(".picker-cat-chips");
  if (chips) chips.outerHTML = pickerCategoryChipsHtml();
  const products = pickerProductsInView();
  list.innerHTML = products.length
    ? products.map((p) => pickerRow(p)).join("")
    : `<div class="picker-panel__empty">Бараа олдсонгүй</div>`;
  updatePickerClearBtn();
  return true;
}
function getWorkerQty(productId) {
  const raw = state.workerQty[productId];
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const p = state.products.find((x) => x.id === productId);
  if (!p) return 0;
  return Math.min(Math.floor(n), p.stock);
}
function resetWorkerCart() {
  state.workerQty = {};
  state.pickerActiveId = "";
  state.pickerQtyProductId = "";
  state.workerOrderActiveId = "";
  state.pickerStatus = "";
  state.pickerBarcode = "";
  state.searches.workerProduct = "";
  state.filters.workerCategory = "";
}
function setWorkerQty(id, qty) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const q = Math.max(0, Math.min(Number(qty) || 0, p.stock));
  if (q > 0) state.workerQty[id] = Math.floor(q);
  else {
    delete state.workerQty[id];
    if (state.workerOrderActiveId === id) state.workerOrderActiveId = "";
  }
  const keepPicker = pickerOpen();
  scheduleBackendSave();
  if (keepPicker) {
    if (state.pickerQtyProductId) {
      pickerModal();
      return;
    }
    if (refreshPickerList()) return;
  }
  render();
  if (keepPicker) pickerModal();
}
function applyPickerBarcode(value, scanned = false) {
  const code = String(value || "").trim();
  if (!code) return;
  state.filters.workerCategory = "";
  const product =
    state.products.find((p) => String(p.barcode) === code) ||
    state.products.find((p) => String(p.barcode).includes(code));
  if (product) {
    const current = state.workerQty[product.id] || 0;
    if (current < product.stock) {
      state.workerQty[product.id] = current + 1;
      state.pickerActiveId = product.id;
    }
  }
  if (scanned) stopBarcodeScan();
  scheduleBackendSave();
  if (pickerOpen() && refreshPickerList()) return;
  render();
  if (pickerOpen()) pickerModal();
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
  stopBarcodeScan();
  state.filters.workerCategory = "";
  state.searches.workerProduct = "";
  state.pickerStatus = "";
  state.pickerBarcode = "";
  pickerModal();
}
function pickerModal() {
  const hasSelected = state.products.some(
      (p) => (state.workerQty[p.id] || 0) > 0,
    ),
    products = pickerProductsInView();
  ensurePickerActiveId();
  const qtySheet = state.pickerQtyProductId
    ? pickerQtySheetHtml(state.pickerQtyProductId)
    : "";
  box(
    pickerModalTitleHtml(),
    `<div class="picker-step2 picker-panel${state.pickerQtyProductId ? " picker-step2--qty-open" : ""}" data-picker-root><div class="picker-step2__toolbar">${pickerCategoryChipsHtml()}</div><div class="picker-step2__scroll"><div class="picker-list" data-picker-products>${products.length ? products.map((p) => pickerRow(p)).join("") : `<div class="picker-panel__empty">Бараа олдсонгүй</div>`}</div></div><footer class="picker-step2__bottom picker-step2__bottom--actions"><div class="picker-footer"><button type="button" data-picker-clear-cart class="btn btn--secondary btn--block${hasSelected ? "" : " is-disabled"}" ${hasSelected ? "" : "disabled"}>Цэвэрлэх</button><button type="button" onclick="closeModal();render()" class="btn btn--primary btn--block">Дуусгах</button></div></footer>${qtySheet}</div>`,
    "max-w-2xl",
    {
      titleId: "picker-order-title",
      dialog: true,
      titleHtml: !!pickerModalCustomer(),
      panelClass: "modal-panel--picker",
    },
  );
}
function backToPickerCategories() {
  setPickerCategory("");
}
function clearPickerCart() {
  resetWorkerCart();
  render();
  pickerModal();
}
function pickerQtyChange(productId, qty) {
  setWorkerQty(productId, qty);
}
function openPickerQtySheet(productId) {
  if (!state.products.some((p) => p.id === productId)) return;
  if (state.pickerQtyProductId && state.pickerQtyProductId !== productId) {
    finishPickerEditFor(state.pickerQtyProductId);
  }
  state.pickerQtyProductId = productId;
  state.pickerActiveId = productId;
  pickerModal();
}
function closePickerQtySheet() {
  const id = state.pickerQtyProductId;
  state.pickerQtyProductId = "";
  state.pickerActiveId = "";
  if (id) setWorkerQty(id, 0);
  if (pickerOpen()) pickerModal();
}
function pickerQtySheetHtml(productId) {
  const p = state.products.find((x) => x.id === productId);
  if (!p) return "";
  const id = esc(p.id);
  const q = getWorkerQty(p.id);
  const packSize = productPackSize(p);
  const { packs, pieces } = pickerQtyToParts(q, p);
  const qtyBody = packSize
    ? `<div class="picker-qty-sheet__qty"><div class="picker-qty-sheet__row"><div class="picker-qty-sheet__row-head"><span class="picker-qty-sheet__row-label">Багц</span><span class="picker-qty-sheet__row-hint">Багц = ${packSize}ш</span></div>${pickerPartStepperHtml(p, packs, { kind: "pack", max: pickerPackMax(p, pieces), sheet: true })}</div><div class="picker-qty-sheet__row"><div class="picker-qty-sheet__row-head"><span class="picker-qty-sheet__row-label">Тоо ширхэг</span></div>${pickerPartStepperHtml(p, pieces, { kind: "piece", max: pickerPieceMax(p, packs), sheet: true })}</div><p class="picker-qty-sheet__total">Нийт: <b data-picker-qty-total>${q} ш</b></p></div>`
    : `<div class="picker-qty-sheet__qty"><div class="picker-qty-sheet__row"><div class="picker-qty-sheet__row-head"><span class="picker-qty-sheet__row-label">Тоо ширхэг</span></div>${pickerQtyStepperHtml(p, q, { sheet: true })}</div><p class="picker-qty-sheet__total">Нийт: <b data-picker-qty-total>${q} ш</b></p></div>`;
  return `<div class="picker-qty-sheet" data-picker-qty-sheet role="dialog" aria-modal="true" aria-labelledby="picker-qty-title"><button type="button" class="picker-qty-sheet__backdrop" data-picker-qty-close aria-label="Хаах"></button><div class="picker-qty-sheet__panel"><div class="picker-qty-sheet__head"><img src="${productImage(p)}" alt="" class="picker-qty-sheet__thumb product-thumb"><div class="picker-qty-sheet__info"><h4 id="picker-qty-title" class="picker-qty-sheet__name">${esc(p.name)}</h4><p class="picker-qty-sheet__meta">${fmt(p.price)} · Үлд ${p.stock} ${esc(p.unit || "ш")}</p></div></div>${qtyBody}<div class="picker-qty-sheet__actions"><button type="button" data-picker-qty-close class="btn btn--secondary btn--block">Болих</button><button type="button" data-picker-qty-done data-product-id="${id}" class="btn btn--primary btn--block">Болсон</button></div></div></div>`;
}
function pickerRow(p) {
  const q = getWorkerQty(p.id),
    inCart = q > 0,
    left = p.stock - q,
    qtyBadge = inCart
      ? `<span class="picker-row__qty" aria-label="Сонгосон ${q} ш">${q} ш</span>`
      : "";
  return `<button type="button" class="picker-row${inCart ? " is-selected" : ""}" data-picker-open="${esc(p.id)}" aria-label="${esc(p.name)} — тоо сонгох"><img src="${productImage(p)}" class="picker-row__thumb" alt=""><div class="picker-row__info"><span class="picker-row__name">${esc(p.name)}</span><span class="picker-row__meta"><span class="picker-row__value--price">${fmt(p.price)}</span><span class="picker-row__meta-sep">·</span><span class="picker-row__value--stock${left <= 10 ? " picker-row__value--stock-low" : ""}">Үлд ${left}</span></span></div>${qtyBadge}</button>`;
}
function setPickerCategory(cat) {
  state.filters.workerCategory = cat || "";
  state.pickerActiveId = "";
  state.pickerQtyProductId = "";
  if (refreshPickerList()) return;
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
    `<div class="p-5 space-y-3" data-worker-select-modal>${state.employees
      .filter((e) => e.role === "sales")
      .map(
        (e) =>
          `<label class="flex items-center gap-3 bg-secondary rounded p-3"><input type="checkbox" ${state.selectedWorkers.includes(e.id) ? "checked" : ""} onchange="toggleWorkerOnly('${e.id}')"><span class="font-medium">${e.name}</span></label>`,
      )
      .join(
        "",
      )}<button onclick="finishWorkerSelect()" class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">Болсон</button></div>`,
    "max-w-md",
  );
}
function finishWorkerSelect() {
  closeModal();
  render();
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
  const q = state.searches.workerStore || "",
    selected = state.customers.find((c) => c.id === state.workerCustomer),
    rows = sortCustomersByName(
      state.customers.filter((c) => customerMatchesQuery(c, q)),
    );
  box(
    "Харилцагч сонгох",
    `<div class="p-5 space-y-4 modal-scroll overflow-y-auto max-h-[80vh]"><input data-store-search value="${esc(state.searches.workerStore || "")}" oninput="storePickerSearch(this.value)" placeholder="Нэр, РД-ээр хайх..." class="w-full px-3 py-3 bg-secondary rounded"><div class="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-3"><div class="store-picker-list space-y-2">${rows.length ? rows.map((c) => `<button type="button" onclick="state.workerCustomer='${c.id}';storePickerModal()" class="w-full text-left rounded p-3 ${state.workerCustomer === c.id ? "bg-primary/10 border border-primary" : "bg-secondary/50"}"><p class="font-medium">${c.name}</p><p class="text-xs text-muted-foreground">${c.companyName || "-"} · ${c.phone1 || "-"}</p></button>`).join("") : `<p class="text-sm text-muted-foreground p-3">Харилцагч олдсонгүй</p>`}</div><div>${selected ? workerStoreSummary(selected) : `<p class="text-sm text-muted-foreground">Жагсаалтаас харилцагч сонгоно уу</p>`}</div></div><button onclick="selectWorkerCustomer(state.workerCustomer)" class="w-full py-3 bg-primary text-primary-foreground rounded font-medium" ${selected ? "" : "disabled"}>Сонгох</button></div>`,
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
  const orders = warehouseOrdersForSelectedWorkers(),
    workerIds = warehouseActiveWorkerIds(orders),
    map = {};
  if (!orders.length || !workerIds.length)
    return alert("Сонгосон ХТ дээр захиалга алга");
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
      .filter((e) => workerIds.includes(e.id))
      .map((e) => e.name)
      .join(", "),
    rows = Object.values(map).sort((a, b) =>
      String(a.productName || "").localeCompare(
        String(b.productName || ""),
        "mn",
      ),
    ),
    totalQty = rows.reduce((sum, row) => sum + row.quantity, 0),
    totalAmount = orders.reduce((sum, o) => sum + orderAmount(o), 0),
    reportDate = dte(new Date()),
    stamp = new Date().toISOString().slice(0, 10),
    sheetRows = [
      ["ТОМУДА — Агуулахын захиалга"],
      [`Тайлан огноо: ${reportDate}`],
      [],
      ["Ажилтан", "Огноо", "Захиалга", "Нийт ширхэг", "Нийт дүн (₮)"],
      [names, reportDate, orders.length, totalQty, totalAmount],
      [],
      ["№", "Бараа", "Ангилал", "Баркод", "Тоо", "Дүн (₮)"],
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
      ["", "", "", "НИЙТ", totalQty, totalAmount],
    ];
  excel(`aguulah-zahialga-${stamp}.csv`, sheetRows);
}
function saveWorker() {
  if (!state.isLoggedIn) return alert("Захиалга хадгалахын өмнө нэвтэрнэ үү");
  const c = state.customers.find((x) => x.id === state.workerCustomer),
    e = orderActor(),
    cart = workerCartSummary();
  if (!cart.paid.length) return alert("Бараа сонгоно уу");
  if (state.applyPercentDiscount && !workerPercentDiscountActive())
    state.applyPercentDiscount = false;
  const items = cart.all,
    percentDiscount = workerPercentDiscountActive() ? percentDiscountRate() : 0;
  const order = buildNewOrder({
    customerId: c.id,
    customerName: c.name,
    items,
    grossTotal: cart.gross,
    applyPercentDiscount: workerPercentDiscountActive(),
    percentDiscount,
    discountAmount: cart.discount,
    total: cart.total,
    settlementAgreed: !!state.settlementAgreed,
    settlementMonth: state.settlementAgreed ? state.settlementMonth : "",
    settlementDay: state.settlementAgreed ? state.settlementDay : "",
    status: "pending",
    employeeId: e.id,
    employeeName: e.name,
    employeePhone: e.phone || "",
    ...orderEmailFields(e),
    isPaid: paidFromPaymentTerm(state.paymentTerm),
    paymentTerm: state.paymentTerm,
    deliveryDate: todayIso(),
    ...deliveryFieldsForNewOrder(),
  });
  state.orders.push(order);
  items.forEach((i) => stock(i.productId, i.quantity, "out"));
  resetWorkerCart();
  state.workerStoreReady = false;
  state.workerCustomer = "";
  state.deliveryDate = "";
  state.settlementAgreed = false;
  state.settlementMonth = "";
  state.settlementDay = "";
  state.applyPercentDiscount = false;
  state.filters.worker = "orders";
  state.workerOrdersArrived = true;
  state.workerHighlightOrderId = order.id;
  scheduleBackendSave();
  render();
  pushAppHistory();
  requestAnimationFrame(() => {
    document
      .querySelector(`[data-order-id="${order.id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  setTimeout(() => {
    if (!state.workerOrdersArrived) return;
    state.workerOrdersArrived = false;
    if (state.currentView === "worker" && state.filters.worker === "orders") {
      render();
    }
  }, 1300);
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
  applyLoginRoleDefaults(emp);
  state.currentView = defaultViewForRole(emp.role);
  saveAuthSession();
  render();
}
function closeConfirmCard() {
  pendingConfirm = null;
  receiptEditQtyConfirmOpen = false;
  const overlay = document.getElementById("confirm-card-overlay");
  if (overlay) overlay.hidden = true;
}
function initConfirmCard() {
  const overlay = document.getElementById("confirm-card-overlay");
  if (!overlay || overlay.dataset.bound) return;
  overlay.dataset.bound = "1";
  overlay.querySelector("#confirm-card-yes")?.addEventListener("click", () => {
    const fn = pendingConfirm?.onConfirm;
    closeConfirmCard();
    fn?.();
  });
  overlay.querySelector("#confirm-card-no")?.addEventListener("click", () => {
    const fn = pendingConfirm?.onCancel;
    closeConfirmCard();
    fn?.();
  });
  overlay
    .querySelector("#confirm-card-close")
    ?.addEventListener("click", () => {
      const fn = pendingConfirm?.onCancel;
      closeConfirmCard();
      fn?.();
    });
  overlay.addEventListener("click", (e) => {
    if (e.target !== overlay) return;
    const fn = pendingConfirm?.onCancel;
    closeConfirmCard();
    fn?.();
  });
}
function initConfirmDeleteActions() {
  if (document.documentElement.dataset.confirmDeleteBound) return;
  document.documentElement.dataset.confirmDeleteBound = "1";
  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("[data-confirm-delete]");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      confirmDelete(
        btn.getAttribute("data-confirm-delete") || "",
        btn.getAttribute("data-id") || "",
      );
    },
    true,
  );
}
let pendingConfirm = null;
function showConfirmCard({
  title,
  message,
  confirmLabel,
  cancelLabel = "Үгүй",
  onConfirm,
  onCancel,
  danger = false,
  single = false,
  closable = false,
}) {
  initConfirmCard();
  const overlay = document.getElementById("confirm-card-overlay");
  if (!overlay) return;
  pendingConfirm = { onConfirm, onCancel };
  const titleEl = overlay.querySelector("#confirm-card-title");
  const messageEl = overlay.querySelector("#confirm-card-message");
  const yesBtn = overlay.querySelector("#confirm-card-yes");
  const noBtn = overlay.querySelector("#confirm-card-no");
  const closeBtn = overlay.querySelector("#confirm-card-close");
  const actions = overlay.querySelector(".confirm-card__actions");
  if (titleEl) titleEl.textContent = title || "";
  if (messageEl) messageEl.innerHTML = message || "";
  if (yesBtn) {
    yesBtn.textContent = confirmLabel || "Тийм";
    yesBtn.className = `confirm-card__btn ${danger ? "confirm-card__btn--danger" : "confirm-card__btn--confirm"}`;
  }
  if (noBtn) {
    noBtn.hidden = !!single;
    noBtn.textContent = cancelLabel;
  }
  if (closeBtn) closeBtn.hidden = !closable;
  actions?.classList.toggle("confirm-card__actions--single", !!single);
  overlay.hidden = false;
  yesBtn?.focus();
}
function alertModal(title, messageHtml) {
  showConfirmCard({
    title,
    message: messageHtml,
    confirmLabel: "Ойлголоо",
    onConfirm: () => {},
    single: true,
  });
}
function confirmModal(
  title,
  messageHtml,
  {
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
    danger = false,
    closable = false,
  } = {},
) {
  if (!confirmLabel || !onConfirm) return;
  showConfirmCard({
    title,
    message: messageHtml,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
    danger,
    closable,
  });
}
function confirmLogout() {
  confirmModal(
    "Системээс гарах",
    `Та <b>${esc(state.currentEmployee?.name || "")}</b> хэрэглэгчээр системээс гарах уу? Хадгалаагүй өөрчлөлт алдагдахгүй.`,
    {
      confirmLabel: "Гарах",
      onConfirm: () => {
        closeModal();
        logout();
      },
      danger: true,
    },
  );
}
function logout() {
  state.currentEmployee = null;
  state.isLoggedIn = false;
  state.mobileOpen = false;
  localStorage.removeItem(AUTH_SESSION_KEY);
  closeModal();
  render();
}
function saveEmployee(e) {
  e.preventDefault();
  const form = e.target?.closest?.("[data-employee-form]");
  if (!form) return;
  if (!isAdmin()) {
    alertModal("Эрхгүй", "Зөвхөн админ ажилтан нэмэх эрхтэй.");
    return;
  }
  const editId = form.getAttribute("data-employee-id") || "";
  const built = buildEmployeeDataFromForm(form, editId);
  if (built.error) return alert(built.error);
  applyEmployeeSave(built.data, editId);
}
function confirmDelete(type, id) {
  if (!canDelete()) {
    alertModal("Эрхгүй", "Зөвхөн админ устгах эрхтэй.");
    return;
  }
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
  const finalMessage = `<strong>${esc(name)}</strong>-г бүрмөсөн устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.`;
  confirmModal(
    "Устгах уу?",
    `<strong>${esc(name)}</strong> устгах гэж байна.`,
    {
      confirmLabel: "Тийм",
      onConfirm: () => {
        confirmModal("Баталгаажуулах", finalMessage, {
          confirmLabel: "Батлах",
          onConfirm: () => deleteNow(type, id),
          danger: true,
          closable: true,
        });
      },
    },
  );
}
function confirmCancelOrder(id) {
  if (!canDelete()) {
    alertModal("Эрхгүй", "Зөвхөн админ устгах эрхтэй.");
    return;
  }
  const o = state.orders.find((x) => x.id === id);
  const name = o?.customerName || "захиалга";
  confirmModal(
    "Цуцлах уу?",
    `<strong>${esc(name)}</strong> захиалгыг цуцлах гэж байна.`,
    {
      confirmLabel: "Тийм",
      onConfirm: () => cancelOrderNow(id),
      danger: true,
    },
  );
}
function cancelOrderNow(id) {
  if (!canDelete()) return;
  setOrder(id, "cancelled");
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
      resetWorkerCart();
    }
  }
  closeModal();
  scheduleBackendSave();
  render();
}
function delEmployee(id) {
  confirmDelete("employee", id);
}
function delProduct(id) {
  confirmDelete("product", id);
}
function setOrder(id, s) {
  if (s === "cancelled" && !canDelete()) return;
  const o = state.orders.find((x) => x.id === id);
  if (!o) return;
  if (s === "cancelled" && o.status !== "cancelled") {
    (o.items || []).forEach((i) => {
      if (i?.productId && i.quantity) stock(i.productId, i.quantity, "in");
    });
  }
  o.status = s;
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
    new Blob(["\uFEFF" + rows.map(csvRow).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
  );
  a.download = name;
  a.click();
}
Object.assign(window, {
  state,
  go,
  appBack,
  search,
  render,
  closeModal,
  confirmEditCustomer,
  confirmEditProduct,
  confirmEditEmployee,
  customerModal,
  handleCustomerImage,
  clearCustomerImage,
  handleEmployeeImage,
  clearEmployeeImage,
  onCustomerProvinceChange,
  onCustomerDistrictChange,
  initCustomerAddressFields,
  confirmCustomerExcel,
  confirmProductsExport,
  confirmInventoryExport,
  confirmReportExport,
  confirmEmployeeExcel,
  confirmOrderReceiptsExcel,
  confirmVisibleOrderReceiptsExcel,
  confirmSingleOrderReceiptExcel,
  exportOrderReceiptsExcel,
  customerExcel,
  deliveryPickerModal,
  deliveryPickerSearch,
  selectDeliveryEmployee,
  clearDeliveryEmployee,
  centerCustomerMapOnUser,
  saveCustomer,
  customerDetail,
  productModal,
  handleProductImage,
  fillProductFromBarcode,
  fillCustomerFromRegistration,
  scheduleCustomerRegistryLookup,
  saveProduct,
  categoryModal,
  addCategory,
  confirmDeleteCategory,
  employeeModal,
  orderModal,
  saveOrder,
  orderDetail,
  orderReceiptModal,
  receiptEditQtyFocus,
  receiptEditQtyKeydown,
  receiptEditQtyDraft,
  receiptEditQtyCommit,
  receiptDetail,
  printOrderReceipt,
  printOrderReceiptNow,
  downloadOrderReceiptExcel,
  downloadOrderReceiptExcelNow,
  orderReceiptModalKeepDraft,
  workerOrderDetail,
  applyStock,
  inventoryStockModal,
  applyStockFromModal,
  setInventoryCategory,
  setInventoryTab,
  setCountCategory,
  setWorkerQty,
  setWorkerOrderActive,
  finishWorkerOrderEdit,
  finishPickerEdit,
  pickerQtyChange,
  pickerPackDraft,
  pickerPackCommit,
  pickerPieceDraft,
  pickerPieceCommit,
  qtyDraft,
  qtyCommit,
  openPickerModal,
  pickerModal,
  backToPickerCategories,
  clearPickerCart,
  setPickerCategory,
  applyPickerBarcode,
  clearPickerFilter,
  startBarcodeScan,
  stopBarcodeScan,
  toggleWorker,
  selectWarehouseOrder,
  workerSelectModal,
  workerSelectedRow,
  toggleWorkerOnly,
  employeeExcel,
  finishWorkerSelect,
  storePickerModal,
  storePickerSearch,
  selectWorkerCustomer,
  pickDeliveryStore,
  clearDeliveryStore,
  pickWorkerStore,
  confirmWorkerStore,
  clearWorkerStore,
  openWorkerNewTab,
  openWorkerOrdersTab,
  clearWorkerOrderDate,
  setWorkerOrderDate,
  clearWarehouseDate,
  setWarehouseDate,
  receiptFilterToggle,
  receiptFilterClear,
  setReceiptPrintDelivery,
  toggleReceiptPrintWorker,
  toggleReceiptPrintWorkerPicker,
  closeReceiptPrintWorkerPicker,
  clearReceiptPrintWorkers,
  toggleReceiptPrintOrder,
  printSelectedOrderReceipts,
  printOrderReceiptsNow,
  scrollWorkerOrdersToDate,
  openPromotionQtyModal,
  openPromotionPage,
  promotionQtyModal,
  promoProductSearch,
  selectPromoProduct,
  promoPickSearch,
  setPromoPickCategory,
  promoFormDraftField,
  addPromoPickProduct,
  removePromoPickProduct,
  promoBuyProductSearch,
  addPromoBuyProduct,
  removePromoBuyProduct,
  openPromotionPriceModal,
  promotionPriceModal,
  setPromotionPriceRuleType,
  openPromotionPaymentModal,
  promotionPaymentModal,
  setPromotionPaymentRuleType,
  setPromotionPaymentTerm,
  savePromotionQty,
  savePromotionPrice,
  savePromotionPayment,
  removePromotionRule,
  confirmRemovePromotionRule,
  removePromotionRuleNow,
  excel,
  saveWorker,
  login,
  toggleLoginPassword,
  togglePasswordField,
  confirmLogout,
  closeConfirmCard,
  logout,
  saveEmployee,
  confirmDelete,
  confirmCancelOrder,
  cancelOrderNow,
  deleteNow,
  delEmployee,
  delProduct,
  setOrder,
  setPaid,
  confirmSetPaid,
  setReportDate,
  clearReportDate,
  reportOrdersFiltered,
  setPaymentTerm,
  csv,
  finishCount,
  confirmNewCount,
  confirmCountExcel,
  exportCountExcel,
  setCountQty,
  saveStockAlertSettings,
  stockAlertModal,
  percentDiscountSettingsModal,
  savePercentDiscountSettings,
  toggleEmployeePercentDiscount,
  syncEmployeePctField,
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
