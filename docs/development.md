# Development & Testing

## 🔄 Software Development Life Cycle (SDLC)

This project follows an **Agile and Iterative** development model.

### Methodologies Used
1.  **Agile:** The project is designed to be flexible and adaptive. Features are decoupled (e.g., Procurement is separate from POS), allowing for independent updates and maintenance.
2.  **Iterative Model:** The application was built in cycles:
    *   **Iteration 1 (MVP):** Core POS functionality, basic product management, and local storage.
    *   **Iteration 2 (Security):** Implementation of Web Crypto API for zero-knowledge encryption of sensitive fields (Cost Price, Customer Data).
    *   **Iteration 3 (Features):** Addition of Reports, Analysis, and Procurement modules.
    *   **Iteration 4 (Refinement):** UI/UX polish, Dark Mode, and performance optimizations (Virtualization/Pagination).

---

## 🧪 Testing and Debugging

Since this is a local-first application relying heavily on IndexedDB and client-side logic, testing approaches focus on browser capabilities.

### Manual Testing
1.  **Auth Flow:** Test registration, logout, and login with incorrect passwords to verify crypto challenges.
2.  **Offline Mode:** Open DevTools > Network > select "Offline". Verify navigation and data access continues to work via Service Worker and Dexie.
3.  **Data Persistence:** Refresh the page (F5) to ensure Redux-like state (Context) is re-hydrated correctly from IndexedDB.

### Debugging Tools
*   **Application Tab (DevTools):** Use the "IndexedDB" section to inspect the `IMS_POS_DB`. You will see tables like `products` and `sales`. Note that sensitive fields will appear as `__ENC__:...` strings.
*   **Console:** The application logs critical crypto failures and sync events.
*   **Emergency Key Repair:** If data appears corrupted (decryption fails due to key mismatch), use the "Repair Access" tool in Settings > Data Management to re-inject the raw Recovery Key.
