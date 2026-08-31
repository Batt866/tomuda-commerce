/**
 * Tomuda permission catalog — mirror in dashboard/permissions.py
 */
(function () {
  const PERM_ACTIONS = [
    { id: "view", label: "Харах" },
    { id: "create", label: "Нэмэх" },
    { id: "edit", label: "Засах" },
    { id: "delete", label: "Устгах" },
    { id: "rate", label: "Үнэлгээ" },
  ];

  const CRUD = ["view", "create", "edit", "delete"];

  const PERM_GROUPS = [
    {
      id: "general",
      label: "Ерөнхий эрх",
      modules: [
        { id: "customers", label: "Харилцагч", actions: [...CRUD, "rate"] },
        { id: "products", label: "Бараа", actions: CRUD },
        { id: "warehouse", label: "Агуулах", actions: CRUD },
        { id: "employees", label: "Ажилтан", actions: CRUD },
        { id: "suppliers", label: "Нийлүүлэгч", actions: CRUD },
      ],
    },
    {
      id: "internal",
      label: "Дотоод эрх",
      modules: [
        { id: "count", label: "Тооллого", actions: CRUD },
        { id: "customerAdd", label: "Харилцагч нэмэх", actions: CRUD },
        { id: "productAdd", label: "Бараа нэмэх", actions: CRUD },
        { id: "categoryAdd", label: "Төрөл нэмэх", actions: CRUD },
        { id: "groupAdd", label: "Бүлэг нэмэх", actions: CRUD },
        { id: "productCost", label: "Өртөг үнэ харах", actions: ["view"] },
        { id: "employeeAdd", label: "Ажилтан нэмэх", actions: CRUD },
        { id: "stockIn", label: "Орлого", actions: CRUD },
        { id: "stockOut", label: "Зарлага", actions: CRUD },
        { id: "reports", label: "Борлуулалтын тайлан", actions: CRUD },
        { id: "salesInfo", label: "Борлуулалтын мэдээ", actions: CRUD },
        { id: "stockReports", label: "Орлого/зарлага тайлан", actions: CRUD },
        { id: "warehousePrepare", label: "Агуулах бэлдэх", actions: CRUD },
        { id: "receipts", label: "Баримтууд", actions: CRUD },
        { id: "promotions", label: "Урамшуулал", actions: CRUD },
        { id: "stockAlert", label: "Үлдэгдлийн мэдэгдэл", actions: CRUD },
        { id: "permissions", label: "Эрхийн тохиргоо", actions: CRUD },
        {
          id: "percentDiscount",
          label: "Шууд төлөлтийн хувь оруулах",
          actions: CRUD,
        },
        {
          id: "orderHistory",
          label: "Захиалгын түүх шалгах",
          actions: CRUD,
        },
        { id: "deletionLog", label: "Устгасан бүртгэл", actions: ["view"] },
        { id: "orderDeliveryMark", label: "Хүргэлт тэмдэглэх", actions: ["view"] },
        {
          id: "orderDeliveryConfirm",
          label: "Хүргэлт баталгаажуулах",
          actions: ["view"],
        },
      ],
    },
    {
      id: "system",
      label: "Системийн эрх",
      modules: [
        { id: "excelExport", label: "Мэдээлэл татах", actions: CRUD },
        { id: "excelImport", label: "Excel файл оруулах", actions: CRUD },
        { id: "excelTemplate", label: "Формат татах", actions: CRUD },
      ],
    },
  ];

  /** Kept for role templates / legacy saves; not shown in grant UI. */
  const HIDDEN_MODULES = [
    { id: "dashboard", label: "Админ самбар", actions: ["view"] },
    { id: "orders", label: "Захиалга", actions: [...CRUD, "markDelivered", "confirmDelivery"] },
    { id: "settings", label: "Тохиргоо", actions: ["view"] },
  ];

  const PERM_MODULES = [
    ...PERM_GROUPS.flatMap((g) => g.modules),
    ...HIDDEN_MODULES,
  ];

  const ACTION_LABELS = {
    view: "харах",
    create: "нэмэх",
    edit: "засах",
    delete: "устгах",
    rate: "үнэлгээ",
    markDelivered: "хүргэлт тэмдэглэх",
    confirmDelivery: "хүргэлт баталгаажуулах",
  };

  function permissionKey(moduleId, actionId) {
    return `${moduleId}.${actionId}`;
  }

  function permissionLabel(moduleLabel, actionId) {
    return `${moduleLabel} ${ACTION_LABELS[actionId] || actionId}`;
  }

  const CATALOG = PERM_MODULES.map((mod) => ({
    id: mod.id,
    label: mod.label,
    permissions: mod.actions.map((actionId) => ({
      key: permissionKey(mod.id, actionId),
      label: permissionLabel(mod.label, actionId),
      action: actionId,
    })),
  }));

  const ALL_KEYS = CATALOG.flatMap((c) => c.permissions.map((p) => p.key));
  const ALL_KEY_SET = new Set(ALL_KEYS);
  const VISIBLE_GRANT_KEYS = PERM_GROUPS.flatMap((g) =>
    g.modules.flatMap((m) => m.actions.map((a) => permissionKey(m.id, a))),
  ).filter((k) => ALL_KEY_SET.has(k));

  /** If employee has any of these, treat requested key as granted (legacy + aliases). */
  const PERMISSION_FALLBACKS = {
    "count.view": ["warehouse.edit"],
    "count.create": ["warehouse.edit"],
    "count.edit": ["warehouse.edit"],
    "count.delete": ["warehouse.edit"],
    "customerAdd.view": ["customers.create"],
    "customerAdd.create": ["customers.create"],
    "customerAdd.edit": ["customers.create", "customers.edit"],
    "customerAdd.delete": ["customers.create"],
    "productAdd.view": ["products.create"],
    "productAdd.create": ["products.create"],
    "productAdd.edit": ["products.create", "products.edit"],
    "productAdd.delete": ["products.create"],
    "categoryAdd.view": ["products.create", "products.edit"],
    "categoryAdd.create": ["products.create", "products.edit"],
    "categoryAdd.edit": ["products.edit"],
    "categoryAdd.delete": ["products.edit", "products.delete"],
    "groupAdd.view": [
      "categoryAdd.view",
      "categoryAdd.create",
      "products.create",
      "products.edit",
    ],
    "groupAdd.create": [
      "categoryAdd.create",
      "products.create",
      "products.edit",
    ],
    "groupAdd.edit": ["categoryAdd.edit", "products.edit", "groupAdd.create"],
    "groupAdd.delete": [
      "categoryAdd.delete",
      "products.edit",
      "products.delete",
    ],
    "productCost.view": ["warehouse.edit", "stockIn.view", "stockIn.edit"],
    "employeeAdd.view": ["employees.create"],
    "employeeAdd.create": ["employees.create"],
    "employeeAdd.edit": ["employees.create", "employees.edit"],
    "employeeAdd.delete": ["employees.create"],
    "warehouse.view": ["warehouse.edit"],
    "stockIn.view": ["warehouse.edit", "warehouse.view"],
    "stockIn.create": ["warehouse.edit"],
    "stockIn.edit": ["warehouse.edit"],
    "stockIn.delete": ["warehouse.edit"],
    "stockOut.view": ["warehouse.edit", "warehouse.view"],
    "stockOut.create": ["warehouse.edit"],
    "stockOut.edit": ["warehouse.edit"],
    "stockOut.delete": ["warehouse.edit"],
    "receipts.view": ["warehouse.view", "warehouse.edit"],
    "receipts.create": ["warehouse.view", "warehouse.edit"],
    "receipts.edit": ["warehouse.edit"],
    "receipts.delete": ["warehouse.edit"],
    "promotions.view": ["settings.view"],
    "promotions.create": ["settings.view"],
    "promotions.edit": ["settings.view"],
    "promotions.delete": ["settings.view"],
    "stockAlert.view": ["settings.view"],
    "stockAlert.create": ["settings.view"],
    "stockAlert.edit": ["settings.view"],
    "stockAlert.delete": ["settings.view"],
    "percentDiscount.view": ["settings.view"],
    "percentDiscount.create": ["settings.view"],
    "percentDiscount.edit": ["settings.view"],
    "percentDiscount.delete": ["settings.view"],
    "orderHistory.view": ["settings.view"],
    "orderHistory.create": ["settings.view"],
    "orderHistory.edit": ["settings.view"],
    "orderHistory.delete": ["settings.view"],
    "excelExport.view": ["reports.view"],
    "excelExport.create": ["reports.view"],
    "excelExport.edit": ["reports.view"],
    "excelExport.delete": ["reports.view"],
    "salesInfo.view": ["reports.view"],
    "salesInfo.create": ["reports.view", "reports.create"],
    "salesInfo.edit": ["reports.edit"],
    "salesInfo.delete": ["reports.delete"],
    "stockReports.view": [
      "warehouse.view",
      "warehouse.edit",
      "stockIn.view",
      "stockOut.view",
      "receipts.view",
      "reports.view",
    ],
    "stockReports.create": ["excelExport.view", "reports.view"],
    "stockReports.edit": ["warehouse.edit", "stockIn.edit", "stockOut.edit"],
    "stockReports.delete": ["warehouse.edit", "receipts.delete"],
    "warehousePrepare.view": ["warehouse.view", "warehouse.edit"],
    "warehousePrepare.create": ["warehouse.view", "warehouse.edit"],
    "warehousePrepare.edit": ["warehouse.edit"],
    "warehousePrepare.delete": ["warehouse.edit"],
    "deletionLog.view": ["settings.view", "stockAlert.view", "orderHistory.view"],
    "excelImport.view": ["products.create", "customers.create"],
    "excelImport.create": ["products.create", "customers.create"],
    "excelImport.edit": ["products.create", "customers.create"],
    "excelImport.delete": ["products.create", "customers.create"],
    "excelTemplate.view": ["products.create", "customers.create"],
    "excelTemplate.create": ["products.create", "customers.create"],
    "excelTemplate.edit": ["products.create", "customers.create"],
    "excelTemplate.delete": ["products.create", "customers.create"],
    "customers.create": ["customerAdd.create", "customerAdd.view"],
    "customers.edit": [
      "customers.create",
      "customerAdd.edit",
      "customerAdd.create",
    ],
    "customers.rate": ["customers.edit"],
    "products.create": ["productAdd.create", "productAdd.view"],
    "employees.create": ["employeeAdd.create", "employeeAdd.view"],
    "dashboard.view": ["settings.view", "permissions.view"],
    "orders.markDelivered": ["orderDeliveryMark.view", "orders.edit"],
    "orders.confirmDelivery": ["orderDeliveryConfirm.view", "orders.edit"],
  };

  function expandLegacyKeys(list) {
    const set = new Set(Array.isArray(list) ? list : []);
    const addCrud = (moduleId) => {
      CRUD.forEach((action) => {
        const key = permissionKey(moduleId, action);
        if (ALL_KEY_SET.has(key)) set.add(key);
      });
    };
    if (set.has("settings.view")) {
      [
        "promotions",
        "stockAlert",
        "percentDiscount",
        "orderHistory",
        "dashboard",
      ].forEach(addCrud);
      if (ALL_KEY_SET.has("settings.view")) set.add("settings.view");
      if (ALL_KEY_SET.has("deletionLog.view")) set.add("deletionLog.view");
    }
    if (set.has("warehouse.edit")) {
      if (ALL_KEY_SET.has("warehouse.view")) set.add("warehouse.view");
      ["count", "stockIn", "stockOut", "suppliers"].forEach(addCrud);
    }
    if (set.has("warehouse.view") && ALL_KEY_SET.has("suppliers.view")) {
      set.add("suppliers.view");
    }
    if (set.has("warehouse.view") || set.has("warehouse.edit")) addCrud("receipts");
    if (set.has("customers.create")) addCrud("customerAdd");
    if (set.has("customers.edit") && ALL_KEY_SET.has("customers.rate")) {
      set.add("customers.rate");
    }
    if (set.has("products.create")) {
      addCrud("productAdd");
      addCrud("categoryAdd");
      addCrud("groupAdd");
    }
    if (set.has("products.edit")) {
      addCrud("categoryAdd");
      addCrud("groupAdd");
    }
    if (set.has("warehouse.edit") && ALL_KEY_SET.has("productCost.view")) {
      set.add("productCost.view");
    }
    if (set.has("employees.create")) addCrud("employeeAdd");
    if (set.has("reports.view")) addCrud("excelExport");
    if (set.has("reports.view")) addCrud("salesInfo");
    if (set.has("products.create") || set.has("customers.create")) {
      addCrud("excelImport");
      addCrud("excelTemplate");
    }
    if (set.has("warehouse.view") || set.has("warehouse.edit")) {
      addCrud("warehousePrepare");
      addCrud("stockReports");
    }
    return [...set];
  }

  const ROLE_TEMPLATES = {
    admin: [...ALL_KEYS],
    sales: [
      "dashboard.view",
      "orders.view",
      "orders.create",
      "orders.edit",
      "customers.view",
      "customers.create",
      "customers.edit",
      "customers.rate",
      "customerAdd.view",
      "customerAdd.create",
      "products.view",
      "warehouse.view",
      "excelExport.view",
      "excelExport.create",
    ],
    warehouse: [
      "warehouse.view",
      "warehouse.edit",
      "products.view",
      "stockIn.view",
      "stockIn.create",
      "stockIn.edit",
      "stockOut.view",
      "stockOut.create",
      "stockOut.edit",
      "suppliers.view",
      "suppliers.create",
      "suppliers.edit",
      "count.view",
      "count.create",
      "count.edit",
      "receipts.view",
      "warehousePrepare.view",
      "stockReports.view",
      "productCost.view",
    ],
    delivery: ["orders.view", "orderDeliveryMark.view"],
    manager: [
      "dashboard.view",
      "orders.view",
      "orders.create",
      "orders.edit",
      "customers.view",
      "customers.create",
      "customers.edit",
      "customers.rate",
      "customerAdd.view",
      "customerAdd.create",
      "products.view",
      "warehouse.view",
      "receipts.view",
      "reports.view",
      "excelExport.view",
      "excelExport.create",
      "employees.view",
    ],
    user: [
      "orders.view",
      "customers.view",
      "customers.rate",
      "products.view",
    ],
  };

  const VIEW_PERMISSION = {
    admin: "dashboard.view",
    worker: "orders.view",
    warehouse: "warehouse.view",
    inventory: "warehouse.view",
    count: "count.view",
    products: "products.view",
    customers: "customers.view",
    employees: "employees.view",
    suppliers: "suppliers.view",
    employeePermissions: "permissions.view",
    stockReports: "stockReports.view",
    reports: "reports.view",
    promotions: "promotions.view",
    warehouseReceipts: "receipts.view",
    delivery: "orders.view",
    orders: "orders.view",
  };

  const NAV_ITEMS = [
    ["worker", "Захиалга үүсгэх", "orders.view"],
    ["customers", "Харилцагч", "customers.view"],
    ["products", "Бараа", "products.view"],
    ["inventory", "Нярав", "warehouse.view"],
    ["warehouse", "Агуулах", "warehouse.view"],
    ["employees", "Ажилтан", "employees.view"],
    ["suppliers", "Нийлүүлэгч", "suppliers.view"],
    ["stockReports", "Тайлан", "reports.view"],
    ["promotions", "Урамшуулал", "promotions.view"],
    ["admin", "Админ", "dashboard.view"],
  ];

  function normalizeKeys(list) {
    if (!Array.isArray(list)) return [];
    return expandLegacyKeys(list).filter((k) => ALL_KEY_SET.has(k));
  }

  /** Raw saved keys for grant UI — no legacy expansion (avoids phantom checks). */
  function storedPermissionKeys(emp) {
    if (!emp) return [];
    const raw = Array.isArray(emp.permissions) ? emp.permissions : [];
    const filtered = raw.filter((k) => ALL_KEY_SET.has(k));
    if (filtered.length) return filtered;
    return templateForRole(emp.role || "sales");
  }

  /** Hidden UI keys (orders/dashboard/settings) that grant form cannot tick. */
  function completeAppAccess(set) {
    if (
      VISIBLE_GRANT_KEYS.length &&
      VISIBLE_GRANT_KEYS.every((k) => set.has(k))
    ) {
      ALL_KEYS.forEach((k) => set.add(k));
      return set;
    }
    if (set.has("customers.view") && set.has("products.view")) {
      set.add("orders.view");
      if (
        set.has("customers.create") ||
        set.has("customerAdd.create") ||
        set.has("customerAdd.view")
      ) {
        set.add("orders.create");
        set.add("orders.edit");
      }
    }
    if (
      set.has("orderDeliveryMark.view") ||
      set.has("orderDeliveryConfirm.view")
    ) {
      set.add("orders.view");
      set.add("orders.markDelivered");
      set.add("orders.confirmDelivery");
    }
    if (
      set.has("promotions.view") ||
      set.has("stockAlert.view") ||
      set.has("percentDiscount.view") ||
      set.has("orderHistory.view") ||
      set.has("deletionLog.view") ||
      set.has("permissions.view")
    ) {
      set.add("dashboard.view");
      set.add("settings.view");
    }
    return set;
  }

  function resolveEmployeePermissions(emp) {
    if (!emp) return new Set();
    const custom = normalizeKeys(emp.permissions);
    if (custom.length) return completeAppAccess(new Set(custom));
    const role = emp.role || "sales";
    return new Set(ROLE_TEMPLATES[role] || []);
  }

  function hasPermission(key, emp) {
    if (!key) return false;
    const perms = resolveEmployeePermissions(emp);
    if (perms.has(key)) return true;
    const fallbacks = PERMISSION_FALLBACKS[key] || [];
    return fallbacks.some((alt) => perms.has(alt));
  }

  function canAccessView(viewId, emp) {
    const perm = VIEW_PERMISSION[viewId];
    if (!perm) return false;
    if (viewId === "warehouse" || viewId === "inventory") {
      if (viewId === "warehouse") {
        return (
          hasPermission("warehousePrepare.view", emp) ||
          hasPermission("warehouse.view", emp) ||
          hasPermission("warehouse.edit", emp)
        );
      }
      return (
        hasPermission("warehouse.view", emp) || hasPermission("warehouse.edit", emp)
      );
    }
    if (viewId === "count") {
      return hasPermission("count.view", emp) || hasPermission("warehouse.edit", emp);
    }
    if (viewId === "warehouseReceipts") {
      return (
        hasPermission("receipts.view", emp) ||
        hasPermission("warehouse.view", emp) ||
        hasPermission("warehouse.edit", emp)
      );
    }
    if (viewId === "stockReports") {
      return (
        hasPermission("stockReports.view", emp) ||
        hasPermission("warehouse.view", emp) ||
        hasPermission("warehouse.edit", emp) ||
        hasPermission("stockIn.view", emp) ||
        hasPermission("stockOut.view", emp) ||
        hasPermission("receipts.view", emp) ||
        hasPermission("reports.view", emp)
      );
    }
    if (viewId === "promotions") {
      return (
        hasPermission("promotions.view", emp) || hasPermission("settings.view", emp)
      );
    }
    if (viewId === "admin") {
      return (
        hasPermission("dashboard.view", emp) ||
        hasPermission("settings.view", emp) ||
        hasPermission("permissions.view", emp)
      );
    }
    return hasPermission(perm, emp);
  }

  function allowedNavForEmployee(emp) {
    if (emp?.role === "delivery") return [["delivery", "Хүргэлт"]];
    return NAV_ITEMS.filter(([, , perm]) => hasPermission(perm, emp));
  }

  function ensureModuleViewDeps(set) {
    PERM_MODULES.forEach((mod) => {
      if (!mod.actions.includes("view")) return;
      const viewKey = permissionKey(mod.id, "view");
      const needsView = mod.actions.some(
        (actionId) =>
          actionId !== "view" && set.has(permissionKey(mod.id, actionId)),
      );
      if (needsView) set.add(viewKey);
    });
  }

  function permissionsFromForm(form) {
    const root = form || document;
    const keys = [];
    root.querySelectorAll('input[name="permissions"]:checked').forEach((el) => {
      if (ALL_KEY_SET.has(el.value)) keys.push(el.value);
    });
    const set = new Set(keys);
    if (set.has("customerAdd.create") || set.has("customerAdd.view")) {
      set.add("customers.create");
    }
    if (set.has("productAdd.create") || set.has("productAdd.view")) {
      set.add("products.create");
    }
    if (set.has("employeeAdd.create") || set.has("employeeAdd.view")) {
      set.add("employees.create");
    }
    if (
      set.has("promotions.view") ||
      set.has("stockAlert.view") ||
      set.has("percentDiscount.view") ||
      set.has("orderHistory.view") ||
      set.has("deletionLog.view")
    ) {
      set.add("dashboard.view");
    }
    ensureModuleViewDeps(set);
    completeAppAccess(set);
    return [...set].filter((k) => ALL_KEY_SET.has(k));
  }

  /** Keys for grant UI matrix — literal saved keys only, no legacy expansion. */
  function keysForGrantUi(list) {
    return (Array.isArray(list) ? list : []).filter((k) => ALL_KEY_SET.has(k));
  }

  function onPermToggleChange(changedInput) {
    const main = document.querySelector(".app-main");
    const scrollTop = main?.scrollTop ?? 0;
    const row = changedInput?.closest?.(".perm-matrix__row");
    if (
      row &&
      changedInput?.checked &&
      changedInput.dataset.permAction !== "view"
    ) {
      const viewInput = row.querySelector(
        'input[name="permissions"][data-perm-action="view"]',
      );
      if (viewInput && !viewInput.checked) viewInput.checked = true;
    }
    syncPermissionRowDeps(changedInput);
    if (typeof window !== "undefined" && window.state) {
      window.state.permissionGrantDirty = true;
    }
    requestAnimationFrame(() => {
      if (main) main.scrollTop = scrollTop;
    });
  }

  function permToggleHtml(key, checked, ariaLabel, esc, actionId, disabled = false) {
    const dis = disabled ? " disabled" : "";
    const labelClass = disabled ? "perm-toggle is-disabled" : "perm-toggle";
    return `<label class="${labelClass}"><input type="checkbox" name="permissions" value="${esc(key)}" data-perm-action="${esc(actionId)}"${checked ? " checked" : ""}${dis} aria-label="${esc(ariaLabel)}" onchange="TOMUDA_PERMISSIONS.onPermToggleChange(this)"><span class="perm-toggle__track" aria-hidden="true"><span class="perm-toggle__thumb"></span></span></label>`;
  }

  function syncPermissionRowDeps(changedInput, opts = {}) {
    const init = !!opts.init;
    const row = changedInput?.closest?.(".perm-matrix__row");
    if (!row || row.classList.contains("perm-matrix__row--head")) return;
    const viewInput = row.querySelector(
      'input[name="permissions"][data-perm-action="view"]',
    );
    if (!viewInput) return;
    const viewOn = viewInput.checked;
    row
      .querySelectorAll('input[name="permissions"]:not([data-perm-action="view"])')
      .forEach((el) => {
        el.closest(".perm-toggle")?.classList.toggle("is-disabled", !viewOn);
        el
          .closest(".perm-matrix__cell")
          ?.classList.toggle("perm-matrix__cell--disabled", !viewOn);
        if (!viewOn && !init && changedInput === viewInput) el.checked = false;
      });
  }

  function syncAllPermissionRowDeps(root) {
    const form = root || document.querySelector("[data-permissions-form]");
    if (!form) return;
    form
      .querySelectorAll(".perm-matrix__row:not(.perm-matrix__row--head)")
      .forEach((row) => {
        const viewInput = row.querySelector(
          'input[name="permissions"][data-perm-action="view"]',
        );
        if (viewInput) syncPermissionRowDeps(viewInput, { init: true });
      });
  }

  function moduleRowHtml(mod, selected, esc) {
    const viewChecked = mod.actions.includes("view")
      ? selected.has(permissionKey(mod.id, "view"))
      : true;
    const cells = PERM_ACTIONS.map((action) => {
      if (!mod.actions.includes(action.id)) {
        return `<div class="perm-matrix__cell perm-matrix__cell--na"><span class="perm-matrix__action-label">${esc(action.label)}</span><span class="perm-matrix__na" aria-hidden="true">—</span></div>`;
      }
      const key = permissionKey(mod.id, action.id);
      const checked = selected.has(key);
      const aria = `${mod.label} — ${action.label}`;
      const muted =
        action.id !== "view" && mod.actions.includes("view") && !viewChecked;
      return `<div class="perm-matrix__cell${muted ? " perm-matrix__cell--disabled" : ""}"><span class="perm-matrix__action-label">${esc(action.label)}</span>${permToggleHtml(key, checked, aria, esc, action.id, false)}</div>`;
    }).join("");
    return `<article class="perm-matrix__row" data-perm-module="${esc(mod.id)}"><h3 class="perm-matrix__module">${esc(mod.label)}</h3><div class="perm-matrix__cells">${cells}</div></article>`;
  }

  function permissionsFieldHtml(selectedKeys = [], role = "sales", opts = {}) {
    const selected = new Set(keysForGrantUi(selectedKeys));
    const esc =
      typeof window !== "undefined" && window.esc
        ? window.esc
        : (s) =>
            String(s ?? "")
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;");
    const hideRoleReset = !!opts.hideRoleReset;
    const formAttr = opts.formAttr ? ` ${opts.formAttr}` : " data-permissions-form";
    const resetBtn = hideRoleReset
      ? ""
      : `<button type="button" class="perm-panel__reset text-xs text-primary" onclick="syncEmployeePermissionsFromRole()">Эрхийг албан тушаал (${esc(role || "sales")})</button>`;
    const headCells = PERM_ACTIONS.map(
      (a) => `<span class="perm-matrix__head-action">${esc(a.label)}</span>`,
    ).join("");
    const groupsHtml = PERM_GROUPS.map((group) => {
      const rows = group.modules
        .map((mod) => moduleRowHtml(mod, selected, esc))
        .join("");
      return `<section class="perm-group" data-perm-group="${esc(group.id)}"><h3 class="perm-group__title">${esc(group.label)}</h3><div class="perm-matrix-wrap"><div class="perm-matrix"><div class="perm-matrix__row perm-matrix__row--head" aria-hidden="true"><span class="perm-matrix__module">Эрх</span>${headCells}</div>${rows}</div></div></section>`;
    }).join("");
    return `<section class="perm-panel"${formAttr}><div class="perm-panel__head"><div><p class="perm-panel__title">Эрх</p><p class="perm-panel__hint">Ерөнхий, дотоод, системийн эрхүүдийг харах / нэмэх / засах / устгах / үнэлгээ-ээр сонгоно. Дээрх албан тушаалын загвараар хурдан бөглөнө.</p></div>${resetBtn}</div>${groupsHtml}</section>`;
  }

  function templateForRole(role) {
    return [...(ROLE_TEMPLATES[role] || ROLE_TEMPLATES.sales)];
  }

  function mergePermissionsForEmployees(employees) {
    const union = new Set();
    (employees || []).forEach((emp) => {
      storedPermissionKeys(emp).forEach((k) => union.add(k));
    });
    return [...union];
  }

  window.TOMUDA_PERMISSIONS = {
    CATALOG,
    ALL_KEYS,
    PERM_ACTIONS,
    PERM_MODULES,
    PERM_GROUPS,
    ROLE_TEMPLATES,
    VIEW_PERMISSION,
    NAV_ITEMS,
    permissionKey,
    normalizeKeys,
    keysForGrantUi,
    storedPermissionKeys,
    resolveEmployeePermissions,
    hasPermission,
    canAccessView,
    allowedNavForEmployee,
    permissionsFromForm,
    permissionsFieldHtml,
    syncPermissionRowDeps,
    syncAllPermissionRowDeps,
    onPermToggleChange,
    templateForRole,
    mergePermissionsForEmployees,
  };
})();
