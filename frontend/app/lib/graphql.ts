const API_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8000/graphql/";

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

export const SETTINGS_QUERY = `
  query PublicSettings {
    systemSettings { appName appSubtitle logoUrl primaryColor accentColor defaultDarkMode companyName }
  }
`;

export const DASHBOARD_QUERY = `
  query GarmentDashboard {
    systemSettings {
      id appName appSubtitle logoUrl primaryColor accentColor defaultDarkMode
      companyName currencySymbol taxPercent
      smtpHost smtpPort smtpUser smtpFromEmail emailEnabled
      twilioAccountSid twilioAuthToken twilioFromNumber smsEnabled
      otpExpiryMinutes allowOtpLogin
    }
    employeeProfile { id role phone active username email locations { id name code locationType } }
    warehouseLocations { id name code locationType city state active }
    dashboardStats {
      totalRawMeters totalFinishedPieces readymadePieces inhousePieces
      activePurchaseOrders activeSalesOrders
      cuttingInProgress stitchingInProgress
      creditOutstanding revenueThisMonth revenueThisYear
      totalSuppliers totalBuyers
    }
    clothCategories { id name description active }
    clothColors { id name hexCode active }
    itemTypes { id name category clothLengthPerPiece active }
    suppliers { id name contactPerson email phone whatsapp address city state gstin supplyType creditDays notes active }
    buyers { id name contactPerson email phone whatsapp address city state gstin buyerType creditLimit notes active }
    purchaseOrders(limit: 100) {
      id poNumber orderType status orderDate expectedDelivery actualDelivery totalAmount notes createdAt
      supplier { id name phone }
      warehouse { id name code }
      items { id itemKind orderedMeters receivedMeters orderedQuantity receivedQuantity unitPrice totalPrice notes
        clothCategory { id name } clothColor { id name hexCode } itemType { id name } }
    }
    rawClothBatches {
      id batchNumber totalMeters availableMeters costPerMeter binLocation receivedDate
      supplier { id name }
      clothCategory { id name }
      clothColor { id name hexCode }
      warehouse { id name code }
    }
    readymadeStock {
      id size quantityReceived quantityAvailable costPrice receivedDate
      itemType { id name }
      clothColor { id name hexCode }
      warehouse { id name code }
      supplier { id name }
    }
    cuttingAssignments(limit: 100) {
      id assignmentNumber metersAssigned targetPieces status assignedDate dueDate
      piecesCompleted clothUsed clothWasted completedDate notes
      rawClothBatch { id batchNumber clothCategory { name } clothColor { name hexCode } }
      cuttingMaster { id username role }
      itemType { id name }
    }
    stitchingJobs(limit: 100) {
      id jobNumber piecesAssigned piecesCompleted piecesRejected status assignedDate dueDate completedDate notes
      cuttingAssignment { id assignmentNumber itemType { name } }
      tailor { id username role }
    }
    finishedProducts {
      id sku source quantity costPrice salePrice profitMargin barcode barcodeSvg tagsPrinted size createdAt
      itemType { id name }
      clothCategory { id name }
      clothColor { id name hexCode }
      warehouse { id name code }
    }
    salesOrders(limit: 100) {
      id orderNumber status paymentMode orderDate expectedDelivery actualDelivery
      subtotal discount totalAmount amountPaid amountDue notes createdAt
      buyer { id name phone }
      warehouse { id name code }
      items { id quantity unitPrice totalPrice finishedProduct { sku itemType { name } } }
    }
    creditTransactions(limit: 100) {
      id totalAmount amountPaid amountDue dueDate status createdAt
      buyer { id name phone }
      salesOrder { id orderNumber }
      payments { id amount paymentDate paymentMethod reference notes }
    }
    employees {
      id username email role phone active createdAt
      locations { id name code }
    }
    notifications { id title message level read createdAt }
    buyerReturns {
      id returnNumber condition status reason createdAt quantity
      buyer { id name }
      finishedProduct { id sku itemType { name } }
      warehouse { id name }
    }
    supplierReturns {
      id returnNumber returnKind status reason metersReturned quantityReturned createdAt
      supplier { id name }
      rawClothBatch { id batchNumber }
      warehouse { id name }
    }
  }
`;
