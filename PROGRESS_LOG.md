# Development Log

This log captures progress on resolving data issues and implementing features.

## 2025-07-30
- Normalized `members.json` and `sales.json` to use array structures only.
- Enhanced `load_data` in `main.py` to support legacy wrapped formats.
- Created `TODO.md` with pending tasks for future improvements.

## 2025-07-31
- Added `validate_required_fields` helper and integrated basic validation into API endpoints.
- Refactored `BaseService` to transparently handle list-based JSON files.
- Created `init_data.py` script for initializing empty data files.
- Added unit tests for validation and service helpers.


