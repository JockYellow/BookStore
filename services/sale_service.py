from datetime import datetime
from typing import Dict, List, Optional, Tuple
from ..models import Sale, SaleItem, Discount, Product
from .base_service import BaseService
from .product_service import ProductService

class SaleService(BaseService):
    """
    銷售服務類，處理銷售相關的業務邏輯
    """
    def __init__(self, data_dir: str = 'data'):
        super().__init__('sales', data_dir)
        self.sale_items = BaseService('sale_items', data_dir)
        self.product_service = ProductService(data_dir)
        self.discounts = BaseService('discounts', data_dir)
    
    def create_sale(self, sale_data: Dict) -> Tuple[bool, str]:
        """創建銷售記錄"""
        # 驗證必填欄位
        if not sale_data.get('items') or not isinstance(sale_data['items'], list):
            return False, "銷售項目不能為空"
        
        # 初始化銷售單數據
        sale_id = self._generate_sale_id()
        now = datetime.now().isoformat()
        
        sale = {
            'id': sale_id,
            'member_id': sale_data.get('member_id'),
            'sale_date': now,
            'total_amount': 0.0,
            'discount_amount': 0.0,
            'final_amount': 0.0,
            'payment_method': sale_data.get('payment_method', 'cash'),
            'created_at': now,
            'updated_at': now
        }
        
        # 處理銷售明細
        total_amount = 0.0
        discount_amount = 0.0
        
        for item_data in sale_data['items']:
            product_id = item_data.get('product_id')
            quantity = int(item_data.get('quantity', 1))
            
            # 獲取商品信息
            product = self.product_service.get(product_id)
            if not product:
                return False, f"找不到商品 ID: {product_id}"
            
            # 檢查庫存
            if product.get('stock', 0) < quantity:
                return False, f"商品 {product.get('name')} 庫存不足"
            
            # 計算單價和總價
            unit_price = float(item_data.get('unit_price', product.get('selling_price', 0)))
            item_total = unit_price * quantity
            
            # 應用折扣（如果有的話）
            item_discount = self._calculate_discount(product_id, quantity, unit_price)
            item_final_total = item_total - item_discount
            
            # 創建銷售明細
            sale_item = {
                'sale_id': sale_id,
                'product_id': product_id,
                'quantity': quantity,
                'unit_price': unit_price,
                'discount': item_discount,
                'total_price': item_final_total
            }
            self.sale_items.create(sale_item)
            
            # 更新總金額和折扣金額
            total_amount += item_total
            discount_amount += item_discount
            
            # 更新庫存
            self.product_service.update_stock(product_id, -quantity)
        
        # 更新銷售單總金額
        final_amount = total_amount - discount_amount
        sale.update({
            'total_amount': total_amount,
            'discount_amount': discount_amount,
            'final_amount': final_amount
        })
        
        # 保存銷售單
        self.create(sale)
        
        return True, sale_id
    
    def _calculate_discount(self, product_id: str, quantity: int, unit_price: float) -> float:
        """計算商品折扣金額"""
        # 獲取適用的折扣
        applicable_discounts = []
        
        # 1. 檢查商品特定折扣
        product_discounts = self.discounts.query(
            target_type='product',
            target_id=product_id
        )
        applicable_discounts.extend(product_discounts)
        
        # 2. 檢查分類折扣（如果有分類信息）
        product = self.product_service.get(product_id)
        if product and product.get('category'):
            category_discounts = self.discounts.query(
                target_type='category',
                target_id=product['category']
            )
            applicable_discounts.extend(category_discounts)
        
        # 3. 檢查全店折扣
        all_discounts = self.discounts.query(target_type='all')
        applicable_discounts.extend(all_discounts)
        
        # 過期過濾
        now = datetime.now()
        applicable_discounts = [
            d for d in applicable_discounts
            if (not d.get('valid_from') or datetime.fromisoformat(d['valid_from']) <= now) and \
               (not d.get('valid_to') or datetime.fromisoformat(d['valid_to']) >= now)
        ]
        
        # 如果沒有適用的折扣，返回0
        if not applicable_discounts:
            return 0.0
        
        # 使用第一個適用的折扣（可以根據優先級排序後選擇）
        discount = applicable_discounts[0]
        
        # 計算折扣金額
        if discount['discount_type'] == 'percentage':
            return (unit_price * quantity) * (discount['value'] / 100)
        else:  # fixed
            return discount['value'] * quantity
    
    def get_sale_details(self, sale_id: str) -> Optional[Dict]:
        """獲取銷售單明細"""
        sale = self.get(sale_id)
        if not sale:
            return None
        
        # 獲取銷售明細
        items = self.sale_items.query(sale_id=sale_id)
        
        # 獲取商品詳情
        for item in items:
            product = self.product_service.get(item['product_id'])
            if product:
                item['product_name'] = product.get('name', '未知商品')
        
        sale['items'] = items
        return sale
    
    def get_sales_by_member(self, member_id: str) -> List[Dict]:
        """根據會員獲取銷售記錄"""
        return self.query(member_id=member_id)
    
    def get_daily_sales_summary(self, date: str = None) -> Dict:
        """獲取指定日期的銷售摘要"""
        if not date:
            date = datetime.now().strftime('%Y-%m-%d')
        
        sales = self.query(sale_date=date)
        
        return {
            'date': date,
            'total_sales': len(sales),
            'total_amount': sum(s.get('final_amount', 0) for s in sales),
            'total_discount': sum(s.get('discount_amount', 0) for s in sales)
        }
    
    def _generate_sale_id(self) -> str:
        """生成銷售單號"""
        # 格式: S + 年月日 + 4位隨機數
        timestamp = datetime.now().strftime('%Y%m%d')
        import random
        random_num = f"{random.randint(0, 9999):04d}"
        return f"S{timestamp}{random_num}"
