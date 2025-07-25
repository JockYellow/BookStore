import json
import os
import shutil
import re
from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

# --- 設定 ---
# 專案根目錄
ROOT_DIR = Path(__file__).parent
# 靜態網站輸出目錄
DIST_DIR = ROOT_DIR / "docs"
# 原始資料目錄
DATA_DIR = ROOT_DIR / "data"
# 原始靜態資源目錄 (CSS, JS)
STATIC_DIR = ROOT_DIR / "static"
# 原始 Jinja 模板目錄
TEMPLATES_DIR = ROOT_DIR / "templates"


def setup_dist_directory():
    """建立一個乾淨的輸出目錄"""
    print(f"1. 正在清理並建立輸出目錄: {DIST_DIR}")
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    DIST_DIR.mkdir(exist_ok=True)
    print("   ✅ 輸出目錄已準備就緒。")


def process_and_copy_assets():
    """
    複製靜態資源並對 JavaScript 檔案進行全面改造，以適應靜態網站的互動模擬。
    """
    print("2. 正在處理與複製靜態資源...")
    dist_static_dir = DIST_DIR / "static"
    shutil.copytree(STATIC_DIR, dist_static_dir, dirs_exist_ok=True)

    js_dir = dist_static_dir / "js"
    if not js_dir.exists():
        print("   ⚠️ 未找到 JavaScript 目錄，跳過處理。")
        return

    print("   正在全面改造 JavaScript 檔案以適應靜態模式...")
    for js_file in js_dir.glob("*.js"):
        content = js_file.read_text("utf-8")
        
        # --- 步驟 1: API 路徑替換 (用於初始資料載入) ---
        content = re.sub(r"/api/(\w+)/overview", r"./data/reports.json", content)
        content = re.sub(r"/api/(\w+)", r"./data/\1.json", content)

        # --- 步驟 2: 修正 purchases.js 的資料讀取問題 ---
        if js_file.name == 'purchases.js':
            content = content.replace('result.data', 'result')
            print(f"   - 已修正 {js_file.name} 的資料讀取邏輯。")

        # --- 步驟 3: 注入前端互動模擬程式碼 ---
        
        # 移除異步關鍵字 `async`，因為不再有實際的 await
        content = re.sub(r'const handle.*? = async \(.*?\)', lambda m: m.group(0).replace('async ', ''), content)
        content = re.sub(r'const processCheckout = async \(\)', 'const processCheckout = ()', content)
        content = re.sub(r'const delete.*? = async \(.*?\)', lambda m: m.group(0).replace('async ', ''), content)

        # 模擬 suppliers.js 的新增/編輯
        if js_file.name == 'suppliers.js':
            submit_pattern = re.compile(r"const handleSubmitSupplier = \((?:.|\n)*?\{((?:.|\n)*?)\};", re.MULTILINE)
            delete_pattern = re.compile(r"const deleteSupplier = \((?:.|\n)*?\{((?:.|\n)*?)\};", re.MULTILINE)
            
            content = submit_pattern.sub(r"""
    const handleSubmitSupplier = (e) => {
        e.preventDefault();
        const supplierId = supplierForm.dataset.id;
        const isEdit = !!supplierId;
        const supplierData = {
            id: supplierId || `S_NEW_${Date.now()}`,
            name: document.getElementById('supplier-name').value.trim(),
            contact_person: document.getElementById('contact-person').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            payment_terms: document.getElementById('payment-terms').value,
            created_at: new Date().toISOString()
        };
        if (!supplierData.name || !supplierData.contact_person || !supplierData.phone) {
            window.app.ui.showNotification('error', '請填寫所有必填欄位 (*)');
            return;
        }
        if (isEdit) {
            const index = allSuppliers.findIndex(s => s.id === supplierId);
            if (index !== -1) allSuppliers[index] = { ...allSuppliers[index], ...supplierData };
        } else {
            allSuppliers.unshift(supplierData);
        }
        renderSuppliers(allSuppliers);
        closeSupplierModal();
        window.app.ui.showNotification('success', '供應商資料已成功模擬儲存！');
    };
            """, content)
            
            content = delete_pattern.sub(r"""
    const deleteSupplier = (supplierId) => {
        allSuppliers = allSuppliers.filter(s => s.id !== supplierId);
        renderSuppliers(allSuppliers);
        window.app.ui.showNotification('success', '供應商已模擬刪除');
    };
            """, content)
            print(f"   - 已注入 {js_file.name} 的互動模擬功能。")

        # 模擬 members.js 的新增/編輯
        if js_file.name == 'members.js':
            content = re.sub(r"const handleFormSubmit = async \((?:.|\n)*?\{((?:.|\n)*?)\};", r"""
    const handleFormSubmit = (e) => {
        e.preventDefault();
        const memberId = document.getElementById('member-id').value;
        const isEdit = !!memberId;
        const memberData = {
            id: memberId || `M_NEW_${Date.now()}`,
            name: document.getElementById('name').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            email: document.getElementById('email').value.trim(),
            total_spent: isEdit ? (allMembers.find(m => m.id === memberId).total_spent || 0) : 0,
            member_level: document.getElementById('member-level').value,
            status: document.getElementById('status').value
        };
        if (!memberData.name || !memberData.phone) {
            window.app.ui.showNotification('error', '請填寫姓名與電話');
            return;
        }
        if (isEdit) {
            const index = allMembers.findIndex(m => m.id === memberId);
            if (index !== -1) allMembers[index] = { ...allMembers[index], ...memberData };
        } else {
            allMembers.unshift(memberData);
        }
        renderMembers(allMembers);
        closeMemberModal();
        window.app.ui.showNotification('success', '會員資料已成功模擬儲存！');
    };
            """, content, flags=re.MULTILINE)
            content = re.sub(r"const deleteMember = async \((?:.|\n)*?\{((?:.|\n)*?)\};", r"""
    const deleteMember = (memberId) => {
        allMembers = allMembers.filter(m => m.id !== memberId);
        renderMembers(allMembers);
        window.app.ui.showNotification('success', '會員已模擬刪除');
    };
            """, content, flags=re.MULTILINE)
            print(f"   - 已注入 {js_file.name} 的互動模擬功能。")
        
        # 模擬 sales.js 的結帳
        if js_file.name == 'sales.js':
            content = re.sub(r'const processCheckout = \(\) => \{((?:.|\n)*?)\};', r"""
    const processCheckout = () => {
        window.app.ui.showLoading('結帳中...');
        setTimeout(() => {
            window.app.ui.hideLoading();
            window.app.ui.showNotification('success', '結帳成功！');
            cart = [];
            updateCartUI();
            checkoutModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }, 800);
    };
            """, content, flags=re.MULTILINE)
            print(f"   - 已注入 {js_file.name} 的互動模擬功能。")

        js_file.write_text(content, "utf-8")

    print("   ✅ 靜態資源處理與複製完成。")


