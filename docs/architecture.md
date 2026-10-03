# Salesbook architecture

## Data and permissions

Existing user accounts and opaque hashed sessions are retained. A Shop belongs to an owner. A worker gains access only after accepting a single-use, email-bound invitation with a random 256-bit token. Only the token hash is stored. Invitations expire after seven days. ShopMember.active is checked on reads and again inside each mutation transaction.

Owner-only mutations cover items/prices, stock adjustments, invitations, worker removal, handovers and voids. Workers can create sales and add payments to their own sales. Owner-recorded additional payments are explicitly attributed to the sale’s seller. Workers cannot choose a seller ID. Export endpoints use the same account scope as the dashboard.

## Money and stock

Amounts are integer bututs. Each sale snapshots the item name and unit price. The server calculates totals and validates paid amounts; client totals are only a preview. Unpaid or partially paid sales require a customer name. Collections have their own timestamped ledger.

All changes acquire a Shop row lock in a PostgreSQL transaction. Stock is checked under that lock before decrementing. Unique request keys make retried sales, collections and handovers idempotent. Database constraints enforce nonnegative stock, positive quantities and exact totals.

Worker-held money equals money collected on their non-void sales minus non-void owner-confirmed handovers. Handovers cannot exceed this balance. Voiding a sale restores stock and removes its collections from totals; a handover must first be corrected if the void would make the balance negative. Voids and their reasons remain visible.

## Scope

One shared stock pool per shop, whole-number item quantities, a configurable two-decimal currency (GMD, EUR, GBP, USD, NGN, CAD or AUD) and Africa/Banjul date display. Changing a shop's currency relabels existing amounts; no exchange-rate conversion or payment processing is performed. Partial returns, offline synchronization and automatic email are not supported. Invitation links are copied and shared by the owner. Prior booking data is retained in legacy tables; public booking/manage routes return not found and the legacy email job endpoint is disabled.

## Verification

Money tests cover exact arithmetic, invalid values, overflow and date boundaries. Browser tests cover owner registration and login retry, invitations and worker registration, protected owner mutations, partial-payment sales, later collections, handover balances, concurrent sales against the last stock item, exports, responsive layouts and immediate access removal.
