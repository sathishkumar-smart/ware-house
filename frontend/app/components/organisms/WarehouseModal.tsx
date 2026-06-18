"use client";

import { FormEvent, useState } from "react";
import type { Modal, Product, Vendor, WarehouseLocation } from "@/app/types";

const TITLES: Record<string, [string, string]> = {
  product:       ["Add product",            "Create a new catalogue item"],
  vendor:        ["Add vendor",             "Create a supplier record"],
  stock:         ["Update stock",           "Receive, issue, or adjust inventory"],
  return:        ["Log a return",           "Track returned inventory"],
  damage:        ["Report damaged goods",   "Remove unusable units from available stock"],
  replenish:     ["Request replenishment",  "Create and send a purchase request to the vendor"],
  employee:      ["Add employee",           "Create a team member account with role and warehouse access"],
  warehouse:     ["Add warehouse",          "Register a new warehouse location"],
  resolve_damage:["Resolve damage record",  "Update the status of a quarantined damage report"],
};

export default function WarehouseModal({
  kind,
  products,
  vendors,
  warehouses,
  isSuperAdmin,
  close,
  submit,
}: {
  kind: Exclude<Modal, null>;
  products: Product[];
  vendors: Vendor[];
  warehouses: WarehouseLocation[];
  isSuperAdmin: boolean;
  close: () => void;
  submit: (query: string, variables: Record<string, unknown>) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activeWarehouses = warehouses.filter(w => w.active);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setError("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (kind === "product") {
        await submit(
          `mutation AddProduct($name:String!,$sku:String!,$category:String,$vendorId:ID,$unitPrice:String,$gstRate:String,$hsnCode:String,$initialStock:Int,$reorderLevel:Int,$location:String,$warehouseId:ID!) {
            createProduct(name:$name,sku:$sku,category:$category,vendorId:$vendorId,unitPrice:$unitPrice,gstRate:$gstRate,hsnCode:$hsnCode,initialStock:$initialStock,reorderLevel:$reorderLevel,location:$location,warehouseId:$warehouseId) { product { id } }
          }`,
          { ...form, initialStock: Number(form.initialStock), reorderLevel: Number(form.reorderLevel), vendorId: form.vendorId || null },
        );
      } else if (kind === "vendor") {
        await submit(
          `mutation AddVendor($name:String!,$contactPerson:String,$email:String,$phone:String,$address:String,$gstin:String) {
            createVendor(name:$name,contactPerson:$contactPerson,email:$email,phone:$phone,address:$address,gstin:$gstin) { vendor { id } }
          }`,
          form,
        );
      } else if (kind === "stock") {
        await submit(
          `mutation Stock($productId:ID!,$warehouseId:ID!,$movementType:String!,$quantity:Int!,$reference:String,$notes:String) {
            updateStock(productId:$productId,warehouseId:$warehouseId,movementType:$movementType,quantity:$quantity,reference:$reference,notes:$notes) { movement { id } }
          }`,
          { ...form, quantity: Number(form.quantity) },
        );
      } else if (kind === "return") {
        await submit(
          `mutation Return($productId:ID!,$warehouseId:ID!,$returnType:String!,$condition:String!,$quantity:Int!,$vendorId:ID,$reference:String,$reason:String!) {
            createReturn(productId:$productId,warehouseId:$warehouseId,returnType:$returnType,condition:$condition,quantity:$quantity,vendorId:$vendorId,reference:$reference,reason:$reason) { returnRecord { id } }
          }`,
          { ...form, quantity: Number(form.quantity), vendorId: form.vendorId || null },
        );
      } else if (kind === "damage") {
        await submit(
          `mutation Damage($productId:ID!,$warehouseId:ID!,$quantity:Int!,$reason:String!,$reference:String) {
            reportDamage(productId:$productId,warehouseId:$warehouseId,quantity:$quantity,reason:$reason,reference:$reference) { damage { id } }
          }`,
          { ...form, quantity: Number(form.quantity) },
        );
      } else if (kind === "replenish") {
        await submit(
          `mutation Replenish($productId:ID!,$warehouseId:ID!,$quantity:Int!,$expectedDate:Date,$notes:String,$sendNow:Boolean) {
            requestReplenishment(productId:$productId,warehouseId:$warehouseId,quantity:$quantity,expectedDate:$expectedDate,notes:$notes,sendNow:$sendNow) { emailSent whatsappSent request { id status } }
          }`,
          { ...form, quantity: Number(form.quantity), expectedDate: form.expectedDate || null, sendNow: true },
        );
      } else if (kind === "employee") {
        const warehouseIds = Array.from(
          event.currentTarget.querySelectorAll<HTMLInputElement>('input[name="warehouseIds"]:checked'),
        ).map(el => el.value);
        await submit(
          `mutation AddEmployee($username:String!,$password:String!,$email:String,$phone:String,$role:String!,$warehouseIds:[ID!]!) {
            createEmployee(username:$username,password:$password,email:$email,phone:$phone,role:$role,warehouseIds:$warehouseIds) { employee { id } }
          }`,
          { ...form, warehouseIds },
        );
      } else if (kind === "warehouse") {
        await submit(
          `mutation AddWarehouse($name:String!,$code:String!,$address:String,$city:String,$state:String,$pincode:String) {
            createWarehouseLocation(name:$name,code:$code,address:$address,city:$city,state:$state,pincode:$pincode) { warehouse { id } }
          }`,
          form,
        );
      } else if (kind === "resolve_damage") {
        const damageId = sessionStorage.getItem("resolve-damage-id") || "";
        await submit(
          `mutation ResolveDmg($id:ID!,$status:String!,$notes:String) {
            resolveDamage(id:$id,status:$status,notes:$notes) { damage { id } }
          }`,
          { id: damageId, status: form.status, notes: form.notes || "" },
        );
        sessionStorage.removeItem("resolve-damage-id");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this record.");
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="modal" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Warehouse record</p>
            <h2>{TITLES[kind]?.[0]}</h2>
            <span>{TITLES[kind]?.[1]}</span>
          </div>
          <button onClick={close}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="form-error" style={{ margin: "12px 0 0" }}>{error}</div>}

          {kind === "product" && (
            <div className="form-grid">
              <label>Product name<input name="name" required placeholder="e.g. Packing tape" /></label>
              <label>SKU<input name="sku" required placeholder="PKG-001" /></label>
              <label>Category<input name="category" placeholder="Packaging" /></label>
              <label>Vendor<select name="vendorId"><option value="">No vendor</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
              <label>Unit cost (₹)<input name="unitPrice" type="number" min="0" step="0.01" defaultValue="0.00" /></label>
              <label>GST rate (%)<input name="gstRate" type="number" min="0" max="100" step="0.01" defaultValue="18" /></label>
              <label>HSN code<input name="hsnCode" placeholder="e.g. 3923" /></label>
              <label>Warehouse<select name="warehouseId" required><option value="">Choose warehouse</option>{activeWarehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}</select></label>
              <label>Storage location<input name="location" placeholder="Aisle A · Bin 12" /></label>
              <label>Opening stock<input name="initialStock" type="number" min="0" defaultValue="0" /></label>
              <label>Reorder level<input name="reorderLevel" type="number" min="0" defaultValue="10" /></label>
            </div>
          )}

          {kind === "vendor" && (
            <>
              <label>Vendor name<input name="name" required placeholder="Supplier company name" /></label>
              <div className="form-grid">
                <label>Contact person<input name="contactPerson" placeholder="Full name" /></label>
                <label>Phone (+91...)<input name="phone" placeholder="+91 98765 43210" /></label>
              </div>
              <label>Email<input name="email" type="email" placeholder="orders@supplier.com" /></label>
              <label>GSTIN<input name="gstin" maxLength={15} placeholder="29ABCDE1234F1Z5" /></label>
              <label>Address<textarea name="address" placeholder="Vendor address" /></label>
            </>
          )}

          {kind === "stock" && (
            <>
              <label>Product<select name="productId" required><option value="">Choose a product</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name} ({p.currentStock} on hand)</option>)}</select></label>
              <label>Warehouse<select name="warehouseId" required><option value="">Choose warehouse</option>{activeWarehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}</select></label>
              <div className="form-grid">
                <label>Movement type<select name="movementType" required><option value="RECEIPT">Receive stock</option><option value="ISSUE">Issue stock</option><option value="ADJUSTMENT">Positive adjustment</option></select></label>
                <label>Quantity<input name="quantity" type="number" min="1" required defaultValue="1" /></label>
              </div>
              <label>Reference<input name="reference" placeholder="PO, invoice, or job number" /></label>
              <label>Notes<textarea name="notes" placeholder="Optional details" /></label>
            </>
          )}

          {kind === "return" && (
            <>
              <label>Product<select name="productId" required><option value="">Choose a product</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select></label>
              <label>Warehouse<select name="warehouseId" required><option value="">Choose warehouse</option>{activeWarehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}</select></label>
              <div className="form-grid">
                <label>Return direction<select name="returnType"><option value="CUSTOMER">From customer</option><option value="VENDOR">To vendor</option></select></label>
                <label>Condition<select name="condition"><option value="RESTOCKABLE">Restockable</option><option value="DAMAGED">Damaged</option></select></label>
                <label>Quantity<input name="quantity" type="number" min="1" required defaultValue="1" /></label>
                <label>Vendor<select name="vendorId"><option value="">Product default vendor</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
              </div>
              <label>Reference<input name="reference" placeholder="RMA or order number" /></label>
              <label>Reason<textarea name="reason" required placeholder="Why is this stock being returned?" /></label>
            </>
          )}

          {kind === "damage" && (
            <>
              <label>Product<select name="productId" required><option value="">Choose a product</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select></label>
              <label>Warehouse<select name="warehouseId" required><option value="">Choose warehouse</option>{activeWarehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}</select></label>
              <div className="form-grid">
                <label>Quantity<input name="quantity" type="number" min="1" required defaultValue="1" /></label>
                <label>Reference<input name="reference" placeholder="Incident or batch number" /></label>
              </div>
              <label>Damage details<textarea name="reason" required placeholder="Describe the damage and where it was found" /></label>
            </>
          )}

          {kind === "replenish" && (
            <>
              <label>Product<select name="productId" required><option value="">Choose a product</option>{products.filter(p => p.vendor).map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name} ({p.currentStock} on hand)</option>)}</select></label>
              <label>Warehouse<select name="warehouseId" required><option value="">Choose warehouse</option>{activeWarehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}</select></label>
              <div className="form-grid">
                <label>Required quantity<input name="quantity" type="number" min="1" required defaultValue="1" /></label>
                <label>Expected by<input name="expectedDate" type="date" /></label>
              </div>
              <label>Message to vendor<textarea name="notes" placeholder="Delivery instructions or purchase notes" /></label>
            </>
          )}

          {kind === "employee" && (
            <>
              <div className="form-grid">
                <label>Username<input name="username" required placeholder="e.g. ravi.kumar" /></label>
                <label>Password<input name="password" required minLength={8} type="password" placeholder="••••••••" /></label>
                <label>Email<input name="email" type="email" placeholder="ravi@company.com" /></label>
                <label>Phone (+91...)<input name="phone" placeholder="+91 98765 43210" /></label>
              </div>
              <label>Role<select name="role" required>
                <option value="INVENTORY_OPERATOR">Inventory Operator</option>
                <option value="MANAGER">Warehouse Manager</option>
                <option value="AUDITOR">Auditor (read-only)</option>
                <option value="ADMIN">Administrator</option>
                {isSuperAdmin && <option value="SUPER_ADMIN">Super Administrator</option>}
              </select></label>
              <label style={{ marginTop: 14 }}>Assign warehouses
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {activeWarehouses.map(wh => (
                    <label key={wh.id} style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, fontWeight: 400, fontSize: 12, color: "var(--ink)" }}>
                      <input type="checkbox" name="warehouseIds" value={wh.id} style={{ width: "auto", marginTop: 0 }} />
                      {wh.code} — {wh.name}
                    </label>
                  ))}
                </div>
              </label>
            </>
          )}

          {kind === "warehouse" && (
            <>
              <div className="form-grid">
                <label>Warehouse name<input name="name" required placeholder="Main Warehouse" /></label>
                <label>Code (unique)<input name="code" required placeholder="MAIN" style={{ textTransform: "uppercase" }} /></label>
                <label>City<input name="city" placeholder="Mumbai" /></label>
                <label>State<input name="state" placeholder="Maharashtra" /></label>
                <label>Pincode<input name="pincode" placeholder="400001" maxLength={6} /></label>
              </div>
              <label>Address<textarea name="address" placeholder="Full warehouse address" /></label>
            </>
          )}

          {kind === "resolve_damage" && (
            <>
              <label>New status<select name="status" required>
                <option value="RETURNED">Returned to vendor</option>
                <option value="DISPOSED">Disposed</option>
                <option value="RESOLVED">Resolved / restored</option>
              </select></label>
              <label>Resolution notes<textarea name="notes" placeholder="Describe what was done with the damaged stock" /></label>
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={close}>Cancel</button>
            <button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save record"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
