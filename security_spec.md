# Security Specification for OOTD Advisor

## Data Invariants
- A clothing item must belong to the authenticated user (`userId` match).
- Users can only read/write their own data in the `users/{userId}` path.
- Fields like `imageUrl` and `category` are required for any wardrobe item.

## The "Dirty Dozen" Payloads (Denial Expected)
1. **Identity Theft**: User A tries to read `/users/UserB/wardrobe/item1`.
2. **Spoofing Ownership**: User A tries to create `/users/UserA/wardrobe/item1` but sets `userId` to `UserB`.
3. **Ghost Update**: User A tries to update `/users/UserA/wardrobe/item1` and add a `isVerified: true` hidden field.
4. **Invalid Category**: Creating an item with category `Spacesuit`.
5. **Orphaned Write**: Trying to create a wardrobe item without being signed in.
6. **Malicious ID**: Using a 2MB string as a document ID.
7. **Type Mismatch**: Setting `tags` to a string instead of an array.
8. **Resource Exhaustion**: Sending a 2MB string for the `color` field.
9. **Creation Time Spoof**: Manually setting `createdAt` to a future date instead of `request.time`.
10. **Path Injection**: Trying to access `users/admin/wardrobe/...`.
11. **Privacy Leak**: Querying all users' wardrobe items without a `userId` filter.
12. **Status Bypass**: (If applicable) Trying to modify a clothing item's "archived" state when not permitted.

## Test Runner (Logic Overview)
The `firestore.rules` will verify:
- `request.auth != null`
- `userId == request.auth.uid`
- `isValidClothingItem(incoming())`
- `affectedKeys().hasOnly(...)` for updates.
