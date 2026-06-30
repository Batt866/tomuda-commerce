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
    { id: "dashboard", label: "Dashboard", actions: ["view"] },
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
      (a) => `<th scope="col" class="perm-table__action">${esc(a.label)}</th>`,
    ).join("");
    const rows = PERM_MODULES.map((mod) => {
      const cells = PERM_ACTIONS.map((action) => {
        if (!mod.actions.includes(action.id)) {
          return `<td class="perm-table__cell perm-table__cell--na"><span class="perm-table__na" aria-hidden="true">—</span></td>`;
        }
        const key = permissionKey(mod.id, action.id);
        const checked = selected.has(key) ? " checked" : "";
        return `<td class="perm-table__cell"><label class="perm-table__check"><input type="checkbox" name="permissions" value="${esc(key)}"${checked} aria-label="${esc(mod.label)} — ${esc(action.label)}"><span class="perm-table__box" aria-hidden="true"></span></label></td>`;
      }).join("");
      return `<tr class="perm-table__row"><th scope="row" class="perm-table__module">${esc(mod.label)}</th>${cells}</tr>`;
    }).join("");
    return `<section class="perm-panel"${formAttr}><div class="perm-panel__head"><div><p class="perm-panel__title">Эрх (Permissions)</p><p class="perm-panel__hint">Модуль бүрт харах, нэмэх, засах, устгах эрхийг сонгоно.</p></div>${resetBtn}</div><div class="perm-table-wrap"><table class="perm-table"><thead class="perm-table__head"><tr><th scope="col" class="perm-table__module">Модуль</th>${headCells}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
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
    templateForRole,
    mergePermissionsForEmployees,
  };
})();
