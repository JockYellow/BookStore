import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime, timedelta
import json
from pathlib import Path
from typing import Dict, List, Optional

# 設置頁面配置
st.set_page_config(
    page_title="書房記帳與營運管理系統",
    page_icon="📚",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 初始化 session state
if 'current_page' not in st.session_state:
    st.session_state.current_page = 'dashboard'

# 數據文件夾
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

# 加載數據
def load_data(collection_name: str) -> Dict:
    file_path = DATA_DIR / f"{collection_name}.json"
    if file_path.exists():
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

# 保存數據
def save_data(collection_name: str, data: Dict):
    file_path = DATA_DIR / f"{collection_name}.json"
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# 側邊欄 - 導航
with st.sidebar:
    st.title("📚 書房管理系統")
    st.write("---")
    
    menu = ["儀表板", "商品管理", "進貨管理", "銷售管理", "會員管理", "供應商管理", "報表分析"]
    for i, item in enumerate(menu):
        if st.button(item, key=f"menu_{i}", use_container_width=True):
            st.session_state.current_page = item
    
    st.write("---")
    st.caption(f"版本: 1.0.0")

# 儀表板頁面
if st.session_state.current_page == "儀表板":
    st.title("📊 儀表板")
    
    # 獲取銷售數據
    sales = load_data("sales")
    products = load_data("products")
    
    # 計算今日銷售額
    today = datetime.now().strftime("%Y-%m-%d")
    today_sales = [s for s in sales.values() if s.get('sale_date', '').startswith(today)]
    
    # 計算指標
    total_sales_today = sum(s.get('final_amount', 0) for s in today_sales)
    total_orders_today = len(today_sales)
    
    # 顯示 KPI 卡片
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("今日銷售額", f"${total_sales_today:,.0f}")
    with col2:
        st.metric("今日訂單數", total_orders_today)
    with col3:
        avg_order = total_sales_today / total_orders_today if total_orders_today > 0 else 0
        st.metric("平均訂單價值", f"${avg_order:,.0f}" if avg_order > 0 else "$0")
    
    st.write("---")
    
    # 銷售趨勢圖
    st.subheader("銷售趨勢")
    
    # 獲取最近30天的銷售數據
    date_range = pd.date_range(end=datetime.now(), periods=30).date
    sales_by_date = {}
    
    for date in date_range:
        date_str = date.strftime("%Y-%m-%d")
        daily_sales = [s for s in sales.values() if s.get('sale_date', '').startswith(date_str)]
        sales_by_date[date_str] = sum(s.get('final_amount', 0) for s in daily_sales)
    
    # 創建折線圖
    df_sales = pd.DataFrame({
        '日期': list(sales_by_date.keys()),
        '銷售額': list(sales_by_date.values())
    })
    
    fig = px.line(df_sales, x='日期', y='銷售額', title='最近30天銷售趨勢')
    st.plotly_chart(fig, use_container_width=True)
    
    # 低庫存商品提醒
    st.subheader("低庫存提醒")
    low_stock_products = [p for p in products.values() if p.get('stock', 0) < 5]
    
    if low_stock_products:
        for product in low_stock_products:
            st.warning(f"{product.get('name')} 庫存不足: {product.get('stock', 0)} 件")
    else:
        st.success("目前沒有低庫存商品")
    
    # 最近交易記錄
    st.subheader("最近交易")
    recent_sales = sorted(sales.values(), key=lambda x: x.get('sale_date', ''), reverse=True)[:5]
    
    if recent_sales:
        for sale in recent_sales:
            st.write(f"**{sale.get('sale_date', '')}** - ${sale.get('final_amount', 0):,.0f}")
    else:
        st.info("暫無交易記錄")

# 商品管理頁面
elif st.session_state.current_page == "商品管理":
    st.title("📦 商品管理")
    
    # 加載商品數據
    products = load_data("products")
    
    # 添加新商品
    with st.expander("添加新商品", expanded=False):
        with st.form("add_product_form"):
            col1, col2 = st.columns(2)
            with col1:
                name = st.text_input("商品名稱*")
                category = st.text_input("商品分類")
            with col2:
                cost_price = st.number_input("成本價", min_value=0.0, value=0.0, step=1.0)
                selling_price = st.number_input("售價", min_value=0.0, value=0.0, step=1.0)
                stock = st.number_input("庫存數量", min_value=0, value=0, step=1)
            
            note = st.text_area("備註")
            
            if st.form_submit_button("保存商品"):
                if not name:
                    st.error("商品名稱不能為空")
                else:
                    new_product = {
                        'id': str(len(products) + 1),
                        'name': name,
                        'category': category,
                        'cost_price': cost_price,
                        'selling_price': selling_price,
                        'stock': stock,
                        'note': note,
                        'created_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat()
                    }
                    products[new_product['id']] = new_product
                    save_data("products", products)
                    st.success(f"商品 '{name}' 已成功添加！")
                    st.rerun()
    
    # 商品列表
    st.subheader("商品列表")
    
    if products:
        # 轉換為 DataFrame 顯示
        df_products = pd.DataFrame([{
            'ID': p['id'],
            '商品名稱': p.get('name', ''),
            '分類': p.get('category', ''),
            '成本價': p.get('cost_price', 0),
            '售價': p.get('selling_price', 0),
            '庫存': p.get('stock', 0),
            '更新日期': p.get('updated_at', '').split('T')[0]
        } for p in products.values()])
        
        st.dataframe(
            df_products,
            use_container_width=True,
            hide_index=True,
            column_config={
                "成本價": st.column_config.NumberColumn(format="$%.2f"),
                "售價": st.column_config.NumberColumn(format="$%.2f")
            }
        )
    else:
        st.info("暫無商品數據")

# 其他頁面的實現...
else:
    st.title(st.session_state.current_page)
    st.write("開發中...")

# 頁腳
st.write("---")
st.caption("© 2025 書房記帳與營運管理系統 - 版本 1.0.0")
