import os, sys; sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import json
from pathlib import Path
from services.base_service import BaseService


def test_base_service_create_and_get(tmp_path):
    service = BaseService('items', data_dir=str(tmp_path))
    new_id = service.create({'name': 'test'})
    assert new_id in service._data
    # file should contain list with item
    file_path = Path(tmp_path) / 'items.json'
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    assert isinstance(data, list)
    assert any(item['id'] == new_id for item in data)
