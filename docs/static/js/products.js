// static/js/products.js (全新內容)

document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素
    const addProductBtn = document.getElementById('addProductBtn');
    const productModal = document.getElementById('productModal');
    const modalTitle = document.getElementById('modalTitle');
    const productForm = document.getElementById('productForm');
    const saveProductBtn = document.getElementById('saveProductBtn');
    const cancelProductBtn = document.getElementById('cancelProductBtn');
    const productsTableBody = document.getElementById('productsTableBody');
    
    // 篩選元素
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');

    let allProducts = []; // 用於儲存所有商品資料

    // 顯示 Modal
    const showModal = (isEdit = false, product = null) => {
        productForm.reset();
        document.getElementById('productId').value = '';
        
        if (isEdit && product) {
            modalTitle.textContent = '編輯商品';
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name || '';
            document.getElementById('barcode').value = product.barcode || '';
            document.getElementById('category').value = product.category || '';
            document.getElementById('supplier').value = product.supplier_id || '';
            // 修正：使用 product.purchase_price
            document.getElementById('costPrice').value = product.purchase_price || 0; 
            // 修正：使用 product.sale_price
            document.getElementById('salePrice').value = product.sale_price || 0; 
             // 修正：使用 product.stock
            document.getElementById('stock').value = product.stock || 0;
            document.getElementById('minStock').value = product.minStock || 5;
            document.getElementById('unit').value = product.unit || '個';
            document.getElementById('description').value = product.description || '';
        } else {
            modalTitle.textContent = '新增商品';
        }
        productModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    };

    // 隱藏 Modal
    const closeModal = () => {
        productModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    };

    // 載入商品資料
    const loadProducts = async () => {
        window.app.ui.showLoading('載入商品中...');
        try {
            // 注意：靜態版本中，這個路徑會被 build 腳本自動替換
            const response = await fetch('./data/products.json');
            if (!response.ok) throw new Error('無法獲取商品列表');
            allProducts = await response.json();
            renderTable(allProducts);
        } catch (error) {
            console.error('載入商品失敗:', error);
            window.app.ui.showNotification('error', '載入商品失敗');
        } finally {
            window.app.ui.hideLoading();
        }
    };

    // 渲染商品表格
    const renderTable = (products) => {
        if (products.length === 0) {
            productsTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4">沒有商品資料</td></tr>`;
            return;
        }

        productsTableBody.innerHTML = products.map(product => {
            const stock = parseInt(product.stock, 10) || 0;
            const minStock = parseInt(product.minStock, 10) || 5;
            let statusBadge;

            if (stock <= 0) {
                statusBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">無庫存</span>`;
            } else if (stock <= minStock) {
                statusBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">低庫存</span>`;
            } else {
                statusBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">庫存正常</span>`;
            }

            return `
                <tr data-id="${product.id}">
                    <td class="px-6 py-4 whitespace-nowrap">${product.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${product.barcode || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${product.category || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">$${product.purchase_price || 0}</td>
                    <td class="px-6 py-4 whitespace-nowrap">$${product.sale_price || 0}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${stock}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button class="text-blue-600 hover:text-blue-900 edit-btn"><i class="fas fa-edit"></i> 編輯</button>
                        <button class="text-red-600 hover:text-red-900 ml-4 delete-btn"><i class="fas fa-trash"></i> 刪除</button>
                    </td>
                </tr>
            `;
        }).join('');
    };

    // 處理表單提交
    const handleFormSubmit = () => {
        const productId = document.getElementById('productId').value;
        const isEdit = !!productId;
        
        const formData = new FormData(productForm);
        const productData = {
            name: formData.get('productName'),
            barcode: formData.get('barcode'),
            category: formData.get('category'),
            purchase_price: parseFloat(formData.get('costPrice')),
            sale_price: parseFloat(formData.get('salePrice')),
            stock: parseInt(formData.get('stock'), 10),
            // ... 其他欄位
        };

        // 在靜態網站中，我們不能真的提交表單，這裡僅為示範
        // 實際部署時，這些操作 (新增/編輯/刪除) 會無法運作
        if (isEdit) {
             console.log("更新商品:", productId, productData);
        } else {
             console.log("新增商品:", productData);
        }
        window.app.ui.showNotification('info', '靜態頁面不支持此操作');
        closeModal();
    };

    // 處理表格中的點擊事件 (編輯與刪除)
    const handleTableClick = (e) => {
        const target = e.target;
        const row = target.closest('tr');
        if (!row) return;

        const productId = row.dataset.id;
        
        if (target.closest('.edit-btn')) {
            const product = allProducts.find(p => p.id === productId);
            if(product) showModal(true, product);
        }

        if (target.closest('.delete-btn')) {
            window.app.ui.showConfirmDialog({
                title: '確認刪除',
                message: `您確定要刪除商品 #${productId} 嗎？此操作無法復原。`,
                confirmText: '確認刪除',
            }).then(confirmed => {
                if (confirmed) {
                    // 靜態網站無法真的刪除
                    window.app.ui.showNotification('info', '靜態頁面不支持刪除操作');
                }
            });
        }
    };

    // 設定事件監聽器
    addProductBtn.addEventListener('click', () => showModal());
    cancelProductBtn.addEventListener('click', closeModal);
    saveProductBtn.addEventListener('click', handleFormSubmit);
    productsTableBody.addEventListener('click', handleTableClick);

    // 初始載入
    loadProducts();
});