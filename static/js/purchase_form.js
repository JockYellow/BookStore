document.addEventListener('DOMContentLoaded', function() {
    // 全局變數
    let suppliers = [];
    let products = [];
    let itemCounter = 1; // 用於追蹤商品項目數量
    
    // DOM 元素
    const form = document.getElementById('purchase-form');
    const supplierSelect = document.getElementById('supplier');
    const itemsContainer = document.getElementById('items-container');
    const addItemBtn = document.getElementById('add-item');
    const saveDraftBtn = document.getElementById('save-draft');
    const itemTemplate = document.getElementById('item-template');
    
    // 初始化頁面
    async function init() {
        try {
            // 載入供應商和商品數據
            await Promise.all([
                loadSuppliers(),
                loadProducts()
            ]);
            
            // 設置事件監聽器
            setupEventListeners();
            
            // 初始化日期選擇器
            initDatePickers();
            
            // 計算初始總額
            calculateTotals();
            
        } catch (error) {
            console.error('初始化錯誤:', error);
            showNotification('error', '載入數據時發生錯誤');
        }
    }
    
    // 載入供應商數據
    async function loadSuppliers() {
        try {
            const response = await fetch('/api/suppliers');
            if (!response.ok) throw new Error('無法載入供應商數據');
            
            const data = await response.json();
            suppliers = data.data || [];
            
            // 填充供應商下拉選單
            suppliers.forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier.id;
                option.textContent = `${supplier.name} (${supplier.contact_person || '無聯絡人'})`;
                supplierSelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('載入供應商錯誤:', error);
            throw error;
        }
    }
    
    // 載入商品數據
    async function loadProducts() {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) throw new Error('無法載入商品數據');
            
            const data = await response.json();
            products = data.data || [];
            
            // 填充所有商品下拉選單
            document.querySelectorAll('.product-select').forEach(select => {
                populateProductOptions(select);
            });
            
        } catch (error) {
            console.error('載入商品錯誤:', error);
            throw error;
        }
    }
    
    // 填充商品選項
    function populateProductOptions(selectElement) {
        // 清空現有選項（保留第一個「請選擇」選項）
        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }
        
        // 添加商品選項
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (庫存: ${product.stock_quantity || 0})`;
            option.dataset.price = product.purchase_price || 0;
            selectElement.appendChild(option);
        });
        
        // 設置價格自動填充
        selectElement.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const priceInput = this.closest('.item-row').querySelector('.price-input');
            if (selectedOption.value && priceInput) {
                priceInput.value = selectedOption.dataset.price || '0';
                calculateTotals();
            }
        });
    }
    
    // 初始化日期選擇器
    function initDatePickers() {
        // 設置進貨日期預設為今天
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('purchase-date').value = today;
        
        // 設置預計到貨日期預設為 3 天後
        const threeDaysLater = new Date();
        threeDaysLater.setDate(threeDaysLater.getDate() + 3);
        document.getElementById('expected-delivery-date').value = threeDaysLater.toISOString().split('T')[0];
    }
    
    // 設置事件監聽器
    function setupEventListeners() {
        // 添加商品按鈕
        addItemBtn.addEventListener('click', addNewItem);
        
        // 刪除商品按鈕（事件委託）
        itemsContainer.addEventListener('click', function(e) {
            if (e.target.closest('.remove-item')) {
                const itemRow = e.target.closest('.item-row');
                if (itemRow && document.querySelectorAll('.item-row').length > 1) {
                    itemRow.remove();
                    calculateTotals();
                } else {
                    showNotification('warning', '至少需要一個商品項目');
                }
            }
        });
        
        // 數量或價格變更時重新計算總額
        itemsContainer.addEventListener('input', function(e) {
            if (e.target.classList.contains('quantity-input') || e.target.classList.contains('price-input')) {
                calculateTotals();
            }
        });
        
        // 運費或稅率變更時重新計算總額
        document.getElementById('shipping-fee').addEventListener('input', calculateTotals);
        document.getElementById('tax-rate').addEventListener('input', calculateTotals);
        
        // 表單提交
        form.addEventListener('submit', handleFormSubmit);
        
        // 存為草稿按鈕
        saveDraftBtn.addEventListener('click', function() {
            handleFormSubmit(new Event('submit'), true);
        });
    }
    
    // 添加新商品項目
    function addNewItem() {
        const newItem = itemTemplate.content.cloneNode(true);
        const newItemElement = newItem.querySelector('.item-row');
        
        // 更新表單名稱索引
        const newIndex = itemCounter++;
        newItemElement.innerHTML = newItemElement.innerHTML.replace(/\[\d+\]/g, `[${newIndex}]`);
        
        // 添加到容器
        itemsContainer.appendChild(newItem);
        
        // 填充商品選項
        const select = itemsContainer.lastElementChild.querySelector('.product-select');
        populateProductOptions(select);
        
        // 設置刪除按鈕事件
        const removeBtn = itemsContainer.lastElementChild.querySelector('.remove-item');
        removeBtn.addEventListener('click', function() {
            if (document.querySelectorAll('.item-row').length > 1) {
                this.closest('.item-row').remove();
                calculateTotals();
            } else {
                showNotification('warning', '至少需要一個商品項目');
            }
        });
    }
    
    // 計算總額
    function calculateTotals() {
        let subtotal = 0;
        
        // 計算商品小計
        document.querySelectorAll('.item-row').forEach(row => {
            const quantity = parseFloat(row.querySelector('.quantity-input')?.value) || 0;
            const price = parseFloat(row.querySelector('.price-input')?.value) || 0;
            subtotal += quantity * price;
        });
        
        // 獲取運費和稅率
        const shippingFee = parseFloat(document.getElementById('shipping-fee').value) || 0;
        const taxRate = (parseFloat(document.getElementById('tax-rate').value) || 0) / 100;
        
        // 計算稅金和總額
        const tax = subtotal * taxRate;
        const total = subtotal + shippingFee + tax;
        
        // 更新UI
        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('shipping-total').textContent = `$${shippingFee.toFixed(2)}`;
        document.getElementById('tax-amount').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('total-amount').textContent = `$${total.toFixed(2)}`;
    }
    
    // 處理表單提交
    async function handleFormSubmit(e, isDraft = false) {
        e.preventDefault();
        
        // 收集表單數據
        const formData = new FormData(form);
        const formValues = {};
        const items = [];
        
        // 處理表單數據
        for (let [key, value] of formData.entries()) {
            if (key.startsWith('items[')) {
                // 處理商品項目
                const match = key.match(/items\[(\d+)\]\[(\w+)\]/);
                if (match) {
                    const index = parseInt(match[1]);
                    const field = match[2];
                    
                    if (!items[index]) {
                        items[index] = {};
                    }
                    
                    items[index][field] = value;
                }
            } else {
                formValues[key] = value;
            }
        }
        
        // 過濾掉未定義的項目
        const validItems = items.filter(item => item && item.product_id);
        
        // 驗證表單
        if (!formValues.supplier_id) {
            showNotification('error', '請選擇供應商');
            return;
        }
        
        if (validItems.length === 0) {
            showNotification('error', '請至少添加一個商品');
            return;
        }
        
        // 準備提交數據
        const submitData = {
            ...formValues,
            items: validItems,
            status: isDraft ? 'draft' : 'pending',
            shipping_cost: parseFloat(formValues.shipping_cost) || 0,
            tax_rate: parseFloat(formValues.tax_rate) || 0,
            payment_status: formValues.payment_status || 'unpaid',
            notes: formValues.notes || ''
        };
        
        try {
            // 顯示載入中
            const submitBtn = isDraft ? saveDraftBtn : form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>處理中...';
            
            // 發送請求
            const response = await fetch('/api/purchases', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submitData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.detail || '儲存進貨單時發生錯誤');
            }
            
            // 顯示成功訊息
            showNotification('success', isDraft ? '已存為草稿' : '進貨單已建立');
            
            // 重定向到進貨列表
            setTimeout(() => {
                window.location.href = '/purchases';
            }, 1500);
            
        } catch (error) {
            console.error('儲存進貨單錯誤:', error);
            showNotification('error', error.message || '儲存進貨單時發生錯誤');
        } finally {
            // 恢復按鈕狀態
            const submitBtn = isDraft ? saveDraftBtn : form.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = isDraft ? '存為草稿' : '儲存進貨單';
        }
    }
    
    // 顯示通知
    function showNotification(type, message) {
        // 這裡可以整合您的通知系統
        alert(`${type.toUpperCase()}: ${message}`);
    }
    
    // 初始化頁面
    init();
});
