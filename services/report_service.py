from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
from .base_service import BaseService
from .product_service import ProductService
from .sale_service import SaleService
from .purchase_service import PurchaseService
from .supplier_service import SupplierService
from .member_service import MemberService

class ReportService:
    """
    報表服務類，處理各種業務報表生成
    """
    def __init__(self, data_dir: str = 'data'):
        self.product_service = ProductService(data_dir)
        self.sale_service = SaleService(data_dir)
        self.purchase_service = PurchaseService(data_dir)
        self.supplier_service = SupplierService(data_dir)
        self.member_service = MemberService(data_dir)
    
    def get_sales_report(self, start_date: str = None, end_date: str = None) -> Dict:
        """
        獲取銷售報表
        :param start_date: 開始日期 (YYYY-MM-DD)
        :param end_date: 結束日期 (YYYY-MM-DD)
        :return: 銷售報表數據
        """
        # 設置默認日期範圍（最近30天）
        if not end_date:
            end_date = datetime.now().strftime('%Y-%m-%d')
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        
        # 獲取銷售記錄
        sales = []
        all_sales = self.sale_service.get_all()
        for sale in all_sales:
            sale_date = sale.get('sale_date', '').split('T')[0]  # 只取日期部分
            if start_date <= sale_date <= end_date:
                sales.append(sale)
        
        # 計算銷售統計
        total_sales = len(sales)
        total_amount = sum(sale.get('final_amount', 0) for sale in sales)
        total_discount = sum(sale.get('discount_amount', 0) for sale in sales)
        
        # 按日期分組
        daily_sales = defaultdict(float)
        for sale in sales:
            sale_date = sale.get('sale_date', '').split('T')[0]
            daily_sales[sale_date] += sale.get('final_amount', 0)
        
        # 按商品分類統計
        category_sales = defaultdict(float)
        product_sales = defaultdict(float)
        
        for sale in sales:
            sale_id = sale['id']
            sale_details = self.sale_service.get_sale_details(sale_id)
            
            for item in sale_details.get('items', []):
                product_id = item.get('product_id')
                product = self.product_service.get(product_id)
                if product:
                    category = product.get('category', '未分類')
                    category_sales[category] += item.get('total_price', 0)
                    product_sales[product.get('name')] += item.get('total_price', 0)
        
        # 獲取最暢銷商品（按銷售額）
        top_products = sorted(
            [{'name': k, 'amount': v} for k, v in product_sales.items()],
            key=lambda x: x['amount'],
            reverse=True
        )[:10]  # 取前10名
        
        return {
            'report_period': {'start_date': start_date, 'end_date': end_date},
            'summary': {
                'total_sales': total_sales,
                'total_amount': total_amount,
                'total_discount': total_discount,
                'average_order_value': total_amount / total_sales if total_sales > 0 else 0
            },
            'daily_sales': dict(daily_sales),
            'category_sales': dict(category_sales),
            'top_products': top_products
        }
    
    def get_inventory_report(self) -> Dict:
        """
        獲取庫存報表
        :return: 庫存報表數據
        """
        products = self.product_service.get_all()
        
        # 計算庫存總值
        total_value = sum(p.get('stock', 0) * p.get('cost_price', 0) for p in products)
        
        # 按分類統計
        category_inventory = defaultdict(lambda: {'count': 0, 'value': 0.0})
        for product in products:
            category = product.get('category', '未分類')
            category_inventory[category]['count'] += 1
            category_inventory[category]['value'] += product.get('stock', 0) * product.get('cost_price', 0)
        
        # 低庫存商品
        low_stock_products = [
            p for p in products 
            if p.get('stock', 0) <= p.get('reorder_level', 5)  # 默認再訂購點為5
        ]
        
        return {
            'total_products': len(products),
            'total_inventory_value': total_value,
            'category_summary': dict(category_inventory),
            'low_stock_products': [
                {
                    'id': p['id'],
                    'name': p.get('name'),
                    'stock': p.get('stock', 0),
                    'reorder_level': p.get('reorder_level', 5)
                }
                for p in low_stock_products
            ]
        }
    
    def get_supplier_report(self) -> Dict:
        """
        獲取供應商報表
        :return: 供應商報表數據
        """
        suppliers = self.supplier_service.get_all()
        report = []
        
        for supplier in suppliers:
            supplier_id = supplier['id']
            supplier_name = supplier.get('name', '未知供應商')
            
            # 獲取未付款的進貨單
            unpaid_purchases = self.supplier_service.get_supplier_purchases(supplier_id, include_paid=False)
            total_unpaid = sum(p.get('total_amount', 0) for p in unpaid_purchases)
            
            # 獲取最近一筆進貨
            last_purchase_date = max(
                (p.get('purchase_date', '') for p in unpaid_purchases),
                default='無進貨記錄'
            )
            
            report.append({
                'supplier_id': supplier_id,
                'supplier_name': supplier_name,
                'contact': supplier.get('contact', ''),
                'payment_cycle': supplier.get('payment_cycle', 'monthly'),
                'total_unpaid': total_unpaid,
                'unpaid_orders': len(unpaid_purchases),
                'last_purchase_date': last_purchase_date
            })
        
        # 按未付款金額降序排序
        report.sort(key=lambda x: x['total_unpaid'], reverse=True)
        
        return {
            'total_suppliers': len(suppliers),
            'total_unpaid_amount': sum(item['total_unpaid'] for item in report),
            'suppliers': report
        }
    
    def get_member_analysis_report(self) -> Dict:
        """
        獲取會員分析報表
        :return: 會員分析報表數據
        """
        members = self.member_service.get_all()
        
        # 會員增長趨勢（按月）
        member_growth = defaultdict(int)
        for member in members:
            if 'created_at' in member:
                month = member['created_at'][:7]  # YYYY-MM
                member_growth[month] += 1
        
        # 會員消費分層
        spending_tiers = {
            'high': 0,    # 高消費 (> 5000)
            'medium': 0,  # 中消費 (1000-5000)
            'low': 0,     # 低消費 (< 1000)
            'inactive': 0 # 從未消費
        }
        
        for member in members:
            member_id = member['id']
            purchases = self.member_service.get_member_purchase_history(member_id)
            
            if not purchases:
                spending_tiers['inactive'] += 1
                continue
                
            total_spent = sum(p.get('final_amount', 0) for p in purchases)
            
            if total_spent >= 5000:
                spending_tiers['high'] += 1
            elif total_spent >= 1000:
                spending_tiers['medium'] += 1
            else:
                spending_tiers['low'] += 1
        
        # 獲取VIP會員
        vip_members = self.member_service.get_vip_members()
        
        return {
            'total_members': len(members),
            'member_growth': dict(member_growth),
            'spending_tiers': spending_tiers,
            'vip_members_count': len(vip_members),
            'top_vip_members': vip_members[:10]  # 取消費金額最高的前10名VIP
        }
    
    def get_daily_summary(self, date: str = None) -> Dict:
        """
        獲取每日營運摘要
        :param date: 日期 (YYYY-MM-DD)，默認為今天
        :return: 每日營運摘要
        """
        if not date:
            date = datetime.now().strftime('%Y-%m-%d')
        
        # 銷售摘要
        sales_summary = self.sale_service.get_daily_sales_summary(date)
        
        # 新增會員數
        members = self.member_service.get_all()
        new_members = sum(
            1 for m in members 
            if m.get('created_at', '').startswith(date)
        )
        
        # 熱銷商品
        sales = [s for s in self.sale_service.get_all() 
                if s.get('sale_date', '').startswith(date)]
        
        product_sales = defaultdict(int)
        for sale in sales:
            sale_details = self.sale_service.get_sale_details(sale['id'])
            for item in sale_details.get('items', []):
                product_sales[item.get('product_id')] += item.get('quantity', 0)
        
        top_selling_products = [
            {
                'product_id': pid,
                'product_name': self.product_service.get(pid).get('name', '未知商品'),
                'quantity': qty
            }
            for pid, qty in sorted(
                product_sales.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:5]  # 取前5名
        ]
        
        return {
            'date': date,
            'sales_summary': sales_summary,
            'new_members': new_members,
            'top_selling_products': top_selling_products
        }
