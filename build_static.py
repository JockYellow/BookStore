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
    複製靜態資源並對 JavaScript 檔案進行路徑替換。
    """
    print("2. 正在處理與複製靜態資源...")
    dist_static_dir = DIST_DIR / "static"
    shutil.copytree(STATIC_DIR, dist_static_dir, dirs_exist_ok=True)

    js_dir = dist_static_dir / "js"
    if not js_dir.exists():
        print("   ⚠️ 未找到 JavaScript 目錄，跳過處理。")
        return

    # 定義 API 路徑替換規則
    replacements = [
        (r"'/api/(\w+)/overview'", r"'./data/\1.json'"),
        (r"'/api/(\w+)'", r"'./data/\1.json'"),
        (r'"/api/(\w+)"', r'"./data/\1.json"'),
        (r"`/api/(\w+)/\${.+?}`", r"'./data/\1.json'"),
    ]

    print("   正在替換 JavaScript 中的 API 路徑...")
    for js_file in js_dir.glob("*.js"):
        content = js_file.read_text("utf-8")
        original_content = content
        
        for pattern, replacement in replacements:
            content = re.sub(pattern, replacement, content)

        if content != original_content:
            js_file.write_text(content, "utf-8")
            print(f"   - 已處理 {js_file.name}")

    print("   ✅ 靜態資源處理與複製完成。")


def copy_data_files():
    """
    將 data 目錄下的 JSON 檔案複製到 dist/data 目錄。
    """
    dist_data_dir = DIST_DIR / "data"
    if not dist_data_dir.exists():
        dist_data_dir.mkdir(exist_ok=True)

    print(f"3. 正在複製資料檔案從 {DATA_DIR} 到 {dist_data_dir}")

    for json_file in DATA_DIR.glob("*.json"):
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if isinstance(data, dict) and len(data) == 1 and isinstance(list(data.values())[0], list):
            key = list(data.keys())[0]
            print(f"   - 正在提取 {json_file.name} 中的 '{key}' 列表...")
            data = data[key]

        (dist_data_dir / json_file.name).write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding='utf-8'
        )
        print(f"   - 已複製並處理 {json_file.name}")
        
    print("   ✅ 資料檔案複製完成。")


def render_and_fix_html_pages():
    """
    渲染模板、儲存為 HTML，並修正內部連結以適用於靜態網站。
    """
    print("4. 正在渲染並修正 HTML 頁面...")
    env = Environment(
        loader=FileSystemLoader(TEMPLATES_DIR),
        autoescape=True
    )
    
    def static_url_for(static_name, path):
        path = path.lstrip('/')
        return f"./{static_name}/{path}"
        
    env.globals['url_for'] = static_url_for

    pages_to_render = {
        "index.html": {"title": "儀表板"},
        "products.html": {"title": "商品管理"},
        "suppliers.html": {"title": "供應商管理"},
        "purchases.html": {"title": "進貨管理"},
        "purchase_form.html": {
            "title": "新增進貨單",
            "today": datetime.now().strftime("%Y-%m-%d")
        },
        "sales.html": {"title": "銷售管理"},
        "members.html": {"title": "會員管理"},
        "reports.html": {"title": "報表分析"},
    }
    
    all_page_names = [name.split('.')[0] for name in pages_to_render.keys()]

    for template_name, context in pages_to_render.items():
        template = env.get_template(template_name)
        full_context = {"request": None, **context}
        rendered_html = template.render(full_context)
        
        # --- 自動修正頁面間的連結 ---
        # 尋找所有 href="/page" 的連結
        for page_name in all_page_names:
            # 修正根目錄連結，例如：href="/"
            rendered_html = re.sub(r'href="/"', 'href="./index.html"', rendered_html)
            # 修正其他頁面連結，例如：href="/products"
            pattern = rf'href="/{page_name}"'
            replacement = f'href="./{page_name}.html"'
            rendered_html = re.sub(pattern, replacement, rendered_html)
            # 修正包含子路徑的連結, 例如 /purchases/new
            rendered_html = re.sub(r'href="/purchases/new"', 'href="./purchase_form.html"', rendered_html)


        output_path = DIST_DIR / template_name
        output_path.write_text(rendered_html, encoding="utf-8")
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
    print(f"   所有檔案都已生成在 '{DIST_DIR.name}' 目錄中，並且頁面連結已自動修正。")
    print("   現在您可以將 'dist' 目錄的內容直接部署到 GitHub Pages。")


if __name__ == "__main__":
    main()