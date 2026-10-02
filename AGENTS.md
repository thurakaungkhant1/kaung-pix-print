# Project Architecture Rules

- Store public, admin-managed storefront conversion values in `public.ad_settings`; this keeps one protected global source of truth.
- Keep KGameShop browser traffic restricted to `study.kaungcomputer.com/api/kgameshop/*`; credentials and direct upstream calls must remain server-side.