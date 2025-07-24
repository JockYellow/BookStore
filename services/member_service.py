from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
# Use absolute imports for the models module.
from models import Member, Sale
from .base_service import BaseService
from .sale_service import SaleService

class MemberService(BaseService):
    """
    會員服務類，處理會員相關的業務邏輯
    """
    def __init__(self, data_dir: str = 'data'):
        super().__init__('members', data_dir)
        self.sale_service = SaleService(data_dir)
    
    def create_member(self, member_data: Dict) -> Tuple[bool, str]:
        """創建新會員"""
        # 驗證必填欄位
        if not member_data.get('name'):
            return False, "會員姓名不能為空"
        
        # 檢查電話是否已存在
        phone = member_data.get('phone')
        if phone and self.get_member_by_phone(phone):
            return False, "該電話號碼已被註冊"
        
        # 設置默認值
        member_data.setdefault('note', '')
        member_data.setdefault('created_at', datetime.now().isoformat())
        member_data.setdefault('updated_at', datetime.now().isoformat())
        
        # 創建會員
        member_id = self.create(member_data)
        return True, member_id
    
    def update_member(self, member_id: str, updates: Dict) -> bool:
        """更新會員資料"""
        # 檢查會員是否存在
        if not self.get(member_id):
            return False
        
        # 如果更新電話，檢查是否已被其他會員使用
        if 'phone' in updates:
            existing_member = self.get_member_by_phone(updates['phone'])
            if existing_member and existing_member['id'] != member_id:
                return False
        
        # 更新資料
        updates['updated_at'] = datetime.now().isoformat()
        return self.update(member_id, updates)
    
    def get_member_by_phone(self, phone: str) -> Optional[Dict]:
        """根據電話號碼查詢會員"""
        members = self.query(phone=phone)
        return members[0] if members else None
    
    def get_member_purchase_history(self, member_id: str) -> List[Dict]:
        """獲取會員的購買歷史"""
        return self.sale_service.get_sales_by_member(member_id)
    
    def get_member_summary(self, member_id: str) -> Dict:
        """獲取會員摘要信息"""
        member = self.get(member_id)
        if not member:
            return {}
        
        # 獲取購買歷史
        purchases = self.get_member_purchase_history(member_id)
        
        # 計算總消費金額
        total_spent = sum(sale.get('final_amount', 0) for sale in purchases)
        
        # 獲取最後消費日期
        last_purchase_date = None
        if purchases:
            last_purchase = max(purchases, key=lambda x: x.get('sale_date', ''))
            last_purchase_date = last_purchase.get('sale_date')
        
        return {
            'member_id': member_id,
            'name': member.get('name'),
            'phone': member.get('phone'),
            'total_purchases': len(purchases),
            'total_spent': total_spent,
            'last_purchase_date': last_purchase_date,
            'member_since': member.get('created_at')
        }
    
    def get_vip_members(self, min_purchases: int = 5, days: int = 90) -> List[Dict]:
        """
        獲取VIP會員列表
        :param min_purchases: 最低購買次數
        :param days: 最近多少天內的活躍會員
        :return: VIP會員列表
        """
        vip_members = []
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        for member in self.get_all():
            member_id = member['id']
            purchases = self.get_member_purchase_history(member_id)
            
            # 篩選指定時間內的購買記錄
            recent_purchases = [
                p for p in purchases 
                if p.get('sale_date', '') >= cutoff_date
            ]
            
            if len(recent_purchases) >= min_purchases:
                total_spent = sum(p.get('final_amount', 0) for p in recent_purchases)
                
                vip_member = {
                    'member_id': member_id,
                    'name': member.get('name'),
                    'phone': member.get('phone'),
                    'purchase_count': len(recent_purchases),
                    'total_spent': total_spent,
                    'last_purchase_date': max(p.get('sale_date') for p in recent_purchases)
                }
                vip_members.append(vip_member)
        
        # 按總消費金額降序排序
        return sorted(vip_members, key=lambda x: x['total_spent'], reverse=True)
    
    def get_inactive_members(self, days: int = 180) -> List[Dict]:
        """
        獲取不活躍會員列表
        :param days: 多少天內沒有消費視為不活躍
        :return: 不活躍會員列表
        """
        inactive_members = []
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        for member in self.get_all():
            member_id = member['id']
            purchases = self.get_member_purchase_history(member_id)
            
            if not purchases:
                # 從未消費過的會員
                member_info = {
                    'member_id': member_id,
                    'name': member.get('name'),
                    'phone': member.get('phone'),
                    'last_purchase_date': None,
                    'days_inactive': (datetime.now() - datetime.fromisoformat(member.get('created_at'))).days
                }
                inactive_members.append(member_info)
            else:
                # 篩選最近的購買記錄
                last_purchase = max(purchases, key=lambda x: x.get('sale_date', ''))
                last_purchase_date = last_purchase.get('sale_date')
                
                if last_purchase_date < cutoff_date:
                    member_info = {
                        'member_id': member_id,
                        'name': member.get('name'),
                        'phone': member.get('phone'),
                        'last_purchase_date': last_purchase_date,
                        'days_inactive': (datetime.now() - datetime.fromisoformat(last_purchase_date)).days
                    }
                    inactive_members.append(member_info)
        
        # 按不活躍天數降序排序
        return sorted(inactive_members, key=lambda x: x['days_inactive'], reverse=True)
