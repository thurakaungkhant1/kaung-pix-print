# Project Architecture Rules

- Store public, admin-managed storefront conversion values in `public.ad_settings`; this keeps one protected global source of truth.
- Keep KGameShop browser traffic restricted to `study.kaungcomputer.com/api/kgameshop/*`; credentials and direct upstream calls must remain server-side.
- Show every VPS package priced server-side (USD × admin rate, or an admin override row) and buy through the `kgameshop-order` function, which creates a `products` row and calls `purchase_product_wallet`; this keeps prices server-authoritative and the VPS secret off the browser.- Send KGameShop order Telegram notices only through `_shared/kgameshop.ts` (`notifyKgOrder`), which claims `orders.telegram_notified_status` so each status is announced once; the generic insert notifier skips KGameShop products.
- Desktop (lg+) uses the global `DesktopTopNav` and widened `MobileLayout` containers while mobile keeps `BottomNav`; auth pages are excluded so the sign-in screens stay unchanged.
- Receive provider order-status webhooks only through the `kokhant-orders-webhook` function, authenticated by a shared server-side secret and applied with conditional, final-state-safe updates; this keeps duplicate deliveries harmless.
- Define KGameShop account fields only in `KG_ACCOUNT_SCHEMAS` (`_shared/kgameshop.ts`), served via `kgameshop-order?schema=<game>`; the VPS exposes no field metadata, so this is the single source of truth for UI, validation and VPS payloads.
- Apply reseller discounts (`public.resellers`, USD per package, matched by login email) server-side in `kgameshop-order` via the service-only `purchase_kg_reseller` RPC; the browser only displays the discounted price.
- Scope reseller profile styling to the Account container and read membership from the existing RLS-protected resellers table by login email; this avoids changing other pages or using discount amounts as membership flags.
