# 🛠️ Under the Hood: Technologies & Services Explained

This document explains the technologies that power the IMS & POS System. We use a **Local-First** architecture, meaning the app runs entirely on your device (browser) rather than relying constantly on a cloud server.

Here is a breakdown of the parts, how they work, and how they fit together.

---

## 1. The "Brain": React & TypeScript 🧠

### What are they?
*   **React:** A library for building user interfaces. It lets us create reusable "components" like LEGO blocks (e.g., a Button, a Product Card, a Sidebar).
*   **TypeScript:** A programming language built on top of JavaScript. It acts as a strict spellchecker and safety inspector for code.

### How they work here:
*   **React** manages what you see on the screen. When you click "Add to Cart," React updates the screen instantly without reloading the page.
*   **TypeScript** ensures that a "Product" always has a price and a name. If a developer tries to save a product without a price, TypeScript blocks the code from running, preventing bugs before they happen.

---

## 2. The "Memory": Dexie.js & IndexedDB 🗄️

### What are they?
*   **IndexedDB:** A powerful database built directly into your web browser (Chrome, Safari, Edge). It can store huge amounts of data.
*   **Dexie.js:** A tool that makes talking to IndexedDB much easier and faster for developers.

### How they work here (Local-First):
Unlike most websites that save data to a "Cloud Server" thousands of miles away, **this app saves data directly to your computer's hard drive** via the browser.
*   **Benefit:** It is incredibly fast. There is no "loading..." spinner waiting for a server reply.
*   **Benefit:** It works offline.
*   **Role:** Dexie stores your Products, Sales, Customers, and Settings.

---

## 3. The "Vault": Web Crypto API 🔐

### What is it?
A set of security tools built into the browser that allows us to encrypt (scramble) and decrypt (unscramble) data using mathematical algorithms.

### How it works here (Zero-Knowledge Security):
This is the most unique feature of this app.
1.  **The Key:** When you register, the app takes your password and mixes it with random data (salt) to create a **Encryption Key**.
2.  **The Lock:** Before sensitive data (like Profit margins, Cost prices, or Customer emails) is saved to Dexie (the database), this API scrambles it.
3.  **The Result:** If someone stole your computer and opened the database file, they would only see gibberish (e.g., `__ENC__:a8s7d6f...`) instead of "$500 Profit".
4.  **Zero-Knowledge:** We (the developers) never know your password. If you lose it, the data stays locked forever unless you have your **Recovery Key**.

---

## 4. The "Nervous System": React Context API 📡

### What is it?
A way to broadcast data to the whole app without passing it down manually through every single component.

### How it works here:
We have several "Providers" wrapping the app:
*   **AuthProvider:** Tells the whole app "Who is logged in?" and "What is the encryption key?".
*   **ProductContext:** Holds the list of products. If you sell an item in the POS, this context updates the stock level, and the Inventory screen updates automatically.
*   **SalesContext:** Listens for new sales and updates the Dashboard graphs immediately.

---

## 5. The "Designers": Tailwind CSS 🎨

### What is it?
A utility-first CSS framework. Instead of writing separate style files, we use pre-defined classes to style elements.

### How it works here:
*   It ensures the app looks consistent (colors, spacing, fonts).
*   It handles **Dark Mode**. When you toggle the theme, Tailwind switches the color palette instantly.
*   It creates the **Responsive Design**, making the layout adjust automatically whether you are on a laptop or a tablet.

---

## 6. The "Survival Kit": Service Workers 🛟

### What is it?
A script that runs in the background, separate from the web page. It acts like a middleman between the app and the internet.

### How it works here (Offline Mode):
1.  When you load the app, the Service Worker downloads the core files (HTML, JavaScript, CSS).
2.  If you lose your internet connection, the Service Worker serves these saved files.
3.  Combined with Dexie (Database), this allows you to **perform full sales and manage inventory while completely offline**.

---

## 7. The "Artists": Recharts & html2canvas 📊

### What are they?
*   **Recharts:** A library for drawing charts and graphs.
*   **html2canvas:** A tool that takes a "screenshot" of a specific part of the webpage.

### How they work here:
*   **Recharts** takes the sales data from the Database, calculates totals, and draws the beautiful lines and bars on the Dashboard.
*   **html2canvas** is used when you click "Save as Image" on a receipt or a report. It converts the HTML receipt into a PNG image file so you can email or print it later.

---

## 🔄 How It All Works Together: "Anatomy of a Sale"

Here is what happens technically when you click **"Pay Now"** in the POS:

1.  **React** detects the click and gathers the Cart items.
2.  **Web Crypto API** kicks in. It calculates the profit, encrypts the profit value and the cost price using your unique key.
3.  **Dexie.js** takes this new Sale record (with encrypted fields) and saves it to the browser's IndexedDB.
4.  **ProductContext** notices a sale happened. It calculates the new stock levels.
5.  **SalesContext** notices a new sale. It adds it to the list.
6.  **Recharts** (on the Dashboard) sees the data change in SalesContext and automatically re-draws the profit graph to go up.
7.  **Toast System** pops up a green "Sale Completed" message.

All of this happens in milliseconds, right on your device, with no server delay.