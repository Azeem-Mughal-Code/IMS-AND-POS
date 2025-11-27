# React IMS & POS System

A comprehensive, local-first **Inventory Management and Point of Sale (POS)** system built with React, TypeScript, and Dexie.js. This application is designed to be offline-capable, secure via client-side encryption, and fully responsive.

---

## 🚀 Key Features

### 🔐 Security & Architecture
*   **Local-First Architecture:** All data is stored locally in the browser using IndexedDB (via Dexie.js).
*   **Client-Side Encryption:** Sensitive business data (profit, cost prices, customer details) is encrypted using the Web Crypto API (AES-GCM) before being saved to the database.
*   **Zero-Knowledge Auth:** The application derives encryption keys from your password. If the password is lost, data cannot be recovered without the **Recovery Key**.
*   **Offline Capable:** Works without an internet connection using Service Workers.

### 🏪 Point of Sale (POS)
*   **Shift Management:** Cashiers must open a shift with a float amount and close it with cash counting and variance tracking.
*   **Smart Cart:** Support for taxes, custom discounts, and holding/retrieving orders.
*   **Product Lookup:** Barcode scanning support and instant search.
*   **Returns:** Integrated return processing linked to original sales history.
*   **Receipts:** Printable receipts with customizable headers and footers.

### 📦 Inventory Management
*   **Product Variants:** Advanced variant generation (e.g., Size, Color) with Cartesian product logic.
*   **Stock Tracking:** Real-time stock level monitoring with low-stock alerts.
*   **Categories:** Hierarchical category management.
*   **Stock History:** Detailed audit logs of all stock adjustments (Sales, POs, Manual Adjustments).

### 🚚 Procurement
*   **Purchase Orders:** Create POs for suppliers with expected dates.
*   **Receiving:** Partial or full receiving of stock against POs.
*   **Auto-Fill:** Smartly generate PO items based on low-stock thresholds.

### 📊 Reporting & Analysis
*   **Dashboard:** Real-time visualization of Sales, Profit, and COGS.
*   **Valuation:** Calculate total retail and cost value of current inventory.
*   **Performance:** Identify top-selling products and highest profit margins.
*   **Export:** Export sales and inventory data to CSV.

---

## 🛠 Technology Stack

*   **Frontend:** React 18, TypeScript, Tailwind CSS
*   **Database:** Dexie.js (IndexedDB wrapper)
*   **Encryption:** Web Crypto API (PBKDF2 key derivation, AES-GCM encryption)
*   **Charts:** Recharts
*   **PDF/Image Generation:** html2canvas
*   **Icons:** Heroicons

---

## 📖 User Guide

### 1. Authentication & Setup
Upon first load, you can:
1.  **Register Business:** Creates a new encrypted workspace. You will be given a **Store Code** and a **Recovery Key**. Save these immediately.
2.  **Demo Mode:** Enters a temporary guest session with seeded data. Data is wiped upon logout.

**Important:** Password reset is impossible without the Recovery Key because your password is used to encrypt the database keys.

### 2. The POS Workflow
1.  **Start Shift:** Go to POS. If no shift is active, you will be prompted to count the cash drawer (float).
2.  **Add Items:** Click items in the catalog or scan/search.
3.  **Variations:** If a product has variants (e.g., Small/Red), a modal will appear to select the specific option.
4.  **Checkout:** Click "Pay Now". Supports Split Payments (Cash, Card, Other).
5.  **Receipt:** A receipt is generated which can be printed or saved as an image.

### 3. Processing Returns
1.  Go to **POS > Returns / Lookup**.
2.  Search for the original receipt (e.g., `TRX-A1B2`).
3.  Select items to return. They will be added to the cart with negative quantities.
4.  Process the "Refund" to update stock and financial records.

### 4. Inventory & Variants
1.  Go to **Inventory > Add Product**.
2.  **Simple Product:** Enter Name, SKU, Prices, and Stock.
3.  **Variable Product:** 
    *   Add Variation Types (e.g., "Size", "Material").
    *   Add Options (e.g., "S, M, L").
    *   The system auto-generates all combinations (Variants).
    *   You can manage stock and price for each variant individually.

### 5. Settings & Data
*   **Currency:** Supports custom currencies and "Integer Only" mode (e.g., for JPY).
*   **Tax:** Global tax rate settings.
*   **Backups:** You can download a full JSON dump of your database. This includes all encrypted data and settings.
*   **Danger Zone:** Factory reset or prune old data to improve performance.

---

## 🔒 Security Deep Dive

The application uses a **Key Wrapping** architecture:

1.  **Master Key (KEK):** Derived from user password + random salt using `PBKDF2`.
2.  **Data Key (DEK):** A random AES-GCM key generated per workspace.
3.  **Storage:** The DEK is encrypted (wrapped) by the KEK and stored in the user record.
4.  **Runtime:** When logging in, the app recreates the KEK from your input password, unwraps the DEK, and stores the DEK in memory (Context) to decrypt data on the fly.

This ensures that even if the local database files are stolen, sensitive business metrics remain encrypted.

---

## 🤝 Contributing

1.  Clone the repository.
2.  Run `npm install`.
3.  Run `npm start`.
4.  Ensure `metadata.json` is updated if adding new permissions.

---

**License:** MIT
