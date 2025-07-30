# TODO List

This document tracks outstanding tasks for the project and records progress on resolving them.

## Pending tasks

- [ ] Implement payment record API endpoints and link purchases with payments.
- [ ] Provide CRUD for discount objects and integrate with sale calculations.
- [ ] Update member statistics when sales are created.
- [ ] Improve delete operations to check for related records (e.g. suppliers with payments).
- [ ] Add data validation helpers and better error handling.
- [ ] Write initialization scripts and unit tests.
- [ ] Review `BaseService` data model mismatch (dictionary vs list) and refactor if needed.

## Completed tasks
- [x] Unified `members.json` and `sales.json` to simple array structures.
- [x] Updated `load_data` helper to handle legacy wrapped formats gracefully.

