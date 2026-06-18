export type AppSettings = {
  appName: string;
  appSubtitle: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  defaultDarkMode: boolean;
  whatsappEnabled: boolean;
  whatsappFromNumber: string;
  alertEmail: string;
};

export type Vendor = {
  id: string; name: string; contactPerson: string;
  email: string; phone: string; address: string; gstin: string;
};

export type WarehouseLocation = {
  id: string; name: string; code: string; address: string;
  city: string; state: string; pincode: string;
  active: boolean; createdAt: string;
};

export type Product = {
  id: string; name: string; sku: string; category: string;
  unitPrice: string; gstRate: string; hsnCode: string;
  currentStock: number; reorderLevel: number; location: string;
  isLowStock: boolean; vendor: Vendor | null;
};

export type Movement = {
  id: string; movementType: string; quantity: number;
  previousStock: number; newStock: number; reference: string;
  notes: string; createdAt: string;
  product: Pick<Product, "name" | "sku">;
  warehouse: Pick<WarehouseLocation, "name" | "code"> | null;
};

export type ReturnItem = {
  id: string; returnType: string; condition: string;
  quantity: number; status: string; reason: string;
  reference: string; createdAt: string;
  product: Pick<Product, "name" | "sku">;
  vendor: Pick<Vendor, "name"> | null;
  warehouse: Pick<WarehouseLocation, "name"> | null;
};

export type Damage = {
  id: string; quantity: number; reason: string; status: string;
  reference: string; createdAt: string;
  product: Pick<Product, "name" | "sku">;
  warehouse: Pick<WarehouseLocation, "name"> | null;
};

export type Employee = {
  id: string; role: string; phone: string; active: boolean;
  createdAt: string; username: string; email: string;
  locations: Pick<WarehouseLocation, "id" | "name" | "code">[];
};

export type ReplenishmentRequest = {
  id: string; quantity: number; expectedDate: string | null;
  status: string; notes: string; createdAt: string; sentAt: string | null;
  product: Pick<Product, "name" | "sku">;
  vendor: Pick<Vendor, "name" | "email">;
  warehouse: Pick<WarehouseLocation, "name" | "code">;
};

export type NotificationItem = {
  id: string; title: string; message: string;
  level: string; read: boolean; createdAt: string;
};

export type Stats = {
  totalProducts: number; totalUnits: number; lowStockProducts: number;
  totalVendors: number; pendingReturns: number; damagedUnits: number;
  inventoryValue: number;
};

export type WarehouseData = {
  me: string;
  dashboardStats: Stats;
  products: Product[];
  vendors: Vendor[];
  stockMovements: Movement[];
  returns: ReturnItem[];
  damagedProducts: Damage[];
  warehouseLocations: WarehouseLocation[];
  employeeProfile: { role: string };
  employees: Employee[];
  replenishmentRequests: ReplenishmentRequest[];
  notifications: NotificationItem[];
  systemSettings: AppSettings;
};

export type Tab =
  | "dashboard" | "inventory" | "movements" | "returns"
  | "damages" | "vendors" | "warehouses" | "employees"
  | "replenishment" | "notifications" | "settings";

export type Modal =
  | "product" | "vendor" | "stock" | "return" | "damage"
  | "replenish" | "employee" | "warehouse" | "resolve_damage"
  | null;

export type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
} | null;
