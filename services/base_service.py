from typing import Dict, List, Type, TypeVar, Any, Optional
from datetime import datetime
import json
import os
from pathlib import Path
"""Base service for CRUD operations backed by JSON files."""

# Importing from the root-level ``models`` module using an absolute import.
# Relative imports like ``from ..models`` fail when the application is
# executed as a script because there is no package above ``services``. Using
# absolute imports avoids this issue.
from models import COLLECTIONS

T = TypeVar('T')

class BaseService:
    """
    基礎服務類，提供基本的 CRUD 操作
    使用本地 JSON 文件模擬 Firestore 集合
    """
    def __init__(self, collection_name: str, data_dir: str = 'data'):
        self.collection_name = collection_name
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.file_path = self.data_dir / f"{collection_name}.json"
        self._data: Dict[str, Dict] = self._load_data()
    
    def _load_data(self) -> Dict[str, Dict]:
        """從 JSON 文件載入數據"""
        if self.file_path.exists():
            with open(self.file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    # convert list to dict keyed by id
                    return {item.get('id', str(idx)): item for idx, item in enumerate(data)}
                if isinstance(data, dict):
                    # handle wrapped array {"items": [...]}
                    if len(data) == 1 and isinstance(next(iter(data.values())), list):
                        arr = next(iter(data.values()))
                        return {item.get('id', str(idx)): item for idx, item in enumerate(arr)}
                    return data
        return {}
    
    def _save_data(self):
        """保存數據到 JSON 文件"""
        with open(self.file_path, 'w', encoding='utf-8') as f:
            json.dump(list(self._data.values()), f, ensure_ascii=False, indent=2)
    
    def create(self, item: Dict) -> str:
        """創建新項目"""
        item_id = item.get('id')
        if not item_id:
            from uuid import uuid4
            item_id = str(uuid4())
            item['id'] = item_id
        
        # 添加時間戳
        now = datetime.now().isoformat()
        if 'created_at' not in item:
            item['created_at'] = now
        item['updated_at'] = now
        
        self._data[item_id] = item
        self._save_data()
        return item_id
    
    def get(self, item_id: str) -> Optional[Dict]:
        """根據 ID 獲取項目"""
        return self._data.get(item_id)
    
    def get_all(self) -> List[Dict]:
        """獲取所有項目"""
        return list(self._data.values())
    
    def update(self, item_id: str, updates: Dict) -> bool:
        """更新項目"""
        if item_id not in self._data:
            return False
        
        # 保留原始創建時間
        if 'created_at' not in updates:
            updates['created_at'] = self._data[item_id].get('created_at')
        
        # 更新時間戳
        updates['updated_at'] = datetime.now().isoformat()
        
        # 更新數據
        self._data[item_id].update(updates)
        self._save_data()
        return True
    
    def delete(self, item_id: str) -> bool:
        """刪除項目"""
        if item_id in self._data:
            del self._data[item_id]
            self._save_data()
            return True
        return False
    
    def query(self, **filters) -> List[Dict]:
        """查詢項目"""
        results = []
        for item in self._data.values():
            match = True
            for key, value in filters.items():
                if item.get(key) != value:
                    match = False
                    break
            if match:
                results.append(item)
        return results
