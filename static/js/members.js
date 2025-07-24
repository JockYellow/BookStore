// static/js/members.js (全新內容)

document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const newMemberBtn = document.getElementById('new-member-btn');
    const memberModal = document.getElementById('member-modal');
    const memberModalTitle = document.getElementById('member-modal-title');
    const memberForm = document.getElementById('member-form');
    const closeModalBtn = document.getElementById('close-member-modal');
    const cancelFormBtn = document.getElementById('cancel-member-form');
    const membersList = document.getElementById('members-list');
    
    let allMembers = [];

    // 開啟 Modal
    const openMemberModal = (member = null) => {
        memberForm.reset();
        document.getElementById('member-id').value = '';

        if (member) {
            // 編輯
            memberModalTitle.textContent = '編輯會員';
            document.getElementById('member-id').value = member.id;
            document.getElementById('name').value = member.name || '';
            document.getElementById('phone').value = member.phone || '';
            document.getElementById('email').value = member.email || '';
            document.getElementById('birthday').value = member.birthday || '';
            document.getElementById('member-level').value = member.member_level || 'standard';
            document.getElementById('status').value = member.status || 'active';
            document.getElementById('address').value = member.address || '';
            document.getElementById('notes').value = member.notes || '';
        } else {
            // 新增
            memberModalTitle.textContent = '新增會員';
        }
        memberModal.classList.remove('hidden');
    };
    
    // 關閉 Modal
    const closeMemberModal = () => {
        memberModal.classList.add('hidden');
    };

    // 載入會員資料
    const loadMembers = async () => {
        window.app.ui.showLoading('載入會員資料中...');
        try {
            const response = await fetch('/api/members');
            if (!response.ok) throw new Error('無法載入會員資料');
            allMembers = await response.json();
            renderMembers(allMembers);
        } catch (error) {
            console.error('載入會員資料失敗:', error);
            window.app.ui.showNotification('error', '載入會員資料失敗');
        } finally {
            window.app.ui.hideLoading();
        }
    };

    // 渲染列表
    const renderMembers = (members) => {
        if (members.length === 0) {
            membersList.innerHTML = `<tr><td colspan="8" class="text-center py-4">沒有會員資料</td></tr>`;
            return;
        }

        membersList.innerHTML = members.map(member => {
             const statusBadge = member.status === 'active' 
                ? '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">啟用中</span>'
                : '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">已停用</span>';
            
            return `
                <tr data-id="${member.id}">
                    <td class="px-6 py-4">${member.id}</td>
                    <td class="px-6 py-4">${member.name}</td>
                    <td class="px-6 py-4">${member.phone}</td>
                    <td class="px-6 py-4">${member.email || '-'}</td>
                    <td class="px-6 py-4">$${(member.total_spent || 0).toLocaleString()}</td>
                    <td class="px-6 py-4">${member.member_level || 'standard'}</td>
                    <td class="px-6 py-4">${statusBadge}</td>
                    <td class="px-6 py-4 text-right">
                        <button class="text-blue-600 hover:text-blue-900 edit-member"><i class="fas fa-edit"></i> 編輯</button>
                        <button class="text-red-600 hover:text-red-900 ml-4 delete-member"><i class="fas fa-trash"></i> 刪除</button>
                    </td>
                </tr>
            `;
        }).join('');
    };

    // 處理表單提交
    const handleFormSubmit = async (e) => {
        e.preventDefault();
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
            notes: document.getElementById('notes').value.trim(),
        };

        if (!memberData.name || !memberData.phone) {
            window.app.ui.showNotification('error', '請填寫姓名與電話');
            return;
        }

        const url = isEdit ? `/api/members/${memberId}` : '/api/members';
        const method = isEdit ? 'PUT' : 'POST';

        window.app.ui.showLoading('儲存中...');
        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(memberData)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || '儲存失敗');
            }

            window.app.ui.showNotification('success', '會員資料儲存成功！');
            closeMemberModal();
            loadMembers();
        } catch (error) {
            console.error('儲存會員失敗:', error);
            window.app.ui.showNotification('error', error.message);
        } finally {
            window.app.ui.hideLoading();
        }
    };
    
    // 處理列表點擊
    const handleListClick = (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        
        const row = target.closest('tr');
        const memberId = row.dataset.id;
        const member = allMembers.find(m => m.id === memberId);

        if (target.classList.contains('edit-member')) {
            if (member) openMemberModal(member);
        }

        if (target.classList.contains('delete-member')) {
            window.app.ui.showConfirmDialog({
                title: '確認刪除',
                message: `您確定要刪除會員 "${member.name}" 嗎？`,
            }).then(confirmed => {
                if (confirmed) deleteMember(memberId);
            });
        }
    };

    // 刪除會員
    const deleteMember = async (memberId) => {
        window.app.ui.showLoading('刪除中...');
        try {
            const response = await fetch(`/api/members/${memberId}`, { method: 'DELETE' });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || '刪除失敗');
            }
            window.app.ui.showNotification('success', '會員已刪除');
            loadMembers();
        } catch (error) {
            console.error('刪除會員失敗:', error);
            window.app.ui.showNotification('error', error.message);
        } finally {
            window.app.ui.hideLoading();
        }
    };

    // 設定事件監聽器
    newMemberBtn.addEventListener('click', () => openMemberModal());
    closeModalBtn.addEventListener('click', closeMemberModal);
    cancelFormBtn.addEventListener('click', closeMemberModal);
    memberForm.addEventListener('submit', handleFormSubmit);
    membersList.addEventListener('click', handleListClick);

    // 初始載入
    loadMembers();
});