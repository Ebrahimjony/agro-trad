# Security Specification — AGRO TRAD Firestore Rules

## 1. Data Invariants
1. **Catalog Integrity**: `products` and `categories` are publicly readable without customer login, but only verified admins (`isAdmin()`) may create, update, or delete them.
2. **Customer Inquiry PII Protection**: Unauthenticated customers may `create` an inquiry in `/inquiries/{inquiryId}` with strict schema, type, size, and `request.time` timestamp validation (`sheetSyncStatus == 'pending'`), but only verified admins may `read`, `update`, or `delete` inquiries.
3. **Chat Session Isolation**: Customers cannot `list` all `/chats` documents. Each customer chat uses an unguessable session `chatId` (length >= 24). Customers can only create messages with `senderRole == 'customer'`, never impersonate `'admin'`.
4. **Immutable Creation Timestamps**: `createdAt` is locked to `request.time` on creation and cannot be modified on update.
5. **No Ghost Fields**: Every `create` enforces `hasAll` + `hasOnly`, and every `update` enforces `affectedKeys().hasOnly(...)`.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated write to `/products/prod-hacked` -> DENIED (only `isAdmin()` can write products).
2. Unauthenticated write to `/categories/cat-hacked` -> DENIED (only `isAdmin()` can write categories).
3. Unauthenticated `list` or `get` on `/inquiries` -> DENIED (PII isolation; admin-only reads).
4. Unauthenticated `update` or `delete` on `/inquiries/{id}` -> DENIED.
5. Inquiry creation with extra ghost field `{"isVerified": true}` -> DENIED (`hasOnly` rejects unknown fields).
6. Inquiry creation with `sheetSyncStatus: "synced"` (spoofing sync state) -> DENIED (`sheetSyncStatus == 'pending'` enforced).
7. Inquiry creation with forged `createdAt` timestamp != `request.time` -> DENIED.
8. Inquiry creation with 2,000-char `phoneNumber` -> DENIED (`size() <= 30`).
9. Unauthenticated `list` on `/chats` -> DENIED (`allow list: if isAdmin()`).
10. Unauthenticated chat message creation with `senderRole: "admin"` -> DENIED.
11. Product creation by admin with `images` array > 10 items or `specifications` > 30 items -> DENIED.
12. Non-admin authenticated user with unverified email (`email_verified: false`) attempting admin write -> DENIED.
