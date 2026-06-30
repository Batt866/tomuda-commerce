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

  const PERM_MODULES = [
    { id: "dashboard", label: "Админ самбар", actions: ["view"] },
    { id: "products", label: "Бараа", actions: ["view", "create", "edit", "delete"] },
    {
      id: "customers",
      label: "Харилцагч",
      actions: ["view", "create", "edit", "delete"],
    },
    { id: "warehouse", label: "Агуулах", actions: ["view", "edit"] },
    { id: "orders", label: "Баримт", actions: ["view", "create", "edit", "delete"] },
    { id: "reports", label: "Тайлан", actions: ["view"] },
    {
      id: "employees",
      label: "Ажилтан",
      actions: ["view", "create", "edit", "delete"],
    },
    {
      id: "permissions",
      label: "Эрх",
      actions: ["view", "create", "edit", "delete"],
    },
    { id: "settings", label: "Тохиргоо", actions: ["view"] },
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
    const mod = PERM_MODULES.find((m) => m.label === moduleLabel);
    const label = mod?.label || moduleLabel;
    return `${label} ${ACTION_LABELS[actionId] || actionId}`;
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
      "products.view",
      "warehouse.view",
    ],
    warehouse: ["warehouse.view", "warehouse.edit", "products.view"],
    delivery: ["orders.view"],
  };

  const VIEW_PERMISSION = {
    admin: "dashboard.view",
    worker: "orders.view",
    warehouse: "warehouse.view",
    inventory: "warehouse.view",
    count: "warehouse.edit",
    products: "products.view",
    customers: "customers.view",
    employees: "employees.view",
    employeePermissions: "permissions.view",
    reports: "reports.view",
    promotions: "settings.view",
    warehouseReceipts: "warehouse.view",
    delivery: "orders.view",
    orders: "orders.view",
  };

  const NAV_ITEMS = [
    ["worker", "Захиалга үүсгэх", "orders.view"],
    ["customers", "Харилцагч", "customers.view"],
    ["products", "Бараа", "products.view"],
    ["warehouse", "Агуулах", "warehouse.view"],
    ["count", "Тооллого", "warehouse.edit"],
    ["employees", "Ажилтан", "employees.view"],
    ["inventory", "Агуулахын бүртгэл", "warehouse.view"],
    ["reports", "Тайлан", "reports.view"],
    ["promotions", "Урамшуулал", "settings.view"],
    ["admin", "Админ", "dashboard.view"],
    ["delivery", "Хүргэлт", "orders.view"],
  ];

  function normalizeKeys(list) {
    if (!Array.isArray(list)) return [];
    return list.filter((k) => ALL_KEYS.includes(k));
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
    return resolveEmployeePermissions(emp).has(key);
  }

  function canAccessView(viewId, emp) {
    const perm = VIEW_PERMISSION[viewId];
    if (!perm) return false;
    return hasPermission(perm, emp);
  }

  function allowedNavForEmployee(emp) {
    return NAV_ITEMS.filter(([, , perm]) => hasPermission(perm, emp));
  }

  function permissionsFromForm(form) {
    const root = form || document;
    const keys = [];
    root.querySelectorAll('input[name="permissions"]:checked').forEach((el) => {
      if (ALL_KEYS.includes(el.value)) keys.push(el.value);
    });
    return keys;
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
    const formAttr = opts.formAttr ? ` ${opts.formAttr}` : ' data-permissions-form';
    const resetBtn = hideRoleReset
      ? ""
      : `<button type="button" class="perm-panel__reset text-xs text-primary" onclick="syncEmployeePermissionsFromRole()">Эрхийг албан туслах (${esc(role || "sales")})</button>`;
    const headCells = PERM_ACTIONS.map(
      (a) => `<span class="perm-matrix__head-action">${esc(a.label)}</span>`,
    ).join("");
    const rows = PERM_MODULES.map((mod) => {
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
    }).join("");
    return `<section class="perm-panel"${formAttr}><div class="perm-panel__head"><div><p class="perm-panel__title">Эрх</p><p class="perm-panel__hint">Модуль бүрт харах, нэмэх, засах, устгах эрхийг сонгоно.</p></div>${resetBtn}</div><div class="perm-matrix-wrap"><div class="perm-matrix"><div class="perm-matrix__row perm-matrix__row--head" aria-hidden="true"><span class="perm-matrix__module">Модуль</span>${headCells}</div>${rows}</div></div></section>`;
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
