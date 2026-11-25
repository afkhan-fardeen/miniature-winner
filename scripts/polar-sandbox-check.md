# Polar sandbox checks (do before going live)

1. Create sandbox products, seat-based, GBP, one per price mode and term:
   launch/standard x 1, 3, 6, 12 months (`recurring_interval=month`, `recurring_interval_count` = 1/3/6/12).
   If a 3 or 6 month count is rejected, fall back to one-time orders plus our own renewal reminders.
2. Put product IDs in `.env.local` as `POLAR_PRODUCT_LAUNCH_3M` etc.
3. Buy 3 seats in sandbox. Confirm: one order, one invoice, `seats = 3`.
4. PATCH seats to 4 with `proration_behavior: invoice`. Confirm: prorated charge, same renewal date.
5. Point a webhook at `/api/webhooks/polar` and confirm a real delivery verifies (secret encoding).
6. Confirm seat-based pricing is enabled for the account.
