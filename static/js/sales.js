// static/js/sales.js (修改後，支援會員折扣、找零與付款方式)

document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const productGrid = document.getElementById('product-grid');
    const cartItems = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const subtotalElement = document.getElementById('subtotal');
    const totalAmount = document.getElementById('total-amount');
    const discountAmount = document.getElementById('discount-amount');
    const checkoutBtn = document.getElementById('checkout-btn');
    const checkoutModal = document.getElementById('checkout-modal');
    const productSearch = document.getElementById('product-search');
    const categoryFilter = document.getElementById('category-filter');
    const memberSelect = document.getElementById('member-select');
    const memberInfo = document.getElementById('member-info');
    const newSaleBtn = document.getElementById('new-sale-btn');

    // 新增付款與找零相關元素
    const paymentSelect = document.getElementById('payment-method');
    const amountReceivedInput = document.getElementById('amount-received');
    const changeDisplay = document.getElementById('change-display');
    const calcChangeBtn = document.getElementById('calc-change-btn');
    const memberDiscountDisplay = document.getElementById('member-discount');

    // 全域變數
    let allProducts = [];
    let cart = []; // 購物車結構: [{ id, name, price, quantity }, ...]
    let members = [];
    let selectedMember = null;

    // 初始化
    const init = async () => {
        window.app.ui.showLoading('載入商品資料...');
        try {
            await loadProducts();
            await loadMembers();
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

    // 載入會員資料
    const loadMembers = async () => {
        try {
            const response = await fetch('/api/members');
            if (response.ok) {
                members = await response.json();
                if (memberSelect) {
                    memberSelect.innerHTML = '<option value="">非會員顧客</option>' +
                        members.map(m => `<option value="${m.id}">${m.name || m.id}</option>`).join('');
                }
            }
        } catch (error) {
            console.warn('載入會員資料失敗:', error);
        }
    };

    // 渲染商品列表
    const renderProductGrid = (products) => {
        if (products.length === 0) {
            productGrid.innerHTML = `<div class="text-center py-4">目前沒有商品</div>`;
            return;
        }
        productGrid.innerHTML = products.map(p => `
            <div class="product-item" data-id="${p.id}">
                <div class="font-medium">${p.name}</div>
                <div class="text-sm text-gray-500">$${p.sale_price}</div>
                <div class="text-xs text-gray-400">庫存: ${p.stock}</div>
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
            cartItems.innerHTML = `
                <div class="p-4 text-center text-gray-500">購物車是空的</div>
            `;
        } else {
            cartItems.innerHTML = cart.map(item => `
                <div class="cart-item flex justify-between items-center" data-id="${item.id}">
                    <div>
                        <div>${item.name}</div>
                        <div class="text-sm text-gray-400">$${item.price} x ${item.quantity}</div>
                    </div>
                    <div class="font-medium">$${(item.price * item.quantity).toLocaleString()}</div>
                    <button class="remove-item text-red-500">x</button>
                </div>
            `).join('');
        }

        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        let discount = 0;
        if (selectedMember && selectedMember.discount_rate) {
            discount = subtotal * selectedMember.discount_rate;
        }
        const total = subtotal - discount;

        subtotalElement.textContent = `$${subtotal.toLocaleString()}`;
        totalAmount.textContent = `$${total.toLocaleString()}`;
        if (discountAmount) {
            discountAmount.textContent = `-$${discount.toLocaleString()}`;
        }
        if (memberDiscountDisplay) {
            memberDiscountDisplay.textContent = `-$${discount.toLocaleString()}`;
        }
        if (memberInfo) {
            if (selectedMember) {
                memberInfo.innerHTML = `
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <i class="fas fa-user text-blue-500"></i>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm font-medium text-gray-900">${selectedMember.name || selectedMember.id}</p>
                            <p class="text-xs text-gray-500">${selectedMember.phone || ''}</p>
                        </div>
                    </div>`;
            } else {
                memberInfo.innerHTML = `
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <i class="fas fa-user text-gray-400"></i>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm font-medium text-gray-900">非會員顧客</p>
                            <p class="text-xs text-gray-500">無會員折扣</p>
                        </div>
                    </div>`;
            }
        }
        cartCount.textContent = `${cart.length} 項商品`;
        checkoutBtn.disabled = cart.length === 0;
    };

    const filterProducts = () => {
        let filtered = [...allProducts];
        const search = productSearch ? productSearch.value.trim().toLowerCase() : '';
        const category = categoryFilter ? categoryFilter.value : '';
        if (search) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(search) ||
                (p.id && p.id.toLowerCase().includes(search))
            );
        }
        if (category) {
            filtered = filtered.filter(p => p.category === category);
        }
        renderProductGrid(filtered);
    };

    // 處理結帳流程
    const processCheckout = async () => {
        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        let discount = 0;
        if (selectedMember && selectedMember.discount_rate) {
            discount = subtotal * selectedMember.discount_rate;
        }
        const total = subtotal - discount;

        const paymentMethod = paymentSelect ? paymentSelect.value : 'cash';
        const received = amountReceivedInput && amountReceivedInput.value ? parseFloat(amountReceivedInput.value) : total;
        const change = received - total;

        const saleData = {
            items: cart.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                unit_price: item.price
            })),
            total: total,
            subtotal: subtotal,
            payment_method: paymentMethod,
            amount_received: received,
            change: change,
            member_id: selectedMember ? selectedMember.id : null
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
            await loadProducts();
            filterProducts();
            cart = []; // 清空購物車
            selectedMember = null;
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

        if (productSearch) {
            productSearch.addEventListener('input', filterProducts);
        }
        if (categoryFilter) {
            categoryFilter.addEventListener('change', filterProducts);
        }
        if (memberSelect) {
            memberSelect.addEventListener('change', () => {
                const val = memberSelect.value;
                selectedMember = members.find(m => m.id === val) || null;
                updateCartUI();
            });
        }
        if (newSaleBtn) {
            newSaleBtn.addEventListener('click', () => {
                cart = [];
                selectedMember = null;
                if (memberSelect) memberSelect.value = '';
                updateCartUI();
            });
        }

        cartItems.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.remove-item');
            if (removeBtn) {
                const itemId = removeBtn.closest('[data-id]').dataset.id;
                cart = cart.filter(item => item.id !== itemId);
                updateCartUI();
            }
        });

        checkoutBtn.addEventListener('click', async () => {
            // 填充結帳 Modal
            const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
            let discount = 0;
            if (selectedMember && selectedMember.discount_rate) {
                discount = subtotal * selectedMember.discount_rate;
            }
            const total = subtotal - discount;
            document.getElementById('checkout-total').textContent = `$${total.toLocaleString()}`;
            document.getElementById('checkout-subtotal').textContent = `$${subtotal.toLocaleString()}`;
            if (memberDiscountDisplay) {
                memberDiscountDisplay.textContent = `-$${discount.toLocaleString()}`;
            }
            const checkoutItems = document.getElementById('checkout-items');
            checkoutItems.innerHTML = cart.map(item => `
                <tr>
                    <td>${item.name}</td>
                    <td>$${item.price}</td>
                    <td>${item.quantity}</td>
                    <td>$${(item.price * item.quantity).toLocaleString()}</td>
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

        // 計算找零按鈕
        if (calcChangeBtn && amountReceivedInput && changeDisplay) {
            calcChangeBtn.addEventListener('click', () => {
                const totalText = document.getElementById('checkout-total')?.textContent || '0';
                const total = parseFloat(totalText.replace(/[$,]/g, ''));
                const received = parseFloat(amountReceivedInput.value);
                if (isNaN(received) || received < total) {
                    window.app.ui.showNotification('error', '實收金額不足');
                    return;
                }
                const changeVal = received - total;
                changeDisplay.textContent = `$${changeVal.toLocaleString()}`;
            });
        }
    };

    // 初始載入
    init();
});
