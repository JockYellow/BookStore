from fastapi import FastAPI, HTTPException, Request, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import uvicorn
from typing import Dict, List, Optional, Any
import json
from datetime import datetime
import os
from services.report_service import ReportService
from utils import validate_required_fields
import logging

# 配置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化 FastAPI 應用
app = FastAPI(title="書房記帳與營運管理系統")

# 添加 CORS 中間件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 確保數據目錄存在
data_dir = Path("data")
data_dir.mkdir(exist_ok=True)

# 設置靜態文件目錄
static_dir = Path("static")
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# 設置模板目錄
templates_dir = Path("templates")
templates_dir.mkdir(exist_ok=True)
templates = Jinja2Templates(directory=templates_dir)

# 數據目錄
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

# 初始化數據文件
DATA_FILES = ["products", "suppliers", "purchases", "sales", "members", "payments", "discounts"]

def initialize_data_files():
    """確保所有需要的數據文件都存在且為有效JSON"""
    for file_name in DATA_FILES:
        file_path = DATA_DIR / f"{file_name}.json"
        if not file_path.exists():
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump([], f, ensure_ascii=False, indent=2)
            logger.info(f"Created empty data file: {file_path}")
        else:
            # 檢查文件是否為有效的JSON
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    json.load(f)
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON in {file_path}, resetting to empty list")
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump([], f, ensure_ascii=False, indent=2)

# 應用啟動時初始化數據文件
initialize_data_files()

# 加載數據
def load_data(collection_name: str) -> List[Dict]:
    """Load data from a JSON file and ensure it's a list."""
    file_path = DATA_DIR / f"{collection_name}.json"
    if file_path.exists():
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    # handle legacy structure like {"sales": [...]} or {"members": [...]}  
                    if len(data) == 1 and isinstance(next(iter(data.values())), list):
                        logger.info(f"Extracting array from wrapper in {file_path}")
                        data = next(iter(data.values()))
                    else:
                        logger.warning(f"Data in {file_path} is a dict, converting values to list")
                        data = [data]
                if not isinstance(data, list):
                    logger.warning(f"Data in {file_path} is not a list, converting to list")
                    data = [data] if data else []
                return data
        except json.JSONDecodeError as e:
            logger.error(f"Error loading {file_path}: {e}")
            return []
    return []

# 保存數據
def save_data(collection_name: str, data: List[Dict]):
    """Save data to a JSON file, ensuring it's a list."""
    file_path = DATA_DIR / f"{collection_name}.json"
    try:
        # Ensure the directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)
        # Ensure data is a list
        if not isinstance(data, list):
            logger.warning(f"Data for {collection_name} is not a list, converting to list")
            data = [data] if data else []
        # Save with pretty print
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    except Exception as e:
        logger.error(f"Error saving {file_path}: {e}")
        raise

# 首頁
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "title": "首頁"})

# 商品頁面
@app.get("/products", response_class=HTMLResponse)
async def products_page(request: Request):
    return templates.TemplateResponse("products.html", {
        "request": request,
        "title": "商品管理"
    })

# 供應商頁面
@app.get("/suppliers", response_class=HTMLResponse)
async def suppliers_page(request: Request):
    return templates.TemplateResponse("suppliers.html", {
        "request": request, 
        "title": "供應商管理"
    })
    
# 進貨頁面
@app.get("/purchases", response_class=HTMLResponse)
async def purchases_page(request: Request):
    return templates.TemplateResponse("purchases.html", {
        "request": request,
        "title": "進貨管理"
    })

@app.get("/purchases/new", response_class=HTMLResponse)
async def new_purchase_page(request: Request):
    return templates.TemplateResponse("purchase_form.html", {
        "request": request,
        "title": "新增進貨單",
        "today": datetime.now().strftime("%Y-%m-%d")
    })

# 會員頁面
@app.get("/members", response_class=HTMLResponse)
async def members_page(request: Request):
    return templates.TemplateResponse("members.html", {
        "request": request,
        "title": "會員管理"
    })

# 報表分析頁面
@app.get("/reports", response_class=HTMLResponse)
async def reports_page(request: Request):
    """顯示簡易報表分析介面"""
    return templates.TemplateResponse("reports.html", {
        "request": request,
        "title": "報表分析"
    })

# 商品相關 API
@app.get("/api/products")
async def get_products():
    return load_data("products")

