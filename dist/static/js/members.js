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
        
        if (isEdit) {
            const index = allMembers.findIndex(m => m.id === memberId);
            if (index !== -1) allMembers[index] = { ...allMembers[index], ...memberData, id: memberId };
        } else {
            memberData.id = `M_NEW_${Date.now()}`;
            allMembers.push(memberData);
        }
        window.app.ui.showNotification('success', '會員資料儲存成功！');
        closeMemberModal();
        loadMembers(); // 直接重新渲染而不是從檔案載入
        renderMembers(allMembers);
        
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