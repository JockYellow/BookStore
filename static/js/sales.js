// 銷售管理（POS收銀）頁面邏輯 - 第1部分
document.addEventListener('DOMContentLoaded', function() {
    const app = window.app || new App();
    
    // DOM 元素
    const productSearch = document.getElementById('product-search');
    const categoryFilter = document.getElementById('category-filter');
    const productGrid = document.getElementById('product-grid');
    const cartItems = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const subtotalElement = document.getElementById('subtotal');
    const discountAmount = document.getElementById('discount-amount');
    const totalAmount = document.getElementById('total-amount');
    const totalItemsCount = document.getElementById('total-items-count');
    const checkoutBtn = document.getElementById('checkout-btn');
    const newSaleBtn = document.getElementById('new-sale-btn');
    
    // 分頁元素
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const paginationNumbers = document.getElementById('pagination-numbers');
    const startItemSpan = document.getElementById('start-item');
    const endItemSpan = document.getElementById('end-item');
    const totalItemsSpan = document.getElementById('total-items');
    
    // Modal 元素
    const productDetailModal = document.getElementById('product-detail-modal');
    const memberModal = document.getElementById('member-modal');
    const checkoutModal = document.getElementById('checkout-modal');
    
    // 全局變數
    let products = [];
    let filteredProducts = [];
    let cart = [];
    let currentPage = 1;
    const itemsPerPage = 12;
    let selectedMember = null;
    let currentProduct = null;
    
    // 初始化頁面
    async function init() {
        try {
            app.showLoading('載入商品資料中...');
            await loadProducts();
            renderProducts();
            setupEventListeners();
            updateCartUI();
        } catch (error) {
            console.error('初始化錯誤:', error);
            app.showNotification('error', '載入商品資料失敗');
        } finally {
            app.hideLoading();
        }
    }
    
    // 載入商品資料
    async function loadProducts() {
        try {
            app.showLoading('載入商品中...');
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error('無法載入商品資料');
            }
            products = await response.json();
            filterProducts();
        } catch (error) {
            console.error('載入商品失敗:', error);
            app.showNotification('error', '載入商品失敗，請稍後再試');
        } finally {
            app.hideLoading();
        }
    // 處理結帳
    async function processCheckout() {
        const amountReceived = parseFloat(document.getElementById('amount-received').value) || 0;
        const total = parseFloat(document.getElementById('checkout-total').textContent.replace('$', '').replace(/,/g, ''));
        
        if (amountReceived < total) {
            app.showNotification('error', '請先計算找零');
            return;
        }
        
        try {
            app.showLoading('處理結帳中...');
            
            // 準備銷售記錄資料
            const saleData = {
                items: cart.map(item => ({
                    product_id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                })),
                member_id: selectedMember?.id || null,
                subtotal: parseFloat(document.getElementById('checkout-subtotal').textContent.replace('$', '').replace(/,/g, '')),
                discount: parseFloat(document.getElementById('checkout-discount').textContent.replace('-$', '').replace(/,/g, '') || '0'),
                total: total,
                payment_method: document.getElementById('payment-method').value,
                amount_received: amountReceived,
                change: amountReceived - total,
                cashier: '系統管理員' // 實際應用中應該從登入資訊獲取
            };
            
            // 發送 API 請求
            const response = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saleData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || '結帳失敗');
            }
            
            const result = await response.json();
            
            // 顯示成功訊息
            app.showNotification('success', '結帳成功');
            
            // 列印收據
            printReceipt();
            
            // 開始新交易
            startNewSale();
            
            // 關閉結帳Modal
            checkoutModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
            
        } catch (error) {
            console.error('結帳失敗:', error);
            app.showNotification('error', error.message || '結帳失敗，請稍後再試');
        } finally {
            app.hideLoading();
        }
    }
    
    // 初始化頁面
    init();
    
    // 匯出函數供全局使用
    window.salesModule = {
        addToCart: addToCart,
        removeFromCart: removeFromCart,
        updateCartItemQuantity: updateCartItemQuantity,
        startNewSale: startNewSale,
        processCheckout: processCheckout,
        printReceipt: printReceipt
    };
    }
    
    // 渲染商品網格
    function renderProducts() {
        if (!productGrid) return;
        
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedProducts = filteredProducts.slice(start, end);
        
        if (paginatedProducts.length === 0) {
            productGrid.innerHTML = `
                <div class="col-span-2 md:col-span-3 lg:col-span-4 py-12 text-center text-gray-500">
                    <i class="fas fa-search text-4xl mb-2 opacity-30"></i>
                    <p>沒有找到符合條件的商品</p>
                </div>`;
            return;
        }
        
        productGrid.innerHTML = paginatedProducts.map(product => `
            <div class="bg-white rounded-lg shadow overflow-hidden border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer product-item" data-id="${product.id}">
                <div class="h-40 bg-gray-100 flex items-center justify-center p-2">
                    <img src="${product.image}" alt="${product.name}" class="h-full object-contain">
                </div>
                <div class="p-3">
                    <h3 class="font-medium text-gray-900 text-sm truncate" title="${product.name}">${product.name}</h3>
                    <div class="mt-1 flex justify-between items-center">
                        <span class="text-sm font-medium text-blue-600">$${product.price.toLocaleString()}</span>
                        <span class="text-xs text-gray-500">庫存: ${product.stock}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
