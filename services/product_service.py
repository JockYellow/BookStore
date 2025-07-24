from typing import List, Dict, Optional
from ..models import Product
from .base_service import BaseService

class ProductService(BaseService):
    """
    商品服務類，處理商品相關的業務邏輯
    """
    def __init__(self, data_dir: str = 'data'):
        super().__init__('products', data_dir)
    
    def create_product(self, product_data: Dict) -> str:
        """創建新商品"""
        # 驗證必填欄位
        if not product_data.get('name'):
            raise ValueError("商品名稱不能為空")
        
        # 設置默認值
        product_data.setdefault('stock', 0)
        product_data.setdefault('cost_price', 0.0)
        product_data.setdefault('selling_price', 0.0)
        
        # 創建商品
        return self.create(product_data)
    
    def update_product(self, product_id: str, updates: Dict) -> bool:
        """更新商品信息"""
        # 檢查商品是否存在
        if not self.get(product_id):
            return False
            
        # 過濾掉不允許更新的欄位
        updates.pop('id', None)
        updates.pop('created_at', None)
        
        return self.update(product_id, updates)
    
    def get_products_by_category(self, category: str) -> List[Dict]:
        """根據分類獲取商品列表"""
        return self.query(category=category)
    
    def update_stock(self, product_id: str, quantity: int) -> bool:
        """更新庫存數量"""
        product = self.get(product_id)
        if not product:
            return False
            
        new_stock = product.get('stock', 0) + quantity
        if new_stock < 0:
            raise ValueError("庫存數量不能為負")
            
        return self.update(product_id, {'stock': new_stock})
    
    def get_low_stock_products(self, threshold: int = 5) -> List[Dict]:
        """獲取低於指定庫存閾值的商品"""
        return [p for p in self.get_all() if p.get('stock', 0) < threshold]
