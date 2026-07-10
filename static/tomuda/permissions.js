/**
 * Tomuda permission catalog — mirror in dashboard/permissions.py
 */
(function () {
  const PERM_ACTIONS = [
    { id: "view", label: "Харах" },
    { id: "create", label: "Нэмэх" },
    { id: "edit", label: "Засах" },
    { id: "delete", label: "Устгах" },
  ];

  const CRUD = ["view", "create", "edit", "delete"];

  const PERM_GROUPS = [
    {
      id: "general",
      label: "Ерөнхий эрх",
      modules: [
        { id: "customers", label: "Харилцагч", actions: CRUD },
        { id: "products", label: "Бараа", actions: CRUD },
        { id: "warehouse", label: "Агуулах", actions: CRUD },
        { id: "employees", label: "Ажилтан", actions: CRUD },
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
        { id: "employeeAdd", label: "Ажилтан нэмэх", actions: CRUD },
        { id: "stockIn", label: "Орлого", actions: CRUD },
        { id: "stockOut", label: "Зарлага", actions: CRUD },
        { id: "reports", label: "Тайлан", actions: CRUD },
        { id: "receipts", label: "Баримтууд", actions: CRUD },
        { id: "promotions", label: "Урамшуулал", actions: CRUD },
        { id: "stockAlert", label: "Үлдэгдлийн мэдэгдэл", actions: CRUD },
        { id: "permissions", label: "Эрх үүсгэх", actions: CRUD },
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
      ],
    },
    {
      id: "system",
      label: "Системийн эрх",
      modules: [
        { id: "excelExport", label: "Excel файл татах", actions: CRUD },
        { id: "excelImport", label: "Excel файл оруулах", actions: CRUD },
        { id: "excelTemplate", label: "Формат татах", actions: CRUD },
      ],
    },
  ];

  /** Kept for role templates / legacy saves; not shown in grant UI. */
  const HIDDEN_MODULES = [
    { id: "dashboard", label: "Админ самбар", actions: ["view"] },
    { id: "orders", label: "Захиалга", actions: CRUD },
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
    "employeeAdd.view": ["employees.create"],
    "employeeAdd.create": ["employees.create"],
    "employeeAdd.edit": ["employees.create", "employees.edit"],
    "employeeAdd.delete": ["employees.create"],
    "stockIn.view": ["warehouse.edit", "warehouse.view"],
    "stockIn.create": ["warehouse.edit"],
    "stockIn.edit": ["warehouse.edit"],
    "stockIn.delete": ["warehouse.edit"],
    "stockOut.view": ["warehouse.edit", "warehouse.view"],
    "stockOut.create": ["warehouse.edit"],
    "stockOut.edit": ["warehouse.edit"],
    "stockOut.delete": ["warehouse.edit"],
    "receipts.view": ["warehouse.view"],
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
    "excelImport.view": ["products.create", "customers.create"],
    "excelImport.create": ["products.create", "customers.create"],
    "excelImport.edit": ["products.create", "customers.create"],
    "excelImport.delete": ["products.create", "customers.create"],
    "excelTemplate.view": ["products.create", "customers.create"],
    "excelTemplate.create": ["products.create", "customers.create"],
    "excelTemplate.edit": ["products.create", "customers.create"],
    "excelTemplate.delete": ["products.create", "customers.create"],
    "customers.create": ["customerAdd.create", "customerAdd.view"],
    "products.create": ["productAdd.create", "productAdd.view"],
    "employees.create": ["employeeAdd.create", "employeeAdd.view"],
    "dashboard.view": ["settings.view", "permissions.view"],
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
    }
    if (set.has("warehouse.edit")) {
      ["count", "stockIn", "stockOut"].forEach(addCrud);
    }
    if (set.has("warehouse.view")) addCrud("receipts");
    if (set.has("customers.create")) addCrud("customerAdd");
    if (set.has("products.create")) {
      addCrud("productAdd");
      addCrud("categoryAdd");
    }
    if (set.has("products.edit")) addCrud("categoryAdd");
    if (set.has("employees.create")) addCrud("employeeAdd");
    if (set.has("reports.view")) addCrud("excelExport");
    if (set.has("products.create") || set.has("customers.create")) {
      addCrud("excelImport");
      addCrud("excelTemplate");
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
      "count.view",
      "count.create",
      "count.edit",
      "receipts.view",
    ],
    delivery: ["orders.view"],
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
    employeePermissions: "permissions.view",
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
    ["warehouse", "Агуулах", "warehouse.view"],
    ["employees", "Ажилтан", "employees.view"],
    ["inventory", "Агуулахын бүртгэл", "warehouse.view"],
    ["reports", "Тайлан", "reports.view"],
    ["promotions", "Урамшуулал", "promotions.view"],
    ["admin", "Админ", "dashboard.view"],
    ["delivery", "Хүргэлт", "orders.view"],
  ];

  function normalizeKeys(list) {
    if (!Array.isArray(list)) return [];
    return expandLegacyKeys(list).filter((k) => ALL_KEY_SET.has(k));
  }

  function resolveEmployeePermissions(emp) {
    if (!emp) return new Set();
    const custom = normalizeKeys(emp.permissions);
    if (custom.length) return new Set(custom);
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
    if (viewId === "count") {
      return hasPermission("count.view", emp) || hasPermission("warehouse.edit", emp);
    }
    if (viewId === "warehouseReceipts") {
      return (
        hasPermission("receipts.view", emp) || hasPermission("warehouse.view", emp)
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
    return NAV_ITEMS.filter(([, , perm]) => hasPermission(perm, emp));
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
      set.has("orderHistory.view")
    ) {
      set.add("dashboard.view");
    }
    return [...set].filter((k) => ALL_KEY_SET.has(k));
  }

  function permToggleHtml(key, checked, ariaLabel, esc, actionId, disabled = false) {
    const dis = disabled ? " disabled" : "";
    const labelClass = disabled ? "perm-toggle is-disabled" : "perm-toggle";
    return `<label class="${labelClass}"><input type="checkbox" name="permissions" value="${esc(key)}" data-perm-action="${esc(actionId)}"${checked ? " checked" : ""}${dis} aria-label="${esc(ariaLabel)}" onchange="TOMUDA_PERMISSIONS.syncPermissionRowDeps(this)"><span class="perm-toggle__track" aria-hidden="true"><span class="perm-toggle__thumb"></span></span></label>`;
  }

  function syncPermissionRowDeps(changedInput) {
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
        el.disabled = !viewOn;
        el.closest(".perm-toggle")?.classList.toggle("is-disabled", !viewOn);
        if (!viewOn) el.checked = false;
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
        if (viewInput) syncPermissionRowDeps(viewInput);
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
      const disabled =
        action.id !== "view" && mod.actions.includes("view") && !viewChecked;
      return `<div class="perm-matrix__cell${disabled ? " perm-matrix__cell--disabled" : ""}"><span class="perm-matrix__action-label">${esc(action.label)}</span>${permToggleHtml(key, checked, aria, esc, action.id, disabled)}</div>`;
    }).join("");
    return `<article class="perm-matrix__row" data-perm-module="${esc(mod.id)}"><h3 class="perm-matrix__module">${esc(mod.label)}</h3><div class="perm-matrix__cells">${cells}</div></article>`;
  }

  function permissionsFieldHtml(selectedKeys = [], role = "sales", opts = {}) {
    const selected = new Set(normalizeKeys(selectedKeys));
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
    return `<section class="perm-panel"${formAttr}><div class="perm-panel__head"><div><p class="perm-panel__title">Эрх</p><p class="perm-panel__hint">Ерөнхий, дотоод, системийн эрхүүдийг харах / нэмэх / засах / устгах-аар сонгоно.</p></div>${resetBtn}</div>${groupsHtml}</section>`;
  }

  function templateForRole(role) {
    return [...(ROLE_TEMPLATES[role] || ROLE_TEMPLATES.sales)];
  }

  function mergePermissionsForEmployees(employees) {
    const union = new Set();
    (employees || []).forEach((emp) => {
      resolveEmployeePermissions(emp).forEach((k) => union.add(k));
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
    resolveEmployeePermissions,
    hasPermission,
    canAccessView,
    allowedNavForEmployee,
    permissionsFromForm,
    permissionsFieldHtml,
    syncPermissionRowDeps,
    syncAllPermissionRowDeps,
    templateForRole,
    mergePermissionsForEmployees,
  };
})();
