// static/js/products.js - 完整商品管理功能

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
    const supplierFilter = document.getElementById('supplierFilter');
    const sortSelect = document.getElementById('sortSelect');

    // 表單內元素
    const supplierSelect = document.getElementById('supplier');
    const costPriceInput = document.getElementById('costPrice');
    const stockInput = document.getElementById('stock');

    let allProducts = [];
    let suppliers = [];

    /** 顯示商品 Modal */
    const showModal = (isEdit = false, product = null) => {
        productForm.reset();
        document.getElementById('productId').value = '';

        if (isEdit && product) {
            modalTitle.textContent = '編輯商品';
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name || '';
            document.getElementById('category').value = product.category || '';
            document.getElementById('supplier').value = product.supplier_id || '';
            document.getElementById('costPrice').value = product.purchase_price || 0;
            document.getElementById('salePrice').value = product.sale_price || 0;
            document.getElementById('stock').value = product.stock || 0;
            document.getElementById('minStock').value = product.min_stock || product.minStock || 5;
            document.getElementById('unit').value = product.unit || '';
            document.getElementById('description').value = product.description || '';
            supplierSelect.disabled = true;
            costPriceInput.disabled = true;
            stockInput.disabled = true;
        } else {
            modalTitle.textContent = '新增商品';
            supplierSelect.disabled = false;
            costPriceInput.disabled = false;
            stockInput.disabled = false;
        }

        productModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    };

    /** 關閉商品 Modal */
    const closeModal = () => {
        productModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    };

    /** 載入供應商列表 */
    const loadSuppliers = async () => {
        try {
            const res = await fetch('/api/suppliers');
            if (res.ok) {
                suppliers = await res.json();
                const optionsHtml = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
                supplierSelect.innerHTML = '<option value="">選擇供應商</option>' + optionsHtml;
                supplierFilter.innerHTML = '<option value="">所有供應商</option>' + optionsHtml;
            }
        } catch (err) {
            console.warn('載入供應商失敗', err);
        }
    };

    /** 從 API 載入商品 */
    const loadProducts = async () => {
        window.app.ui.showLoading('載入商品中...');
        try {
            const res = await fetch('/api/products');
            if (!res.ok) throw new Error('無法獲取商品列表');
            allProducts = await res.json();
            filterAndRender();
        } catch (error) {
            console.error('載入商品失敗:', error);
            window.app.ui.showNotification('error', '載入商品失敗');
        } finally {
            window.app.ui.hideLoading();
        }
    };

    /** 渲染商品表格 */
    const renderTable = (products) => {
        if (products.length === 0) {
            productsTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4">沒有商品資料</td></tr>`;
            return;
        }

        productsTableBody.innerHTML = products.map(product => {
            const stock = parseInt(product.stock, 10) || 0;
            const min = parseInt(product.min_stock || product.minStock || 5, 10);
            let statusBadge;
            if (stock <= 0) {
                statusBadge = '無庫存';
            } else if (stock <= min) {
                statusBadge = '低庫存';
            } else {
                statusBadge = '庫存正常';
            }
            const supplierName = suppliers.find(s => s.id === product.supplier_id)?.name || '-';
            return `
                <tr data-id="${product.id}">
                    <td>${product.name}</td>
                    <td>${product.category || '-'}</td>
                    <td>${supplierName}</td>
                    <td>${product.purchase_price || 0}</td>
                    <td>${product.sale_price || 0}</td>
                    <td>${stock}</td>
                    <td>${statusBadge}</td>
                    <td class="text-right text-sm font-medium">
                        <button class="edit-btn text-blue-600 hover:underline">編輯</button>
                    </td>
                </tr>`;
        }).join('');
    };

    /** 依搜尋與篩選條件顯示 */
    const filterAndRender = () => {
        const searchText = searchInput.value.trim().toLowerCase();
        const category = categoryFilter.value;
        const status = statusFilter.value;
        const supplier = supplierFilter.value;
        let filtered = allProducts.filter(p => {
            const nameMatch = (p.name || '').toLowerCase().includes(searchText);
            const matchSearch = nameMatch;
            const matchCategory = !category || p.category === category;
            const stock = parseInt(p.stock, 10) || 0;
            const min = parseInt(p.min_stock || p.minStock || 5, 10);
            let statusMatch = true;
            if (status === 'in_stock') statusMatch = stock > min;
            if (status === 'low_stock') statusMatch = stock > 0 && stock <= min;
            if (status === 'out_of_stock') statusMatch = stock <= 0;
            const supplierMatch = !supplier || p.supplier_id === supplier;
            return matchSearch && matchCategory && statusMatch && supplierMatch;
        });
        const sortValue = sortSelect.value;
        if (sortValue) {
            const [field, direction] = sortValue.split('_');
            filtered.sort((a, b) => {
                const aVal = a[field] || 0;
                const bVal = b[field] || 0;
                if (aVal < bVal) return direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        renderTable(filtered);
    };

    searchInput.addEventListener('input', filterAndRender);
    categoryFilter.addEventListener('change', filterAndRender);
    statusFilter.addEventListener('change', filterAndRender);
    supplierFilter.addEventListener('change', filterAndRender);
    sortSelect.addEventListener('change', filterAndRender);

    /** API：新增商品 */
    const createProduct = async (productData) => {
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || '新增商品失敗');
        }
        return res.json();
    };

    /** API：更新商品 */
    const updateProductApi = async (id, productData) => {
        const res = await fetch(`/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || '更新商品失敗');
        }
        return res.json();
    };

    /** 處理表單提交 */
    const handleFormSubmit = async () => {
        const productId = document.getElementById('productId').value;
        const isEdit = !!productId;
        const formData = new FormData(productForm);
        const productData = {
            name: formData.get('productName').trim(),
            category: formData.get('category'),
            sale_price: parseFloat(formData.get('salePrice')) || 0,
            min_stock: parseInt(formData.get('minStock'), 10) || 0,
            unit: formData.get('unit').trim(),
            description: formData.get('description').trim(),
        };
        if (!isEdit) {
            productData.supplier_id = formData.get('supplier');
            productData.purchase_price = parseFloat(formData.get('costPrice')) || 0;
            productData.stock = parseInt(formData.get('stock'), 10) || 0;
        }

        window.app.ui.showLoading('儲存中...');
        try {
            if (isEdit) {
                await updateProductApi(productId, productData);
                window.app.ui.showNotification('success', '商品已更新');
            } else {
                await createProduct(productData);
                window.app.ui.showNotification('success', '商品已新增');
            }
            await loadProducts();
            closeModal();
        } catch (error) {
            console.error('儲存失敗:', error);
            window.app.ui.showNotification('error', error.message);
        } finally {
            window.app.ui.hideLoading();
        }
    };

    /** 處理表格中的點擊 (編輯/刪除) */
    const handleTableClick = (e) => {
        const target = e.target;
        const row = target.closest('tr');
        if (!row) return;
        const productId = row.dataset.id;
        const product = allProducts.find(p => p.id === productId);

        if (target.closest('.edit-btn')) {
            if (product) showModal(true, product);
        }
    };

    // 事件監聽器
    addProductBtn.addEventListener('click', () => showModal());
    cancelProductBtn.addEventListener('click', closeModal);
    saveProductBtn.addEventListener('click', handleFormSubmit);
    productsTableBody.addEventListener('click', handleTableClick);

    // 初始化
    loadSuppliers();
    loadProducts();
});

