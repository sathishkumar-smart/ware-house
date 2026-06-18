import type { Tab } from "@/app/types";

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADMIN: "Administrator",
  MANAGER: "Warehouse manager",
  INVENTORY_OPERATOR: "Inventory operator",
  AUDITOR: "Auditor",
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACKNOWLEDGED: "Acknowledged",
  PARTIALLY_RECEIVED: "Partially received",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const REPLENISHMENT_STATUSES = [
  "DRAFT", "SENT", "ACKNOWLEDGED", "PARTIALLY_RECEIVED", "COMPLETED", "CANCELLED",
];

export const NEXT_STATUS: Record<string, string> = {
  DRAFT: "SENT",
  SENT: "ACKNOWLEDGED",
  ACKNOWLEDGED: "PARTIALLY_RECEIVED",
  PARTIALLY_RECEIVED: "COMPLETED",
};

export const TAB_TITLES: Record<Tab, string> = {
  dashboard: "Overview",
  inventory: "Inventory",
  movements: "Stock activity",
  returns: "Returns",
  damages: "Damaged goods",
  vendors: "Vendors",
  warehouses: "Warehouses",
  employees: "Employees",
  replenishment: "Replenishment",
  notifications: "Notifications",
  settings: "Settings",
};
