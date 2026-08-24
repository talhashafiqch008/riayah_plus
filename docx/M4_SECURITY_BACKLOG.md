# M4 Security Backlog

**Source:** Karim Ashraf re-audit of `milestone2-revisions` branch (commit `ea27627`)  
**Full audit:** `GDPR_Security_ReTest_ea27627.md`  
**Added:** 2026-07-24  

These findings were identified during the M2 re-audit but are scoped to payment, billing, booking, and wallet surfaces — all of which are planned for Milestone 4. They are not regressions introduced by M2; they existed in the codebase before M2 work began.

---

## Payment Verification

**Anyone can mark a booking as paid using someone else's payment**  
The endpoint that confirms a booking payment does not verify that the person making the request actually owns the booking, or that the payment amount matches what was owed. Fix: add ownership check and amount/currency validation before updating booking status.  
→ `server/src/controllers/payments/BookingPaymentController.ts:113-132`

**Anyone can mark any invoice as paid with no actual money received**  
The "mark invoice paid" endpoint has no ownership or admin check — any logged-in user can mark any invoice as paid. This is the highest-severity billing finding.  
→ `server/src/controllers/billing/InvoiceController.ts:135-161`; `server/src/routes/invoice.routes.ts:15`

---

## Invoice Security

**Anyone can create an invoice billed to any other user**  
Invoice creation accepts a `clientId` from the request body without checking that the caller has a relationship with that client. An attacker could generate fake invoices in another user's name.  
→ `server/src/controllers/billing/InvoiceController.ts:69-94`

**Anyone can view or send any invoice (no ownership check)**  
Both the invoice detail and invoice send endpoints only require a login — no check that the caller is the invoice issuer or the billed client.  
→ `server/src/controllers/billing/InvoiceController.ts:96-133`; `server/src/routes/invoice.routes.ts:11,14`

---

## Refund & Self-Refund

**Provider self-refund creates duplicate paid records without issuing an actual refund** — ✅ Fixed (M4-1.5, 2026-08-12)  
Was: provider could create multiple "refund paid" rows without a real gateway refund.  
Now: `RefundService` marks the original payment `refunded`, issues Stripe/PayTabs/wallet refund, writes `PaymentAudit`.  
→ `server/src/services/RefundService.ts`; `ProviderBookingController.selfRefund`

**Client self-refund is not atomic — race condition allows double wallet credit** — ✅ Fixed (M4-1.5, 2026-08-12)  
Was: wallet credit and payment status update were separate.  
Now: wallet path claims `paid→refunded` + credits in one Prisma transaction. Card path uses `updateMany` claim before gateway call.  
→ `RefundService`; `BookingPaymentController.selfRefund`

**Client self-refund for Stripe payments does not create a reconciliation record** — ✅ Fixed (M4-1.5, 2026-08-12)  
Was: Stripe refund with no DB reconciliation.  
Now: `refundRef` stored on payment metadata + `PaymentAudit` row; Stripe idempotency key `booking-refund-{paymentId}`.  
→ `RefundService`; `StripeService.refundPayment`

---

## Booking Business Logic

**Booking status can be changed by anyone**  
The endpoint to update booking status (accepted, rejected, cancelled) does not enforce who is allowed to make which transition — a client can reject a booking that should only be rejectable by the provider.  
→ `server/src/routes/booking.routes.ts:94-114`

**Counter-offer price can be changed by anyone, not just the assigned provider**  
The counter-offer endpoint updates booking price and terms without verifying the caller is the provider assigned to that booking. Any logged-in user can alter prices on any booking.  
→ `server/src/routes/booking.routes.ts:160-174`

**No-show penalties can be triggered by anyone on any booking**  
The no-show endpoints have no ownership check — any user can trigger a penalty or refund against a booking they are not part of.  
→ `server/src/routes/booking.routes.ts:177-194`

---

## Payment Methods

**A user can remove another user's saved payment card**  
The payment method detach endpoint does not verify the card belongs to the caller's Stripe customer account. Anyone who knows a Stripe payment method ID can detach it from another account.  
→ `server/src/controllers/payments/PaymentMethodController.ts:52-59`

---

## Webhook Security

**PayTabs webhook accepts any POST without signature validation**  
The PayTabs payment webhook does not validate the request signature or server key. An attacker can POST a fake payment approval and mark invoices as paid.  
→ `server/src/services/QatariPaymentService.ts:82-133`; `server/src/routes/wallet.routes.ts:42-45`

---

## Wallet

**Wallet top-up accepts any currency string**  
The top-up endpoint lets users specify any currency code (e.g., a low-value currency for the same numeric amount). Fix: whitelist only supported currencies (`QAR`, `USD`) before calling Stripe.  
→ `server/src/routes/wallet.routes.ts:63-83`

**Admin wallet credit/debit has no daily limits or dual-approval**  
An admin can move unlimited funds from/to any wallet with no daily ceiling, no idempotency key to prevent duplicate requests, and no second-approver requirement for large amounts.  
→ `server/src/controllers/admin/AdvancedAdminController.ts:130-151`

**WalletService does not guard against negative credit amounts**  
The `credit` and `debit` helpers accept any number — a caller that passes a negative amount could do the opposite of what's intended. Fix: add an `amount > 0` guard inside both functions.  
→ `server/src/services/WalletService.ts`

---

## Marketplace

**Any provider can list services publicly without being verified**  
Marketplace offer creation is not gated on provider verification status. An unvetted provider account can immediately list services as active, visible to the public.  
→ `server/src/controllers/provider/MarketplaceOfferController.ts:122-152`

---

## Admin Permissions (Provider Actions)

**All provider actions share one broad permission check**  
Every action under the provider API (clinical notes, marketplace offers, self-refund, booking reports, client access) uses a single catch-all role check that covers all provider types. A cleaning or gardening account can call clinical note and financial report endpoints.  
→ `server/src/routes/provider-booking.routes.ts:17`

---

## Notes

- All findings above are pre-existing in the codebase. None were introduced by M1 or M2 work.
- Severity ratings from Karim's report: PayTabs webhook and invoice mark-paid are the highest priority within this group.
- The full audit detail (including exact severity, HIPAA mirrors, and GDPR notes) is in `GDPR_Security_ReTest_ea27627.md`.
