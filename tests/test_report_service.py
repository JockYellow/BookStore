from pathlib import Path

from services.report_service import ReportService

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def test_product_sales_summary():
    service = ReportService(data_dir=str(DATA_DIR))
    summary = service.get_product_sales_summary("2025-07-01", "2025-07-31")
    assert any(
        item["product_id"] == "P001" and item["quantity"] == 1 and item["amount"] == 300
        for item in summary
    )
    assert sum(item["quantity"] for item in summary) == 4


def test_supplier_purchase_summary():
    service = ReportService(data_dir=str(DATA_DIR))
    summary = service.get_supplier_purchase_summary("2025-07-01", "2025-07-31")
    s1 = next(item for item in summary if item["supplier_id"] == "S001")
    assert s1["total_amount"] == 18390.0
    assert s1["purchase_count"] == 2


def test_transactions_and_purchases():
    service = ReportService(data_dir=str(DATA_DIR))
    tx = service.get_sales_transactions("2025-07-01", "2025-07-31")
    assert len(tx) == 2
    assert all(len(t.get("items", [])) > 0 for t in tx)
    purchases = service.get_purchase_records("2025-07-01", "2025-07-31")
    assert len(purchases) == 7
    assert all(len(p.get("items", [])) > 0 for p in purchases)


def test_export_to_excel(tmp_path):
    service = ReportService(data_dir=str(DATA_DIR))
    data = service.get_product_sales_summary("2025-07-01", "2025-07-31")
    file_path = tmp_path / "out.xlsx"
    service.export_to_excel(data, str(file_path))
    assert file_path.exists()

