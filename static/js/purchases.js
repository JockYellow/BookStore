// 進貨管理頁面邏輯
document.addEventListener('DOMContentLoaded', function() {
    const app = window.app || new App();
    
    // DOM 元素
    const searchInput = document.getElementById('search');
    const supplierFilter = document.getElementById('supplier-filter');
    const dateRangeInput = document.getElementById('date-range');
    const purchasesList = document.getElementById('purchases-list');
    const newPurchaseBtn = document.getElementById('new-purchase-btn');
    const exportPurchasesBtn = document.getElementById('export-purchases-btn');
    
    // 分頁元素
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const mobilePrevPageBtn = document.getElementById('mobile-prev-page');
    const mobileNextPageBtn = document.getElementById('mobile-next-page');
    const paginationNumbers = document.getElementById('pagination-numbers');
    const startItemSpan = document.getElementById('start-item');
    const endItemSpan = document.getElementById('end-item');
    const totalItemsSpan = document.getElementById('total-items');
    
    // Modal 元素
    const purchaseDetailModal = document.getElementById('purchase-detail-modal');
    
    // 全局變數
    let purchases = [];
    let suppliers = [];
    let filteredPurchases = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    
    // 初始化頁面
    async function init() {
        try {
            app.showLoading('載入資料中...');
            await Promise.all([
                loadPurchases(),
                loadSuppliers()
            ]);
            renderPurchases();
            setupEventListeners();
            updatePagination();
        } catch (error) {
            console.error('初始化錯誤:', error);
            app.showNotification('error', '載入資料失敗');
        } finally {
            app.hideLoading();
        }
    }
    
    // 載入進貨記錄
    async function loadPurchases() {
        try {
            app.showLoading('載入進貨記錄中...');
            const response = await fetch('/api/purchases');
            if (!response.ok) {
                throw new Error('無法載入進貨記錄');
            }
            purchases = await response.json();
            
            // 確保 purchases 是陣列
            if (!Array.isArray(purchases)) {
                console.warn('Expected purchases to be an array, got:', typeof purchases);
                purchases = [];
            }
            
            // 按創建時間降序排序
            purchases.sort((a, b) => {
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateB - dateA;
            });
            
            filteredPurchases = [...purchases];
            return purchases;
        } catch (error) {
            console.error('載入進貨記錄失敗:', error);
            app.showNotification('error', '載入進貨記錄失敗，請稍後再試');
            throw error;
        } finally {
            app.hideLoading();
        }
    }
    
    // 載入供應商
    async function loadSuppliers() {
        try {
            const response = await fetch('/api/suppliers');
            if (!response.ok) {
                throw new Error('無法載入供應商');
            }
            suppliers = await response.json();
            updateSupplierFilters();
        } catch (error) {
            console.error('載入供應商失敗:', error);
            throw error;
        }
    }
    
    // 更新供應商篩選選項
    function updateSupplierFilters() {
        if (!supplierFilter) return;
        
        // 清空現有選項，保留「全部供應商」
        supplierFilter.innerHTML = '<option value="">全部供應商</option>';
        
        // 添加供應商選項
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.id;
            option.textContent = supplier.name;
            supplierFilter.appendChild(option);
        });
    }
    
    // 渲染進貨記錄列表
    function renderPurchases() {
        if (!purchasesList) return;
        
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedPurchases = filteredPurchases.slice(start, end);
        
        if (paginatedPurchases.length === 0) {
            purchasesList.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">
                        沒有找到符合條件的進貨記錄
                    </td>
                </tr>`;
            return;
        }
        
        purchasesList.innerHTML = paginatedPurchases.map(purchase => {
            const supplier = suppliers.find(s => s.id === purchase.supplier_id) || { name: '未知供應商' };
            const itemCount = purchase.items ? purchase.items.length : 0;
            const totalAmount = purchase.total || 0;
            const purchaseDate = new Date(purchase.purchase_date || purchase.created_at).toLocaleDateString();
            const status = getStatusBadge(purchase.status || 'draft');
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <a href="#" class="text-blue-600 hover:text-blue-800 view-purchase" data-id="${purchase.id}">
                            ${purchase.purchase_number || purchase.id}
                        </a>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${supplier.name}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${itemCount} 項商品
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        $${totalAmount.toLocaleString()}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${purchaseDate}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        ${status}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex justify-end space-x-2">
                            <button class="text-blue-600 hover:text-blue-900 view-purchase" data-id="${purchase.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="text-indigo-600 hover:text-indigo-900 edit-purchase" data-id="${purchase.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="text-red-600 hover:text-red-900 delete-purchase" data-id="${purchase.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    }
    
    // 獲取狀態標籤
    function getStatusBadge(status) {
        const statusMap = {
            'draft': { text: '草稿', color: 'bg-gray-100 text-gray-800' },
            'ordered': { text: '已訂購', color: 'bg-blue-100 text-blue-800' },
            'received': { text: '已到貨', color: 'bg-green-100 text-green-800' },
            'cancelled': { text: '已取消', color: 'bg-red-100 text-red-800' }
        };
        
        const statusInfo = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
        return `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.color}">
            ${statusInfo.text}
        </span>`;
    }
    
    // 更新分頁控制
    function updatePagination() {
        if (!paginationNumbers || !startItemSpan || !endItemSpan || !totalItemsSpan) return;
        
        const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
        const startItem = filteredPurchases.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
        const endItem = Math.min(currentPage * itemsPerPage, filteredPurchases.length);
        
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
        startItemSpan.textContent = startItem;
        endItemSpan.textContent = endItem;
        totalItemsSpan.textContent = filteredPurchases.length;
        
        // 更新按鈕狀態
        if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
        if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
        if (mobilePrevPageBtn) mobilePrevPageBtn.disabled = currentPage === 1;
        if (mobileNextPageBtn) mobileNextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    }
    
    // 前往指定頁面
    function goToPage(page) {
        const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
        if (page < 1 || page > totalPages) return;
        
        currentPage = page;
        renderPurchases();
        updatePagination();
        
        // 滾動到頂部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // 設置事件監聽器
    function setupEventListeners() {
        // 搜尋輸入
        if (searchInput) {
            searchInput.addEventListener('input', debounce(filterPurchases, 300));
        }
        
        // 供應商篩選
        if (supplierFilter) {
            supplierFilter.addEventListener('change', filterPurchases);
        }
        
        // 日期範圍選擇
        if (dateRangeInput) {
            // 初始化日期選擇器
            flatpickr(dateRangeInput, {
                mode: 'range',
                dateFormat: 'Y-m-d',
                locale: 'zh_tw',
                onClose: filterPurchases
            });
        }
        
        // 分頁按鈕
        if (prevPageBtn) prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
        if (nextPageBtn) nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
        if (mobilePrevPageBtn) mobilePrevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
        if (mobileNextPageBtn) mobileNextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
        
        // 分頁數字按鈕
        if (paginationNumbers) {
            paginationNumbers.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON' && e.target.dataset.page) {
                    goToPage(parseInt(e.target.dataset.page));
                }
            });
        }
        
        // 新增進貨按鈕
        if (newPurchaseBtn) {
            newPurchaseBtn.addEventListener('click', () => {
                window.location.href = '/purchases/new';
            });
        }
        
        // 導出報表按鈕
        if (exportPurchasesBtn) {
            exportPurchasesBtn.addEventListener('click', exportPurchases);
        }
        
        // 查看進貨明細
        document.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-purchase');
            if (viewBtn) {
                e.preventDefault();
                const purchaseId = viewBtn.dataset.id;
                viewPurchaseDetails(purchaseId);
                return;
            }
            
            // 編輯進貨
            const editBtn = e.target.closest('.edit-purchase');
            if (editBtn) {
                e.preventDefault();
                const purchaseId = editBtn.dataset.id;
                editPurchase(purchaseId);
                return;
            }
            
            // 刪除進貨
            const deleteBtn = e.target.closest('.delete-purchase');
            if (deleteBtn) {
                e.preventDefault();
                const purchaseId = deleteBtn.dataset.id;
                confirmDeletePurchase(purchaseId);
                return;
            }
            
            // 關閉Modal
            const closeModalBtn = e.target.closest('.close-modal-btn');
            if (closeModalBtn) {
                e.preventDefault();
                purchaseDetailModal.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
                return;
            }
        });
    }
    
    // 過濾進貨記錄
    function filterPurchases() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const supplierId = supplierFilter ? supplierFilter.value : '';
        const dateRange = dateRangeInput ? dateRangeInput.value : '';
        
        filteredPurchases = purchases.filter(purchase => {
            // 搜尋條件
            const matchesSearch = !searchTerm || 
                (purchase.purchase_number && purchase.purchase_number.toLowerCase().includes(searchTerm)) ||
                (purchase.supplier_name && purchase.supplier_name.toLowerCase().includes(searchTerm)) ||
                (purchase.items && purchase.items.some(item => 
                    (item.product_name && item.product_name.toLowerCase().includes(searchTerm)) ||
                    (item.product_code && item.product_code.toLowerCase().includes(searchTerm))
                ));
            
            // 供應商篩選
            const matchesSupplier = !supplierId || purchase.supplier_id === supplierId;
            
            // 日期範圍篩選
            let matchesDateRange = true;
            if (dateRange) {
                const [startDateStr, endDateStr] = dateRange.split(' to ');
                const purchaseDate = new Date(purchase.purchase_date || purchase.created_at);
                const startDate = new Date(startDateStr);
                const endDate = endDateStr ? new Date(endDateStr) : new Date(startDateStr);
                
                // 設置時間為當天的開始和結束
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                
                matchesDateRange = purchaseDate >= startDate && purchaseDate <= endDate;
            }
            
            return matchesSearch && matchesSupplier && matchesDateRange;
        });
        
        currentPage = 1; // 重置到第一頁
        renderPurchases();
        updatePagination();
    }
    
    // 查看進貨明細
    async function viewPurchaseDetails(purchaseId) {
        try {
            app.showLoading('載入進貨明細中...');
            
            // 從 API 獲取最新資料
            const response = await fetch(`/api/purchases/${purchaseId}`);
            if (!response.ok) {
                throw new Error('無法載入進貨明細');
            }
            
            const purchase = await response.json();
            
            // 更新本地快取
            const index = purchases.findIndex(p => p.id === purchaseId);
            if (index !== -1) {
                purchases[index] = purchase;
            }

            // 設置 Modal 標題
            document.getElementById('purchase-detail-title').textContent = `進貨單 #${purchase.id}`;
            
            // 設置供應商資訊
            const supplier = suppliers.find(s => s.id === purchase.supplier_id) || { name: '未知供應商' };
            document.getElementById('supplier-info').innerHTML = `
                <p class="font-medium">${supplier.name}</p>
                <p class="text-sm text-gray-500">採購日期: ${new Date(purchase.purchase_date || purchase.created_at).toLocaleDateString()}</p>
                <p class="text-sm text-gray-500">預計交貨: ${purchase.expected_delivery_date ? new Date(purchase.expected_delivery_date).toLocaleDateString() : '未設定'}</p>
            `;
            
            // 設置狀態標籤
            const statusBadge = getStatusBadge(purchase.status || 'draft');
            document.getElementById('purchase-status').innerHTML = statusBadge;
            
            // 設置商品明細
            const itemsContainer = document.getElementById('purchase-items');
            if (itemsContainer) {
                itemsContainer.innerHTML = purchase.items ? purchase.items.map(item => `
                    <tr>
                        <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            ${item.product_code || 'N/A'}
                        </td>
                        <td class="px-3 py-2 text-sm text-gray-900">
                            ${item.product_name || '未知商品'}
                        </td>
                        <td class="px-3 py-2 text-center text-sm text-gray-500">
                            $${(item.unit_price || 0).toLocaleString()}
                        </td>
                        <td class="px-3 py-2 text-center text-sm text-gray-500">
                            ${item.quantity || 0}
                        </td>
                        <td class="px-3 py-2 text-right text-sm text-gray-500">
                            $${((item.unit_price || 0) * (item.quantity || 0)).toLocaleString()}
                        </td>
                    </tr>
                `).join('') : '<tr><td colspan="5" class="px-3 py-2 text-center text-sm text-gray-500">沒有商品明細</td></tr>';
            }
            
            // 設置金額
            const subtotal = purchase.items ? purchase.items.reduce((sum, item) => sum + (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 0), 0) : 0;
            const shipping = parseFloat(purchase.shipping_cost) || 0;
            const tax = parseFloat(purchase.tax) || 0;
            const discount = parseFloat(purchase.discount) || 0;
            const total = subtotal + shipping + tax - discount;
            
            // 更新金額顯示
            document.getElementById('subtotal').textContent = `$${subtotal.toLocaleString()}`;
            document.getElementById('shipping-cost').textContent = `$${shipping.toLocaleString()}`;
            document.getElementById('tax').textContent = `$${tax.toLocaleString()}`;
            document.getElementById('discount').textContent = `$${discount.toLocaleString()}`;
            document.getElementById('total-amount').textContent = `$${total.toLocaleString()}`;
            
            // 顯示備註
            const notesElement = document.getElementById('purchase-notes');
            if (purchase.notes) {
                notesElement.textContent = purchase.notes;
                notesElement.parentElement.classList.remove('hidden');
            } else {
                notesElement.parentElement.classList.add('hidden');
            }
            
            // 顯示 Modal
            purchaseDetailModal.classList.remove('hidden');
            
        } catch (error) {
            console.error('載入進貨明細失敗:', error);
            app.showNotification('error', error.message || '載入進貨明細失敗，請稍後再試');
        } finally {
            app.hideLoading();
        }
    }
}

