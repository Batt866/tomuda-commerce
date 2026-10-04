const app = document.getElementById("app");
const modal = document.getElementById("modal");
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
    worker: "new",
    workerCategory: "",
  },
  workerCustomer: "excel-1",
  orderEmployee: "1",
  paymentTerm: "cash",
  isPaid: false,
  selectedWorkers: [],
  workerQty: {},
  extraCategories: [],
  inventoryLogs: [],
  countQty: {},
  countDone: false,
};
const fmt = (n) => "₮" + Number(n || 0).toLocaleString();
const dte = (d) => new Date(d).toLocaleDateString("mn-MN");
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
  const nav = [
    ["worker", "Захиалга үүсгэх"],
    ["orders", "Захиалга"],
    ["customers", "Харилцагч"],
    ["products", "Бараа"],
    ["warehouse", "Агуулах"],
    ["count", "Тооллогo"],
    ["admin", "Админ"],
  ];
  return `<div class="min-h-screen bg-background flex"><button onclick="state.mobileOpen=!state.mobileOpen;render()" class="lg:hidden fixed top-4 left-4 z-50 px-3 py-2 bg-sidebar text-sidebar-foreground rounded text-sm">${state.mobileOpen ? "Хаах" : "Цэс"}</button>${state.mobileOpen ? `<div onclick="state.mobileOpen=false;render()" class="lg:hidden fixed inset-0 bg-black/50 z-30"></div>` : ""}<aside class="fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 ${state.mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} flex flex-col"><div class="p-6 border-b border-sidebar-border"><div class="flex items-center gap-3"><div class="tomuda-logo">T</div><div><h1 class="text-lg font-bold text-sidebar-primary">ТОМУДА</h1><p class="text-sm text-sidebar-foreground/70 mt-1">Импорт, түгээлт</p></div></div></div><nav class="flex-1 p-4 space-y-1">${nav.map(([id, label]) => `<button onclick="go('${id}')" class="w-full px-4 py-3 rounded text-left ${state.currentView === id ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent"}"><span class="font-medium">${label}</span></button>`).join("")}</nav><div class="p-4 border-t border-sidebar-border"><div class="flex items-center gap-3 px-4 py-3 rounded bg-sidebar-accent"><div class="flex-1 min-w-0"><p class="font-medium truncate">${state.currentEmployee?.name || "Нэвтрээгүй"}</p><p class="text-xs text-sidebar-foreground/70">${state.currentEmployee ? role(state.currentEmployee.role) : "Ажилчин хэсгээс нэвтэрнэ"}</p></div>${state.currentEmployee ? `<button onclick="logout()" class="px-3 py-2 hover:bg-sidebar-border rounded text-sm">Гарах</button>` : ""}</div></div></aside><main class="flex-1 p-4 lg:p-8 overflow-auto"><div class="max-w-7xl mx-auto pt-12 lg:pt-0">${["employees", "inventory", "reports"].includes(state.currentView) ? `<button onclick="go('admin')" class="mb-4 px-4 py-2 bg-card rounded text-sm">Админ руу буцах</button>` : ""}${content}</div></main></div>`;
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
  ];
  return `<div class="space-y-5"><div><h2 class="text-lg font-bold">Админ</h2><p class="text-sm text-muted-foreground mt-1">Бараа, ажилтан, агуулах, тайланг нэг дороос удирдана</p></div><div class="grid grid-cols-2 lg:grid-cols-4 gap-3">${card("Хүлээгдэж буй", pending)}${card("Захиалгад оруулах бараа", low)}${card("Харилцагч", state.customers.length)}${card("Ажилтны тоо", sales)}</div><div class="grid grid-cols-1 md:grid-cols-2 gap-3">${actions.map((a) => `<button onclick="go('${a[0]}')" class="bg-card rounded p-5 text-left hover:bg-secondary/40"><p class="font-semibold">${a[1]}</p><p class="text-sm text-muted-foreground mt-1">${a[2]}</p></button>`).join("")}</div></div>`;
}
function ordersView() {
  const q = state.searches.orders || "",
    rows = state.orders.filter(
      (o) =>
        o.customerName.toLowerCase().includes(q.toLowerCase()) &&
        (state.filters.order === "all" || o.status === state.filters.order),
    );
  return `<div class="space-y-5"><div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><h2 class="text-lg font-bold">Захиалга</h2><button onclick="orderModal()" class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Шинэ захиалга</button></div><div class="flex flex-col sm:flex-row gap-3"><input data-focus="orders" value="${esc(q)}" oninput="search('orders',this.value)" placeholder="Харилцагч хайх" class="flex-1 px-4 py-2.5 bg-card rounded text-sm"><select onchange="state.filters.order=this.value;render()" class="px-4 py-2.5 bg-card rounded text-sm"><option value="all">Бүгд</option>${["pending", "confirmed", "delivered", "cancelled"].map((s) => `<option value="${s}" ${state.filters.order === s ? "selected" : ""}>${status(s)}</option>`).join("")}</select></div><div class="bg-card rounded overflow-hidden"><div class="overflow-x-auto"><table class="w-full"><thead class="bg-secondary/50"><tr><th class="px-4 py-3 text-left text-xs font-semibold">Захиалга</th><th class="px-4 py-3 text-left text-xs font-semibold">Бараа</th><th class="px-4 py-3 text-left text-xs font-semibold">Төлөв</th><th class="px-4 py-3 text-right text-xs font-semibold">Дүн</th><th class="px-4 py-3 text-right text-xs font-semibold">Үйлдэл</th></tr></thead><tbody class="divide-y divide-border">${rows.map(orderRow).join("")}</tbody></table></div>${rows.length ? "" : `<div class="p-12 text-center text-muted-foreground">Захиалга олдсонгүй</div>`}</div></div>`;
}
function orderRow(o) {
  return `<tr class="hover:bg-secondary/30"><td class="px-4 py-3"><p class="font-medium">${o.customerName}</p><p class="text-xs text-muted-foreground">#${o.id} · ${dte(o.createdAt)}</p></td><td class="px-4 py-3 text-sm">${o.items.length} бараа</td><td class="px-4 py-3"><span class="inline-flex px-2.5 py-1 rounded text-xs font-medium ${badge(o.status)}">${status(o.status)}</span></td><td class="px-4 py-3 text-right text-sm font-semibold">${fmt(o.total)}</td><td class="px-4 py-3"><div class="flex justify-end gap-2 whitespace-nowrap"><button onclick="orderDetail('${o.id}')" class="px-3 py-1.5 bg-secondary rounded text-sm">Харах</button>${o.status === "pending" ? `<button onclick="setOrder('${o.id}','confirmed')" class="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded text-sm">Батлах</button><button onclick="setOrder('${o.id}','cancelled')" class="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm">Цуцлах</button>` : ""}${o.status === "confirmed" ? `<button onclick="setOrder('${o.id}','delivered')" class="px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-sm">Хүргэсэн</button>` : ""}</div></td></tr>`;
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
function customerRow(c) {
  const addr =
    [c.province, c.district, c.khoroo, c.address].filter(Boolean).join(", ") ||
    "-";
  return `<div class="p-4 hover:bg-secondary/30"><div class="grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_140px_1.4fr_190px] lg:items-center"><div><p class="font-semibold">${c.name}</p><p class="text-sm text-muted-foreground">${c.companyName}</p></div><p class="font-medium text-sm">${c.phone1 || "-"}</p><p class="font-medium text-sm truncate">${addr}</p><div class="flex gap-2 lg:justify-end"><button onclick="customerDetail('${c.id}')" class="px-3 py-2 bg-secondary rounded text-sm">Дэлгэрэнгүй</button><button onclick="customerModal('${c.id}')" class="px-3 py-2 bg-primary text-primary-foreground rounded text-sm">Засах</button></div></div></div>`;
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
  const img = p.image
    ? `<img src="${p.image}" class="w-12 h-12 rounded object-cover">`
    : `<div class="w-12 h-12 rounded bg-secondary grid place-items-center text-xs text-muted-foreground">IMG</div>`;
  return `<tr class="hover:bg-secondary/30"><td class="px-6 py-4">${img}</td><td class="px-6 py-4"><p class="font-medium">${p.name}</p><p class="text-xs text-muted-foreground">${p.country}</p></td><td class="px-6 py-4 text-sm font-mono">${p.barcode}</td><td class="px-6 py-4 text-sm font-semibold">${fmt(p.price)}</td><td class="px-6 py-4 text-sm">${p.unit}</td><td class="px-6 py-4"><div class="flex justify-end gap-2"><button onclick="productModal('${p.id}')" class="px-3 py-2 bg-secondary rounded">Засах</button><button onclick="confirmDelete('product','${p.id}')" class="px-3 py-2 bg-red-100 text-red-700 rounded">Устгах</button></div></td></tr>`;
}
function inventoryView() {
  const tab = state.filters.inventory,
    q = state.searches.inventory || "",
    list = state.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q.toLowerCase()) || p.barcode.includes(q),
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
    )}</div><input data-focus="inventory" value="${esc(q)}" oninput="search('inventory',this.value)" placeholder="Бараа хайх (нэр, баркод)..." class="w-full px-4 py-3 bg-card rounded">${tab === "stock" ? stockGrid(list) : stockTable(list, tab)}</div>`;
}
function stockGrid(list) {
  return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${list
    .map((p) => {
      const w = Math.min((p.stock / (p.minStock * 3)) * 100, 100);
      return `<div class="bg-card rounded p-4"><h3 class="font-semibold">${p.name}</h3><p class="text-xs text-muted-foreground mb-4">${p.category}</p><div class="flex justify-between"><span class="text-sm text-muted-foreground">Үлдэгдэл</span><span class="font-semibold">${p.stock} ${p.unit}</span></div><div class="w-full h-3 bg-secondary rounded-full overflow-hidden mt-3"><div class="h-full bg-emerald-500" style="width:${w}%"></div></div></div>`;
    })
    .join("")}</div>`;
}
function stockTable(list, tab) {
  return `<div class="bg-card rounded overflow-hidden"><div class="overflow-x-auto"><table class="w-full"><tbody class="divide-y divide-border">${list.map((p) => `<tr><td class="px-6 py-4 font-medium">${p.name}</td><td class="px-6 py-4 text-sm font-mono">${p.barcode}</td><td class="px-6 py-4 font-semibold">${p.stock} ${p.unit}</td><td class="px-6 py-4 text-right"><input id="qty-${p.id}" type="number" min="1" value="1" class="w-20 text-center px-3 py-2 bg-secondary rounded"><button onclick="applyStock('${p.id}','${tab}')" class="ml-2 px-4 py-2 rounded text-white ${tab === "in" ? "bg-emerald-500" : "bg-red-500"}">${tab === "in" ? "Орлого" : "Зарлага"}</button></td></tr>`).join("")}</tbody></table></div></div>`;
}
function countView() {
  const q = state.searches.count || "",
    list = state.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q.toLowerCase()) || p.barcode.includes(q),
    );
  return `<div class="space-y-5"><div><h2 class="text-lg font-bold">Тooллoгo</h2><p class="text-sm text-muted-foreground mt-1">Агуулахад байгаа бүртгэлтэй бараа</p></div><input data-focus="count" value="${esc(q)}" oninput="search('count',this.value)" placeholder="Бараа хайх..." class="w-full px-4 py-3 bg-card rounded"><div class="bg-card rounded overflow-hidden"><div class="divide-y divide-border">${list.map((p) => `<div class="p-4 grid grid-cols-[1fr_110px_110px] gap-3 items-center"><div><p class="font-medium">${p.name}</p><p class="text-xs text-muted-foreground">${p.category} · бүртгэл ${p.stock} ${p.unit}</p></div><input onchange="state.countQty['${p.id}']=Number(this.value)" value="${state.countQty[p.id] ?? ""}" placeholder="Тоолсон" type="number" class="px-3 py-2 bg-secondary rounded text-center"><span class="text-sm text-muted-foreground">Зөрүү ${(state.countQty[p.id] ?? p.stock) - p.stock}</span></div>`).join("")}</div></div><button onclick="finishCount()" class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">Тооллого дуусгах</button>${state.countDone ? `<div class="bg-card rounded p-4 text-sm">Тооллого хадгалагдлаа. Зөрүүтэй бараа: ${Object.keys(state.countQty).filter((id) => state.countQty[id] !== state.products.find((p) => p.id === id)?.stock).length}</div>` : ""}</div>`;
}
function finishCount() {
  state.countDone = true;
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
  return `<div class="space-y-5"><div class="flex justify-between"><div><h2 class="text-lg font-bold">Тайлан</h2><p class="text-sm text-muted-foreground mt-1">Борлуулалт, төлбөр, урамшуулал</p></div><button onclick="csv('report.csv',[[${total},${paid}]])" class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Тайлан татах</button></div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">${card("Нийт борлуулалт", fmt(total))}${card("Төлсөн", fmt(paid), "text-emerald-600")}${card("Төлөөгүй", fmt(total - paid), "text-red-600")}${card("Барааны үлдэгдэл", fmt(stock))}</div><div class="bg-card rounded overflow-hidden"><div class="px-4 py-3 bg-secondary/50"><h3 class="text-sm font-semibold">Ажилтны борлуулалт</h3></div>${sales.map((e, i) => `<div class="px-4 py-3 border-t"><div class="flex justify-between"><span>${i + 1}. ${e.name}</span><b>${fmt(e.sum)}</b></div><p class="text-sm text-muted-foreground">${e.count} баримт · Урамшуулал ${fmt(e.commission)}</p></div>`).join("")}</div></div>`;
}
function employeesView() {
  return `<div class="space-y-5"><div class="flex justify-between"><div><h2 class="text-lg font-bold">Ажилтан</h2><p class="text-sm text-muted-foreground mt-1">Ажилтан нэмэх, устгах, нууц үг тохируулах</p></div><button onclick="employeeModal()" class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Ажилтан нэмэх</button></div><div class="bg-card rounded overflow-hidden"><table class="w-full"><tbody class="divide-y divide-border">${state.employees.map((e) => `<tr><td class="px-4 py-3 font-medium">${e.name}</td><td class="px-4 py-3 text-sm font-mono">${e.password}</td><td class="px-4 py-3 text-sm">${role(e.role)}</td><td class="px-4 py-3 text-right"><button onclick="confirmDelete('employee','${e.id}')" class="px-3 py-2 bg-red-100 text-red-700 rounded text-sm">Устгах</button></td></tr>`).join("")}</tbody></table></div></div>`;
}
function loginView() {
  return `<div class="min-h-screen flex items-center justify-center p-4"><div class="w-full max-w-sm"><div class="mb-5"><h1 class="text-lg font-bold">Ажилчин нэвтрэх</h1><p class="text-sm text-muted-foreground mt-1">Админаас өгсөн нууц үгээ оруулна уу</p></div><form onsubmit="login(event)" class="bg-card rounded p-5 space-y-4"><input id="password" autofocus type="password" placeholder="Нууц үг" class="w-full px-4 py-3 bg-secondary rounded"><div id="loginError"></div><button class="w-full h-12 rounded text-base font-semibold bg-primary text-primary-foreground">Нэвтрэх</button></form><div class="mt-5 text-center text-sm text-muted-foreground bg-card rounded p-3"><p>Туршилт: <b class="font-mono text-foreground">ajiltan1</b></p><p>Админ: <b class="font-mono text-foreground">admin</b></p></div></div></div>`;
}
function workerView() {
  const tab = state.filters.worker,
    items = state.products
      .map((p) => ({ ...p, qty: state.workerQty[p.id] || 0 }))
      .filter((p) => p.qty > 0),
    total = items.reduce((s, p) => s + p.qty * p.price, 0),
    orders = state.orders.filter((o) =>
      state.selectedWorkers.includes(o.employeeId),
    );
  return `<div class="space-y-4"><div class="grid grid-cols-2 gap-2 bg-card rounded p-2"><button onclick="state.filters.worker='new';render()" class="py-3 rounded font-medium ${tab === "new" ? "bg-primary text-primary-foreground" : "bg-secondary/60"}">Захиалга авах</button><button onclick="state.filters.worker='orders';render()" class="py-3 rounded font-medium ${tab === "orders" ? "bg-primary text-primary-foreground" : "bg-secondary/60"}">Нийт захиалга</button></div>${tab === "new" ? workerNew(items, total) : workerOrders(orders)}</div>`;
}
function warehouseView() {
  const orders = state.selectedWorkers.length
    ? state.orders.filter((o) => state.selectedWorkers.includes(o.employeeId))
    : [];
  return `<div class="space-y-4">${workerChooser(orders)}</div>`;
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
  return `<section class="bg-card rounded p-4 space-y-3"><button onclick="workerSelectModal()" class="w-full text-left bg-secondary rounded p-3"><p class="font-semibold">Ажилтан сонгох</p><p class="text-sm text-muted-foreground mt-1">${names || "Сонгоогүй"}</p></button>${state.selectedWorkers.length ? `<div class="grid grid-cols-3 gap-2 text-sm bg-secondary/50 rounded p-3"><div><p class="text-muted-foreground">Ажилтан</p><b>${state.selectedWorkers.length}</b></div><div><p class="text-muted-foreground">Ширхэг</p><b>${qty}</b></div><div><p class="text-muted-foreground">Дүн</p><b class="text-primary">${fmt(total)}</b></div></div><div class="bg-secondary/50 rounded overflow-hidden"><div class="grid grid-cols-[54px_1fr_62px_82px_76px_56px] gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground"><span>Зураг</span><span>Нэр</span><span>Нэгж</span><span>Үнэ</span><span>Үлдэгдэл</span><span class="text-right">Тоо</span></div>${detail.length ? detail.map(detailRow).join("") : `<p class="p-3 text-sm text-muted-foreground">Сонгосон ажилтанд захиалга алга</p>`}</div><button onclick="employeePdf()" class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">PDF татах</button>` : `<div class="p-6 text-center text-sm text-muted-foreground bg-secondary/50 rounded">Ажилтан сонгоно уу</div>`}</section>`;
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
    img = p.image
      ? `<img src="${p.image}" class="w-10 h-10 rounded object-cover">`
      : `<div class="w-10 h-10 rounded bg-card grid place-items-center text-xs text-muted-foreground">IMG</div>`;
  return `<div class="grid grid-cols-[54px_1fr_62px_82px_76px_56px] gap-2 items-center px-3 py-2 border-t text-sm">${img}<div class="min-w-0"><p class="font-medium truncate">${p.name || "-"}</p><p class="text-xs text-muted-foreground truncate">${p.category || ""}</p></div><span>${p.unit || "-"}</span><span>${fmt(p.price)}</span><span>${p.stock ?? "-"}</span><b class="text-right">${x.qty}</b></div>`;
}
function workerNew(items, total) {
  return `<section class="bg-card rounded overflow-hidden"><div class="p-4 space-y-4"><input data-focus="workerProduct" value="${esc(state.searches.workerProduct || "")}" oninput="state.searches.workerProduct=this.value;pickerModal()" placeholder="Бараа хайх..." class="w-full px-3 py-3 bg-secondary rounded"><label><span class="block text-sm text-muted-foreground mb-1">Дэлгүүр</span><select onchange="state.workerCustomer=this.value" class="w-full px-3 py-3 bg-secondary rounded">${state.customers.map((c) => `<option value="${c.id}" ${state.workerCustomer === c.id ? "selected" : ""}>${c.name}</option>`).join("")}</select></label><div class="grid sm:grid-cols-2 gap-3"><label><span class="block text-sm text-muted-foreground mb-1">Захиалга авах ажилтан</span><select onchange="state.orderEmployee=this.value" class="w-full px-3 py-3 bg-secondary rounded">${state.employees
    .filter((e) => e.role === "sales")
    .map(
      (e) =>
        `<option value="${e.id}" ${state.orderEmployee === e.id ? "selected" : ""}>${e.name}</option>`,
    )
    .join(
      "",
    )}</select></label><label><span class="block text-sm text-muted-foreground mb-1">Төлбөрийн нөхцөл</span><select onchange="state.paymentTerm=this.value" class="w-full px-3 py-3 bg-secondary rounded"><option value="cash" ${state.paymentTerm === "cash" ? "selected" : ""}>Бэлэн</option><option value="credit" ${state.paymentTerm === "credit" ? "selected" : ""}>Зээлээр</option></select></label></div><label class="flex items-center gap-2 text-sm"><input type="checkbox" ${state.isPaid ? "checked" : ""} onchange="state.isPaid=this.checked"> Төлбөр төлсөн</label><div class="grid grid-cols-[1fr_auto] gap-2"><button onclick="pickerModal()" class="px-3 py-3 bg-primary text-primary-foreground rounded font-medium">Бараа сонгох</button><button onclick="state.workerQty={};render()" class="px-4 py-3 bg-secondary rounded">Цэвэрлэх</button></div><div class="grid grid-cols-3 gap-2 text-sm rounded bg-secondary/50 p-3"><div><p class="text-muted-foreground">Бараа</p><p class="font-semibold">${items.length}</p></div><div><p class="text-muted-foreground">Ширхэг</p><p class="font-semibold">${items.reduce((s, p) => s + p.qty, 0)}</p></div><div><p class="text-muted-foreground">Дүн</p><p class="font-semibold text-primary">${fmt(total)}</p></div></div></div><div class="px-4 py-3 bg-secondary/50 flex items-center justify-between text-sm"><span class="font-medium"></span><span class="text-muted-foreground">Тоо</span></div><div class="divide-y divide-border">${items.length ? items.map((p) => `<div class="p-4 grid grid-cols-[1fr_132px] gap-3 items-center"><div><p class="font-medium">${p.name}</p><p class="text-xs text-muted-foreground mt-1">${p.category} · ${fmt(p.price)} · Үлд ${p.stock - p.qty}</p></div><div class="flex items-center gap-2"><button onclick="setWorkerQty('${p.id}',${p.qty - 1})" class="w-10 h-10 bg-secondary rounded">-</button><input onchange="setWorkerQty('${p.id}',Number(this.value))" value="${p.qty}" type="number" class="w-16 h-10 px-2 text-center bg-secondary rounded"><button onclick="setWorkerQty('${p.id}',${p.qty + 1})" class="w-10 h-10 bg-secondary rounded">+</button></div></div>`).join("") : `<div class="p-8 text-center text-sm text-muted-foreground">Бараа сонгоогүй байна</div>`}</div><div class="sticky bottom-0 bg-card p-4 border-t border-border"><button onclick="saveWorker()" class="w-full py-3 bg-primary text-primary-foreground rounded font-medium ${items.length ? "" : "opacity-50"}">Захиалга хадгалах</button></div></section>`;
}
function workerOrders(orders) {
  const total = orders.reduce((s, o) => s + o.total, 0);
  return `<section class="bg-card rounded p-5"><div class="mb-4"><p class="text-sm text-muted-foreground">Нийт захиалгын дүн</p><p class="text-xl font-semibold text-primary">${fmt(total)}</p></div><p class="font-semibold mb-3">Дэлгүүрийн жагсаалт</p>${orders.length ? orders.map((o) => `<button onclick="orderDetail('${o.id}')" class="w-full text-left bg-secondary/50 rounded p-4 mb-3"><p class="font-medium">${o.customerName}</p><p class="text-sm text-muted-foreground mt-1">${dte(o.createdAt)} · ${o.items.length} бараа · ${fmt(o.total)}</p></button>`).join("") : `<p class="text-sm text-muted-foreground">Захиалга байхгүй</p>`}</section>`;
}
function render() {
  const map = {
    admin: adminView,
    orders: ordersView,
    customers: customersView,
    products: productsView,
    inventory: inventoryView,
    employees: employeesView,
    reports: reportsView,
    worker: workerView,
    warehouse: warehouseView,
    count: countView,
  };
  app.innerHTML = shell(map[state.currentView]());
}
function box(title, body, max = "max-w-2xl") {
  modal.innerHTML = `<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div class="bg-card rounded w-full ${max} max-h-[90vh] overflow-hidden"><div class="p-6 border-b flex justify-between"><h3 class="text-lg font-semibold">${title}</h3><button onclick="closeModal()" class="p-2 hover:bg-secondary rounded">✕</button></div>${body}</div></div>`;
}
function closeModal() {
  modal.innerHTML = "";
}
function field(name, label, value = "", type = "text") {
  return `<label><span class="block text-sm font-medium mb-2">${label}</span><input name="${name}" type="${type}" value="${esc(value)}" class="w-full px-4 py-3 bg-secondary rounded"></label>`;
}
function customerModal(id) {
  const c = state.customers.find((x) => x.id === id) || {};
  box(
    id ? "Харилцагч засах" : "Харилцагч бүртгэх",
    `<form onsubmit="saveCustomer(event,'${id || ""}')" class="p-6 space-y-4 modal-scroll overflow-y-auto"><div class="grid sm:grid-cols-2 gap-4">${field("name", "Нэр", c.name)}${field("registrationNumber", "Регистрийн дугаар", c.registrationNumber)}</div>${field("companyName", "Байгууллагын нэр", c.companyName)}<div class="grid sm:grid-cols-2 gap-4">${field("phone1", "Утас 1", c.phone1)}${field("phone2", "Утас 2", c.phone2)}</div><div class="grid sm:grid-cols-2 gap-4">${field("province", "Аймаг/Хот", c.province)}${field("district", "Дүүрэг/Сум", c.district)}</div>${field("khoroo", "Хороо", c.khoroo)}${field("address", "Дэлгэрэнгүй хаяг", c.address)}${field("locationText", "Location", c.locationText || "")}<button class="w-full py-3 bg-primary text-primary-foreground rounded">Хадгалах</button></form>`,
  );
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
      .join(", ");
  box(
    c.name,
    `<div class="p-6 space-y-4"><p class="text-muted-foreground">${c.companyName}</p><p><b>Дугаар:</b> ${c.phone1 || "-"}</p><p><b>Хаяг:</b> ${addr}</p><button onclick="closeModal();customerModal('${id}')" class="w-full py-3 bg-primary text-primary-foreground rounded">Засах</button></div>`,
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
    `<form onsubmit="saveProduct(event,'${id || ""}')" class="p-6 space-y-4 modal-scroll overflow-y-auto"><div class="grid sm:grid-cols-2 gap-4">${field("barcode", "Баркод", p.barcode)}${field("name", "Барааны нэр", p.name)}</div><div class="grid sm:grid-cols-2 gap-4">${field("boxQuantity", "Хайрцаг", p.boxQuantity, "number")}${field("category", "Төрөл", p.category)}</div><label><span class="block text-sm font-medium mb-2">Хэмжих нэгж</span><select name="unit" class="w-full px-4 py-3 bg-secondary rounded">${["ширхэг", "кг", "метр"].map((u) => `<option ${(p.unit === u || (u === "кг" && (p.unit === "KG" || p.unit === "kg"))) ? "selected" : ""}>${u}</option>`).join("")}</select></label><div class="grid sm:grid-cols-2 gap-4">${field("price", "Үнэ", p.price, "number")}${field("costPrice", "Өртөг", p.costPrice, "number")}</div>${field("country", "Үйлдвэрлэсэн улс", p.country)}${field("image", "Зураг", p.image || "")}${field("stock", "Тоо ширхэг", p.stock, "number")}<button class="w-full py-3 bg-primary text-primary-foreground rounded">Хадгалах</button></form>`,
  );
}
function saveProduct(e, id) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
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
    `<form onsubmit="saveEmployee(event)" class="p-5 space-y-3"><input name="name" required placeholder="Нэр" class="w-full px-3 py-3 bg-secondary rounded"><input name="password" required placeholder="Нууц үг" class="w-full px-3 py-3 bg-secondary rounded"><select name="role" class="w-full px-3 py-3 bg-secondary rounded"><option value="sales">Борлуулалт</option><option value="warehouse">Агуулах</option><option value="admin">Админ</option></select><button class="w-full py-3 bg-primary text-primary-foreground rounded">Нэмэх</button></form>`,
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
  const f = new FormData(e.target),
    c = state.customers.find((x) => x.id === f.get("customerId")),
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
    employeeId: state.currentEmployee?.id || "",
    employeeName: state.currentEmployee?.name || "",
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
    `<div class="p-6 no-print"><table class="w-full"><tbody>${o.items.map((i) => `<tr><td class="py-2">${i.productName}</td><td class="text-right">${i.quantity}</td><td class="text-right font-medium">${fmt(i.total)}</td></tr>`).join("")}</tbody></table><div class="flex justify-between border-t mt-4 pt-4"><span>Нийт</span><b class="text-primary">${fmt(o.total)}</b></div><button onclick="window.print()" class="mt-5 w-full py-3 bg-secondary rounded font-medium">Зарлагын баримт хэвлэх</button></div>${receipt(o)}`,
    "max-w-3xl",
  );
}
function receipt(o) {
  const c = state.customers.find((x) => x.id === o.customerId) || {},
    sub = o.total / 1.1,
    vat = o.total - sub;
  return `<div class="print-receipt hidden"><div class="receipt-page"><header class="receipt-header"><div class="receipt-logo">T</div><div><h1>ТОМУДА групп ХХК</h1><p>Хаяг: Улаанбаатар Баянзүрх, 26-р хороо, Олимп хотхон</p><p>Утас: +976-75333357</p></div><div><p>Хүргэлтийн огноо:</p><b>${dte(o.createdAt)}</b></div></header><h2 class="receipt-title">ЗАРЛАГЫН БАРИМТ №${o.id}</h2><section class="receipt-info"><div><p><span>Худалдааны төлөөлөгч:</span><b>${o.employeeName || "-"}</b></p><p><span>Түгээгчийн нэр:</span><b>${o.employeeName || "-"}</b></p></div><div><p><span>Харилцагч:</span><b>${c.name || o.customerName}</b></p><p><span>Регистр:</span><b>${c.registrationNumber || "-"}</b></p><p><span>Компанийн нэр:</span><b>${c.companyName || "-"}</b></p><p><span>Утас:</span><b>${c.phone1 || "-"}</b></p><p><span>Хаяг:</span><b>${c.address || "-"}</b></p></div></section><section class="receipt-bank"><p><span>Дансны нэр:</span><b>ТОМУДА групп</b></p><p><span>Банк:</span><b>Хаан банк</b></p><p><span>Данс:</span><b>5133333307</b></p></section><table class="receipt-table"><thead><tr><th>№</th><th>Барааны нэр</th><th>Нэгж</th><th>Баркод</th><th>Тоо</th><th>Үнэ</th><th>Нийт</th></tr></thead><tbody>${o.items
    .map((i, n) => {
      const p = state.products.find((x) => x.id === i.productId) || {};
      return `<tr><td>${n + 1}</td><td>${i.productName}</td><td>${p.unit || "ш"}</td><td>${p.barcode || "-"}</td><td>${i.quantity}</td><td>${i.price.toLocaleString()}</td><td>${i.total.toLocaleString()}</td></tr>`;
    })
    .join(
      "",
    )}</tbody></table><section class="receipt-total"><p><span>Бараа үйлчилгээний дүн</span><b>${sub.toFixed(2)}</b></p><p><span>НӨАТ</span><b>${vat.toFixed(2)}</b></p><p><span>Таны нийт төлөх дүн</span><b>${o.total.toLocaleString()}</b></p></section><footer><p>Хүлээлгэн өгсөн ажилтны гарын үсэг: ____________________</p><p>Хүлээн авсан ажилтны гарын үсэг: ____________________</p></footer></div></div>`;
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
function pickerModal() {
  const cat = state.filters.workerCategory,
    q = (state.searches.workerProduct || "").toLowerCase(),
    categories = cats(),
    products = cat
      ? state.products.filter(
          (p) =>
            p.category === cat &&
            (p.name.toLowerCase().includes(q) || p.barcode.includes(q)),
        )
      : [];
  box(
    "Бараа сонгох",
    `<div class="p-5 space-y-3"><select onchange="state.filters.workerCategory=this.value;state.searches.workerProduct='';pickerModal()" class="w-full px-3 py-3 bg-secondary rounded"><option value="">Төрөл сонгох</option>${categories.map((c) => `<option ${cat === c ? "selected" : ""}>${c}</option>`).join("")}</select>${cat ? `<input data-picker-search value="${esc(state.searches.workerProduct || "")}" oninput="pickerSearch(this.value)" placeholder="Бараа хайх..." class="w-full px-3 py-3 bg-secondary rounded">` : `<div class="p-6 text-center text-sm text-muted-foreground bg-secondary/50 rounded">Эхлээд төрөл сонгоно уу</div>`}<div class="space-y-2 max-h-[46vh] overflow-y-auto">${products.length ? products.map((p) => pickerRow(p)).join("") : cat ? `<div class="p-6 text-center text-sm text-muted-foreground">Бараа олдсонгүй</div>` : ""}</div><button onclick="closeModal();render()" class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">Дуусгах</button></div>`,
    "max-w-md",
  );
  const el = document.querySelector("[data-picker-search]");
  if (el) {
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }
}
function pickerRow(p) {
  const q = state.workerQty[p.id] || 0;
  return `<div class="rounded bg-secondary/50 p-3 ${q ? "ring-1 ring-primary" : ""}"><div class="grid grid-cols-[1fr_120px] gap-3 items-center"><div class="min-w-0"><p class="text-sm font-medium truncate">${p.name}</p><p class="text-xs text-muted-foreground">${p.barcode} · ${fmt(p.price)} · Үлд ${p.stock - q}</p></div><div class="flex items-center gap-1"><button onclick="setWorkerQty('${p.id}',${q - 1});pickerModal()" class="w-9 h-9 bg-card rounded">-</button><input onchange="setWorkerQty('${p.id}',Number(this.value));pickerModal()" value="${q || ""}" placeholder="0" class="w-14 px-2 py-2 bg-card rounded text-center text-sm"><button onclick="setWorkerQty('${p.id}',${q + 1});pickerModal()" class="w-9 h-9 bg-card rounded">+</button></div></div></div>`;
}
function pickerSearch(value) {
  state.searches.workerProduct = value;
  pickerModal();
}
function toggleWorker(id) {
  state.selectedWorkers = state.selectedWorkers.includes(id)
    ? state.selectedWorkers.filter((x) => x !== id)
    : [...state.selectedWorkers, id];
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
function toggleWorkerOnly(id) {
  state.selectedWorkers = state.selectedWorkers.includes(id)
    ? state.selectedWorkers.filter((x) => x !== id)
    : [...state.selectedWorkers, id];
  workerSelectModal();
}
function employeePdf() {
  if (!state.selectedWorkers.length) return alert("Ажилтан сонгоно уу");
  const orders = state.orders.filter((o) =>
      state.selectedWorkers.includes(o.employeeId),
    ),
    map = {};
  orders.forEach((o) =>
    o.items.forEach((i) => {
      map[i.productName] = (map[i.productName] || 0) + i.quantity;
    }),
  );
  const names = state.employees
    .filter((e) => state.selectedWorkers.includes(e.id))
    .map((e) => e.name)
    .join(", ");
  box(
    "PDF тайлан",
    `<div class="p-5 no-print"><button onclick="window.print()" class="w-full py-3 bg-primary text-primary-foreground rounded font-medium">PDF болгон хадгалах</button></div><div class="print-receipt hidden"><div class="receipt-page"><h2 class="receipt-title">АЖИЛТНЫ ЗАХИАЛГЫН НЭГТГЭЛ</h2><p><b>Ажилтан:</b> ${names}</p><p><b>Захиалга:</b> ${orders.length}</p><table class="receipt-table"><thead><tr><th>№</th><th>Бараа</th><th>Нийт тоо</th></tr></thead><tbody>${Object.entries(
      map,
    )
      .map(
        ([n, q], i) => `<tr><td>${i + 1}</td><td>${n}</td><td>${q}</td></tr>`,
      )
      .join("")}</tbody></table></div></div>`,
    "max-w-xl",
  );
}
function saveWorker() {
  const c = state.customers.find((x) => x.id === state.workerCustomer),
    e = state.employees.find((x) => x.id === state.orderEmployee),
    items = state.products
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
  if (!items.length) return alert("Бараа сонгоно уу");
  state.orders.push({
    id: String(state.orders.length + 1),
    customerId: c.id,
    customerName: c.name,
    items,
    total: items.reduce((s, i) => s + i.total, 0),
    status: "pending",
    employeeId: e.id,
    employeeName: e.name,
    isPaid: state.isPaid,
    paymentTerm: state.paymentTerm,
    createdAt: new Date(),
  });
  items.forEach((i) => stock(i.productId, i.quantity, "out"));
  if (!state.selectedWorkers.includes(e.id)) state.selectedWorkers.push(e.id);
  state.workerQty = {};
  state.isPaid = false;
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
  state.currentView = emp.role === "admin" ? "admin" : "worker";
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
function csv(name, rows) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }),
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
  saveProduct,
  categoryModal,
  employeeModal,
  orderModal,
  saveOrder,
  orderDetail,
  applyStock,
  setWorkerQty,
  pickerModal,
  pickerSearch,
  toggleWorker,
  workerSelectModal,
  toggleWorkerOnly,
  employeePdf,
  saveWorker,
  login,
  logout,
  saveEmployee,
  confirmDelete,
  deleteNow,
  delEmployee,
  delProduct,
  setOrder,
  csv,
  finishCount,
});
render();
