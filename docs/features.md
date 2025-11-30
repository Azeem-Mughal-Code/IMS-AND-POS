# Features & Application Walkthrough

## 🚀 Key Features

*   **Local-First Architecture:** All data is stored locally in the browser using IndexedDB (via Dexie.js).
*   **Client-Side Encryption:** Sensitive business data (profit, cost prices, customer details) is encrypted using the Web Crypto API (AES-GCM) before being saved to the database.
*   **Zero-Knowledge Auth:** The application derives encryption keys from your password. If the password is lost, data cannot be recovered without the **Recovery Key**.
*   **Offline Capable:** Works without an internet connection using Service Workers.
*   **Responsive Design:** Optimized for tablets and desktop environments.

---

## 📖 Application Walkthrough

The application is divided into several modules, accessible via the sidebar navigation.

### 1. Dashboard
The command center of your business.
*   **Overview Cards:** Real-time metrics for Total Sales, Total Profit (encrypted field), Cost of Goods Sold (COGS), and Low Stock alerts.
*   **Sales Chart:** Interactive line/bar chart displaying Sales vs. Profit trends over different time ranges (Today, Weekly, Monthly, Yearly).
*   **Notifications Panel:** Alerts for low stock, overdue purchase orders, and system messages.

### 2. Point of Sale (POS)
A robust interface for processing transactions.
*   **Register Tab:**
    *   **Catalog:** Browse products with search and category filters. Click to add to cart.
    *   **Cart:** Adjust quantities, remove items, apply discounts (fixed/percent), and apply taxes.
    *   **Hold Order:** Park a current sale to retrieve later.
    *   **Shift Management:** Open and close shifts with cash float tracking and reconciliation.
    *   **Payment:** Supports split payments across Cash, Card, and Other methods.
*   **Returns Tab:** Lookup past receipts by ID to process full or partial returns. Stock is automatically adjusted.

### 3. Inventory Management
*   **Products:** Comprehensive CRUD for products. Supports Variants (e.g., Size/Color), SKU management, and detailed Price/Stock history.
*   **Categories:** hierarchical category management (Category Tree).
*   **Valuation:** (Admin Only) A report showing total asset value (Cost vs Retail) and potential profit for current inventory.

### 4. Procurement
*   **Purchase Orders (POs):** Create orders for suppliers.
    *   **Auto-Fill:** Automatically populate PO with low-stock items.
    *   **Receiving:** Receive items against a PO to automatically update stock levels.
*   **Suppliers:** Manage supplier contact details.

### 5. Customers
*   **Directory:** Manage customer profiles (Name, Phone, Email, Address).
*   **Valuation:** View customer lifetime value, total spent, profit generated, and purchase history.

### 6. User Management
*   **Users:** Add/Edit staff accounts. Assign roles (Admin vs Cashier).
*   **Permissions:** Granular control over Cashier capabilities (e.g., restrict view of reports, profit margins, or ability to delete items).
*   **Shifts:** View historical shift reports, cash discrepancies, and notes.

### 7. Reports
*   **Transaction History:** Detailed list of all Sales and Returns. Filter by date, status, or salesperson.
*   **Stock Levels:** Current stock status report (In Stock, Low Stock, Out of Stock).

### 8. Analysis
*   **Performance Metrics:** View top-performing products by Revenue, Profit, or Units Sold.
*   **Sell-Through Rate:** Analyze inventory efficiency.

### 9. Settings
*   **Profile:** Update username/password.
*   **General:** Theme (Light/Dark), Zoom Level, Timezone configuration.
*   **Business Details:** Configure Store Name, Code, Address, and Receipt Footer.
*   **Currency & Tax:** Customize currency symbol/code, formatting, tax rates, and profit calculation logic.
*   **Data Management:**
    *   **Backup/Restore:** Export full workspace data as JSON.
    *   **Import/Export:** CSV support for Products and Sales.
    *   **Security:** View/Repair Recovery Keys.
    *   **Danger Zone:** Prune old data or Factory Reset.
