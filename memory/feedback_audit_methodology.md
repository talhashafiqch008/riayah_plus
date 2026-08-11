---
name: feedback-audit-methodology
description: How to conduct security audits on this codebase — what past internal audits missed vs what a professional security review caught
metadata:
  type: feedback
---

Internal developer audits (M3, 25 findings) missed ~37 additional issues that the client's security assessment caught. The difference was methodology, not effort.

**Why:** Internal audits are targeted — check for patterns you already know to look for. A security assessment systematically covers every file using attack frameworks (OWASP, GDPR articles, HIPAA rules).

**What we missed pattern-by-pattern:**

1. **We checked CREATE but not READ/UPDATE/DELETE/COMPLETE on the same resource.**  
   Task CREATE had an org check (Finding 5) ✅ — but UPDATE, DELETE, STATUS, COMPLETE all used `canManageTask` which blindly returns `true` for any coordinator. Always check every mutation method on a controller, not just one.

2. **We never read certain files at all.**  
   `StaffController.ts`, `IntakeDocumentController.ts`, `RoleGuard.tsx` — zero findings because zero reads. Future audits must list every new M3 file and confirm each was reviewed.

3. **We checked auth (who can call an endpoint) but not IDOR (can they access this specific record).**  
   Shift auth was fixed (Finding 8) but the race condition on `POST /shifts/start` was missed. Always ask: "can two concurrent requests corrupt state?" for any check-then-write pattern.

4. **We didn't do a GDPR/HIPAA lens pass.**  
   AI consent gates, BAA documentation, audit log coverage, data export encryption — these require a separate pass with GDPR/HIPAA as the framework, not just "does the code look correct."

5. **We didn't do a business logic state machine pass.**  
   Care plan approval bypass (BL-02/03), intake step-skip (BL-04) — these require tracing every state transition and asking "can the happy path be skipped?"

**How to apply — Next audit checklist:**

For every controller file, run through ALL of:
- [ ] Every CRUD method has the same org/ownership check (not just CREATE)
- [ ] Every `findUnique({ where: { id: req.params.id } })` has an ownership check after it (IDOR)
- [ ] Every check-then-write pattern is inside a transaction (race condition)
- [ ] Every query param used in a Prisma `where` is Zod-validated (injection)
- [ ] Every file upload path enforces the MIME allowlist
- [ ] State machine transitions: can any step be skipped?
- [ ] Does the endpoint send PHI to a third party? If yes, is consent gated?
- [ ] Is there an AuditService.log for every sensitive action?

**Why:** Client security assessment found these gaps on the M3 commit. Our pre-delivery audit verified fixes but used a narrower lens. Next audit should use the full checklist above.
