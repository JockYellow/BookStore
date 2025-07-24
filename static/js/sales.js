// static/js/sales.js (全新內容)

document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const productGrid = document.getElementById('product-grid');
    const cartItems = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const subtotalElement = document.getElementById('subtotal');
    const totalAmount = document.getElementById('total-amount');
    const checkoutBtn = document.getElementById('checkout-btn');
    const checkoutModal = document.getElementById('checkout-modal');
    
    // 全域變數
    let allProducts = [];
    let cart = []; // 購物車結構: [{ id, name, price, quantity }, ...]
    
    // 初始化
    const init = async () => {
        window.app.ui.showLoading('載入商品資料...');
        try {
            await loadProducts();
            renderProductGrid(allProducts);
            setupEventListeners();
            updateCartUI();
        } catch (error) {
            console.error('初始化失敗:', error);
            window.app.ui.showNotification('error', '頁面載入失敗');
        } finally {
            window.app.ui.hideLoading();
        }
    };

    // 載入商品
    const loadProducts = async () => {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('無法載入商品');
        allProducts = await response.json();
    };

    // 渲染商品列表
    const renderProductGrid = (products) => {
        if (products.length === 0) {
            productGrid.innerHTML = `<p class="col-span-full text-center">目前沒有商品</p>`;
            return;
        }
        productGrid.innerHTML = products.map(p => `
            <div class="bg-white rounded-lg shadow p-3 flex flex-col justify-between cursor-pointer product-item" data-id="${p.id}">
                <h3 class="font-medium text-gray-800 text-sm truncate">${p.name}</h3>
                <div class="mt-2 flex justify-between items-center">
                    <span class="text-lg font-bold text-blue-600">$${p.sale_price}</span>
                    <span class="text-xs text-gray-500">庫存: ${p.stock_quantity}</span>
                </div>
            </div>
        `).join('');
    };

    // 新增至購物車
    const addToCart = (productId) => {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;

        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.sale_price,
                quantity: 1,
            });
        }
        updateCartUI();
    };

    // 更新購物車 UI
    const updateCartUI = () => {
        if (cart.length === 0) {
            cartItems.innerHTML = `<div class="py-8 text-center text-gray-500">
                <i class="fas fa-shopping-cart text-4xl mb-2 opacity-30"></i>
                <p>購物車是空的</p>
            </div>`;
        } else {
            cartItems.innerHTML = cart.map(item => `
                <div class="flex items-center justify-between py-3 px-2" data-id="${item.id}">
                    <div class="flex-1">
                        <p class="font-medium text-sm">${item.name}</p>
                        <p class="text-xs text-gray-500">$${item.price} x ${item.quantity}</p>
                    </div>
                    <div class="font-bold text-sm">$${(item.price * item.quantity).toLocaleString()}</div>
                    <button class="ml-4 text-red-500 hover:text-red-700 remove-item"><i class="fas fa-times-circle"></i></button>
                </div>
            `).join('');
        }

        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        subtotalElement.textContent = `$${subtotal.toLocaleString()}`;
        totalAmount.textContent = `$${subtotal.toLocaleString()}`; // 假設無折扣
        cartCount.textContent = `${cart.length} 項商品`;

        checkoutBtn.disabled = cart.length === 0;
    };

    // 處理結帳流程
    const processCheckout = async () => {
        const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        
        const saleData = {
            items: cart.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                unit_price: item.price
            })),
            total: total,
            subtotal: total,
            payment_method: 'cash', // 可擴充
            amount_received: total, // 假設付清
            change: 0
        };

        window.app.ui.showLoading('結帳中...');
        try {
            const response = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saleData)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || '結帳失敗');
            }
            
            window.app.ui.showNotification('success', '結帳成功！');
            cart = []; // 清空購物車
            updateCartUI();
            checkoutModal.classList.add('hidden'); // 關閉結帳視窗
            document.body.classList.remove('overflow-hidden');

        } catch (error) {
            console.error('結帳失敗:', error);
            window.app.ui.showNotification('error', error.message);
        } finally {
            window.app.ui.hideLoading();
        }
    };
    
    // 設定事件監聽器
    const setupEventListeners = () => {
        productGrid.addEventListener('click', (e) => {
            const item = e.target.closest('.product-item');
            if (item) {
                addToCart(item.dataset.id);
            }
        });

        cartItems.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.remove-item');
            if (removeBtn) {
                const itemId = removeBtn.closest('[data-id]').dataset.id;
                cart = cart.filter(item => item.id !== itemId);
                updateCartUI();
            }
        });

        checkoutBtn.addEventListener('click', () => {
            // 填充結帳 Modal
            document.getElementById('checkout-total').textContent = totalAmount.textContent;
            document.getElementById('checkout-subtotal').textContent = subtotalElement.textContent;
            
            const checkoutItems = document.getElementById('checkout-items');
            checkoutItems.innerHTML = cart.map(item => `
                <tr>
                    <td class="px-3 py-2">${item.name}</td>
                    <td class="px-3 py-2 text-right">$${item.price}</td>
                    <td class="px-3 py-2 text-center">${item.quantity}</td>
                    <td class="px-3 py-2 text-right">$${item.price * item.quantity}</td>
                </tr>
            `).join('');

            checkoutModal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
        });

        // 結帳 Modal 內的按鈕
        document.getElementById('confirm-checkout-btn').addEventListener('click', processCheckout);
        
        document.querySelectorAll('.close-checkout-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                checkoutModal.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            });
        });
    };

    // 初始載入
    init();
});