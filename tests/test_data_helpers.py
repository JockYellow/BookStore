import os, sys; sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import json
from pathlib import Path
import main


def test_load_and_save_data(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DATA_DIR', Path(tmp_path))
    data = [{'id': '1', 'name': 'test'}]
    main.save_data('items', data)
    loaded = main.load_data('items')
    assert loaded == data
