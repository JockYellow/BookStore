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
DIST_DIR = ROOT_DIR / "dist"
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
    複製靜態資源並對 JavaScript 檔案進行全面改造，以適應靜態網站。
    """
    print("2. 正在處理與複製靜態資源...")
    dist_static_dir = DIST_DIR / "static"
    shutil.copytree(STATIC_DIR, dist_static_dir, dirs_exist_ok=True)

    js_dir = dist_static_dir / "js"
    if not js_dir.exists():
        print("   ⚠️ 未找到 JavaScript 目錄，跳過處理。")
        return

    # --- 定義 JS 修改規則 ---

    # 規則 1: API 路徑替換
    api_replacements = [
        (r"'/api/(\w+)/overview'", r"'./data/reports.json'"), # reports.js 特殊路徑
        (r"fetch\('/api/(\w+)'\)", r"fetch('./data/\1.json')"),
        (r'fetch\("/api/(\w+)"\)', r'fetch("./data/\1.json")'),
        (r"fetch\(`/api/(\w+)/\${.+?}`\)", r"fetch('./data/\1.json')"),
    ]
    
    # 規則 2: 模擬 Fetch 請求的替換 (正則表達式)
    # 匹配一個完整的 fetch().then().catch().finally() 結構
    fetch_pattern = re.compile(
        r"window\.app\.ui\.showLoading\((?:.|\n)*?fetch\((?:.|\n)*?body: JSON\.stringify\((?P<data_var>\w+)\)(?:.|\n)*?\}\);(?P<block_content>(?:.|\n)*?)\s*?window\.app\.ui\.hideLoading\(\);",
        re.MULTILINE
    )

    # 檔案特定的模擬程式碼
    simulation_logic = {
        "members.js": """
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
        """,
        "suppliers.js": """
        if (isEdit) {
            const index = allSuppliers.findIndex(s => s.id === supplierId);
            if (index !== -1) allSuppliers[index] = { ...allSuppliers[index], ...supplierData, id: supplierId };
        } else {
            supplierData.id = `S_NEW_${Date.now()}`;
            allSuppliers.push(supplierData);
        }
        window.app.ui.showNotification('success', '供應商資料儲存成功！');
        closeSupplierModal();
        renderSuppliers(allSuppliers);
        """,
        "products.js": """
        if (isEdit) {
            const index = allProducts.findIndex(p => p.id === productId);
            if (index !== -1) allProducts[index] = { ...allProducts[index], ...productData, id: productId };
        } else {
            productData.id = `P_NEW_${Date.now()}`;
            allProducts.push(productData);
        }
        window.app.ui.showNotification('success', '商品資料儲存成功！');
        closeModal();
        renderTable(allProducts);
        """,
         "purchase_form.js": """
        window.app.ui.showNotification('success', '進貨單已成功建立！');
        setTimeout(() => { window.location.href = './purchases.html'; }, 1500);
        """
    }

    print("   正在全面改造 JavaScript 檔案以適應靜態模式...")
    for js_file in js_dir.glob("*.js"):
        content = js_file.read_text("utf-8")
        
        # 步驟 1: 替換 API 路徑
        for pattern, replacement in api_replacements:
            content = re.sub(pattern, replacement, content)

        # 步驟 2: 替換 fetch 提交邏輯為前端模擬
        if js_file.name in simulation_logic:
            # 找到異步函數定義，並移除 async 關鍵字
            content = re.sub(r'const handle.*? = async \(.*?\)', lambda m: m.group(0).replace('async ', ''), content)
            
            # 替換 fetch 區塊
            match = fetch_pattern.search(content)
            if match:
                replacement_code = simulation_logic[js_file.name]
                content = fetch_pattern.sub(replacement_code, content)
                print(f"   - 已模擬 {js_file.name} 的表單提交功能。")
        
        # 步驟 3: 修正 purchases.js 的資料讀取問題
        if js_file.name == 'purchases.js':
            content = content.replace('allPurchases = result.data || [];', 'allPurchases = result || [];')
            print(f"   - 已修正 {js_file.name} 的資料讀取邏輯。")

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
        
        # 如果 JSON 頂層是一個物件且只有一個 key，其值為 list，則提取該 list
        if isinstance(data, dict) and len(data) == 1 and isinstance(list(data.values())[0], list):
            key = list(data.keys())[0]
            print(f"   - 正在提取 {json_file.name} 中的 '{key}' 陣列...")
            data = data[key]
        
        # 如果頂層是陣列，且第一個元素是包含 `members` 鍵的字典 (members.json 的特殊情況)
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
        
        # 【核心修正】將所有絕對路徑改為相對路徑
        rendered_html = re.sub(r'(href|src)="/', r'\1="./', rendered_html)
        # 修正頁面間的連結 .html
        rendered_html = re.sub(r'href="./(?!static)([^"]+)"', r'href="./\1.html"', rendered_html)
        # 特殊處理首頁連結
        rendered_html = re.sub(r'href="./index.html"', 'href="./index.html"', rendered_html) 
        # 修正 purchase form 的特殊連結
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