@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    products = load_data("products")
    product = next((p for p in products if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    return product

@app.post("/api/products")
async def create_product(product: dict):
    products = load_data("products")
    if not isinstance(products, list):
        products = []
    product["id"] = f"P{len(products) + 1:03d}"
    product["created_at"] = datetime.now().isoformat()
    product["updated_at"] = datetime.now().isoformat()
    products.append(product)
    save_data("products", products)
    return {"message": "商品新增成功", "id": product["id"]}

@app.put("/api/products/{product_id}")
async def update_product(product_id: str, product_data: dict):
    products = load_data("products")
    if not isinstance(products, list):
        products = []
    
    product_index = next((i for i, p in enumerate(products) if p["id"] == product_id), None)
    if product_index is None:
        raise HTTPException(status_code=404, detail="商品不存在")
    
    # 保留原始創建時間
    product_data["created_at"] = products[product_index].get("created_at", datetime.now().isoformat())
    product_data["updated_at"] = datetime.now().isoformat()
    product_data["id"] = product_id
    
    products[product_index] = product_data
    save_data("products", products)
    return {"message": "商品更新成功", "id": product_id}

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str):
    products = load_data("products")
    if not isinstance(products, list):
        products = []
    
    product_index = next((i for i, p in enumerate(products) if p["id"] == product_id), None)
    if product_index is None:
        raise HTTPException(status_code=404, detail="商品不存在")
    
    # 檢查是否有關聯的銷售記錄
    sales = load_data("sales") or []
    if any(any(item.get("product_id") == product_id for item in sale.get("items", [])) for sale in sales):
        raise HTTPException(status_code=400, detail="無法刪除，該商品已有銷售記錄")
    
    del products[product_index]
    save_data("products", products)
    return {"message": "商品刪除成功", "id": product_id}

# 銷售相關 API
@app.get("/sales", response_class=HTMLResponse)
async def sales_page(request: Request):
    return templates.TemplateResponse("sales.html", {
        "request": request,
        "title": "銷售管理"
    })

@app.get("/api/sales")
async def get_sales():
    sales_data = load_data("sales")
    # 確保返回的是列表
    if isinstance(sales_data, dict) and 'sales' in sales_data:
        return sales_data['sales']
    return sales_data or []

@app.post("/api/sales")
async def create_sale(sale: dict):
    sales = load_data("sales")
    products = load_data("products")
    discounts = load_data("discounts")

    error = validate_required_fields(sale, ["items"])
    if error:
        raise HTTPException(status_code=400, detail=error)
    if not isinstance(sale["items"], list) or not sale["items"]:
        raise HTTPException(status_code=400, detail="銷售項目不能為空")

    now = datetime.now()
    sale_id = f"S{now.strftime('%Y%m%d%H%M%S')}"

    def calc_discount(pid: str, qty: int, price: float) -> float:
        applicable = [d for d in discounts if d.get("target_type") == "product" and d.get("target_id") == pid]
        product = next((p for p in products if p["id"] == pid), None)
        if product and product.get("category"):
            applicable += [d for d in discounts if d.get("target_type") == "category" and d.get("target_id") == product["category"]]
        applicable += [d for d in discounts if d.get("target_type") == "all"]

        now_dt = datetime.now()
        applicable = [
            d for d in applicable
            if (not d.get("valid_from") or datetime.fromisoformat(d["valid_from"]) <= now_dt) and
               (not d.get("valid_to") or datetime.fromisoformat(d["valid_to"]) >= now_dt)
        ]
        if not applicable:
            return 0.0
        disc = applicable[0]
        if disc.get("discount_type") == "percentage":
            return price * qty * (float(disc.get("value", 0)) / 100)
        return float(disc.get("value", 0)) * qty

    subtotal = 0.0
    discount_total = 0.0

    for item in sale.get("items", []):
        product = next((p for p in products if p["id"] == item["product_id"]), None)
        if not product:
            continue
        quantity = int(item.get("quantity", 0))
        unit_price = float(item.get("unit_price", product.get("selling_price", 0)))
        subtotal += unit_price * quantity
        discount_total += calc_discount(product["id"], quantity, unit_price)

        product["stock"] -= quantity
        if product["stock"] < 0:
            product["stock"] = 0

    total = subtotal - discount_total
    amount_received = float(sale.get("amount_received", total))

    sale_data = {
        "id": sale_id,
        "items": sale.get("items", []),
        "member_id": sale.get("member_id"),
        "subtotal": subtotal,
        "discount": discount_total,
        "total": total,
        "payment_method": sale.get("payment_method", "cash"),
        "amount_received": amount_received,
        "change": amount_received - total,
        "created_at": now.isoformat(),
        "cashier": sale.get("cashier", "系統管理員")
    }

    sales.append(sale_data)
    save_data("sales", sales)
    save_data("products", products)

    if sale_data.get("member_id"):
        members = load_data("members")
        member = next((m for m in members if m["id"] == sale_data["member_id"]), None)
        if member:
            member["total_spent"] = member.get("total_spent", 0) + total
            member["points"] = member.get("points", 0) + int(total // 100)
            member["updated_at"] = now.isoformat()
            save_data("members", members)

    return {"message": "銷售記錄已建立", "sale_id": sale_id}

# 進貨相關 API
@app.get("/api/purchases")
async def get_purchases():
    """獲取所有進貨記錄"""
    try:
        purchases = load_data("purchases")
        return {"data": purchases}
    except Exception as e:
        logger.error(f"Error getting purchases: {e}")
        raise HTTPException(status_code=500, detail="獲取進貨記錄時發生錯誤")

@app.get("/api/purchases/{purchase_id}")
async def get_purchase(purchase_id: str):
    """根據ID獲取單筆進貨記錄"""
    try:
        purchases = load_data("purchases")
        purchase = next((p for p in purchases if str(p.get("id")) == str(purchase_id)), None)
        if not purchase:
            raise HTTPException(status_code=404, detail="進貨記錄不存在")
        
        # 獲取供應商信息
        suppliers = load_data("suppliers")
        supplier = next((s for s in suppliers if str(s.get("id")) == str(purchase.get("supplier_id"))), {})
        purchase["supplier_name"] = supplier.get("name", "未知供應商")
        
        # 獲取商品信息
        products = load_data("products")
        for item in purchase.get("items", []):
            product = next((p for p in products if str(p.get("id")) == str(item.get("product_id"))), {})
            item["product_name"] = product.get("name", "未知商品")
            item["barcode"] = product.get("barcode", "")
        
        return {"data": purchase}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting purchase {purchase_id}: {e}")
        raise HTTPException(status_code=500, detail="獲取進貨記錄時發生錯誤")

@app.post("/api/purchases")
async def create_purchase(purchase: dict):
    """創建新的進貨記錄"""
    try:
        error = validate_required_fields(purchase, ["supplier_id", "items"])
        if error:
            raise HTTPException(status_code=400, detail=error)
        if not isinstance(purchase["items"], list):
            raise HTTPException(status_code=400, detail="進貨項目格式錯誤")
        
        # 載入現有數據
        purchases = load_data("purchases")
        products = load_data("products")
        
        # 生成唯一ID
        purchase_id = f"P{len(purchases) + 1:04d}"
        now = datetime.now().isoformat()
        
        # 計算總金額
        subtotal = 0
        for item in purchase["items"]:
            product = next((p for p in products if str(p.get("id")) == str(item.get("product_id"))), None)
            if not product:
                raise HTTPException(status_code=400, detail=f"找不到商品 ID: {item.get('product_id')}")
            
            quantity = int(item.get("quantity", 0))
            unit_price = float(item.get("unit_price", 0))
            item_total = quantity * unit_price
            subtotal += item_total
            
            # 更新商品庫存（如果狀態為已接收）
            if purchase.get("status") == "received":
                product["stock"] = product.get("stock", 0) + quantity
                product["updated_at"] = now
        
        # 計算稅金和總金額
        tax_rate = float(purchase.get("tax_rate", 0)) / 100
        tax = subtotal * tax_rate
        shipping_cost = float(purchase.get("shipping_cost", 0))
        total_amount = subtotal + tax + shipping_cost
        
        # 創建新的進貨記錄
        new_purchase = {
            "id": purchase_id,
            "purchase_number": f"PO-{datetime.now().strftime('%Y%m%d')}-{len(purchases) + 1:04d}",
            "supplier_id": purchase.get("supplier_id"),
            "purchase_date": purchase.get("purchase_date", now),
            "expected_delivery_date": purchase.get("expected_delivery_date"),
            "status": purchase.get("status", "pending"),
            "shipping_fee": shipping_cost,
            "tax_rate": tax_rate * 100,
            "notes": purchase.get("notes", ""),
            "items": [{
                "product_id": item.get("product_id"),
                "quantity": int(item.get("quantity", 0)),
                "unit_price": float(item.get("unit_price", 0)),
                "product_name": next((p.get("name", "") for p in products if str(p.get("id")) == str(item.get("product_id"))), "未知商品")
            } for item in purchase["items"]],
            "subtotal": subtotal,
            "tax": tax,
            "total_amount": total_amount,
            "payment_status": purchase.get("payment_status", "unpaid"),
            "created_at": now,
            "updated_at": now,
            "created_by": "system"
        }
        
        # 保存更新後的商品數據
        save_data("products", products)
        
        # 添加新的進貨記錄並保存
        purchases.append(new_purchase)
        save_data("purchases", purchases)
        
        return {"message": "進貨記錄創建成功", "data": new_purchase}
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"數據格式錯誤: {str(e)}")
    except Exception as e:
        logger.error(f"Error creating purchase: {e}")
        raise HTTPException(status_code=500, detail="創建進貨記錄時發生錯誤")

@app.put("/api/purchases/{purchase_id}")
async def update_purchase(purchase_id: str, purchase_data: dict):
    """更新進貨記錄"""
    purchases = load_data("purchases")
    purchase_index = next((i for i, p in enumerate(purchases) if p["id"] == purchase_id), None)
    
    if purchase_index is None:
        raise HTTPException(status_code=404, detail="進貨記錄不存在")
    
    old_purchase = purchases[purchase_index]
    
    # 更新進貨記錄
    updated_purchase = {**old_purchase, **purchase_data}
    updated_purchase["updated_at"] = datetime.now().isoformat()
    
    # 如果狀態從其他變更為已接收，則更新庫存
    if old_purchase["status"] != "received" and updated_purchase["status"] == "received":
        update_inventory_for_purchase(updated_purchase)
    
    purchases[purchase_index] = updated_purchase
    save_data("purchases", purchases)
    
    return updated_purchase

@app.delete("/api/purchases/{purchase_id}")
async def delete_purchase(purchase_id: str):
    """刪除進貨記錄"""
    purchases = load_data("purchases")
    purchase_index = next((i for i, p in enumerate(purchases) if p["id"] == purchase_id), None)
    
    if purchase_index is None:
        raise HTTPException(status_code=404, detail="進貨記錄不存在")
    
    # 檢查是否可以刪除（例如：已完成的進貨可能不允許刪除）
    purchase = purchases[purchase_index]
    if purchase.get("status") == "received":
        raise HTTPException(status_code=400, detail="已完成的進貨記錄無法刪除")
    
    # 從列表中移除
    deleted_purchase = purchases.pop(purchase_index)
    save_data("purchases", purchases)
    
    return {"message": "進貨記錄已刪除", "purchase": deleted_purchase}

def update_inventory_for_purchase(purchase: Dict):
    """更新庫存（當進貨單被標記為已接收時調用）"""
    products = load_data("products")
    updated = False
    
    for item in purchase.get("items", []):
        product_id = item.get("product_id")
        quantity = int(item.get("quantity", 0))
        
        # 找到對應的產品並更新庫存
        for product in products:
            if product["id"] == product_id:
                product["stock"] = str(int(product.get("stock", 0)) + quantity)
                product["updated_at"] = datetime.now().isoformat()
                updated = True
                break
    
    if updated:
        save_data("products", products)

# 會員相關 API
@app.get("/api/members")
async def get_members():
    return load_data("members")

@app.get("/api/members/{member_id}")
async def get_member(member_id: str):
    members = load_data("members")
    member = next((m for m in members if m["id"] == member_id), None)
    if not member:
        raise HTTPException(status_code=404, detail="會員不存在")
    return member

@app.post("/api/members")
async def create_member(member: dict):
    members = load_data("members")
    if not isinstance(members, list):
        members = []

    error = validate_required_fields(member, ["name", "phone"])
    if error:
        raise HTTPException(status_code=400, detail=error)
        
    # 檢查電話是否已存在
    if any(m.get('phone') == member.get('phone') for m in members):
        raise HTTPException(status_code=400, detail="此電話號碼已被使用")
    
    # 生成會員編號
    member_id = f"M{len(members) + 1:04d}"
    
    member_data = {
        "id": member_id,
        "name": member.get("name", ""),
        "phone": member.get("phone", ""),
        "email": member.get("email", ""),
        "birthday": member.get("birthday"),
        "member_level": member.get("member_level", "standard"),
        "status": member.get("status", "active"),
        "address": member.get("address", ""),
        "notes": member.get("notes", ""),
        "total_spent": 0,
        "points": 0,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    members.append(member_data)
    save_data("members", members)
    return {"message": "會員新增成功", "id": member_id}

@app.put("/api/members/{member_id}")
async def update_member(member_id: str, member_data: dict):
    members = load_data("members")
    if not isinstance(members, list):
        members = []
    
    member_index = next((i for i, m in enumerate(members) if m["id"] == member_id), None)
    if member_index is None:
        raise HTTPException(status_code=404, detail="會員不存在")
    
    # 檢查電話是否已被其他會員使用
    if any(m.get('phone') == member_data.get('phone') and m['id'] != member_id for m in members):
        raise HTTPException(status_code=400, detail="此電話號碼已被其他會員使用")
    
    # 保留原始數據
    original_member = members[member_index]
    
    # 更新會員資料
    updated_member = {
        **original_member,
        "name": member_data.get("name", original_member.get("name", "")),
        "phone": member_data.get("phone", original_member.get("phone", "")),
        "email": member_data.get("email", original_member.get("email", "")),
        "birthday": member_data.get("birthday", original_member.get("birthday")),
        "member_level": member_data.get("member_level", original_member.get("member_level", "standard")),
        "status": member_data.get("status", original_member.get("status", "active")),
        "address": member_data.get("address", original_member.get("address", "")),
        "notes": member_data.get("notes", original_member.get("notes", "")),
        "updated_at": datetime.now().isoformat()
    }
    
    members[member_index] = updated_member
    save_data("members", members)
    return {"message": "會員資料已更新", "id": member_id}

@app.delete("/api/members/{member_id}")
async def delete_member(member_id: str):
    members = load_data("members")
    if not isinstance(members, list):
        members = []
    
    member_index = next((i for i, m in enumerate(members) if m["id"] == member_id), None)
    if member_index is None:
        raise HTTPException(status_code=404, detail="會員不存在")
    
    # 檢查是否有關聯的銷售記錄
    sales = load_data("sales") or []
    if any(sale.get("member_id") == member_id for sale in sales):
        raise HTTPException(status_code=400, detail="無法刪除，該會員已有消費記錄")
    
    # 刪除會員
    del members[member_index]
    save_data("members", members)
    
    return {"message": "會員已刪除", "id": member_id}

# 供應商相關 API
@app.get("/api/suppliers")
async def get_suppliers():
    return load_data("suppliers")

@app.get("/api/suppliers/{supplier_id}")
async def get_supplier(supplier_id: str):
    suppliers = load_data("suppliers")
    supplier = next((s for s in suppliers if s["id"] == supplier_id), None)
    if not supplier:
        raise HTTPException(status_code=404, detail="供應商不存在")
    return supplier

@app.post("/api/suppliers")
async def create_supplier(supplier: dict):
    suppliers = load_data("suppliers")
    error = validate_required_fields(supplier, ["name"])
    if error:
        raise HTTPException(status_code=400, detail=error)
    supplier["id"] = f"S{len(suppliers) + 1:03d}"
    supplier["created_at"] = datetime.now().isoformat()
    suppliers.append(supplier)
    save_data("suppliers", suppliers)
    return {"message": "供應商新增成功", "id": supplier["id"]}

@app.put("/api/suppliers/{supplier_id}")
async def update_supplier(supplier_id: str, supplier_data: dict):
    suppliers = load_data("suppliers")
    index = next((i for i, s in enumerate(suppliers) if s["id"] == supplier_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="供應商不存在")
    
    # 保留創建時間，更新其他欄位
    supplier_data["id"] = supplier_id
    supplier_data["created_at"] = suppliers[index].get("created_at", datetime.now().isoformat())
    supplier_data["updated_at"] = datetime.now().isoformat()
    
    suppliers[index] = supplier_data
    save_data("suppliers", suppliers)
    
    return {"message": "供應商更新成功", "id": supplier_id}

@app.delete("/api/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str):
    suppliers = load_data("suppliers")
    supplier_ids = [s["id"] for s in suppliers]
    
    if supplier_id not in supplier_ids:
        raise HTTPException(status_code=404, detail="供應商不存在")
    
    # 檢查是否有相關的進貨或付款記錄
    purchases = load_data("purchases")
    payments = load_data("payments")

    has_related_purchases = any(p["supplier_id"] == supplier_id for p in purchases)
    has_related_payments = any(pay.get("supplier_id") == supplier_id for pay in payments)

    if has_related_purchases or has_related_payments:
        raise HTTPException(
            status_code=400,
            detail="無法刪除該供應商，因為有相關的進貨或付款記錄"
        )
    
    # 刪除供應商
    updated_suppliers = [s for s in suppliers if s["id"] != supplier_id]
    save_data("suppliers", updated_suppliers)

    return {"message": "供應商已刪除", "id": supplier_id}

# 付款記錄相關 API
@app.get("/api/payments")
async def get_payments():
    return load_data("payments")


@app.get("/api/payments/{payment_id}")
async def get_payment(payment_id: str):
    payments = load_data("payments")
    payment = next((p for p in payments if p["id"] == payment_id), None)
    if not payment:
        raise HTTPException(status_code=404, detail="付款紀錄不存在")
    return payment


@app.post("/api/payments")
async def create_payment(payment: dict):
    payments = load_data("payments")
    purchases = load_data("purchases")

    error = validate_required_fields(payment, ["supplier_id", "amount"])
    if error:
        raise HTTPException(status_code=400, detail=error)
    if float(payment.get("amount", 0)) <= 0:
        raise HTTPException(status_code=400, detail="付款金額必須大於0")

    payment_id = f"PM{len(payments) + 1:04d}"
    now = datetime.now().isoformat()

    payment_data = {
        "id": payment_id,
        "supplier_id": payment.get("supplier_id"),
        "amount": float(payment.get("amount", 0)),
        "payment_date": payment.get("payment_date", now),
        "notes": payment.get("notes", ""),
        "purchase_ids": payment.get("purchase_ids", []),
        "created_at": now,
    }

    payments.append(payment_data)

    for pid in payment_data["purchase_ids"]:
        purchase = next((p for p in purchases if p.get("id") == pid), None)
        if purchase:
            purchase["payment_status"] = "paid"
            purchase["paid"] = True
            purchase["paid_date"] = now

    save_data("payments", payments)
    save_data("purchases", purchases)

    return {"message": "付款記錄已建立", "id": payment_id}

# 折扣相關 API
@app.get("/api/discounts")
async def get_discounts():
    return load_data("discounts")


@app.get("/api/discounts/{discount_id}")
async def get_discount(discount_id: str):
    discounts = load_data("discounts")
    discount = next((d for d in discounts if d["id"] == discount_id), None)
    if not discount:
        raise HTTPException(status_code=404, detail="折扣不存在")
    return discount


@app.post("/api/discounts")
async def create_discount(discount: dict):
    discounts = load_data("discounts")
    discount_id = f"D{len(discounts) + 1:04d}"
    now = datetime.now().isoformat()

    if not discount.get("name"):
        raise HTTPException(status_code=400, detail="折扣名稱不能為空")
    if discount.get("value") is None:
        raise HTTPException(status_code=400, detail="折扣值必須提供")

    discount_data = {
        "id": discount_id,
        "name": discount.get("name", ""),
        "discount_type": discount.get("discount_type", "percentage"),
        "value": float(discount.get("value", 0)),
        "target_type": discount.get("target_type", "product"),
        "target_id": discount.get("target_id"),
        "valid_from": discount.get("valid_from"),
        "valid_to": discount.get("valid_to"),
        "created_at": now,
        "updated_at": now,
    }

    discounts.append(discount_data)
    save_data("discounts", discounts)
    return {"message": "折扣已建立", "id": discount_id}


@app.put("/api/discounts/{discount_id}")
async def update_discount(discount_id: str, discount: dict):
    discounts = load_data("discounts")
    index = next((i for i, d in enumerate(discounts) if d["id"] == discount_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="折扣不存在")

    discount["id"] = discount_id
    discount["created_at"] = discounts[index].get("created_at")
    discount["updated_at"] = datetime.now().isoformat()
    discounts[index] = discount
    save_data("discounts", discounts)
    return {"message": "折扣已更新", "id": discount_id}


@app.delete("/api/discounts/{discount_id}")
async def delete_discount(discount_id: str):
    discounts = load_data("discounts")
    index = next((i for i, d in enumerate(discounts) if d["id"] == discount_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="折扣不存在")
    discounts.pop(index)
    save_data("discounts", discounts)
    return {"message": "折扣已刪除", "id": discount_id}

# 報表相關 API
@app.get("/api/reports/overview")
async def get_report_overview(start_date: str = None, end_date: str = None):
    """返回簡易銷售報表數據"""
    service = ReportService(str(DATA_DIR))
    report = service.get_sales_report(start_date, end_date)
    return report


# 啟動服務
if __name__ == "__main__":
    try:
        logger.info("Starting server...")
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        raise
