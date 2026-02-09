// Dinu Roo Rata POS - App Logic

// 1. Database Setup
const db = new Dexie('DinuRooRataDB');
db.version(1).stores({
    products: '++id, name, costPrice, sellingPrice, stock, category',
    sales: '++id, totalPrice, totalProfit, date, items' // items will be stored as array of objects
});

// 2. Application State
const state = {
    cart: [],
    products: [],
    currentView: 'dashboard',
    searchQuery: '',
    categoryFilter: 'all'
};

// 3. Main App Object
const app = {
    async init() {
        console.log('App Initializing...');
        this.updateTime();
        setInterval(() => this.updateTime(), 60000);

        await this.loadProducts();
        this.renderDashboard();

        // Initial Navigation
        this.navigate('dashboard');

        // Global Listeners
        document.getElementById('pos-search').addEventListener('input', (e) => {
            state.searchQuery = e.target.value.toLowerCase();
            this.renderPOSGrid();
        });

        document.getElementById('pos-category-filter').addEventListener('change', (e) => {
            state.categoryFilter = e.target.value;
            this.renderPOSGrid();
        });

        // Load Categories
        this.loadCategories();
    },

    updateTime() {
        const now = new Date();
        document.getElementById('current-time').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('current-date').innerText = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    },

    navigate(viewId) {
        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        // Show target view
        document.getElementById(`view-${viewId}`).classList.remove('hidden');

        // Update Sidebar
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.remove('bg-blue-50', 'text-primary');
            el.classList.add('text-gray-600');
        });
        const navBtn = document.getElementById(`nav-${viewId}`);
        if (navBtn) {
            navBtn.classList.add('bg-blue-50', 'text-primary');
            navBtn.classList.remove('text-gray-600');
        }

        state.currentView = viewId;

        // Refresh data based on view
        if (viewId === 'dashboard') this.renderDashboard();
        if (viewId === 'pos') this.renderPOSGrid();
        if (viewId === 'inventory') this.renderInventoryTable();
        if (viewId === 'reports') this.loadSalesHistory();
    },

    // --- Data Loading ---
    async loadProducts() {
        state.products = await db.products.toArray();
    },

    async loadCategories() {
        const categories = [...new Set(state.products.map(p => p.category).filter(Boolean))];
        const select = document.getElementById('pos-category-filter');
        select.innerHTML = '<option value="all">All Categories</option>' +
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
    },

    // --- Dashboard ---
    async renderDashboard() {
        const today = new Date().toDateString();
        const allSales = await db.sales.toArray();
        const todaySales = allSales.filter(s => new Date(s.date).toDateString() === today);

        const totalSalesAmount = todaySales.reduce((sum, s) => sum + (parseFloat(s.totalPrice) || 0), 0);
        const totalProfitAmount = todaySales.reduce((sum, s) => sum + (parseFloat(s.totalProfit) || 0), 0);

        document.getElementById('dash-today-sales').innerText = this.formatCurrency(totalSalesAmount);
        document.getElementById('dash-sales-count').innerText = todaySales.length;
        document.getElementById('dash-today-profit').innerText = this.formatCurrency(totalProfitAmount);

        // Low Stock
        const lowStockItems = state.products.filter(p => p.stock < 5);
        document.getElementById('dash-low-stock').innerText = lowStockItems.length;

        // Render Low Stock Table
        const lowStockHTML = lowStockItems.slice(0, 5).map(p => `
            <tr>
                <td class="px-6 py-4 font-medium text-gray-900">${p.name}</td>
                <td class="px-6 py-4 text-right text-red-600 font-bold">${p.stock}</td>
            </tr>
        `).join('');
        document.getElementById('dash-lowstock-list').innerHTML = lowStockHTML || '<tr><td colspan="2" class="px-6 py-4 text-center text-gray-400">Inventory looks good!</td></tr>';

        // Recent Sales
        const recentSales = allSales.slice(-5).reverse();
        const recentHTML = recentSales.map(s => `
            <tr>
                <td class="px-6 py-4 text-gray-500">${new Date(s.date).toLocaleTimeString()}</td>
                <td class="px-6 py-4 text-gray-900">${s.items.length} items</td>
                <td class="px-6 py-4 text-right font-medium text-gray-900">${this.formatCurrency(s.totalPrice)}</td>
            </tr>
        `).join('');
        document.getElementById('dash-recent-list').innerHTML = recentHTML || '<tr><td colspan="3" class="px-6 py-4 text-center text-gray-400">No sales yet today.</td></tr>';
    },

    // --- POS System ---
    renderPOSGrid() {
        const container = document.getElementById('pos-products-container');
        let filtered = state.products;

        if (state.searchQuery) {
            filtered = filtered.filter(p => p.name.toLowerCase().includes(state.searchQuery));
        }
        if (state.categoryFilter !== 'all') {
            filtered = filtered.filter(p => p.category === state.categoryFilter);
        }

        if (filtered.length === 0) {
            container.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400">No products found.</div>`;
            return;
        }

        container.innerHTML = filtered.map(p => `
            <div onclick="app.addToCart(${p.id})" class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md hover:border-primary/30 transition-all active:scale-95 group relative overflow-hidden">
                ${p.stock < 1 ? '<div class="absolute inset-0 bg-white/60 flex items-center justify-center font-bold text-red-500 z-10 backdrop-blur-sm">Out of Stock</div>' : ''}
                <div class="flex justify-between items-start mb-2">
                    <span class="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors">${p.category || 'General'}</span>
                    <span class="text-xs font-bold ${p.stock < 5 ? 'text-red-500' : 'text-green-600'}">${p.stock} left</span>
                </div>
                <h3 class="font-bold text-gray-800 mb-1 leading-tight group-hover:text-primary transition-colors line-clamp-2 h-10">${p.name}</h3>
                <div class="mt-2 font-bold text-lg text-gray-900">${this.formatCurrency(p.sellingPrice)}</div>
            </div>
        `).join('');
    },

    addToCart(productId) {
        const product = state.products.find(p => p.id === productId);
        if (!product || product.stock < 1) return;

        const date = Date.now();
        const existingItem = state.cart.find(item => item.productId === productId);

        if (existingItem) {
            if (existingItem.qty >= product.stock) {
                alert("Not enough stock!");
                return;
            }
            existingItem.qty++;
            existingItem.total = existingItem.qty * existingItem.price;
        } else {
            state.cart.push({
                productId: product.id,
                name: product.name,
                price: parseFloat(product.sellingPrice),
                cost: parseFloat(product.costPrice),
                qty: 1,
                total: parseFloat(product.sellingPrice)
            });
        }
        this.updateCartUI();
    },

    removeFromCart(productId) {
        state.cart = state.cart.filter(item => item.productId !== productId);
        this.updateCartUI();
    },

    updateCartQty(productId, change) {
        const item = state.cart.find(i => i.productId === productId);
        if (!item) return;

        const product = state.products.find(p => p.id === productId);

        if (change > 0 && item.qty >= product.stock) {
            alert(`Only ${product.stock} items available in stock.`);
            return;
        }

        item.qty += change;
        if (item.qty <= 0) {
            this.removeFromCart(productId);
            return;
        }
        item.total = item.qty * item.price;
        this.updateCartUI();
    },

    clearCart() {
        state.cart = [];
        this.updateCartUI();
    },

    updateCartUI() {
        const container = document.getElementById('pos-cart-items');

        if (state.cart.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-400 py-10 animate-pulse">
                    <i data-lucide="shopping-cart" class="w-12 h-12 mx-auto mb-3 opacity-20"></i>
                    <p>Cart is empty</p>
                    <p class="text-xs">Select items to start selling</p>
                </div>`;
        } else {
            container.innerHTML = state.cart.map(item => `
                <div class="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div class="flex-1">
                        <h4 class="font-bold text-gray-800 text-sm line-clamp-1">${item.name}</h4>
                        <div class="text-xs text-gray-500 mt-1">${this.formatCurrency(item.price)} x ${item.qty}</div>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        <div class="font-bold text-gray-900">${this.formatCurrency(item.total)}</div>
                        <div class="flex items-center gap-2 bg-white rounded-lg border border-gray-200 shadow-sm px-1 py-0.5">
                            <button onclick="app.updateCartQty(${item.productId}, -1)" class="p-1 hover:bg-gray-100 rounded text-gray-600"><i data-lucide="minus" class="w-3 h-3"></i></button>
                            <span class="text-xs font-bold w-4 text-center">${item.qty}</span>
                            <button onclick="app.updateCartQty(${item.productId}, 1)" class="p-1 hover:bg-gray-100 rounded text-gray-600"><i data-lucide="plus" class="w-3 h-3"></i></button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        lucide.createIcons();

        // Totals
        const total = state.cart.reduce((sum, i) => sum + i.total, 0);
        document.getElementById('cart-subtotal').innerText = this.formatCurrency(total);
        document.getElementById('cart-total').innerText = this.formatCurrency(total);

        // Button
        const btn = document.getElementById('checkout-btn');
        btn.disabled = state.cart.length === 0;
        if (state.cart.length === 0) {
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    },

    async processCheckout() {
        if (state.cart.length === 0) return;

        if (!confirm("Proceed with Checkout?")) return;

        const totalAmount = state.cart.reduce((sum, i) => sum + i.total, 0);
        const totalCost = state.cart.reduce((sum, i) => sum + (i.cost * i.qty), 0);
        const profit = totalAmount - totalCost;

        const sale = {
            date: new Date().toISOString(),
            items: [...state.cart],
            totalPrice: totalAmount,
            totalProfit: profit
        };

        try {
            // 1. Add Sale Record
            const saleId = await db.sales.add(sale);

            // 2. Update Stock
            for (const item of state.cart) {
                const product = await db.products.get(item.productId);
                if (product) {
                    await db.products.update(item.productId, {
                        stock: product.stock - item.qty
                    });
                }
            }

            // 3. UI Feedback
            await this.loadProducts(); // Reload stock
            this.renderPOSGrid();

            // Show Success
            document.getElementById('success-total').innerText = this.formatCurrency(totalAmount);
            document.getElementById('success-items').innerText = state.cart.reduce((s, i) => s + i.qty, 0);
            document.getElementById('success-id').innerText = '#' + saleId;
            document.getElementById('success-modal').classList.remove('hidden');

            this.clearCart();

        } catch (err) {
            console.error(err);
            alert("Transaction Failed: " + err.message);
        }
    },

    // --- Inventory Management ---
    renderInventoryTable() {
        const search = document.getElementById('inv-search').value.toLowerCase();
        const rows = state.products.filter(p => !search || p.name.toLowerCase().includes(search)).map(p => `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 font-medium text-gray-900">${p.name}</td>
                <td class="px-6 py-4 text-gray-500"><span class="px-2 py-1 bg-gray-100 rounded-lg text-xs">${p.category || '-'}</span></td>
                <td class="px-6 py-4 text-right text-gray-500">${this.formatCurrency(p.costPrice)}</td>
                <td class="px-6 py-4 text-right font-medium text-gray-900">${this.formatCurrency(p.sellingPrice)}</td>
                <td class="px-6 py-4 text-center">
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${p.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}">
                        ${p.stock}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <button onclick="app.editProduct(${p.id})" class="text-primary hover:text-indigo-700 font-medium text-sm mr-3">Edit</button>
                    <button onclick="app.deleteProduct(${p.id})" class="text-red-500 hover:text-red-700 font-medium text-sm">Delete</button>
                </td>
            </tr>
        `).join('');

        document.getElementById('inventory-list').innerHTML = rows || `<tr><td colspan="6" class="text-center py-8 text-gray-400">No products found</td></tr>`;
    },

    showAddProductModal() {
        document.getElementById('product-form').reset();
        document.getElementById('prod-id').value = '';
        document.getElementById('modal-title').innerText = 'Add New Product';
        document.getElementById('product-modal').classList.remove('hidden');
    },

    async editProduct(id) {
        const prod = await db.products.get(id);
        if (!prod) return;

        document.getElementById('prod-id').value = prod.id;
        document.getElementById('prod-name').value = prod.name;
        document.getElementById('prod-category').value = prod.category;
        document.getElementById('prod-stock').value = prod.stock;
        document.getElementById('prod-cost').value = prod.costPrice;
        document.getElementById('prod-price').value = prod.sellingPrice;

        document.getElementById('modal-title').innerText = 'Edit Product';
        document.getElementById('product-modal').classList.remove('hidden');
    },

    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    },

    async saveProduct() {
        const id = document.getElementById('prod-id').value;
        const data = {
            name: document.getElementById('prod-name').value,
            category: document.getElementById('prod-category').value,
            stock: parseInt(document.getElementById('prod-stock').value),
            costPrice: parseFloat(document.getElementById('prod-cost').value),
            sellingPrice: parseFloat(document.getElementById('prod-price').value)
        };

        if (id) {
            await db.products.update(parseInt(id), data);
        } else {
            await db.products.add(data);
        }

        this.closeModal('product-modal');
        await this.loadProducts();
        this.renderInventoryTable();
        this.renderPOSGrid();
        this.loadCategories(); // Refresh categories
    },

    async deleteProduct(id) {
        if (confirm('Are you sure you want to delete this product?')) {
            await db.products.delete(id);
            await this.loadProducts();
            this.renderInventoryTable();
            this.renderPOSGrid();
        }
    },

    // --- Reports ---
    async loadSalesHistory(filter = 'today') {
        const allSales = await db.sales.toArray();
        let filtered = allSales.reverse(); // Newest first

        if (filter === 'today') {
            const today = new Date().toDateString();
            filtered = filtered.filter(s => new Date(s.date).toDateString() === today);
        }

        const html = filtered.map(s => `
            <tr>
                <td class="px-6 py-4">
                    <div class="text-sm font-medium text-gray-900">${new Date(s.date).toLocaleDateString()}</div>
                    <div class="text-xs text-gray-500">${new Date(s.date).toLocaleTimeString()}</div>
                </td>
                <td class="px-6 py-4 text-gray-500 text-xs font-mono">#${s.id}</td>
                <td class="px-6 py-4 text-gray-900">${s.items.length}</td>
                <td class="px-6 py-4 text-right font-bold text-gray-900">${this.formatCurrency(s.totalPrice)}</td>
                <td class="px-6 py-4 text-right text-green-600 font-medium">+${this.formatCurrency(s.totalProfit)}</td>
            </tr>
        `).join('');

        document.getElementById('sales-history-list').innerHTML = html || `<tr><td colspan="5" class="text-center py-8 text-gray-400">No sales records found</td></tr>`;
    },

    async exportToCSV() {
        const allSales = await db.sales.toArray();
        if (allSales.length === 0) {
            alert("No sales data to export.");
            return;
        }

        // CSV Header
        const headers = ["Date", "Time", "Order ID", "Items Count", "Total Amount (LKR)", "Profit (LKR)"];
        const rows = allSales.map(s => [
            new Date(s.date).toLocaleDateString(),
            new Date(s.date).toLocaleTimeString(),
            s.id,
            s.items.length,
            s.totalPrice.toFixed(2),
            s.totalProfit.toFixed(2)
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        // Download Logic using Blob
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "sales_report_" + new Date().toISOString().slice(0, 10) + ".csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    async exportToPDF() {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            alert("PDF Library not loaded. Check internet connection.");
            return;
        }

        const allSales = await db.sales.toArray();
        if (allSales.length === 0) {
            alert("No sales data to export.");
            return;
        }

        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text("Dinu Roo Rata - Sales Report", 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text("Generated on: " + new Date().toLocaleString(), 14, 30);

        // Table Data
        const tableBody = allSales.map(s => [
            new Date(s.date).toLocaleDateString() + ' ' + new Date(s.date).toLocaleTimeString(),
            "#" + s.id,
            s.items.length,
            this.formatCurrency(s.totalPrice),
            this.formatCurrency(s.totalProfit)
        ]);

        // Generate Table
        doc.autoTable({
            head: [['Date', 'Order ID', 'Items', 'Total', 'Profit']],
            body: tableBody,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }, // Primary color
        });

        // Summary
        const totalSales = allSales.reduce((sum, s) => sum + s.totalPrice, 0);
        const totalProfit = allSales.reduce((sum, s) => sum + s.totalProfit, 0);

        const finalY = doc.lastAutoTable.finalY || 40;
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Total Sales: ${this.formatCurrency(totalSales)}`, 14, finalY + 10);
        doc.text(`Total Profit: ${this.formatCurrency(totalProfit)}`, 14, finalY + 16);

        doc.save("sales_report_" + new Date().toISOString().slice(0, 10) + ".pdf");
    },

    // --- Utils ---
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(amount);
    }
};

// Start App
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
