// static/js/purchase_form.js (全新內容)

document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const form = document.getElementById('purchase-form');
    const supplierSelect = document.getElementById('supplier');
    const itemsContainer = document.getElementById('items-container');
    const addItemBtn = document.getElementById('add-item');
    const itemTemplate = document.getElementById('item-template');
    
    let allProducts = [];
    let itemCounter = 1;

    // 初始化
    const init = async () => {
        window.app.ui.showLoading('載入頁面資料...');
        try {
            await Promise.all([loadSuppliers(), loadProducts()]);
            // 初始時，為第一個商品選項填充內容
            populateProductOptions(document.querySelector('.product-select'));
        } catch (error) {
            console.error('初始化失敗:', error);
            window.app.ui.showNotification('error', '頁面資料載入失敗');
        } finally {
            window.app.ui.hideLoading();
        }
    };

    // 載入供應商
    const loadSuppliers = async () => {
        const response = await fetch('/api/suppliers');
        if (!response.ok) throw new Error('無法載入供應商');
        const suppliers = await response.json();
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.id;
            option.textContent = supplier.name;
            supplierSelect.appendChild(option);
        });
    };

    // 載入商品
    const loadProducts = async () => {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('無法載入商品');
        allProducts = await response.json();
    };
    
    // 填充商品下拉選項
    const populateProductOptions = (selectElement) => {
        allProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (售價: $${product.sale_price})`;
            // 將成本價存在 data attribute 中，方便自動帶入
            option.dataset.cost = product.purchase_price || 0;
            selectElement.appendChild(option);
        });
    };
    
    // 新增一筆商品項目
    const addNewItem = () => {
        const newItemFragment = itemTemplate.content.cloneNode(true);
        const newItemRow = newItemFragment.querySelector('.item-row');
        
        // 更新 name 屬性中的索引，確保後端能正確解析
        newItemRow.querySelectorAll('[name]').forEach(input => {
            input.name = input.name.replace(/\[\d+\]/, `[${itemCounter}]`);
        });
        itemCounter++;

        populateProductOptions(newItemRow.querySelector('.product-select'));
        itemsContainer.appendChild(newItemRow);
    };

    // 計算總金額
    const calculateTotals = () => {
        let subtotal = 0;
        itemsContainer.querySelectorAll('.item-row').forEach(row => {
            const quantity = parseFloat(row.querySelector('.quantity-input').value) || 0;
            const price = parseFloat(row.querySelector('.price-input').value) || 0;
            subtotal += quantity * price;
        });

        const shippingFee = parseFloat(document.getElementById('shipping-fee').value) || 0;
        const taxRate = (parseFloat(document.getElementById('tax-rate').value) || 0) / 100;
        const tax = subtotal * taxRate;
        const total = subtotal + shippingFee + tax;

        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('shipping-total').textContent = `$${shippingFee.toFixed(2)}`;
        document.getElementById('tax-amount').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('total-amount').textContent = `$${total.toFixed(2)}`;
    };

    // 處理表單提交
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        const items = [];
        document.querySelectorAll('.item-row').forEach(row => {
            const productId = row.querySelector('.product-select').value;
            if (productId) {
                items.push({
                    product_id: productId,
                    quantity: parseInt(row.querySelector('.quantity-input').value, 10),
                    unit_price: parseFloat(row.querySelector('.price-input').value)
                });
            }
        });

        if (!supplierSelect.value) {
            window.app.ui.showNotification('error', '請選擇一個供應商');
            return;
        }
        if (items.length === 0) {
            window.app.ui.showNotification('error', '請至少新增一項商品');
            return;
        }

        const purchaseData = {
            supplier_id: supplierSelect.value,
            purchase_date: document.getElementById('purchase-date').value,
            expected_delivery_date: document.getElementById('expected-delivery-date').value,
            shipping_cost: parseFloat(document.getElementById('shipping-fee').value) || 0,
            tax_rate: parseFloat(document.getElementById('tax-rate').value) || 0,
            payment_status: document.getElementById('payment-status').value,
            notes: document.getElementById('notes').value,
            status: 'ordered', // 或根據需求設定
            items: items
        };

        window.app.ui.showLoading('正在儲存進貨單...');
        try {
            const response = await fetch('/api/purchases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(purchaseData)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || '儲存失敗');
            }
            
            window.app.ui.showNotification('success', '進貨單已成功建立！');
            // 延遲1.5秒後跳轉回列表頁
            setTimeout(() => {
                window.location.href = '/purchases';
            }, 1500);

        } catch (error) {
            console.error('儲存失敗:', error);
            window.app.ui.showNotification('error', error.message);
        } finally {
            window.app.ui.hideLoading();
        }
    };
    
    // 設定事件監聽
    addItemBtn.addEventListener('click', addNewItem);
    form.addEventListener('submit', handleFormSubmit);

    // 動態綁定事件
    itemsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.remove-item')) {
            if (itemsContainer.querySelectorAll('.item-row').length > 1) {
                e.target.closest('.item-row').remove();
                calculateTotals();
            } else {
                window.app.ui.showNotification('warning', '至少需要一項商品');
            }
        }
    });

    itemsContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('product-select')) {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const cost = selectedOption.dataset.cost || '0';
            e.target.closest('.item-row').querySelector('.price-input').value = cost;
        }
        calculateTotals();
    });

    form.addEventListener('input', (e) => {
        if (e.target.matches('#shipping-fee, #tax-rate')) {
            calculateTotals();
        }
    });

    // 初始化
    init();
});