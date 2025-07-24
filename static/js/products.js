// 商品管理頁面邏輯
class ProductsPage {
    constructor() {
        this.apiBaseUrl = '/api';
        this.products = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalItems = 0;
        this.filters = { search: '', category: '', status: '' };
        
        this.initializeElements();
        this.initializeEventListeners();
        this.loadProducts();
    }
    
    // 初始化 DOM 元素
    initializeElements() {
        // 表單元素
        this.productForm = document.getElementById('productForm');
        this.productModal = document.getElementById('productModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.productIdInput = document.getElementById('productId');
        this.productNameInput = document.getElementById('productName');
        this.barcodeInput = document.getElementById('barcode');
        this.categorySelect = document.getElementById('category');
        this.supplierSelect = document.getElementById('supplier');
        this.costPriceInput = document.getElementById('costPrice');
        this.salePriceInput = document.getElementById('salePrice');
        this.stockInput = document.getElementById('stock');
        this.minStockInput = document.getElementById('minStock');
        this.unitInput = document.getElementById('unit');
        this.descriptionInput = document.getElementById('description');
        
        // 按鈕元素
        this.addProductBtn = document.getElementById('addProductBtn');
        this.saveProductBtn = document.getElementById('saveProductBtn');
        this.cancelProductBtn = document.getElementById('cancelProductBtn');
        
        // 篩選元素
        this.searchInput = document.getElementById('searchInput');
        this.categoryFilter = document.getElementById('categoryFilter');
        this.statusFilter = document.getElementById('statusFilter');
        
        // 表格元素
        this.productsTableBody = document.getElementById('productsTableBody');
    }
    
    // 初始化事件監聽器
    initializeEventListeners() {
        // 新增商品按鈕
        if (this.addProductBtn) {
            this.addProductBtn.addEventListener('click', () => this.showAddProductModal());
        }
        
        // 儲存商品按鈕
        if (this.saveProductBtn) {
            this.saveProductBtn.addEventListener('click', () => this.saveProduct());
        }
        
        // 取消按鈕
        if (this.cancelProductBtn) {
            this.cancelProductBtn.addEventListener('click', () => this.closeModal());
        }
        
        // 搜尋和篩選
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.currentPage = 1;
                this.loadProducts();
            });
        }
        
        if (this.categoryFilter) {
            this.categoryFilter.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                this.currentPage = 1;
                this.loadProducts();
            });
        }
        
        if (this.statusFilter) {
            this.statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.currentPage = 1;
                this.loadProducts();
            });
        }
        
        // 表單提交
        if (this.productForm) {
            this.productForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProduct();
            });
        }
    }
    
    // 載入商品列表
    async loadProducts() {
        try {
            this.showLoading(true);
            
            // 從 API 獲取商品數據
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            let products = await response.json();
            
            // 確保 products 是陣列
            if (!Array.isArray(products)) {
                console.warn('Expected products to be an array, got:', typeof products);
                products = [];
            }
            
            // 應用篩選條件
            let filteredProducts = products.filter(product => {
                // 搜尋過濾
                if (this.filters.search) {
                    const searchTerm = this.filters.search.toLowerCase();
                    const productName = (product.name || '').toLowerCase();
                    const productBarcode = (product.barcode || '').toLowerCase();
                    
                    if (!productName.includes(searchTerm) && 
                        !productBarcode.includes(searchTerm)) {
                        return false;
                    }
                }
                
                // 類別過濾
                if (this.filters.category && product.category !== this.filters.category) {
                    return false;
                }
                
                // 狀態過濾
                const stock = parseInt(product.stock) || 0;
                const minStock = parseInt(product.minStock) || 0;
                
                if (this.filters.status === 'in_stock' && stock <= 0) return false;
                if (this.filters.status === 'low_stock' && (stock <= 0 || stock > minStock)) return false;
                if (this.filters.status === 'out_of_stock' && stock > 0) return false;
                
                return true;
            });
            
            // 按更新時間降序排序
            filteredProducts.sort((a, b) => {
                const dateA = new Date(a.updated_at || a.created_at || 0);
                const dateB = new Date(b.updated_at || b.created_at || 0);
                return dateB - dateA;
            });
            
            // 更新總數
            this.totalItems = filteredProducts.length;
            
            // 分頁
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const paginatedProducts = filteredProducts.slice(startIndex, startIndex + this.itemsPerPage);
            
            // 渲染表格
            this.renderProductsTable(paginatedProducts);
            
            // 更新分頁控件
            this.updatePagination();
            
        } catch (error) {
            console.error('載入商品列表失敗:', error);
            app.showNotification('載入商品列表失敗，請稍後再試', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // 渲染商品表格
    renderProductsTable(products) {
        if (!this.productsTableBody) return;
        
        if (products.length === 0) {
            this.productsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-4 text-center text-gray-500">
                        沒有找到符合條件的商品
                    </td>
                </tr>
            `;
            return;
        }
        
        this.productsTableBody.innerHTML = products.map(product => {
            // 庫存狀態
            let statusBadge = '';
            if (product.stock <= 0) {
                statusBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">無庫存</span>';
            } else if (product.stock <= product.minStock) {
                statusBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">低庫存 (${product.stock})</span>`;
            } else {
                statusBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">有庫存 (${product.stock})</span>`;
            }
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${product.name}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${product.barcode || '-'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${product.category || '-'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${app.formatCurrency(product.costPrice)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${app.formatCurrency(product.salePrice)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${product.stock} ${product.unit || '個'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        ${statusBadge}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onclick="productsPage.editProduct('${product.id}')" class="text-blue-600 hover:text-blue-900 mr-3">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="productsPage.deleteProduct('${product.id}')" class="text-red-600 hover:text-red-900">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // 更新分頁控件
    updatePagination() {
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        const paginationContainer = document.getElementById('pagination');
        
        if (!paginationContainer) return;
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = `
            <div class="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
                <div class="flex-1 flex justify-between sm:hidden">
                    <button ${this.currentPage <= 1 ? 'disabled' : ''} 
                            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${this.currentPage <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                            ${this.currentPage > 1 ? `onclick="productsPage.changePage(${this.currentPage - 1})"` : ''}>
                        上一頁
                    </button>
                    <div class="flex items-center">
                        <span class="text-sm text-gray-700">
                            第 <span class="font-medium">${this.currentPage}</span> 頁，共 <span class="font-medium">${totalPages}</span> 頁
                        </span>
                    </div>
                    <button ${this.currentPage >= totalPages ? 'disabled' : ''} 
                            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${this.currentPage >= totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                            ${this.currentPage < totalPages ? `onclick="productsPage.changePage(${this.currentPage + 1})"` : ''}>
                        下一頁
                    </button>
                </div>
                <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                        <p class="text-sm text-gray-700">
                            顯示 <span class="font-medium">${Math.min((this.currentPage - 1) * this.itemsPerPage + 1, this.totalItems)}</span> 到 
                            <span class="font-medium">${Math.min(this.currentPage * this.itemsPerPage, this.totalItems)}</span> 筆，共 
                            <span class="font-medium">${this.totalItems}</span> 筆結果
                        </p>
                    </div>
                    <div>
                        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
        `;
        
        // 上一頁按鈕
        paginationHTML += `
            <button ${this.currentPage <= 1 ? 'disabled' : ''} 
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${this.currentPage <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}"
                    ${this.currentPage > 1 ? `onclick="productsPage.changePage(${this.currentPage - 1})"` : ''}>
                <span class="sr-only">上一頁</span>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // 頁碼
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        if (startPage > 1) {
            paginationHTML += `
                <button class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                        onclick="productsPage.changePage(1)">
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
                <button class="relative inline-flex items-center px-4 py-2 border ${i === this.currentPage ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'} text-sm font-medium"
                        onclick="productsPage.changePage(${i})">
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
                        onclick="productsPage.changePage(${totalPages})">
                    ${totalPages}
                </button>
            `;
        }
        
        // 下一頁按鈕
        paginationHTML += `
            <button ${this.currentPage >= totalPages ? 'disabled' : ''} 
                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${this.currentPage >= totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}"
                    ${this.currentPage < totalPages ? `onclick="productsPage.changePage(${this.currentPage + 1})"` : ''}>
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
    
    // 切換頁面
    changePage(page) {
        if (page < 1 || page > Math.ceil(this.totalItems / this.itemsPerPage)) {
            return;
        }
        
        this.currentPage = page;
        this.loadProducts();
        
        // 滾動到表格頂部
        const tableContainer = document.querySelector('.overflow-x-auto');
        if (tableContainer) {
            tableContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    // 顯示新增商品模態框
    showAddProductModal() {
        this.resetForm();
        this.modalTitle.textContent = '新增商品';
        this.productIdInput.value = '';
        this.showModal();
    }
    
    // 顯示編輯商品模態框
    async editProduct(productId) {
        try {
            this.showLoading(true);
            
            // 從 API 獲取商品詳情
            const response = await fetch(`/api/products/${productId}`);
            
            if (!response.ok) {
                throw new Error('找不到該商品');
            }
            
            const product = await response.json();
            
            // 填充表單
            this.productIdInput.value = product.id;
            this.productNameInput.value = product.name || '';
            this.barcodeInput.value = product.barcode || '';
            
            if (product.category && this.categorySelect) {
                this.categorySelect.value = product.category;
            }
            
            if (product.supplier && this.supplierSelect) {
                this.supplierSelect.value = product.supplier;
            }
            
            this.costPriceInput.value = product.costPrice || '';
            this.salePriceInput.value = product.salePrice || '';
            this.stockInput.value = product.stock || 0;
            this.minStockInput.value = product.minStock || 5;
            this.unitInput.value = product.unit || '個';
            this.descriptionInput.value = product.description || '';
            
            // 更新模態框標題
            this.modalTitle.textContent = '編輯商品';
            
            // 顯示模態框
            this.showModal();
            
        } catch (error) {
            console.error('載入商品詳情失敗:', error);
            app.showNotification(error.message || '載入商品詳情失敗，請稍後再試', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // 儲存商品
    async saveProduct() {
        try {
            // 驗證表單
            if (!this.validateForm()) {
                return;
            }
            
            this.showLoading(true);
            
            // 準備商品數據
            const productData = {
                name: this.productNameInput.value.trim(),
                barcode: this.barcodeInput.value.trim() || null,
                category: this.categorySelect ? this.categorySelect.value : null,
                supplier: this.supplierSelect ? this.supplierSelect.value : null,
                costPrice: parseFloat(this.costPriceInput.value) || 0,
                salePrice: parseFloat(this.salePriceInput.value) || 0,
                stock: parseInt(this.stockInput.value) || 0,
                minStock: parseInt(this.minStockInput.value) || 5,
                unit: this.unitInput.value.trim() || '個',
                description: this.descriptionInput.value.trim() || null
            };
            
            const productId = this.productIdInput.value;
            let response;
            
            if (productId) {
                // 更新現有商品
                response = await fetch(`/api/products/${productId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(productData)
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || '更新商品失敗');
                }
                
                app.showNotification('商品更新成功', 'success');
            } else {
                // 新增商品
                response = await fetch('/api/products', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(productData)
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || '新增商品失敗');
                }
                
                const result = await response.json();
                productData.id = result.id;
                
                app.showNotification('商品新增成功', 'success');
            }
            
            // 關閉模態框
            this.closeModal();
            
            // 重新載入商品列表
            this.loadProducts();
            
        } catch (error) {
            console.error('儲存商品失敗:', error);
            app.showNotification(error.message || '儲存商品失敗，請稍後再試', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // 刪除商品
    async deleteProduct(productId) {
        if (!confirm('確定要刪除此商品嗎？此操作無法撤銷。')) {
            return;
        }
        
        try {
            this.showLoading(true);
            
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || '刪除商品失敗');
            }
            
            app.showNotification('商品已刪除', 'success');
            
            // 重新載入商品列表
            this.loadProducts();
            
        } catch (error) {
            console.error('刪除商品失敗:', error);
            app.showNotification(error.message || '刪除商品失敗，請稍後再試', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // 驗證表單
    validateForm() {
        let isValid = true;
        
        // 重置錯誤狀態
        document.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        
        // 驗證商品名稱
        if (!this.productNameInput.value.trim()) {
            this.showError(this.productNameInput, '請輸入商品名稱');
            isValid = false;
        }
        
        // 驗證售價
        const salePrice = parseFloat(this.salePriceInput.value);
        if (isNaN(salePrice) || salePrice <= 0) {
            this.showError(this.salePriceInput, '請輸入有效的售價');
            isValid = false;
        }
        
        // 驗證成本價（如果已填寫）
        const costPrice = parseFloat(this.costPriceInput.value);
        if (this.costPriceInput.value && (isNaN(costPrice) || costPrice < 0)) {
            this.showError(this.costPriceInput, '請輸入有效的成本價');
            isValid = false;
        }
        
        // 驗證庫存
        const stock = parseInt(this.stockInput.value);
        if (isNaN(stock) || stock < 0) {
            this.showError(this.stockInput, '請輸入有效的庫存數量');
            isValid = false;
        }
        
        // 驗證最低庫存
        const minStock = parseInt(this.minStockInput.value);
        if (isNaN(minStock) || minStock < 0) {
            this.showError(this.minStockInput, '請輸入有效的最低庫存警告');
            isValid = false;
        }
        
        return isValid;
    }
    
    // 顯示表單錯誤
    showError(input, message) {
        input.classList.add('border-red-500', 'is-invalid');
        
        let errorElement = input.nextElementSibling;
        
        // 如果沒有錯誤訊息元素，則創建一個
        if (!errorElement || !errorElement.classList.contains('invalid-feedback')) {
            errorElement = document.createElement('div');
            errorElement.className = 'invalid-feedback text-red-500 text-xs mt-1';
            input.parentNode.insertBefore(errorElement, input.nextSibling);
        }
        
        errorElement.textContent = message;
    }
    
    // 重置表單
    resetForm() {
        if (this.productForm) {
            this.productForm.reset();
        }
        
        // 重置錯誤狀態
        document.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        
        // 重置選擇框
        if (this.categorySelect) this.categorySelect.selectedIndex = 0;
        if (this.supplierSelect) this.supplierSelect.selectedIndex = 0;
    }
    
    // 顯示模態框
    showModal() {
        if (this.productModal) {
            this.productModal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
            
            // 將焦點設置到第一個表單元素
            setTimeout(() => {
                const firstInput = this.productForm.querySelector('input:not([type="hidden"]), select, textarea');
                if (firstInput) firstInput.focus();
            }, 100);
        }
    }
    
    // 關閉模態框
    closeModal() {
        if (this.productModal) {
            this.productModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }
        this.resetForm();
    }
    
    // 顯示/隱藏加載指示器
    showLoading(show) {
        const loadingElement = document.getElementById('loading');
        if (!loadingElement) return;
        
        if (show) {
            loadingElement.classList.remove('hidden');
        } else {
            loadingElement.classList.add('hidden');
        }
    }
    
    // 獲取模擬商品數據（僅用於演示）
    getMockProducts() {
        return [
            {
                id: '1',
                name: '原子習慣',
                barcode: '9789861755267',
                category: '書籍',
                supplier: '天下雜誌',
                costPrice: 237,
                salePrice: 316,
                stock: 15,
                minStock: 5,
                unit: '本',
                description: '細微改變帶來巨大成就的實證法則',
                createdAt: '2023-01-15T10:30:00Z',
                updatedAt: '2023-05-20T14:25:00Z'
            },
            {
                id: '2',
                name: '被討厭的勇氣',
                barcode: '9789861342482',
                category: '書籍',
                supplier: '究竟出版',
                costPrice: 205,
                salePrice: 300,
                stock: 8,
                minStock: 5,
                unit: '本',
                description: '自我啟發之父阿德勒的教導',
                createdAt: '2023-02-10T09:15:00Z',
                updatedAt: '2023-05-18T16:40:00Z'
            },
            {
                id: '3',
                name: '原子習慣 (中文版) 限量金屬書籤版',
                barcode: '4717702008505',
                category: '書籍',
                supplier: '天下雜誌',
                costPrice: 268,
                salePrice: 356,
                stock: 3,
                minStock: 5,
                unit: '本',
                description: '限量金屬書籤版',
                createdAt: '2023-03-05T14:20:00Z',
                updatedAt: '2023-05-22T11:10:00Z'
            },
            {
                id: '4',
                name: '無印良品 MUJI 聚丙烯筆盒',
                barcode: '4549738292667',
                category: '文具',
                supplier: '無印良品',
                costPrice: 90,
                salePrice: 150,
                stock: 25,
                minStock: 10,
                unit: '個',
                description: '簡約設計，輕巧耐用',
                createdAt: '2023-02-15T11:30:00Z',
                updatedAt: '2023-05-19T09:45:00Z'
            },
            {
                id: '5',
                name: 'ZEBRA 斑馬牌 SARASA 復古色中性筆',
                barcode: '4984074001359',
                category: '文具',
                supplier: '利百代',
                costPrice: 35,
                salePrice: 60,
                stock: 0,
                minStock: 20,
                unit: '支',
                description: '復古色系，書寫流暢',
                createdAt: '2023-01-20T13:25:00Z',
                updatedAt: '2023-05-21T16:20:00Z'
            }
        ];
    }
}

// 當頁面加載完成後初始化商品頁面
document.addEventListener('DOMContentLoaded', () => {
    window.productsPage = new ProductsPage();
});
