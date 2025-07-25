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
        window.app.ui.showLoading('載入供應商資料中...');
        try {
            const response = await fetch('./data/suppliers.json');
            if (!response.ok) throw new Error('無法載入供應商資料');
            allSuppliers = await response.json();
            renderSuppliers(allSuppliers);
        } catch (error) {
            console.error('載入供應商資料失敗:', error);
            window.app.ui.showNotification('error', '載入供應商資料失敗');
        } finally {
            window.app.ui.hideLoading();
        }
    };

    // 渲染列表
    const renderSuppliers = (suppliers) => {
        if (!suppliersList) return;
        if (suppliers.length === 0) {
            suppliersList.innerHTML = `<tr><td colspan="6" class="text-center py-4">沒有供應商資料</td></tr>`;
            return;
        }

        suppliersList.innerHTML = suppliers.map(supplier => `
            <tr data-id="${supplier.id}">
                <td class="px-6 py-4 whitespace-nowrap">${supplier.name}</td>
                <td class="px-6 py-4 whitespace-nowrap">${supplier.contact_person}</td>
                <td class="px-6 py-4 whitespace-nowrap">${supplier.phone}</td>
                <td class="px-6 py-4 whitespace-nowrap">${supplier.payment_terms}</td>
                <td class="px-6 py-4 whitespace-nowrap">${new Date(supplier.created_at).toLocaleDateString()}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="text-blue-600 hover:text-blue-900 edit-supplier"><i class="fas fa-edit"></i> 編輯</button>
                    <button class="text-red-600 hover:text-red-900 ml-4 delete-supplier"><i class="fas fa-trash"></i> 刪除</button>
                </td>
            </tr>
        `).join('');
    };

    // 處理表單提交
    const handleSubmitSupplier = async (e) => {
        e.preventDefault();
        const supplierId = supplierForm.dataset.id;
        const isEdit = !!supplierId;
        
        const formData = new FormData(supplierForm);
        const supplierData = {
            name: formData.get('name').trim(),
            contact_person: formData.get('contact_person').trim(),
            phone: formData.get('phone').trim(),
            email: formData.get('email').trim(),
            address: formData.get('address').trim(),
            payment_terms: formData.get('payment_terms'),
            notes: formData.get('notes').trim(),
        };

        if (!supplierData.name || !supplierData.contact_person || !supplierData.phone) {
            window.app.ui.showNotification('error', '請填寫所有必填欄位 (*)');
            return;
        }

        const url = isEdit ? './data/suppliers.json' : './data/suppliers.json';
        const method = isEdit ? 'PUT' : 'POST';

        window.app.ui.showLoading('儲存中...');
        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(supplierData)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || '儲存失敗');
            }

            window.app.ui.showNotification('success', '供應商資料儲存成功！');
            closeSupplierModal();
            loadSuppliers();
        } catch (error) {
            console.error('儲存供應商失敗:', error);
            window.app.ui.showNotification('error', error.message);
        } finally {
            window.app.ui.hideLoading();
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
            const response = await fetch('./data/suppliers.json', { method: 'DELETE' });
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
