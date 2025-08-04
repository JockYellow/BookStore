
let allProducts = []; // 用於儲存所有商品資料

// DOM 元素
const productImageInput = document.getElementById('productImage');
const imagePreview = document.getElementById('imagePreview');
const barcodeInput = document.getElementById('barcode');

/**
 * 根據搜尋文字、分類與庫存狀態過濾商品，並重新渲染表格。
 */
const filterAndRender = () => {
    const searchText = searchInput.value.trim().toLowerCase();
    const category = categoryFilter.value;
    const status = statusFilter.value;
    const filtered = allProducts.filter(p => {
        const nameMatch = (p.name || '').toLowerCase().includes(searchText);
        const barcodeMatch = (p.barcode || '').toLowerCase().includes(searchText);
        const matchSearch = nameMatch || barcodeMatch;
        const matchCategory = category === '' || p.category === category;
        const stock = parseInt(p.stock, 10) || 0;
        const min = parseInt(p.minStock, 10) || 5;
        let statusMatch = true;
        if (status === 'instock') statusMatch = stock > min;
        if (status === 'low')     statusMatch = stock > 0 && stock <= min;
        if (status === 'out')     statusMatch = stock <= 0;
        return matchSearch && matchCategory && statusMatch;
    });
    renderTable(filtered);
};

// 註冊搜尋與篩選事件，當輸入或選取變更時自動過濾
searchInput.addEventListener('input', filterAndRender);
categoryFilter.addEventListener('change', filterAndRender);
statusFilter.addEventListener('change', filterAndRender);

// 呼叫 API 新增商品
const createProduct = async (formData) => {
    const res = await fetch('/api/products', {
        method: 'POST',
        body: formData // Send FormData directly
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || '新增商品失敗');
    }
    return res.json();
};

// 呼叫 API 更新商品
const updateProductApi = async (id, formData) => {
    const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        body: formData // Send FormData directly
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || '更新商品失敗');
    }
    return res.json();
};

// 呼叫 API 刪除商品
const deleteProductApi = async (id) => {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || '刪除商品失敗');
    }
};

// 處理表單提交
const handleFormSubmit = async () => {
    const productId = document.getElementById('productId').value;
    const isEdit = !!productId;

    const formData = new FormData();
    formData.append('name', document.getElementById('productName').value);
    formData.append('barcode', document.getElementById('barcode').value);
    formData.append('category', document.getElementById('category').value);
    formData.append('supplier_id', document.getElementById('supplier').value);
    formData.append('purchase_price', document.getElementById('costPrice').value);
    formData.append('sale_price', document.getElementById('salePrice').value);
    formData.append('stock', document.getElementById('stock').value);
    formData.append('min_stock', document.getElementById('minStock').value);
    formData.append('unit', document.getElementById('unit').value);
    formData.append('description', document.getElementById('description').value);

    if (productImageInput.files[0]) {
        formData.append('image', productImageInput.files[0]);
    }

    window.app.ui.showLoading('儲存中...');
    try {
        if (isEdit) {
            await updateProductApi(productId, formData);
            window.app.ui.showNotification('success', '商品已更新');
        } else {
            await createProduct(formData);
            window.app.ui.showNotification('success', '商品已新增');
        }
        await loadProducts();
    } catch (error) {
        console.error('儲存失敗:', error);
        window.app.ui.showNotification('error', error.message);
    } finally {
        window.app.ui.hideLoading();
        closeModal();
    }
};

const handleTableClick = (e) => {
    const target = e.target;
    const row = target.closest('tr');
    const productId = row.dataset.id;

    if (target.closest('.delete-btn')) {
        window.app.ui.showConfirmDialog({
            title: '確認刪除',
            message: `您確定要刪除商品 #${productId} 嗎？此操作無法復原。`,
            confirmText: '確認刪除',
        }).then(async (confirmed) => {
            if (confirmed) {
                window.app.ui.showLoading('刪除中...');
                try {
                    await deleteProductApi(productId);
                    window.app.ui.showNotification('success', '商品已刪除');
                    await loadProducts();
                } catch (error) {
                    console.error('刪除失敗:', error);
                    window.app.ui.showNotification('error', error.message);
                } finally {
                    window.app.ui.hideLoading();
                }
            }
        });
    }
};

const renderTable = (products) => {
    productsTableBody.innerHTML = products.map(product => {
        const stock = parseInt(product.stock, 10) || 0;
        const minStock = parseInt(product.minStock, 10) || 5;
        let statusBadge;

        if (stock <= 0) {
            statusBadge = `無庫存`;
        } else if (stock <= minStock) {
            statusBadge = `低庫存`;
        } else {
            statusBadge = `庫存正常`;
        }

        return `
            <tr data-id="${product.id}">
                <td>${product.name}</td>
                <td>${product.barcode || '-'}</td>
                <td>${product.category || '-'}</td>
                <td>${product.purchase_price || 0}</td>
                <td>${product.sale_price || 0}</td>
                <td>${stock}</td>
                <td>${statusBadge}</td>
                <td><button class="edit-btn text-blue-600 hover:underline">編輯</button></td>
                <td><button class="delete-btn text-red-600 hover:underline">刪除</button></td>
            </tr>
        `;
    }).join('');
};

// Image preview handler
productImageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        imagePreview.src = 'https://via.placeholder.com/150'; // Default placeholder
    }
});

// Barcode scanning simulation (listen for rapid input)
let barcodeBuffer = '';
let lastKeyTime = 0;
const SCAN_INTERVAL = 100; // milliseconds

barcodeInput.addEventListener('keydown', (e) => {
    const currentTime = new Date().getTime();
    if (currentTime - lastKeyTime > SCAN_INTERVAL) {
        barcodeBuffer = ''; // Reset buffer if pause is too long
    }
    if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission
        if (barcodeBuffer) {
            console.log('Scanned Barcode:', barcodeBuffer);
            // Here you would typically trigger a product lookup or other action
            // For now, we just log it.
            barcodeInput.value = barcodeBuffer; // Set the input value to the scanned barcode
        }
        barcodeBuffer = ''; // Clear buffer after processing
    } else if (e.key.length === 1) { // Only append single character keys
        barcodeBuffer += e.key;
    }
    lastKeyTime = currentTime;
});
