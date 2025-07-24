from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from ..models import Supplier, Purchase, Payment
from .base_service import BaseService
from .purchase_service import PurchaseService

class SupplierService(BaseService):
    """
    供應商服務類，處理供應商相關的業務邏輯
    """
    def __init__(self, data_dir: str = 'data'):
        super().__init__('suppliers', data_dir)
        self.purchase_service = PurchaseService(data_dir)
        self.payments = BaseService('payments', data_dir)
    
    def create_supplier(self, supplier_data: Dict) -> Tuple[bool, str]:
        """創建新供應商"""
        # 驗證必填欄位
        if not supplier_data.get('name'):
            return False, "供應商名稱不能為空"
        
        # 設置默認值
        supplier_data.setdefault('payment_cycle', 'monthly')  # 默認月結
        supplier_data.setdefault('note', '')
        
        # 創建供應商
        supplier_id = self.create(supplier_data)
        return True, supplier_id
    
    def get_supplier_purchases(self, supplier_id: str, include_paid: bool = False) -> List[Dict]:
        """獲取供應商的進貨記錄"""
        purchases = self.purchase_service.get_purchases_by_supplier(supplier_id)
        if not include_paid:
            purchases = [p for p in purchases if not p.get('paid', False)]
        return purchases
    
    def get_outstanding_balance(self, supplier_id: str) -> float:
        """計算供應商未付款總額"""
        purchases = self.get_supplier_purchases(supplier_id, include_paid=False)
        return sum(p.get('total_amount', 0) for p in purchases)
    
    def create_payment(self, supplier_id: str, payment_data: Dict) -> Tuple[bool, str]:
        """創建付款記錄"""
        # 驗證必填欄位
        if not payment_data.get('amount') or float(payment_data['amount']) <= 0:
            return False, "付款金額必須大於0"
            
        if not payment_data.get('payment_date'):
            payment_data['payment_date'] = datetime.now().isoformat()
        
        # 創建付款記錄
        payment_data.update({
            'supplier_id': supplier_id,
            'created_at': datetime.now().isoformat()
        })
        
        payment_id = self.payments.create(payment_data)
        
        # 如果指定了要標記為已付款的進貨單，則更新這些進貨單的狀態
        purchase_ids = payment_data.get('purchase_ids', [])
        if purchase_ids:
            for purchase_id in purchase_ids:
                self.purchase_service.mark_as_paid(purchase_id)
        
        return True, payment_id
    
    def get_payment_history(self, supplier_id: str) -> List[Dict]:
        """獲取供應商的付款記錄"""
        return self.payments.query(supplier_id=supplier_id)
    
    def get_payment_schedule(self) -> Dict[str, List[Dict]]:
        """
        獲取付款排程
        返回按供應商分組的待付款進貨單
        """
        schedule = {}
        suppliers = self.get_all()
        
        for supplier in suppliers:
            supplier_id = supplier['id']
            unpaid_purchases = self.get_supplier_purchases(supplier_id, include_paid=False)
            
            if unpaid_purchases:
                schedule[supplier['name']] = {
                    'supplier': supplier,
                    'total_amount': sum(p['total_amount'] for p in unpaid_purchases),
                    'purchases': unpaid_purchases
                }
        
        return schedule
    
    def get_upcoming_payments(self, days_ahead: int = 30) -> Dict[str, List[Dict]]:
        """
        獲取即將到期的應付款項
        """
        today = datetime.now().date()
        end_date = today + timedelta(days=days_ahead)
        
        upcoming_payments = {}
        suppliers = self.get_all()
        
        for supplier in suppliers:
            supplier_id = supplier['id']
            purchases = self.get_supplier_purchases(supplier_id, include_paid=False)
            
            # 根據供應商的結帳週期計算應付款日期
            if supplier['payment_cycle'] == 'monthly':
                due_date = today.replace(day=1) + timedelta(days=32)  # 下個月初
                due_date = due_date.replace(day=1)
            else:  # quarterly
                quarter = (today.month - 1) // 3 + 1
                due_month = quarter * 3 + 1  # 下個季度的第一個月
                due_year = today.year
                if due_month > 12:
                    due_month = 1
                    due_year += 1
                due_date = today.replace(month=due_month, day=1, year=due_year)
            
            if today <= due_date <= end_date:
                upcoming_payments[supplier['name']] = {
                    'due_date': due_date.isoformat(),
                    'amount': sum(p['total_amount'] for p in purchases if not p.get('paid', False)),
                    'payment_cycle': supplier['payment_cycle']
                }
        
        return upcoming_payments
