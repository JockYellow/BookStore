// UI 通用功能
class UI {
    constructor() {
        this.initializeComponents();
        this.setupEventListeners();
    }

    // 初始化所有 UI 組件
    initializeComponents() {
        this.loadingElement = document.getElementById('loading');
        this.notificationsElement = document.getElementById('notifications');
        this.confirmDialog = document.getElementById('confirm-dialog');
        
        if (this.confirmDialog) {
            this.confirmTitle = document.getElementById('confirm-title');
            this.confirmMessage = document.getElementById('confirm-message');
            this.confirmOkBtn = document.getElementById('confirm-ok');
            this.confirmCancelBtn = document.getElementById('confirm-cancel');
        }
    }

    // 設置事件監聽器
    setupEventListeners() {
        // 關閉通知按鈕
        document.addEventListener('click', (e) => {
            if (e.target.closest('.close-notification')) {
                this.hideNotification(e.target.closest('.notification'));
            }
        });

        // 確認對話框按鈕
        if (this.confirmCancelBtn) {
            this.confirmCancelBtn.addEventListener('click', () => this.hideConfirmDialog());
        }
    }

    // 顯示加載指示器
    showLoading(message = '載入中，請稍候...') {
        if (this.loadingElement) {
            const messageEl = this.loadingElement.querySelector('span');
            if (messageEl) messageEl.textContent = message;
            this.loadingElement.classList.remove('hidden');
        }
    }

    // 隱藏加載指示器
    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.classList.add('hidden');
        }
    }

    // 顯示通知
    showNotification(type, message, duration = 5000) {
        const notification = document.getElementById(`${type}-notification`);
        if (!notification) return;

        const messageEl = notification.querySelector('.notification-message');
        if (messageEl) messageEl.textContent = message;

        notification.classList.remove('hidden');
        notification.style.animation = 'slideIn 0.3s ease-out';

        // 自動關閉通知
        if (duration > 0) {
            setTimeout(() => {
                this.hideNotification(notification);
            }, duration);
        }
    }

    // 隱藏通知
    hideNotification(notification) {
        if (!notification) return;
        
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            notification.classList.add('hidden');
            notification.style.animation = '';
        }, 300);
    }

    // 顯示確認對話框
    showConfirmDialog(options = {}) {
        return new Promise((resolve) => {
            if (!this.confirmDialog) return resolve(false);

            const {
                title = '確認操作',
                message = '您確定要執行此操作嗎？此操作無法復原。',
                confirmText = '確認',
                cancelText = '取消',
                confirmButtonClass = 'bg-red-600 hover:bg-red-700',
                cancelButtonClass = 'bg-white hover:bg-gray-50'
            } = options;

            this.confirmTitle.textContent = title;
            this.confirmMessage.textContent = message;
            this.confirmOkBtn.textContent = confirmText;
            this.confirmCancelBtn.textContent = cancelText;

            // 更新按鈕樣式
            this.confirmOkBtn.className = `ml-3 inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${confirmButtonClass}`;
            this.confirmCancelBtn.className = `px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${cancelButtonClass}`;

            this.confirmDialog.classList.remove('hidden');

            // 設置一次性事件監聽器
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                this.confirmDialog.classList.add('hidden');
                this.confirmOkBtn.removeEventListener('click', handleConfirm);
                this.confirmCancelBtn.removeEventListener('click', handleCancel);
            };

            this.confirmOkBtn.addEventListener('click', handleConfirm);
            this.confirmCancelBtn.addEventListener('click', handleCancel);
        });
    }

    // 隱藏確認對話框
    hideConfirmDialog() {
        if (this.confirmDialog) {
            this.confirmDialog.classList.add('hidden');
        }
    }

    // 禁用表單按鈕
    disableButtons(form, disabled = true) {
        const buttons = form.querySelectorAll('button, [type="submit"], [type="button"]');
        buttons.forEach(button => {
            if (disabled) {
                button.setAttribute('disabled', 'disabled');
            } else {
                button.removeAttribute('disabled');
            }
        });
    }

    // 格式化日期
    formatDate(date, format = 'YYYY-MM-DD') {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    // 格式化貨幣
    formatCurrency(amount, currency = 'TWD') {
        if (amount === null || amount === undefined) return '';
        return new Intl.NumberFormat('zh-TW', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0
        }).format(amount);
    }
}

// 初始化 UI 實例
window.ui = new UI();
// 導出 UI 實例
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = ui;
} else {
    window.UI = ui;
}

