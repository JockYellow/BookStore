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
        
        window.app.ui.showNotification('success', '進貨單已成功建立！');
        setTimeout(() => { window.location.href = './purchases.html'; }, 1500);
        
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