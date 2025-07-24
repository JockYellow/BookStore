from datetime import datetime
from typing import Dict, List, Optional, Tuple
# Absolute import ensures compatibility when executed outside of a package
# context.
from models import Purchase, PurchaseItem, Product
from .base_service import BaseService
from .product_service import ProductService

class PurchaseService(BaseService):
    """
    進貨服務類，處理進貨相關的業務邏輯
    """
    def __init__(self, data_dir: str = 'data'):
        super().__init__('purchases', data_dir)
        self.purchase_items = BaseService('purchase_items', data_dir)
        self.product_service = ProductService(data_dir)
    
    def create_purchase(self, purchase_data: Dict) -> Tuple[bool, str]:
        """創建進貨單"""
        # 驗證必填欄位
        if not purchase_data.get('supplier_id'):
            return False, "供應商不能為空"
            
        if not purchase_data.get('items') or not isinstance(purchase_data['items'], list):
            return False, "進貨項目不能為空"
        
        # 計算總金額
        total_amount = 0.0
        items = purchase_data.pop('items', [])
        
        # 創建進貨單
        purchase_data['total_amount'] = total_amount
        purchase_data['paid'] = purchase_data.get('paid', False)
        purchase_id = self.create(purchase_data)
        
        # 處理進貨明細
        for item in items:
            if not item.get('product_id') or not item.get('quantity') or not item.get('unit_price'):
                self.delete(purchase_id)  # 刪除已創建的進貨單
                return False, "進貨項目資訊不完整"
                
            quantity = int(item['quantity'])
            unit_price = float(item['unit_price'])
            item_total = quantity * unit_price
            total_amount += item_total
            
            # 創建進貨明細
            purchase_item = {
                'purchase_id': purchase_id,
                'product_id': item['product_id'],
                'quantity': quantity,
                'unit_price': unit_price,
                'total_price': item_total
            }
            self.purchase_items.create(purchase_item)
            
            # 更新商品庫存
            self.product_service.update_stock(item['product_id'], quantity)
        
        # 更新進貨單總金額
        self.update(purchase_id, {'total_amount': total_amount})
        
        return True, purchase_id
    
    def get_purchase_details(self, purchase_id: str) -> Optional[Dict]:
        """獲取進貨單明細"""
        purchase = self.get(purchase_id)
        if not purchase:
            return None
            
        # 獲取進貨明細
        items = self.purchase_items.query(purchase_id=purchase_id)
        
        # 獲取商品詳情
        product_service = ProductService()
        for item in items:
            product = product_service.get(item['product_id'])
            if product:
                item['product_name'] = product.get('name', '未知商品')
        
        purchase['items'] = items
        return purchase
    
    def get_purchases_by_supplier(self, supplier_id: str) -> List[Dict]:
        """根據供應商獲取進貨單列表"""
        return self.query(supplier_id=supplier_id)
    
    def mark_as_paid(self, purchase_id: str, paid: bool = True) -> bool:
        """標記進貨單付款狀態"""
        updates = {
            'paid': paid,
            'paid_date': datetime.now().isoformat() if paid else None
        }
        return self.update(purchase_id, updates)
