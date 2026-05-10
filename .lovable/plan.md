## "As You Like" AI Suite — Add as new section to existing app

A new premium AI section with 3 features, integrated with the existing wallet/coin system. Built in phases to keep changes reviewable.

### Scope decisions (from your answers)
- Add as new section inside the existing app (not a separate app)
- AI: Lovable AI Gateway (`google/gemini-2.5-flash-image` for images, `google/gemini-3-flash-preview` for text)
- Daily limit: use existing wallet/coin balance instead of free 5/day. Each AI photo = X coins; each invitation = 1000 MMK from wallet; each gift link = X coins.

### New routes
- `/ai` — "As You Like" hub page (Hero + 3 feature cards)
- `/ai/photo` — AI Photo Generator (upload + prompt → image)
- `/ai/invitation` — Wedding Invitation generator (text → multiple styled previews, locked download until paid)
- `/ai/gift` — Gift Link Creator (image/text → 10 styles → shareable `/g/:slug` page)
- `/g/:slug` — Public animated gift recipient page
- `/admin/ai` — Admin: invitation purchases approval, gift links list, daily AI usage stats

Add a 5th nav entry "AI" to the bottom nav OR put a prominent CTA card on `/` Home that links to `/ai`. (Default: put it on Home — keeps current 4-tab nav clean.)

### Database (new tables)
- `ai_photo_generations` — id, user_id, prompt, source_image_url, result_image_url, cost_coins, created_at
- `ai_invitations` — id, user_id, text, theme, style_json, preview_urls[], paid (bool), price_mmk, status (pending|paid|approved), created_at
- `ai_gift_links` — id, user_id, slug (unique), payload (jsonb: text/image_url/style), views, created_at, expires_at
- `ai_usage_settings` — singleton row: photo_cost_coins, gift_cost_coins, invitation_price_mmk, daily_photo_limit

All with RLS: users see/insert own rows; admins see all; gift links public-read by slug.

### Edge functions
- `ai-generate-photo` — auth, deduct coins, call Gemini image, store URL in storage, insert row
- `ai-generate-invitation` — auth, call Gemini text + image to render N styles, insert pending row
- `ai-generate-gift-styles` — auth, generate 10 style variants (HTML/JSON templates), return previews
- `ai-create-gift-link` — auth, deduct coins, persist final selected style + slug

### Storage buckets
- `ai-photos` (public) — generated AI images
- `ai-uploads` (private) — user uploaded source photos
- `ai-invitations` (public) — preview renders

### Design system
- New gradient tokens: purple → pink → blue
- Glassmorphism cards (`bg-white/10 backdrop-blur-xl border-white/20`)
- Animated blob background component
- Reuses existing `AnimatedPage`, `framer-motion`, semantic HSL tokens

### Phase plan
**Phase 1 (this turn):** DB migration + storage buckets + `/ai` hub page + animated background + 3 feature cards. Routes wired with placeholder pages. Home gets an "✨ AI Suite" entry card.

**Phase 2:** AI Photo Generator end-to-end (edge function + UI + coin deduction + gallery + download).

**Phase 3:** Wedding Invitation generator (text form + theme picker + multi-style preview + locked-download paywall + admin approval).

**Phase 4:** Gift Link Creator + public `/g/:slug` animated recipient page + 10 style templates.

**Phase 5:** `/admin/ai` panel (purchases, gift links, daily usage analytics).

### Technical notes (for reviewers)
- All AI calls go through edge functions (LOVABLE_API_KEY stays server-side)
- Coin deduction is atomic inside the edge function before generation
- Gift link slugs are 10-char nanoid; collision-checked
- Invitation paywall: "Buy credits" deducts from wallet on confirm, admin manually approves bigger packages
- Mobile-first: every page works at 390px viewport
- Code-split with `React.lazy()` per existing memory rule

---

Approve this and I'll start with Phase 1 (database + hub page + nav entry). Each later phase is one focused turn.