def copy_data_files():
    """將 data 目錄下的 JSON 檔案複製到 dist/data 目錄，並提取陣列。"""
    print("3. 正在複製資料檔案...")
    dist_data_dir = DIST_DIR / "data"
    dist_data_dir.mkdir(exist_ok=True)

    for json_file in DATA_DIR.glob("*.json"):
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if isinstance(data, dict) and len(data) == 1 and isinstance(list(data.values())[0], list):
            key = list(data.keys())[0]
            print(f"   - 正在提取 {json_file.name} 中的 '{key}' 陣列...")
            data = data[key]
        
        elif json_file.name == "members.json" and isinstance(data, list) and data and 'members' in data[0]:
             print(f"   - 正在處理 {json_file.name} 的特殊結構...")
             processed_data = []
             for item in data:
                 if 'members' in item and isinstance(item['members'], list):
                     processed_data.extend(item['members'])
                 else:
                     processed_data.append(item)
             data = processed_data

        (dist_data_dir / json_file.name).write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding='utf-8'
        )
        print(f"   - 已複製並處理 {json_file.name}")
        
    print("   ✅ 資料檔案複製完成。")


def render_and_fix_html_pages():
    """渲染模板、儲存為 HTML，並修正內部連結與資源路徑。"""
    print("4. 正在渲染並修正 HTML 頁面...")
    env = Environment(loader=FileSystemLoader(TEMPLATES_DIR), autoescape=True)

    pages_to_render = {
        "index.html": {"title": "儀表板"}, "products.html": {"title": "商品管理"},
        "suppliers.html": {"title": "供應商管理"}, "purchases.html": {"title": "進貨管理"},
        "purchase_form.html": {"title": "新增進貨單", "today": datetime.now().strftime("%Y-%m-%d")},
        "sales.html": {"title": "銷售管理"}, "members.html": {"title": "會員管理"},
        "reports.html": {"title": "報表分析"},
    }

    for template_name, context in pages_to_render.items():
        template = env.get_template(template_name)
        rendered_html = template.render({"request": None, **context})
        
        # 將所有絕對路徑改為相對路徑
        rendered_html = re.sub(r'(href|src)="/', r'\1="./', rendered_html)
        rendered_html = re.sub(r'href="./(?!static)([^"]+)"', r'href="./\1.html"', rendered_html)
        rendered_html = re.sub(r'href="./index.html"', 'href="./index.html"', rendered_html) 
        rendered_html = re.sub(r'href="./purchases/new.html"', 'href="./purchase_form.html"', rendered_html)

        (DIST_DIR / template_name).write_text(rendered_html, encoding="utf-8")
        print(f"   - 已渲染並修正 {template_name}")
        
    print("   ✅ HTML 頁面處理完成。")


def main():
    """主執行函數"""
    print("🚀 開始建立靜態網站...")
    
    setup_dist_directory()
    process_and_copy_assets()
    copy_data_files()
    render_and_fix_html_pages()
    
    print("\n✅ 靜態網站建立成功！")
    print(f"   所有檔案都已生成在 '{DIST_DIR.name}' 目錄中。")
    print("   JS 檔案已自動改造，現在可以完整模擬新增、編輯、刪除的互動效果。")


if __name__ == "__main__":
    main()