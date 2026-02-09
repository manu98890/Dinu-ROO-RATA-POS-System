# Project: Dinu Roo Rata POS System - Requirements & Technical Guide

Meya "Dinu Roo Rata" wisithuru badu kade dinpatha weda katayuthu pahasu kireema sandaha hadana lada local POS (Point of Sale) system ekaki.

---

## 1. Business Requirements (Business One-epakam)

System eken karaganna ona pradhana weda thunai:

* **Inventory Management:** Colombo walin gena badu (stock) athulath kireema, badu wala nama, gaththa mila (Cost), wikunana mila (Price), saha thiyena pramanaya (Quantity) track kireema.
* **Billing/POS Interface:** Customer kenek badu gannakota lesiyen search karala bill ekata ekathu kireema saha discount thiyenam ewa adu kireema.
* **Sales History & Profit:** Dawasakata kiyaka badu wikunawada, eken kiyaka labhayak (Profit) thiyenawada kiyala balaganeema.
* **Offline First:** Internet nathuwath kade weda tika digatama karagena yaama.

---

## 2. Technical Stack (Bhwitha Karana Thshnaya)

* **Frontend:** HTML5, Vanilla JavaScript.
* **Styling:** Tailwind CSS (Modern lassan ui ekak ganna).
* **Database:** Dexie.js (IndexedDB wrapper ekak - Browser eke data save karanna).
* **Icons:** Heroicons ho Lucide Icons.

---

## 3. Database Schema (Data Save Wena Akuruwa)

Dexie.js bhwitha kara pradhana table dekak hadiya yuthuya:

1.  **products**: `++id, name, costPrice, sellingPrice, stock, category`
2.  **sales**: `++id, totalPrice, totalProfit, date, items`

---

## 4. System Features (Hadanna Ona Kotas)

### A. Dashboard
- Total Sales (Ada dawase wikunuwa pramanaya).
- Total Profit (Ada labhaya).
- Low Stock Alert (Badu iwara wenna yana ewa).

### B. Inventory Page
- Badu aluthen athulath kireema (Add Product).
- Thiyena badu edit kireema ho ain kireema.
- Search bar ekak badu hoyanna.

### C. POS / Billing Page
- Product name eken ho ID eken search kireema.
- Cart ekakata items ekathu kireema.
- Total bill eka calculate kireema.
- "Checkout" kalama stock eken badu adu weema saha sales table ekata data yama.

### D. Reports
- Kalayakata adala sales record balaganeema.
- Monthly/Daily profit graph.

---

## 5. Implementation Instructions (Piyawaren Piyawara)

### Step 1: Project Setup
`index.html` file ekak hadala Tailwind CSS CDN ekai Dexie.js library ekai link karaganna.

### Step 2: Database Initialization
`app.js` file ekak hadala database eka setup karanna:
```javascript
const db = new Dexie("DinuRooRataDB");
db.version(1).stores({
    products: '++id, name, costPrice, sellingPrice, stock',
    sales: '++id, totalPrice, totalProfit, date'
});