// 導出報表
async function exportPurchases() {
    try {
        app.showLoading('準備導出中...');
        
        // 使用瀏覽器內建功能導出 CSV
        const headers = [
            '進貨單號', '供應商', '採購日期', '預計交貨日', 
            '狀態', '商品數量', '總金額', '付款狀態', '備註'
        ];
        
        const csvContent = [
            headers.join(','),
            ...filteredPurchases.map(purchase => {
                const itemCount = purchase.items ? purchase.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0) : 0;
                const statusMap = { 'pending': '待處理', 'received': '已收貨', 'cancelled': '已取消' };
                const paymentStatusMap = { 'unpaid': '未付款', 'partial': '部分付款', 'paid': '已付款' };
                
                return [
                    `"${purchase.id}"`,
                    `"${purchase.supplier_name || ''}"`,
                    `"${formatDate(purchase.purchase_date) || ''}"`,
                    `"${purchase.expected_delivery_date ? formatDate(purchase.expected_delivery_date) : ''}"`,
                    `"${statusMap[purchase.status] || purchase.status}"`,
                    `"${itemCount}"`,
                    `"${purchase.total_amount || 0}"`,
                    `"${paymentStatusMap[purchase.payment_status] || purchase.payment_status}"`,
                    `"${(purchase.notes || '').replace(/"/g, '""')}"`
                ].join(',');
            })
        ].join('\n');
        
        // 創建下載連結
        const blob = new Blob([\`\uFEFF${csvContent}\`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `進貨記錄_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        app.showNotification('success', '已成功導出進貨記錄');
        
    } catch (error) {
        console.error('導出進貨記錄失敗:', error);
        app.showNotification('error', '導出進貨記錄失敗，請稍後再試');
    } finally {
        app.hideLoading();
            // 發送導出請求
            const response = await fetch(`/api/purchases/export?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error('導出報表失敗');
            }
            
            // 下載檔案
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `進貨報表_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            
            app.showNotification('success', '報表導出成功');
            
        } catch (error) {
            console.error('導出報表失敗:', error);
            app.showNotification('error', error.message || '導出報表失敗');
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
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
    
    // 初始化頁面
    init();
});
