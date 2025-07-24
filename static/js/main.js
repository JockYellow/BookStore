// 主應用程序邏輯
class BookstoreApp {
    constructor() {
        this.apiBaseUrl = '/api';
        this.ui = window.UI || new UI(); // 使用全局 UI 實例
        this.initializeEventListeners();
        this.initializeMobileMenu();
        this.initializeModals();
        this.initializeDropdowns();
        this.initializeForms();
    }

    // 初始化事件監聽器
    initializeEventListeners() {
        // 全局點擊事件，用於關閉下拉菜單等
        document.addEventListener('click', (e) => {
            // 關閉所有下拉菜單
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                if (!menu.contains(e.target) && !e.target.matches('.dropdown-toggle')) {
                    menu.classList.add('hidden');
                }
            });
            
            // 關閉模態框（如果點擊了背景）
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
        
        // 點擊通知關閉按鈕
        document.addEventListener('click', (e) => {
            if (e.target.closest('.close-notification')) {
                const notification = e.target.closest('.notification');
                if (notification) {
                    this.ui.hideNotification(notification);
                }
            }
        });
    }

    // 初始化移動端菜單
    initializeMobileMenu() {
        const menuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (menuButton && mobileMenu) {
            menuButton.addEventListener('click', (e) => {
                e.stopPropagation(); // 防止觸發文檔點擊事件
                const isExpanded = menuButton.getAttribute('aria-expanded') === 'true' || false;
                menuButton.setAttribute('aria-expanded', !isExpanded);
                mobileMenu.classList.toggle('hidden');
            });
        }
    }
    
