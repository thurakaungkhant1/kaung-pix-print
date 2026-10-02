# Project Architecture Rules

- Store public, admin-managed storefront conversion values in `public.ad_settings`; this keeps one protected global source of truth.
- Keep KGameShop browser traffic restricted to `study.kaungcomputer.com/api/kgameshop/*`; credentials and direct upstream calls must remain server-side.
- Show every VPS package priced server-side (USD × admin rate, or an admin override row) and buy through the `kgameshop-order` function, which creates a `products` row and calls `purchase_product_wallet`; this keeps prices server-authoritative and the VPS secret off the browser.- Send KGameShop order Telegram notices only through `_shared/kgameshop.ts` (`notifyKgOrder`), which claims `orders.telegram_notified_status` so each status is announced once; the generic insert notifier skips KGameShop products.
