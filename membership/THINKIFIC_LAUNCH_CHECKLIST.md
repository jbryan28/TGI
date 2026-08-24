# TGI Membership — Thinkific Launch Acceptance Checklist

Enrollment must remain closed until every required item below is verified. A page that accepts payment before delivery, billing, cancellation, and access behavior are proven is not launch-ready.

## 1. Product identity

- [ ] Paid product is named **Trader Growth Institute Membership**.
- [ ] Free **TGI Intelligence Briefing** is not presented as the paid product.
- [ ] Every June 28, 2026 availability claim is removed.
- [ ] The checkout, receipt, welcome email, course dashboard, and cancellation flow use the same product name.

## 2. Curriculum and delivery

- [ ] All 46 Thinkific items in `THINKIFIC_PRODUCT_SPEC.md` exist and are publishable.
- [ ] The Day 0–63 enrollment-based release schedule is configured and tested with a student account.
- [ ] Every download, assessment, 90% checkpoint, capstone submission, and final examination works.
- [ ] Two Weekly Capital Briefs and the first four weeks of Desk Status templates are prepared before the first paid enrollment.
- [ ] The Capital Operator Room and Operator Clinic delivery locations are visible to an active member.

## 3. Offer and billing

- [ ] Monthly price is $99 with no trial, setup fee, coupon, lifetime plan, or course-only plan.
- [ ] The $990 annual option remains disabled until the delivery proof gate is satisfied.
- [ ] Checkout states the amount, billing frequency, automatic renewal, cancellation rule, first-payment refund window, and tax treatment immediately before purchase.
- [ ] Terms of Use, Privacy Policy, and Risk Disclosure are linked from checkout or the pre-purchase path.
- [ ] Legal language has received appropriate professional review before broad paid acquisition.

## 4. Access behavior

- [ ] Successful payment grants Core, Desk, Resource Vault, Room, and archive access.
- [ ] Cancellation preserves access only through the paid billing period.
- [ ] Failed renewal removes access on the renewal date.
- [ ] Refund processing removes access and records the transaction correctly.
- [ ] Expired members cannot reach protected lessons, recordings, community, or archives.

## 5. End-to-end transaction tests

Run every test with a new email address and preserve screenshots or recordings as launch evidence.

| Test | Expected result | Evidence |
| --- | --- | --- |
| Monthly purchase | Correct amount charged once; access granted | [ ] |
| Receipt and welcome | Correct product name, price, and login link | [ ] |
| Drip schedule | Day 0 content available; later phases locked correctly | [ ] |
| First-payment refund | Refund succeeds inside seven days; access removed | [ ] |
| Cancellation | Renewal stops; access remains through paid term | [ ] |
| Failed renewal | Dunning behavior is understood; access ends as specified | [ ] |
| Mobile checkout | Purchase and login complete without layout or validation failure | [ ] |
| Existing-member login | Returning member reaches the correct dashboard | [ ] |

## 6. Website activation

- [ ] Copy the final Thinkific checkout URL only after the transaction tests pass.
- [ ] In `membership/config.js`, set `checkoutUrl` to that final HTTPS URL.
- [ ] Set `enrollmentOpen` to `true` in the same reviewed commit.
- [ ] Confirm `/membership/` displays **Open** and the enrollment CTA reaches the exact tested checkout.
- [ ] Re-run static checks and the complete Chromium, Firefox, and WebKit workflow.
- [ ] Merge and publish only after the final preview is approved.

## Release decision

- [ ] **GO:** Every required item passed and evidence is retained.
- [ ] **NO-GO:** Any required item is missing, inconsistent, or untested.
