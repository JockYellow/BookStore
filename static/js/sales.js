// static/js/sales.js (修正後，支援會員折扣與找零)

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

    // 會員相關元素與找零
    const memberList = document.getElementById('member-list');
    const memberModal = document.getElementById('member-modal');
    const memberSearch = document.getElementById('member-search');
    const nonMemberBtn = document.getElementById('non-member-btn');
    const amountReceivedInput = document.getElementById('amount-received');
    const changeDisplay = document.getElementById('change-display');
    const calcChangeBtn = document.getElementById('calc-change-btn');
    const memberDiscountDisplay = document.getElementById('member-discount');
    const discountType = document.getElementById('discount-type');
    const discountValue = document.getElementById('discount-value');
    const manualDiscountDisplay = document.getElementById('manual-discount');

    // 全域變數
    let allProducts = [];
    let cart = []; // 購物車結構: [{ id, name, price, quantity }, ...]
    let members = [];
    let selectedMember = null;

    // [修正] 將 calculateChange 和 updateCheckoutSummary 移至頂層，使其成為可重用的輔助函式

    /**
     * 計算找零金額
     */
    const calculateChange = () => {
        const totalText = document.getElementById('checkout-total')?.textContent || '0';
        const total = parseFloat(totalText.replace(/[$,]/g, '')) || 0;
        const received = parseFloat(amountReceivedInput.value);
        if (!isNaN(received) && received >= total) {
            const changeVal = received - total;
            changeDisplay.value = changeVal.toLocaleString();
        } else {
            changeDisplay.value = '0';
        }
    };

    /**
     * 更新結帳彈出視窗內的摘要資訊
     */
    const updateCheckoutSummary = () => {
        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        let discount = 0;
        if (selectedMember && selectedMember.discount_rate) {
            discount = subtotal * selectedMember.discount_rate;
        }
        let manual = 0;
        const dt = discountType ? discountType.value : '';
        const dv = discountValue ? parseFloat(discountValue.value) || 0 : 0;
        if (dt === 'percentage') manual = subtotal * (dv / 100);
        else if (dt === 'amount') manual = dv;
        
        const total = subtotal - discount - manual;

        document.getElementById('checkout-subtotal').textContent = `$${subtotal.toLocaleString()}`;
        memberDiscountDisplay.textContent = `-$${discount.toLocaleString()}`;
        manualDiscountDisplay.textContent = `-$${manual.toLocaleString()}`;
        document.getElementById('checkout-total').textContent = `$${total.toLocaleString()}`;
        
        calculateChange(); // 每次更新摘要時都重新計算找零
    };


    // 初始化
    const init = async () => {
        window.app.ui.showLoading('載入商品資料...');
        try {
            await loadProducts();
            await loadMembers();
            populateCategories();
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

    const populateCategories = () => {
        if (!categoryFilter) return;
        const cats = Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)));
        categoryFilter.innerHTML = '<option value="">所有分類</option>' +
            cats.map(c => `<option value="${c}">${c}</option>`).join('');
    };

    // 載入會員資料
    const renderMemberList = (list) => {
        if (!memberList) return;
        memberList.innerHTML = list.map(m => `
            <li class="py-3 px-2 hover:bg-gray-50 cursor-pointer" data-id="${m.id}">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span class="text-blue-600 font-medium">${(m.name || m.id).charAt(0)}</span>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-900">${m.name || m.id}</p>
                        <p class="text-sm text-gray-500">${m.phone || ''}</p>
                    </div>
                    <div class="ml-auto text-sm text-gray-500">
                        累積 ${(m.total_spent || 0).toLocaleString()} 元
                    </div>
                </div>
            </li>
        `).join('');
    };

    const loadMembers = async () => {
        try {
            const response = await fetch('/api/members');
            if (response.ok) {
                const data = await response.json();
                members = Array.isArray(data) ? data : (data.data || []);
                if (memberSelect) {
                    memberSelect.innerHTML = '<option value="">非會員顧客</option>' +
                        members.map(m => `<option value="${m.id}">${m.name || m.id}</option>`).join('');
                }
                renderMemberList(members);
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
        let memberDiscount = 0;
        if (selectedMember && selectedMember.discount_rate) {
            memberDiscount = subtotal * selectedMember.discount_rate;
        }
        let manualDiscount = 0;
        const discType = discountType ? discountType.value : '';
        const discVal = discountValue ? parseFloat(discountValue.value) || 0 : 0;
        if (discType === 'percentage') {
            manualDiscount = subtotal * (discVal / 100);
        } else if (discType === 'amount') {
            manualDiscount = discVal;
        }
        const total = subtotal - memberDiscount - manualDiscount;
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
            discount: memberDiscount + manualDiscount,
            manual_discount_type: discType || null,
            manual_discount_value: discVal,
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
            populateCategories();
            filterProducts();
            cart = []; // 清空購物車
            selectedMember = null;
            if (discountType) discountType.value = '';
            if (discountValue) discountValue.value = 0;
            updateCartUI();
            checkoutModal.classList.add('hidden');
            // 關閉結帳視窗
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
        if (memberList) {
            memberList.addEventListener('click', (e) => {
                const li = e.target.closest('li[data-id]');
                if (li) {
                    const id = li.dataset.id;
                    selectedMember = members.find(m => m.id === id) || null;
                    if (memberSelect) memberSelect.value = id;
                    updateCartUI();
                    if (memberModal) {
                        memberModal.classList.add('hidden');
                        document.body.classList.remove('overflow-hidden');
                    }
                }
            });
        }
        if (memberSearch) {
            memberSearch.addEventListener('input', () => {
                const term = memberSearch.value.trim().toLowerCase();
                const filtered = members.filter(m =>
                    (m.name || '').toLowerCase().includes(term) ||
                    (m.phone || '').toLowerCase().includes(term)
                );
                renderMemberList(filtered);
            });
        }
        document.querySelectorAll('.close-member-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (memberModal) {
                    memberModal.classList.add('hidden');
                    document.body.classList.remove('overflow-hidden');
                }
            });
        });
        if (nonMemberBtn) {
            nonMemberBtn.addEventListener('click', () => {
                selectedMember = null;
                if (memberSelect) memberSelect.value = '';
                updateCartUI();
                if (memberModal) {
                    memberModal.classList.add('hidden');
                    document.body.classList.remove('overflow-hidden');
                }
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
            document.getElementById('checkout-subtotal').textContent = `$${subtotal.toLocaleString()}`;
            memberDiscountDisplay.textContent = `-$${discount.toLocaleString()}`;
            if (manualDiscountDisplay) manualDiscountDisplay.textContent = '-$0';
            if (discountType) discountType.value = '';
            if (discountValue) discountValue.value = 0;
            document.getElementById('checkout-total').textContent = `$${(subtotal - discount).toLocaleString()}`;
            const checkoutItems = document.getElementById('checkout-items');
            checkoutItems.innerHTML = cart.map(item => `
                <tr>
                    <td>${item.name}</td>
                    <td>$${item.price}</td>
                    <td>${item.quantity}</td>
                    <td>$${(item.price * item.quantity).toLocaleString()}</td>
                </tr>
            `).join('');
            // ←—— 新增：預設實收金額為總計，並立即算一次找零
            amountReceivedInput.value = (subtotal - discount).toFixed(2);
            calculateChange();

            updateCheckoutSummary(); // Initial calculation
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
        
        // 折扣輸入會觸發重新計算
        if (discountType) {
            discountType.addEventListener('change', updateCheckoutSummary);
        }
        if (discountValue) {
            discountValue.addEventListener('input', updateCheckoutSummary);
        }

        // 計算找零的事件監聽
        if (calcChangeBtn && amountReceivedInput && changeDisplay) {
            calcChangeBtn.addEventListener('click', calculateChange);
            amountReceivedInput.addEventListener('input', calculateChange);
        }
    };

    // 初始載入
    init();
});