// 供應商管理頁面邏輯
document.addEventListener('DOMContentLoaded', function() {
    const app = window.app || new App();
    const suppliersList = document.getElementById('suppliers-list');
    const searchInput = document.getElementById('search-supplier');
    const filterPayment = document.getElementById('filter-payment');
    const filterBtn = document.getElementById('filter-btn');
    const addSupplierBtn = document.getElementById('add-supplier-btn');
    const supplierModal = document.getElementById('supplier-modal');
    const supplierForm = document.getElementById('supplier-form');
    const cancelSupplierBtn = document.getElementById('cancel-supplier');
    const modalTitle = document.getElementById('modal-title');
    
    // 分頁相關元素
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const prevPageMobileBtn = document.getElementById('prev-page-mobile');
    const nextPageMobileBtn = document.getElementById('next-page-mobile');
    const paginationNumbers = document.getElementById('pagination-numbers');
    const startItemSpan = document.getElementById('start-item');
    const endItemSpan = document.getElementById('end-item');
    const totalItemsSpan = document.getElementById('total-items');
    
    let suppliers = [];
    let filteredSuppliers = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    
    // 初始化頁面
    async function init() {
        try {
            app.showLoading('載入供應商資料中...');
            await loadSuppliers();
            renderSuppliers();
            setupEventListeners();
        } catch (error) {
            console.error('初始化錯誤:', error);
            app.showNotification('error', '載入供應商資料失敗');
        } finally {
            app.hideLoading();
        }
    }
    
    // 載入供應商資料
    async function loadSuppliers() {
        try {
            const response = await fetch('/api/suppliers');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            suppliers = await response.json();
            if (!Array.isArray(suppliers)) {
                console.warn('Expected suppliers to be an array, got:', typeof suppliers);
                suppliers = [];
            }
            
            // 按創建時間降序排序
            suppliers.sort((a, b) => {
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateB - dateA;
            });
            
            filteredSuppliers = [...suppliers];
            updatePagination();
        } catch (error) {
            console.error('載入供應商資料失敗:', error);
            app.showNotification('error', '載入供應商資料失敗，請稍後再試');
            throw error;
        }
    }
    
    // 渲染供應商列表
    function renderSuppliers() {
        if (!suppliersList) return;
        
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedSuppliers = filteredSuppliers.slice(start, end);
        
        if (paginatedSuppliers.length === 0) {
            suppliersList.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                        沒有找到符合條件的供應商
                    </td>
                </tr>`;
            return;
        }
        
        suppliersList.innerHTML = paginatedSuppliers.map(supplier => `
            <tr class="hover:bg-gray-50" data-id="${supplier.id}">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="font-medium text-gray-900">${supplier.name}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${supplier.contact_person}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${supplier.phone}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${supplier.payment_terms === '貨到付款' ? 'bg-green-100 text-green-800' : 
                          supplier.payment_terms === '月結30天' ? 'bg-blue-100 text-blue-800' : 
                          'bg-yellow-100 text-yellow-800'}">
                        ${supplier.payment_terms}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${app.formatDate(supplier.created_at, 'YYYY/MM/DD')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="text-blue-600 hover:text-blue-900 mr-4 edit-supplier" data-id="${supplier.id}">
                        <i class="fas fa-edit"></i> 編輯
                    </button>
                    <button class="text-red-600 hover:text-red-900 delete-supplier" data-id="${supplier.id}">
                        <i class="fas fa-trash"></i> 刪除
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    // 更新分頁控制
    function updatePagination() {
        const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
        
        // 更新分頁數字
        let paginationHTML = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // 第一頁按鈕
        if (startPage > 1) {
            paginationHTML += `
                <button class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50" data-page="1">
                    1
                </button>
                ${startPage > 2 ? '<span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>' : ''}
            `;
        }
        
        // 頁碼按鈕
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="relative inline-flex items-center px-4 py-2 border ${i === currentPage ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'} text-sm font-medium" data-page="${i}">
                    ${i}
                </button>
            `;
        }
        
        // 最後一頁按鈕
        if (endPage < totalPages) {
            paginationHTML += `
                ${endPage < totalPages - 1 ? '<span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>' : ''}
                <button class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50" data-page="${totalPages}">
                    ${totalPages}
                </button>
            `;
        }
        
        paginationNumbers.innerHTML = paginationHTML;
        
        // 更新分頁狀態
        const startItem = filteredSuppliers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
        const endItem = Math.min(currentPage * itemsPerPage, filteredSuppliers.length);
        
        startItemSpan.textContent = startItem;
        endItemSpan.textContent = endItem;
        totalItemsSpan.textContent = filteredSuppliers.length;
        
        // 更新按鈕狀態
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
        prevPageMobileBtn.disabled = currentPage === 1;
        nextPageMobileBtn.disabled = currentPage === totalPages || totalPages === 0;
    }
    
    // 設置事件監聽器
    function setupEventListeners() {
        // 搜尋供應商
        searchInput.addEventListener('input', debounce(filterSuppliers, 300));
        
        // 篩選按鈕
        filterBtn.addEventListener('click', filterSuppliers);
        
        // 新增供應商按鈕
        addSupplierBtn.addEventListener('click', () => openSupplierModal());
        
        // 取消按鈕
        cancelSupplierBtn.addEventListener('click', () => closeSupplierModal());
        
        // 表單提交
        supplierForm.addEventListener('submit', handleSubmitSupplier);
        
        // 分頁按鈕
        prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
        nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
        prevPageMobileBtn.addEventListener('click', () => goToPage(currentPage - 1));
        nextPageMobileBtn.addEventListener('click', () => goToPage(currentPage + 1));
        
        // 委派事件處理編輯和刪除按鈕
        suppliersList.addEventListener('click', (e) => {
            const target = e.target.closest('.edit-supplier');
            if (target) {
                const id = target.dataset.id;
                editSupplier(id);
                return;
            }
            
            const deleteBtn = e.target.closest('.delete-supplier');
            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                deleteSupplier(id);
                return;
            }
        });
        
        // 分頁數字按鈕
        paginationNumbers.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && e.target.dataset.page) {
                goToPage(parseInt(e.target.dataset.page));
            }
        });
    }
    
    // 過濾供應商
    function filterSuppliers() {
        const searchTerm = searchInput.value.toLowerCase();
        const paymentFilter = filterPayment.value;
        
        filteredSuppliers = suppliers.filter(supplier => {
            const matchesSearch = !searchTerm || 
                supplier.name.toLowerCase().includes(searchTerm) || 
                supplier.contact_person.toLowerCase().includes(searchTerm) ||
                supplier.phone.includes(searchTerm);
                
            const matchesPayment = !paymentFilter || supplier.payment_terms === paymentFilter;
            
            return matchesSearch && matchesPayment;
        });
        
        currentPage = 1; // 重置到第一頁
        renderSuppliers();
        updatePagination();
    }
    
    // 前往指定頁面
    function goToPage(page) {
        const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
        if (page < 1 || page > totalPages) return;
        
        currentPage = page;
        renderSuppliers();
        updatePagination();
        
        // 滾動到頂部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // 打開新增/編輯供應商模態框
    function openSupplierModal(supplier = null) {
        if (supplier) {
            // 編輯模式
            modalTitle.textContent = '編輯供應商';
            document.getElementById('supplier-id').value = supplier.id;
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
            supplierForm.reset();
            document.getElementById('supplier-id').value = '';
        }
        
        supplierModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }
    
    // 關閉供應商模態框
    function closeSupplierModal() {
        supplierModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }
    
    // 處理表單提交
    async function handleSubmitSupplier(e) {
        e.preventDefault();
        
        const formData = new FormData(supplierForm);
        const supplierData = {
            name: formData.get('name').trim(),
            contact_person: formData.get('contact_person').trim(),
            phone: formData.get('phone').trim(),
            email: formData.get('email').trim(),
            address: formData.get('address').trim(),
            payment_terms: formData.get('payment_terms'),
            tax_id: formData.get('tax_id') ? formData.get('tax_id').trim() : null,
            bank_account: formData.get('bank_account') ? formData.get('bank_account').trim() : null,
            bank_name: formData.get('bank_name') ? formData.get('bank_name').trim() : null,
            note: formData.get('note') ? formData.get('note').trim() : null
        };
        
        // 表單驗證
        if (!supplierData.name) {
            app.showNotification('error', '請填寫供應商名稱');
            return;
        }
        
        if (!supplierData.contact_person) {
            app.showNotification('error', '請填寫聯絡人');
            return;
        }
        
        if (!supplierData.phone) {
            app.showNotification('error', '請填寫聯絡電話');
            return;
        }
        
        const supplierId = supplierForm.dataset.id;
        
        try {
            app.showLoading('處理中...');
            let response;
            
            if (supplierId) {
                // 更新現有供應商
                response = await fetch(`/api/suppliers/${supplierId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(supplierData)
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || '更新供應商失敗');
                }
                
                app.showNotification('success', '供應商更新成功');
            } else {
                // 新增供應商
                response = await fetch('/api/suppliers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(supplierData)
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || '新增供應商失敗');
                }
                
                const result = await response.json();
                supplierData.id = result.id;
                
                app.showNotification('success', '供應商新增成功');
            }
            
            closeSupplierModal();
            await loadSuppliers();
            renderSuppliers();
            
        } catch (error) {
            console.error('儲存供應商失敗:', error);
            app.showNotification('error', error.message || '儲存供應商失敗，請稍後再試');
        } finally {
            app.hideLoading();
        }
    }
    
    // 編輯供應商
    async function editSupplier(id) {
        try {
            app.showLoading('載入供應商資料中...');
            
            const response = await fetch(`/api/suppliers/${id}`);
            if (!response.ok) {
                throw new Error('載入供應商資料失敗');
            }
            
            const supplier = await response.json();
            openSupplierModal(supplier);
            
        } catch (error) {
            console.error('載入供應商資料失敗:', error);
            app.showNotification('error', error.message || '載入供應商資料失敗，請稍後再試');
        } finally {
            app.hideLoading();
        }
    }
    
    // 刪除供應商
    async function deleteSupplier(id) {
        const confirm = await app.showConfirm(
            '確認刪除',
            '確定要刪除此供應商嗎？此操作無法復原。',
            '刪除',
            '取消'
        );
        
        if (!confirm) return;
        
        try {
            app.showLoading('刪除中...');
            
            const response = await fetch(`/api/suppliers/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || '刪除供應商失敗');
            }
            
            // 從本地數據中移除
            const index = suppliers.findIndex(s => s.id === id);
            if (index !== -1) {
                suppliers.splice(index, 1);
                filteredSuppliers = [...suppliers];
                renderSuppliers();
                updatePagination();
            }
            
            app.showNotification('success', '供應商已刪除');
            
        } catch (error) {
            console.error('刪除供應商失敗:', error);
            app.showNotification('error', error.message || '刪除供應商失敗，請稍後再試');
        } finally {
            app.hideLoading();
        }
    }
    
    // 防抖函數
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
    
    // 初始化頁面
    init();
});
