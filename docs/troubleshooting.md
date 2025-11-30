# Troubleshooting

### 1. "Decryption Failed" or Garbled Text
If you see random characters (e.g., `__ENC__:...`) instead of prices or names:
*   **Cause:** The encryption key in memory does not match the key used to encrypt the data. This often happens if a password reset was performed incorrectly or browser storage was partially cleared.
*   **Fix:**
    1.  Go to **Settings > Encryption & Recovery**.
    2.  Click **Emergency Key Repair**.
    3.  Enter your **Recovery Key** and your **Current Password**.
    4.  This forces the system to re-wrap the data key, restoring access.

### 2. Application Sluggishness
If the app feels slow after months of use:
*   **Cause:** Accumulation of thousands of transaction records in IndexedDB.
*   **Fix:**
    1.  Go to **Settings > Data Management**.
    2.  Open the **Danger Zone**.
    3.  Select **Prune Old Data**.
    4.  Choose a target (e.g., "Sales") and a timeframe (e.g., "Older than 90 days"). This deletes old records to free up memory.

### 3. Data Not Saving
*   **Check:** Ensure you are not in **Demo Mode**. Demo mode does not persist data after you close the session.
*   **Check:** Ensure your browser has disk space available. IndexedDB allows large storage, but the OS may restrict it if the disk is full.
