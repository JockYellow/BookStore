// 會員管理頁面邏輯
document.addEventListener('DOMContentLoaded', function() {
    const app = window.app || new App();
    
    // DOM 元素
    const searchInput = document.getElementById('search-members');
    const statusFilter = document.getElementById('member-status-filter');
    const membersList = document.getElementById('members-list');
    const newMemberBtn = document.getElementById('new-member-btn');
    const memberModal = document.getElementById('member-modal');
    const memberForm = document.getElementById('member-form');
    const memberModalTitle = document.getElementById('member-modal-title');
    const closeModalBtn = document.getElementById('close-member-modal');
    const cancelFormBtn = document.getElementById('cancel-member-form');
    
    // 分頁元素
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const mobilePrevPageBtn = document.getElementById('mobile-prev-page');
    const mobileNextPageBtn = document.getElementById('mobile-next-page');
    const paginationNumbers = document.getElementById('pagination-numbers');
    const startItemSpan = document.getElementById('start-item');
    const endItemSpan = document.getElementById('end-item');
    const totalItemsSpan = document.getElementById('total-items');
    
    // 全局變數
    let members = [];
    let filteredMembers = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    
    // 初始化頁面
    async function init() {
        try {
            app.showLoading('載入會員資料中...');
            await loadMembers();
            setupEventListeners();
            renderMembers();
            updatePagination();
        } catch (error) {
            console.error('初始化錯誤:', error);
            app.showNotification('error', '載入會員資料失敗');
        } finally {
            app.hideLoading();
        }
    }
    
    // 載入會員資料
    async function loadMembers() {
        try {
            const response = await fetch('/api/members');
            if (!response.ok) {
                throw new Error('無法載入會員資料');
            }
            members = await response.json();
            filteredMembers = [...members];
        } catch (error) {
            console.error('載入會員資料失敗:', error);
            app.showNotification('error', '載入會員資料失敗，請稍後再試');
            throw error;
        }
    }
    
    // 渲染會員列表
    function renderMembers() {
        if (!membersList) return;
        
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedMembers = filteredMembers.slice(start, end);
        
        if (paginatedMembers.length === 0) {
            membersList.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-4 text-center text-sm text-gray-500">
                        沒有找到符合條件的會員
                    </td>
                </tr>`;
            return;
        }
        
        membersList.innerHTML = paginatedMembers.map(member => {
            const statusBadge = member.status === 'active' 
                ? '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">啟用中</span>'
                : '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">已停用</span>';
                
            const memberLevel = {
                'standard': '標準會員',
                'silver': '銀卡會員',
                'gold': '金卡會員',
                'platinum': '白金會員'
            }[member.member_level] || member.member_level;
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${member.id || 'N/A'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                                <span class="text-blue-600 font-medium">${member.name ? member.name.charAt(0).toUpperCase() : '?'}</span>
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">${member.name || '未提供'}</div>
                                <div class="text-sm text-gray-500">${member.email || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${member.phone || '未提供'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${member.email || '未提供'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        $${(member.total_spent || 0).toLocaleString()}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${memberLevel}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        ${statusBadge}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex justify-end space-x-2">
                            <button class="text-blue-600 hover:text-blue-900 edit-member" data-id="${member.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="text-red-600 hover:text-red-900 delete-member" data-id="${member.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
        
        // 綁定編輯和刪除按鈕事件
        document.querySelectorAll('.edit-member').forEach(btn => {
            btn.addEventListener('click', (e) => editMember(e.target.closest('button').dataset.id));
        });
        
        document.querySelectorAll('.delete-member').forEach(btn => {
            btn.addEventListener('click', (e) => deleteMember(e.target.closest('button').dataset.id));
        });
    }
    
    // 過濾會員
    function filterMembers() {
        const searchTerm = searchInput.value.toLowerCase();
        const statusFilterValue = statusFilter.value;
        
        filteredMembers = members.filter(member => {
            const matchesSearch = !searchTerm || 
                (member.name && member.name.toLowerCase().includes(searchTerm)) ||
                (member.phone && member.phone.includes(searchTerm)) ||
                (member.email && member.email.toLowerCase().includes(searchTerm));
                
            const matchesStatus = !statusFilterValue || member.status === statusFilterValue;
            
            return matchesSearch && matchesStatus;
        });
        
        currentPage = 1; // 重置到第一頁
        renderMembers();
        updatePagination();
    }
    
    // 更新分頁控制
    function updatePagination() {
        if (!paginationNumbers || !startItemSpan || !endItemSpan || !totalItemsSpan) return;
        
        const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
        const startItem = filteredMembers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
        const endItem = Math.min(currentPage * itemsPerPage, filteredMembers.length);
        
        // 更新分頁資訊
        startItemSpan.textContent = startItem;
        endItemSpan.textContent = endItem;
        totalItemsSpan.textContent = filteredMembers.length;
        
        // 更新分頁按鈕狀態
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage >= totalPages;
        mobilePrevPageBtn.disabled = currentPage === 1;
        mobileNextPageBtn.disabled = currentPage >= totalPages;
        
        // 更新分頁數字
        paginationNumbers.innerHTML = '';
        
        // 顯示最多5個分頁按鈕
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4 && startPage > 1) {
            startPage = Math.max(1, endPage - 4);
        }
        
        // 第一頁按鈕
        if (startPage > 1) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = '1';
            pageBtn.className = currentPage === 1 ? 'relative inline-flex items-center px-4 py-2 border border-blue-500 bg-blue-50 text-sm font-medium text-blue-600' : 'relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50';
            pageBtn.addEventListener('click', () => goToPage(1));
            paginationNumbers.appendChild(pageBtn);
            
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700';
                paginationNumbers.appendChild(ellipsis);
            }
        }
        
        // 分頁數字按鈕
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = i === currentPage 
                ? 'relative inline-flex items-center px-4 py-2 border border-blue-500 bg-blue-50 text-sm font-medium text-blue-600' 
                : 'relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50';
            pageBtn.addEventListener('click', () => goToPage(i));
            paginationNumbers.appendChild(pageBtn);
        }
        
        // 最後一頁按鈕
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700';
                paginationNumbers.appendChild(ellipsis);
            }
            
            const lastPageBtn = document.createElement('button');
            lastPageBtn.textContent = totalPages;
            lastPageBtn.className = currentPage === totalPages 
                ? 'relative inline-flex items-center px-4 py-2 border border-blue-500 bg-blue-50 text-sm font-medium text-blue-600' 
                : 'relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50';
            lastPageBtn.addEventListener('click', () => goToPage(totalPages));
            paginationNumbers.appendChild(lastPageBtn);
        }
    }
    
    // 前往指定頁面
    function goToPage(page) {
        currentPage = page;
        renderMembers();
        updatePagination();
        
        // 滾動到頂部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // 新增會員
    function newMember() {
        memberModalTitle.textContent = '新增會員';
        memberForm.reset();
        document.getElementById('member-id').value = '';
        memberModal.classList.remove('hidden');
    }
    
    // 編輯會員
    async function editMember(memberId) {
        try {
            app.showLoading('載入會員資料中...');
            const response = await fetch(`/api/members/${memberId}`);
            if (!response.ok) {
                throw new Error('無法載入會員資料');
            }
            
            const member = await response.json();
            
            // 填充表單
            document.getElementById('member-id').value = member.id;
            document.getElementById('name').value = member.name || '';
            document.getElementById('phone').value = member.phone || '';
            document.getElementById('email').value = member.email || '';
            document.getElementById('birthday').value = member.birthday || '';
            document.getElementById('member-level').value = member.member_level || 'standard';
            document.getElementById('status').value = member.status || 'active';
            document.getElementById('address').value = member.address || '';
            document.getElementById('notes').value = member.notes || '';
            
            memberModalTitle.textContent = '編輯會員';
            memberModal.classList.remove('hidden');
        } catch (error) {
            console.error('載入會員資料失敗:', error);
            app.showNotification('error', '載入會員資料失敗，請稍後再試');
        } finally {
            app.hideLoading();
        }
    }
    
    // 刪除會員
    async function deleteMember(memberId) {
        const confirmed = await app.showConfirm('確定要刪除此會員嗎？', '此操作無法還原');
        if (!confirmed) return;
        
        try {
            app.showLoading('刪除會員中...');
            const response = await fetch(`/api/members/${memberId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '刪除會員失敗');
            }
            
            // 從本地數據中刪除
            members = members.filter(m => m.id !== memberId);
            filteredMembers = filteredMembers.filter(m => m.id !== memberId);
            
            renderMembers();
            updatePagination();
            app.showNotification('success', '會員已刪除');
        } catch (error) {
            console.error('刪除會員失敗:', error);
            app.showNotification('error', error.message || '刪除會員失敗，請稍後再試');
        } finally {
            app.hideLoading();
        }
    }
    
    // 儲存會員資料
    async function saveMember(event) {
        event.preventDefault();
        
        const memberId = document.getElementById('member-id').value;
        const isEdit = !!memberId;
        
        const memberData = {
            name: document.getElementById('name').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            email: document.getElementById('email').value.trim(),
            birthday: document.getElementById('birthday').value,
            member_level: document.getElementById('member-level').value,
            status: document.getElementById('status').value,
            address: document.getElementById('address').value.trim(),
            notes: document.getElementById('notes').value.trim()
        };
        
        // 驗證必填欄位
        if (!memberData.name || !memberData.phone) {
            app.showNotification('error', '請填寫所有必填欄位');
            return;
        }
        
        try {
            app.showLoading(isEdit ? '更新會員中...' : '新增會員中...');
            
            let response;
            if (isEdit) {
                response = await fetch(`/api/members/${memberId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(memberData)
                });
            } else {
                response = await fetch('/api/members', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(memberData)
                });
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || (isEdit ? '更新會員失敗' : '新增會員失敗'));
            }
            
            const result = await response.json();
            
            // 更新本地數據
            if (isEdit) {
                const index = members.findIndex(m => m.id === memberId);
                if (index !== -1) {
                    members[index] = { ...members[index], ...memberData };
                }
            } else {
                const newMember = { id: result.id, ...memberData };
                members.unshift(newMember);
            }
            
            // 重新過濾和渲染
            filterMembers();
            
            // 關閉模態框
            memberModal.classList.add('hidden');
            
            app.showNotification('success', isEdit ? '會員資料已更新' : '會員新增成功');
        } catch (error) {
            console.error('儲存會員失敗:', error);
            app.showNotification('error', error.message || (isEdit ? '更新會員失敗，請稍後再試' : '新增會員失敗，請稍後再試'));
        } finally {
            app.hideLoading();
        }
    }
    
    // 設置事件監聽器
    function setupEventListeners() {
        // 搜尋和過濾
        searchInput.addEventListener('input', debounce(filterMembers, 300));
        statusFilter.addEventListener('change', filterMembers);
        
        // 分頁控制
        prevPageBtn?.addEventListener('click', () => goToPage(currentPage - 1));
        nextPageBtn?.addEventListener('click', () => goToPage(currentPage + 1));
        mobilePrevPageBtn?.addEventListener('click', () => goToPage(currentPage - 1));
        mobileNextPageBtn?.addEventListener('click', () => goToPage(currentPage + 1));
        
        // 新增/編輯會員
        newMemberBtn?.addEventListener('click', newMember);
        closeModalBtn?.addEventListener('click', () => memberModal.classList.add('hidden'));
        cancelFormBtn?.addEventListener('click', () => memberModal.classList.add('hidden'));
        memberForm?.addEventListener('submit', saveMember);
        
        // 點擊模態框外部關閉
        window.addEventListener('click', (e) => {
            if (e.target === memberModal) {
                memberModal.classList.add('hidden');
            }
        });
    }
    
    // 防抖函數
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // 初始化頁面
    init();
});
