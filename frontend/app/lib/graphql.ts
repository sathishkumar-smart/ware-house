const API_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8000/graphql/";

export async function graphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
): Promise<T> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `JWT ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors[0].message || "Something went wrong.");
  return payload.data;
}

export const DASHBOARD_QUERY = `
  query WarehouseDashboard {
    systemSettings { appName appSubtitle logoUrl primaryColor accentColor defaultDarkMode whatsappEnabled alertEmail }
    me
    employeeProfile { role }
    warehouseLocations { id name code address city state pincode active createdAt }
    dashboardStats { totalProducts totalUnits lowStockProducts totalVendors pendingReturns damagedUnits inventoryValue }
    products {
      id name sku category unitPrice gstRate hsnCode currentStock reorderLevel location isLowStock
      vendor { id name contactPerson email phone address gstin }
    }
    vendors { id name contactPerson email phone address gstin }
    stockMovements(limit: 50) {
      id movementType quantity previousStock newStock reference notes createdAt
      product { name sku }
      warehouse { name code }
    }
    returns(limit: 50) {
      id returnType condition quantity status reason reference createdAt
      product { name sku }
      vendor { name }
      warehouse { name }
    }
    damagedProducts(limit: 50) {
      id quantity reason status reference createdAt
      product { name sku }
      warehouse { name }
    }
    employees {
      id role phone active createdAt username email
      locations { id name code }
    }
    replenishmentRequests(limit: 50) {
      id quantity expectedDate status notes createdAt sentAt
      product { name sku }
      vendor { name email }
      warehouse { name code }
    }
    notifications { id title message level read createdAt }
  }
`;

export const SETTINGS_QUERY = `
  query PublicSettings {
    systemSettings { appName appSubtitle logoUrl primaryColor accentColor defaultDarkMode }
  }
`;
