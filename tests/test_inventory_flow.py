import os, sys; sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import json
from pathlib import Path
import asyncio
import main


def setup_temp_env(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DATA_DIR', Path(tmp_path))
    products = [{
        "id": "P001",
        "name": "測試商品",
        "category": "書籍",
        "purchase_price": 100,
        "sale_price": 150,
        "stock": 10,
        "supplier_id": "S001",
        "min_stock": 5,
        "unit": "本"
    }]
    suppliers = [{"id": "S001", "name": "供應商A"}]
    (Path(tmp_path) / 'products.json').write_text(json.dumps(products), encoding='utf-8')
    (Path(tmp_path) / 'suppliers.json').write_text(json.dumps(suppliers), encoding='utf-8')
    for name in ['purchases', 'sales', 'members', 'discounts', 'payments']:
        (Path(tmp_path) / f'{name}.json').write_text('[]', encoding='utf-8')


def test_purchase_increases_and_sale_decreases_stock(tmp_path, monkeypatch):
    setup_temp_env(tmp_path, monkeypatch)

    purchase_payload = {
        "supplier_id": "S001",
        "status": "received",
        "items": [{"product_id": "P001", "quantity": 5, "unit_price": 80}]
    }
    asyncio.run(main.create_purchase(purchase_payload))

    product = next(p for p in main.load_data('products') if p['id'] == 'P001')
    assert product['stock'] == 15
    assert isinstance(product['stock'], int)

    sale_payload = {"items": [{"product_id": "P001", "quantity": 2, "unit_price": 150}]}
    asyncio.run(main.create_sale(sale_payload))

    product = next(p for p in main.load_data('products') if p['id'] == 'P001')
    assert product['stock'] == 13
    assert isinstance(product['stock'], int)
