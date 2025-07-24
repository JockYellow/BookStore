// static/js/main.js (替換後的全新內容)

class BookstoreApp {
    constructor() {
        // 這裡不直接使用 new UI()，而是等到 ui.js 自己初始化
        // 這樣可以確保我們總是使用同一個 ui 實例
        this.ui = window.ui;
        this.initializeMobileMenu();
    }

    // 初始化移動端菜單
    initializeMobileMenu() {
        const menuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (menuButton && mobileMenu) {
            menuButton.addEventListener('click', (e) => {
                e.stopPropagation();
                mobileMenu.classList.toggle('hidden');
            });
        }
    }
}

// 確保在 DOM 載入後，並且 ui.js 已經初始化完畢
document.addEventListener('DOMContentLoaded', () => {
    if (window.ui) {
        window.app = new BookstoreApp();
    } else {
        console.error('UI module not found. Make sure ui.js is loaded correctly.');
    }
});
