# Security Model

This system uses a **Zero-Knowledge** authentication model. Unlike traditional web apps, we do not store your password on a server to unlock your data. Your password *is* the key to your data.

## 🛡️ Security Architecture

### 1. Zero-Knowledge Architecture
The fundamental security promise of this application is that **the developer and the server (if synchronization is enabled) never possess the keys required to decrypt sensitive business data.**

*   **Client-Side Operations:** All encryption and decryption operations occur exclusively within the user's browser memory using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).
*   **No Plaintext Transmission:** Sensitive fields (such as profit margins and customer PII) are encrypted *before* they are saved to the local IndexedDB or sent to any remote server.

### 2. Cryptographic Standards
We utilize industry-standard, military-grade algorithms to ensure data security. Custom "home-rolled" cryptography is strictly avoided.

| Component | Standard / Algorithm | Configuration Details |
| :--- | :--- | :--- |
| **Data Encryption** | **AES-GCM** | 256-bit keys. Authenticated encryption ensures data confidentiality and integrity (tamper detection). A unique 12-byte Initialization Vector (IV) is generated for every write operation. |
| **Key Derivation** | **PBKDF2** | Uses **SHA-256** hashing with **100,000 iterations**. A unique 16-byte random salt is generated per user. |
| **Randomness** | **CSPRNG** | `window.crypto.getRandomValues` is used for all Salts, IVs, and Key generation. |

### 3. Key Management: Envelope Encryption
The system employs an **Envelope Encryption** strategy to manage keys securely and allow for password changes without re-encrypting the entire database.

#### The Keys
1.  **Data Encryption Key (DEK):** A random 256-bit AES-GCM key generated when a workspace is created. This key encrypts the actual database records. It is never stored in plaintext.
2.  **Key Encryption Key (KEK):** A key derived dynamically from the user's password using PBKDF2. This key exists only in memory while the user is logging in.

#### The "Wrapping" Process
The **DEK** is encrypted (wrapped) by the **KEK**. The database stores only the *Encrypted DEK*.
*   **Login:** The system takes the input password $\rightarrow$ derives KEK $\rightarrow$ attempts to decrypt the Encrypted DEK.
*   **Success:** If successful, the raw DEK is loaded into memory to decrypt business data.
*   **Password Change:** The system decrypts the DEK using the *old* password, then re-encrypts (re-wraps) the DEK using a KEK derived from the *new* password. The database data remains untouched; only the lock on the key changes.

### 4. Granular Field-Level Encryption
To balance security with performance (indexing and searching), the application uses **Selective Field-Level Encryption**.

*   **Plaintext Fields:** Structural data required for database indexing, relationships, and sorting (e.g., `id`, `date`, `sku`, `categoryIds`, `workspaceId`) remains in plaintext.
*   **Encrypted Fields:** Sensitive business logic and Personal Identifiable Information (PII) are encrypted.

**Specific Encrypted Fields:**
*   **Products:** `costPrice` (Protecting margin data from staff).
*   **Sales:** `cogs`, `profit`, `total`, `subtotal`, `tax`, `discount`.
*   **Customers:** `email`, `phone`, `address`, `notes`.
*   **Suppliers:** `contactPerson`, `email`, `phone`, `address`.
*   **Purchase Orders:** `totalCost`.

### 5. Data Isolation
The application supports multi-tenancy within the same browser instance via **Workspace Isolation**.
*   Every record in the database is tagged with a `workspaceId`.
*   Queries are strictly filtered by this ID.
*   Each workspace (and user) has unique encryption keys. Even if data leaks from one workspace to another logically, it cannot be decrypted without the specific workspace credentials.

---

## 🔐 Access & Authentication Flows

### 1. Business Registration
When you create a business, the system performs the following cryptographic operations locally in your browser:
1.  Generates a unique **Store Code** (e.g., `WS-A1B2C3`).
2.  Generates a random **Data Encryption Key (DEK)** (AES-GCM 256-bit).
3.  Derives a **Key Encryption Key (KEK)** from your password using **PBKDF2**.
4.  Encrypts (wraps) the DEK using the KEK and stores the wrapped key.
5.  Exports the raw DEK as a **Recovery Key**.
6.  **NOTE:** We do NOT store your password or even a hash of it for authentication.

### 2. Login (Cryptographic Challenge)
To log in, you need:
*   **Store Code** (or Email, if unique)
*   **Username**
*   **Password**

The system uses a **Cryptographic Challenge** to verify credentials:
1.  The system attempts to unlock (decrypt) the stored Data Key using the password provided.
2.  If the key unwraps successfully: The password is correct, the database is unlocked, and the DEK is held in memory.
3.  If the operation fails: The password is incorrect.

### 3. Account Recovery
Because there is no server with a "master key," **there is no traditional "Reset Password via Email" functionality.**

*   **The Recovery Key:** Upon registration, the raw Base64 string of the Data Encryption Key (DEK) is provided to the Admin user.
*   **Recovery Process:**
    1.  Go to the Login screen and click **"Forgot Password?"**.
    2.  Enter your Email and the **Recovery Key**.
    3.  The system validates the key against a stored fingerprint (Key Check Value/KCV).
    4.  Enter a new password. The system uses the Recovery Key to re-encrypt (re-wrap) the master key with your *new* password.

### 4. Demo Mode
*   **Purpose:** To explore the application features without setting up an account.
*   **Data:** Pre-seeded with sample products, suppliers, and customers.
*   **Persistence:** Data is stored in a temporary "Guest Workspace" in your browser. **All data is permanently wiped upon logout.**
*   **Security:** Encryption is disabled or uses ephemeral keys in Demo Mode.