    // 初始化下拉菜單
    initializeDropdowns() {
        document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = toggle.nextElementSibling;
                if (menu && menu.classList.contains('dropdown-menu')) {
                    const isVisible = !menu.classList.contains('hidden');
                    // 隱藏所有其他下拉菜單
                    document.querySelectorAll('.dropdown-menu').forEach(m => {
                        if (m !== menu) m.classList.add('hidden');
                    });
                    // 切換當前下拉菜單
                    menu.classList.toggle('hidden', isVisible);
                }
            });
        });
    }
    
    // 初始化表單
    initializeForms() {
        // 自動處理表單提交
        document.addEventListener('submit', async (e) => {
            if (e.target.matches('form[data-ajax]')) {
                e.preventDefault();
                await this.handleFormSubmit(e.target);
            }
        });
    }
    
    // 處理表單提交
    async handleFormSubmit(form) {
        const formData = new FormData(form);
        const url = form.action || `${this.apiBaseUrl}${form.getAttribute('action')}`;
        const method = form.method || 'POST';
        
        try {
            this.ui.showLoading('處理中，請稍候...');
            const response = await fetch(url, {
                method,
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.ui.showNotification('success', result.message || '操作成功');
                // 如果有成功回調，執行它
                if (form.dataset.success) {
                    const callback = new Function('response', form.dataset.success);
                    callback(result);
                }
                // 如果有重定向，執行重定向
                if (result.redirect) {
                    setTimeout(() => {
                        window.location.href = result.redirect;
                    }, 1500);
                }
            } else {
                throw new Error(result.message || '操作失敗');
            }
        } catch (error) {
            console.error('表單提交錯誤:', error);
            this.ui.showNotification('error', error.message || '發生錯誤，請稍後再試');
        } finally {
            this.ui.hideLoading();
        }
    }

    // 初始化模態框
    initializeModals() {
        // 關閉按鈕
        document.querySelectorAll('[data-modal-toggle]').forEach(button => {
            button.addEventListener('click', () => {
                const modalId = button.getAttribute('data-modal-toggle');
                this.toggleModal(modalId);
            });
        });
        
        // 確認對話框
        window.showConfirm = (options) => {
            return this.ui.showConfirmDialog(options);
        };
    }
    
    // 切換模態框顯示/隱藏
    toggleModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            if (modal.classList.contains('hidden')) {
                this.openModal(modalId);
            } else {
                this.closeModal(modalId);
            }
        }
    }
    
    // 打開模態框
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
            
            // 觸發顯示事件
            const event = new CustomEvent('modal-shown', { detail: { modalId } });
            modal.dispatchEvent(event);
        }
    }
    
    // 關閉模態框
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
            
            // 觸發隱藏事件
            const event = new CustomEvent('modal-hidden', { detail: { modalId } });
            modal.dispatchEvent(event);
        }
    }
    // 關閉所有模態框
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            this.closeModal(modal.id);
        });
    }
    
    // 顯示通知
    showNotification(type, message, duration = 5000) {
        return this.ui.showNotification(type, message, duration);
    }
    
    // 顯示加載指示器
    showLoading(message) {
        this.ui.showLoading(message);
    }
    
    // 隱藏加載指示器
    hideLoading() {
        this.ui.hideLoading();
    }
    
    // 顯示確認對話框
    showConfirm(options) {
        return this.ui.showConfirmDialog(options);
    }
    
    // 格式化日期
    formatDate(date, format = 'YYYY-MM-DD') {
        return this.ui.formatDate(date, format);
    }
    
    // 格式化貨幣
    formatCurrency(amount, currency = 'TWD') {
        return this.ui.formatCurrency(amount, currency);
    }
            document.body.classList.remove('overflow-hidden');
        };

        // 點擊模態框外部關閉
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                window.closeAllModals();
            }
        });

        // ESC 鍵關閉模態框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.closeAllModals();
            }
        });
    }

    // 顯示通知
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg text-white font-medium ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        // 3秒後自動移除通知
        setTimeout(() => {
            notification.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);

        // 點擊通知可手動關閉
        notification.addEventListener('click', () => {
            notification.remove();
        });
    }

    // 格式化日期
    formatDate(dateString) {
        if (!dateString) return '';
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString('zh-TW', options);
    }

    // 格式化貨幣
    formatCurrency(amount) {
        if (amount === null || amount === undefined) return '$0.00';
        return new Intl.NumberFormat('zh-TW', {
            style: 'currency',
            currency: 'TWD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount).replace('TWD', '$');
    }

    // 顯示加載動畫
    showLoading(show = true) {
        const loadingElement = document.getElementById('loading');
        if (!loadingElement) return;
        
        if (show) {
            loadingElement.classList.remove('hidden');
        } else {
            loadingElement.classList.add('hidden');
        }
    }

    // 處理 API 錯誤
    handleApiError(error) {
        console.error('API Error:', error);
        let errorMessage = '發生錯誤，請稍後再試';
        
        if (error.response) {
            // 服務器返回了錯誤狀態碼
            if (error.response.data && error.response.data.detail) {
                errorMessage = error.response.data.detail;
            } else if (error.response.status === 401) {
                errorMessage = '未授權，請重新登入';
            } else if (error.response.status === 403) {
                errorMessage = '權限不足';
            } else if (error.response.status === 404) {
                errorMessage = '找不到請求的資源';
            } else if (error.response.status >= 500) {
                errorMessage = '伺服器錯誤，請稍後再試';
            }
        } else if (error.request) {
            // 請求已發送但沒有收到回應
            errorMessage = '無法連接到伺服器，請檢查您的網絡連接';
        }
        
        this.showNotification(errorMessage, 'error');
        return Promise.reject(error);
    }

    // 初始化表格排序
    initializeTableSorting(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const headers = table.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                const sortField = header.getAttribute('data-sort');
                const isAsc = !header.classList.contains('asc');
                this.sortTable(table, sortField, isAsc);
                
                // 更新排序指示器
                headers.forEach(h => {
                    h.classList.remove('asc', 'desc');
                    h.querySelector('.sort-icon')?.remove();
                });
                
                const sortIcon = document.createElement('i');
                sortIcon.className = 'fas ml-1 sort-icon';
                sortIcon.classList.add(isAsc ? 'fa-sort-up' : 'fa-sort-down');
                header.appendChild(sortIcon);
                
                header.classList.add(isAsc ? 'asc' : 'desc');
            });
        });
    }

    // 表格排序
    sortTable(table, sortField, isAsc) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        rows.sort((a, b) => {
            const aValue = a.querySelector(`td[data-sort="${sortField}"]`).getAttribute('data-value') || '';
            const bValue = b.querySelector(`td[data-sort="${sortField}"]`).getAttribute('data-value') || '';
            
            // 嘗試轉換為數字比較
            const aNum = parseFloat(aValue);
            const bNum = parseFloat(bValue);
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return isAsc ? aNum - bNum : bNum - aNum;
            }
            
            // 日期比較
            const aDate = new Date(aValue);
            const bDate = new Date(bValue);
            
            if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
                return isAsc ? aDate - bDate : bDate - aDate;
            }
            
            // 默認字符串比較
            return isAsc 
                ? aValue.localeCompare(bValue, 'zh-TW')
                : bValue.localeCompare(aValue, 'zh-TW');
        });
        
        // 重新添加排序後的行
        rows.forEach(row => tbody.appendChild(row));
    }

    // 初始化分頁
    initializePagination(totalItems, itemsPerPage, currentPage, onPageChange) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const paginationContainer = document.getElementById('pagination');
        
        if (!paginationContainer || totalPages <= 1) {
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = `
            <div class="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
                <div class="flex-1 flex justify-between sm:hidden">
                    <button ${currentPage <= 1 ? 'disabled' : ''} 
                            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                            onclick="${currentPage > 1 ? `(${onPageChange.toString()})(${currentPage - 1})` : ''}">
                        上一頁
                    </button>
                    <button ${currentPage >= totalPages ? 'disabled' : ''} 
                            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage >= totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                            onclick="${currentPage < totalPages ? `(${onPageChange.toString()})(${currentPage + 1})` : ''}">
                        下一頁
                    </button>
                </div>
                <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                        <p class="text-sm text-gray-700">
                            顯示 <span class="font-medium">${(currentPage - 1) * itemsPerPage + 1}</span> 到 
                            <span class="font-medium">${Math.min(currentPage * itemsPerPage, totalItems)}</span> 筆，共 
                            <span class="font-medium">${totalItems}</span> 筆結果
                        </p>
                    </div>
                    <div>
                        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
        `;
        
        // 上一頁按鈕
        paginationHTML += `
            <button ${currentPage <= 1 ? 'disabled' : ''} 
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}"
                    onclick="${currentPage > 1 ? `(${onPageChange.toString()})(${currentPage - 1})` : ''}">
                <span class="sr-only">上一頁</span>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // 頁碼
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        if (startPage > 1) {
            paginationHTML += `
                <button class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                        onclick="(${onPageChange.toString()})(1)">
                    1
                </button>
            `;
            
            if (startPage > 2) {
                paginationHTML += `
                    <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        ...
                    </span>
                `;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="relative inline-flex items-center px-4 py-2 border ${i === currentPage ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'} text-sm font-medium"
                        onclick="(${onPageChange.toString()})(${i})">
                    ${i}
                </button>
            `;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `
                    <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        ...
                    </span>
                `;
            }
            
            paginationHTML += `
                <button class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                        onclick="(${onPageChange.toString()})(${totalPages})">
                    ${totalPages}
                </button>
            `;
        }
        
        // 下一頁按鈕
        paginationHTML += `
            <button ${currentPage >= totalPages ? 'disabled' : ''} 
                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage >= totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}"
                    onclick="${currentPage < totalPages ? `(${onPageChange.toString()})(${currentPage + 1})` : ''}">
                <span class="sr-only">下一頁</span>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        paginationHTML += `
                        </nav>
                    </div>
                </div>
            </div>
        `;
        
        paginationContainer.innerHTML = paginationHTML;
    }
}

// 當文檔加載完成後初始化應用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BookstoreApp();
    
    // 初始化工具提示
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // 初始化彈出框
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
});
