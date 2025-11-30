# Security & Authentication

This system uses a **Zero-Knowledge** authentication model. Unlike traditional web apps, we do not store your password on a server to unlock your data. Your password *is* the key to your data.

## 🔐 Access & Authentication

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

The system attempts to unlock (decrypt) your Data Key using the password provided.
*   If the key unwraps successfully: The password is correct, and the database is unlocked.
*   If the operation fails: The password is incorrect.

### 3. Forgot Password / Account Recovery
Because we cannot see your password, we cannot send you a "reset link".
1.  Go to the Login screen.
2.  Click **"Forgot Password?"**.
3.  Enter your Email and the **Recovery Key** you saved during registration.
4.  The system validates the key against a stored fingerprint (KCV).
5.  Enter a new password. The system uses the Recovery Key to re-encrypt the master key with your *new* password.

### 4. Demo Mode
*   **Purpose:** To explore the application features without setting up an account.
*   **Data:** Pre-seeded with sample products, suppliers, and customers.
*   **Persistence:** Data is stored in a temporary "Guest Workspace" in your browser. **All data is permanently wiped upon logout.**
*   **Security:** Encryption is disabled or uses ephemeral keys in Demo Mode.

---

## 🛡️ Encryption & Security

We utilize the **Web Crypto API** to ensure military-grade security for your sensitive business data directly in the browser.

### Encryption Standards
*   **Algorithm:** AES-GCM (Advanced Encryption Standard - Galois/Counter Mode) with 256-bit keys.
*   **Key Derivation:** PBKDF2 (Password-Based Key Derivation Function 2) with high iteration counts and random salts.
*   **Zero Storage:** Passwords are never stored. Authentication is purely a cryptographic challenge.

### Encrypted Fields
*   **Products:** Cost Price (hides margins from cashiers).
*   **Sales:** Profit, COGS, Total, Subtotal, Tax, Discount.
*   **Customers:** Phone, Email, Address, Notes (PII protection).
*   **Suppliers:** Contact details.
*   **Shifts:** Cash counts and discrepancies.

### Durability & Safety
*   **Data Isolation:** Each workspace has a unique ID (`workspaceId`) and unique encryption keys. Data from one business cannot be read by another, even if they share the same browser.
*   **Zero-Knowledge:** Since the encryption key is derived from your password client-side, even if the database file were stolen, the sensitive fields would remain unreadable ciphertext without the password or recovery key.
