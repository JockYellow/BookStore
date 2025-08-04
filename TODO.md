# TODO List

This document tracks outstanding tasks for the project and records progress on resolving them.

## Pending tasks


- [ ] Create unit tests.


## Completed tasks

- [x] Unified `members.json` and `sales.json` to simple array structures.
- [x] Updated `load_data` helper to handle legacy wrapped formats gracefully.
- [x] Implement payment record API endpoints and link purchases with payments.
- [x] Provide CRUD for discount objects and integrate with sale calculations.
- [x] Update member statistics when sales are created.
- [x] Improve delete operations to check for related records (e.g. suppliers with payments).
- [x] Added optional FastAPI/uvicorn stubs for offline testing.
- [x] Add data validation helpers and better error handling.
- [x] Write initialization script.
- [x] Review `BaseService` data model mismatch (dictionary vs list) and refactor if needed.
- [x] `templates/sales.html`: Added missing elements required by `sales.js`.
- [x] `static/js/purchases.js`: Implemented create and delete functionality.
- [x] `static/js/reports.js`: Fetched sales and category data from API and redrew charts.
- [x] `static/js/members.js`: Confirmed member create/edit/delete actions are API-connected.
- [x] `static/js/suppliers.js`: Confirmed supplier management actions are API-connected.
- [x] `static/js/products.js`: Implemented product image upload and barcode scanning.