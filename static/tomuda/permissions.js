/**
 * Tomuda permission catalog — add new keys here and mirror in dashboard/permissions.py
 */
(function () {
  const CATALOG = [
    {
      id: "dashboard",
      label: "Dashboard",
      permissions: [
        { key: "dashboard.view", label: "Dashboard харах" },
      ],
    },
    {
      id: "warehouse",
      label: "Агуулах",
      permissions: [
        { key: "warehouse.view", label: "Агуулах харах" },
        { key: "warehouse.edit", label: "Агуулах засах" },
      ],
    },
    {
      id: "products",
      label: "Бараа",
      permissions: [
        { key: "products.view", label: "Бараа харах" },
        { key: "products.create", label: "Бараа нэмэх" },
        { key: "products.edit", label: "Бараа засах" },
      ],
    },
    {
      id: "customers",
      label: "Харилцагч",
      permissions: [
        { key: "customers.view", label: "Харилцагч харах" },
        { key: "customers.create", label: "Харилцагч нэмэх" },
      ],
    },
    {
      id: "orders",
      label: "Захиалга",
      permissions: [
        { key: "orders.view", label: "Захиалга харах" },
        { key: "orders.create", label: "Захиалга үүсгэх" },
        { key: "orders.edit", label: "Захиалга засах" },
      ],
    },
    {
      id: "reports",
      label: "Тайлан",
      permissions: [
        { key: "reports.view", label: "Тайлан харах" },
      ],
    },
    {
      id: "employees",
      label: "Ажилтан",
      permissions: [
        { key: "employees.view", label: "Ажилтан харах" },
        { key: "employees.create", label: "Ажилтан нэмэх" },
        { key: "employees.edit", label: "Ажилтан засах" },
      ],
    },
    {
      id: "settings",
      label: "Тохиргоо",
      permissions: [
        { key: "settings.view", label: "Тохиргоо харах" },
      ],
    },
  ];

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
      "products.view",
      "warehouse.view",
    ],
    warehouse: [
      "warehouse.view",
      "warehouse.edit",
      "products.view",
    ],
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
    const keys = [];
    form.querySelectorAll('input[name="permissions"]:checked').forEach((el) => {
      if (ALL_KEYS.includes(el.value)) keys.push(el.value);
    });
    return keys;
  }

  function permissionsFieldHtml(selectedKeys = [], role = "sales") {
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
    const blocks = CATALOG.map((cat) => {
      const items = cat.permissions
        .map((p) => {
          const checked = selected.has(p.key) ? " checked" : "";
          return `<label class="perm-check"><input type="checkbox" name="permissions" value="${esc(p.key)}"${checked}><span>${esc(p.label)}</span></label>`;
        })
        .join("");
      return `<fieldset class="perm-group"><legend class="perm-group__title">${esc(cat.label)}</legend><div class="perm-group__items">${items}</div></fieldset>`;
    }).join("");
    return `<section class="perm-panel"><div class="perm-panel__head"><p class="perm-panel__title">Эрх (Permissions)</p><button type="button" class="perm-panel__reset text-xs text-primary" onclick="syncEmployeePermissionsFromRole()">Эрхийг албан туслах (${esc(role || "sales")})</button></div>${blocks}</section>`;
  }

  function templateForRole(role) {
    return [...(ROLE_TEMPLATES[role] || ROLE_TEMPLATES.sales)];
  }

  window.TOMUDA_PERMISSIONS = {
    CATALOG,
    ALL_KEYS,
    ROLE_TEMPLATES,
    VIEW_PERMISSION,
    NAV_ITEMS,
    normalizeKeys,
    resolveEmployeePermissions,
    hasPermission,
    canAccessView,
    allowedNavForEmployee,
    permissionsFromForm,
    permissionsFieldHtml,
    templateForRole,
  };
})();
