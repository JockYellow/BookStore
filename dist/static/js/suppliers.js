// static/js/suppliers.js (全新內容)

document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const addSupplierBtn = document.getElementById('add-supplier-btn');
    const supplierModal = document.getElementById('supplier-modal');
    const modalTitle = document.getElementById('modal-title');
    const supplierForm = document.getElementById('supplier-form');
    const cancelSupplierBtn = document.getElementById('cancel-supplier');
    const suppliersList = document.getElementById('suppliers-list');

    let allSuppliers = [];

    // 開啟 Modal
    const openSupplierModal = (supplier = null) => {
        supplierForm.reset();
        supplierForm.dataset.id = '';

        if (supplier) {
            // 編輯模式
            modalTitle.textContent = '編輯供應商';
            supplierForm.dataset.id = supplier.id;
            document.getElementById('supplier-name').value = supplier.name || '';
            document.getElementById('contact-person').value = supplier.contact_person || '';
            document.getElementById('phone').value = supplier.phone || '';
            document.getElementById('email').value = supplier.email || '';
            document.getElementById('address').value = supplier.address || '';
            document.getElementById('payment-terms').value = supplier.payment_terms || '';
            document.getElementById('notes').value = supplier.notes || '';
        } else {
            // 新增模式
            modalTitle.textContent = '新增供應商';
        }
        
        supplierModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    };

    // 關閉 Modal
    const closeSupplierModal = () => {
        supplierModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    };
    
    // 載入供應商資料
    const loadSuppliers = async () => {
        
        if (isEdit) {
            const index = allSuppliers.findIndex(s => s.id === supplierId);
            if (index !== -1) allSuppliers[index] = { ...allSuppliers[index], ...supplierData, id: supplierId };
        } else {
            supplierData.id = `S_NEW_${Date.now()}`;
            allSuppliers.push(supplierData);
        }
        window.app.ui.showNotification('success', '供應商資料儲存成功！');
        closeSupplierModal();
        renderSuppliers(allSuppliers);
        
        }
    };
    
    // 處理列表點擊事件
    const handleListClick = (e) => {
        const target = e.target;
        const row = target.closest('tr');
        if (!row) return;

        const supplierId = row.dataset.id;
        const supplier = allSuppliers.find(s => s.id === supplierId);

        if (target.closest('.edit-supplier')) {
            if (supplier) openSupplierModal(supplier);
        }

        if (target.closest('.delete-supplier')) {
             window.app.ui.showConfirmDialog({
                title: '確認刪除',
                message: `您確定要刪除供應商 "${supplier.name}" 嗎？`,
                confirmText: '確認刪除',
            }).then(confirmed => {
                if (confirmed) {
                    deleteSupplier(supplierId);
                }
            });
        }
    };

    // 刪除供應商
    const deleteSupplier = async (supplierId) => {
        window.app.ui.showLoading('刪除中...');
        try {
            const response = await fetch(`/api/suppliers/${supplierId}`, { method: 'DELETE' });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || '刪除失敗');
            }
            window.app.ui.showNotification('success', '供應商已刪除');
            loadSuppliers();
        } catch (error) {
            console.error('刪除供應商失敗:', error);
            window.app.ui.showNotification('error', error.message);
        } finally {
            window.app.ui.hideLoading();
        }
    };

    // 設定事件監聽
    addSupplierBtn.addEventListener('click', () => openSupplierModal());
    cancelSupplierBtn.addEventListener('click', closeSupplierModal);
    supplierForm.addEventListener('submit', handleSubmitSupplier);
    suppliersList.addEventListener('click', handleListClick);

    // 初始載入
    loadSuppliers();
})
