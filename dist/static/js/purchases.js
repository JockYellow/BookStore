// static/js/purchases.js (全新內容)

document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const purchasesList = document.getElementById('purchases-list');
    const newPurchaseBtn = document.getElementById('new-purchase-btn');
    const purchaseDetailModal = document.getElementById('purchase-detail-modal');

    let allPurchases = [];
    let allSuppliers = [];

    // 初始化
    const init = async () => {
        window.app.ui.showLoading('載入資料中...');
        try {
            await Promise.all([loadSuppliers(), loadPurchases()]);
            renderPurchases(allPurchases);
        } catch (error) {
            console.error('初始化失敗:', error);
            window.app.ui.showNotification('error', '頁面初始化失敗');
        } finally {
            window.app.ui.hideLoading();
        }
    };

    // 載入供應商資料 (用於顯示名稱)
    const loadSuppliers = async () => {
        try {
            const response = await fetch('./data/suppliers.json');
            if (!response.ok) throw new Error('無法載入供應商');
            allSuppliers = await response.json();
        } catch (error) {
            console.error(error);
            // 即使供應商載入失敗，也繼續執行
        }
    };

    // 載入進貨紀錄
    const loadPurchases = async () => {
        const response = await fetch('./data/purchases.json');
        if (!response.ok) throw new Error('無法載入進貨紀錄');
        const result = await response.json();
        // API 回傳的資料結構是 { "data": [...] }
        allPurchases = result.data || []; 
    };

    // 渲染進貨列表
    const renderPurchases = (purchases) => {
        if (!purchasesList) return;
        if (purchases.length === 0) {
            purchasesList.innerHTML = `<tr><td colspan="7" class="text-center py-4">沒有任何進貨紀錄</td></tr>`;
            return;
        }

        purchasesList.innerHTML = purchases.map(purchase => {
            const supplier = allSuppliers.find(s => s.id === purchase.supplier_id);
            const supplierName = supplier ? supplier.name : '未知供應商';
            const itemCount = purchase.items ? purchase.items.length : 0;
            const statusMap = {
                draft: { text: '草稿', color: 'bg-gray-100 text-gray-800' },
                ordered: { text: '已訂購', color: 'bg-blue-100 text-blue-800' },
                received: { text: '已到貨', color: 'bg-green-100 text-green-800' },
                cancelled: { text: '已取消', color: 'bg-red-100 text-red-800' }
            };
            const statusInfo = statusMap[purchase.status] || { text: '未知', color: 'bg-gray-100' };
            const statusBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.color}">${statusInfo.text}</span>`;

            return `
                <tr data-id="${purchase.id}">
                    <td class="px-6 py-4 whitespace-nowrap text-blue-600 font-medium cursor-pointer view-details">${purchase.purchase_number || purchase.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${supplierName}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${itemCount} 項</td>
                    <td class="px-6 py-4 whitespace-nowrap">$${(purchase.total || purchase.total_amount || 0).toLocaleString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${new Date(purchase.purchase_date).toLocaleDateString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a href="/purchases/edit/${purchase.id}" class="text-indigo-600 hover:text-indigo-900"><i class="fas fa-edit"></i> 編輯</a>
                        <button class="text-red-600 hover:text-red-900 ml-4 delete-purchase"><i class="fas fa-trash"></i> 刪除</button>
                    </td>
                </tr>
            `;
        }).join('');
    };

    // 顯示進貨明細 Modal
    const viewPurchaseDetails = async (purchaseId) => {
        window.app.ui.showLoading('載入明細中...');
        try {
            const response = await fetch('./data/purchases.json');
            if (!response.ok) throw new Error('無法獲取明細');
            const result = await response.json();
            const purchase = result.data;
            
            const supplier = allSuppliers.find(s => s.id === purchase.supplier_id);
            
            // 填充 Modal 內容
            document.getElementById('purchase-id').textContent = purchase.purchase_number || purchase.id;
            document.getElementById('supplier-name').textContent = supplier ? supplier.name : '未知供應商';
            document.getElementById('purchase-date').textContent = new Date(purchase.purchase_date).toLocaleString();
            document.getElementById('purchase-status').textContent = purchase.status;
            document.getElementById('purchase-notes').textContent = purchase.notes || '無';
            
            const itemsTbody = document.getElementById('purchase-items');
            itemsTbody.innerHTML = purchase.items.map(item => `
                <tr>
                    <td class="px-3 py-2">${item.product_id}</td>
                    <td class="px-3 py-2">${item.product_name}</td>
                    <td class="px-3 py-2 text-center">$${item.unit_price.toLocaleString()}</td>
                    <td class="px-3 py-2 text-center">${item.quantity}</td>
                    <td class="px-3 py-2 text-right">$${(item.unit_price * item.quantity).toLocaleString()}</td>
                </tr>
            `).join('');
            
            // 計算總計
            const subtotal = purchase.items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
            document.getElementById('purchase-subtotal').textContent = `$${subtotal.toLocaleString()}`;
            document.getElementById('purchase-shipping').textContent = `$${(purchase.shipping_fee || 0).toLocaleString()}`;
            document.getElementById('purchase-total').textContent = `$${(purchase.total || purchase.total_amount || 0).toLocaleString()}`;

            // 顯示 Modal
            purchaseDetailModal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');

        } catch (error) {
            console.error('顯示明細失敗:', error);
            window.app.ui.showNotification('error', '無法顯示進貨明細');
        } finally {
            window.app.ui.hideLoading();
        }
    };
    
    // 刪除進貨單
    const deletePurchase = async (purchaseId) => {
        const confirmed = await window.app.ui.showConfirmDialog({ title: '確認刪除', message: '您確定要刪除這筆進貨單嗎？' });
        if (!confirmed) return;

        window.app.ui.showLoading('刪除中...');
        try {
            const response = await fetch('./data/purchases.json', { method: 'DELETE' });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || '刪除失敗');
            }
            window.app.ui.showNotification('success', '進貨單已刪除');
            // 重新載入資料
            await loadPurchases();
            renderPurchases(allPurchases);
        } catch (error) {
            console.error('刪除失敗:', error);
            window.app.ui.showNotification('error', error.message);
        } finally {
            window.app.ui.hideLoading();
        }
    };


    // 設定事件監聽器
    newPurchaseBtn.addEventListener('click', () => {
        window.location.href = '/purchases/new';
    });

    purchasesList.addEventListener('click', (e) => {
        const purchaseId = e.target.closest('tr').dataset.id;
        if (e.target.closest('.view-details')) {
            viewPurchaseDetails(purchaseId);
        }
        if (e.target.closest('.delete-purchase')) {
            deletePurchase(purchaseId);
        }
    });

    purchaseDetailModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-modal-btn') || e.target.closest('.close-modal-btn')) {
            purchaseDetailModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }
    });

    // 初始載入
    init();
});