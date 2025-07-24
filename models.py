from datetime import datetime, date
from typing import List, Dict, Optional, Literal
from dataclasses import dataclass, field, asdict
from uuid import uuid4

# 供應商資料模型
@dataclass
class Supplier:
    name: str  # 供應商名稱
    id: str = field(default_factory=lambda: str(uuid4()))
    contact: str = ""  # 聯絡方式
    payment_cycle: str = "monthly"  # 結帳週期: monthly(月結), quarterly(季結)
    note: str = ""  # 備註
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())

# 商品資料模型
@dataclass
class Product:
    name: str  # 商品名稱
    id: str = field(default_factory=lambda: str(uuid4()))
    category: str = ""  # 商品分類
    cost_price: float = 0.0  # 成本價
    selling_price: float = 0.0  # 建議售價
    stock: int = 0  # 庫存數量
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())

# 進貨記錄模型
@dataclass
class Purchase:
    supplier_id: str  # 供應商ID
    id: str = field(default_factory=lambda: str(uuid4()))
    purchase_date: str = field(default_factory=lambda: date.today().isoformat())
    total_amount: float = 0.0  # 總金額
    paid: bool = False  # 是否已付款
    paid_date: Optional[str] = None  # 付款日期
    note: str = ""  # 備註
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    # 明細項目 (不會直接儲存，而是通過PurchaseItem關聯)
    items: List[Dict] = field(default_factory=list)

# 進貨明細項目
@dataclass
class PurchaseItem:
    purchase_id: str  # 進貨單ID
    product_id: str  # 商品ID
    quantity: int  # 數量
    unit_price: float  # 單價
    total_price: float  # 總價 (quantity * unit_price)

# 會員資料模型
@dataclass
class Member:
    name: str  # 會員姓名
    id: str = field(default_factory=lambda: str(uuid4()))
    phone: str = ""  # 電話
    email: str = ""  # 電子郵件
    note: str = ""  # 備註
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())

# 銷售記錄模型
@dataclass
class Sale:
    id: str = field(default_factory=lambda: str(uuid4()))
    member_id: Optional[str] = None  # 會員ID (可選)
    sale_date: str = field(default_factory=lambda: datetime.now().isoformat())
    total_amount: float = 0.0  # 總金額
    discount_amount: float = 0.0  # 折扣金額
    final_amount: float = 0.0  # 實際收款金額 (total_amount - discount_amount)
    payment_method: str = "cash"  # 付款方式: cash, credit_card, etc.
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    # 明細項目 (不會直接儲存，而是通過SaleItem關聯)
    items: List[Dict] = field(default_factory=list)

# 銷售明細項目
@dataclass
class SaleItem:
    sale_id: str  # 銷售單ID
    product_id: str  # 商品ID
    quantity: int  # 數量
    unit_price: float  # 單價
    total_price: float  # 總價 (quantity * unit_price - discount)
    discount: float = 0.0  # 折扣金額

# 折扣活動模型
@dataclass
class Discount:
    name: str  # 活動名稱
    id: str = field(default_factory=lambda: str(uuid4()))
    discount_type: Literal["percentage", "fixed"] = "percentage"  # 折扣類型: 百分比/固定金額
    value: float  # 折扣值 (百分比: 0-100, 固定金額: 折扣金額)
    valid_from: str  # 活動開始日期
    valid_to: str  # 活動結束日期
    target_type: Literal["product", "category", "all"] = "product"  # 適用對象
    target_id: Optional[str] = None  # 對象ID (商品ID或分類名稱)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())

# 資料庫集合名稱
COLLECTIONS = {
    'suppliers': 'suppliers',
    'products': 'products',
    'purchases': 'purchases',
    'purchase_items': 'purchase_items',
    'members': 'members',
    'sales': 'sales',
    'sale_items': 'sale_items',
    'discounts': 'discounts'
}
