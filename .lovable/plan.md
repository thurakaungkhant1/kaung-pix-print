# AI App Upgrade Plan (existing project ထဲမှာ ဖြည့်စွက်)

လက်ရှိ project မှာ ရှိပြီးသား feature တွေ — auth, profiles, `ai_photo_generations`, `ai_usage_settings`, watermark, MLBB name checker (`verify-mlbb-player`), `premium_memberships`, `premium_plans`, manual deposits, admin panel — အပေါ်မှာ တင်ပြီး အောက်က phase တွေအတိုင်း ဖြည့်မယ်။ Phase တစ်ခုပြီးတိုင်း approve လုပ်ပြီးမှ နောက်တစ်ခုကို ဆက်မယ်။

---

## Phase 1 — Free / Premium Credit System (foundation)

**Database (migration):**
- `profiles` ထဲ ထပ်ထည့်: `daily_ai_credits int default 5`, `premium_ai_credits int default 0`, `total_ai_generations int default 0`, `daily_credits_reset_date date`
- `ai_usage_settings` ထဲ ထပ်ထည့်: `free_daily_limit int default 5`, `premium_daily_limit int default 100`, `ai_paused boolean default false`, `free_styles text[]`, `premium_styles text[]`
- New table `ai_styles` (id, key, label, tier `free|premium`, prompt_suffix, is_active, display_order)
- Premium check helper: `is_premium_active(uuid)` SQL function reading `premium_memberships`

**Edge function `ai-generate-photo` updates:**
- Reset `daily_ai_credits` when `daily_credits_reset_date != today`
- Block when `ai_paused = true` → return 503
- Premium → consume `premium_ai_credits` (skip if `premium_daily_limit` not yet hit per day); Free → consume `daily_ai_credits`
- Reject styles user can't access (free user picking premium style)
- Increment `total_ai_generations`
- Skip watermark for premium users

**Frontend (`AIPhoto.tsx`):**
- Show two counters: "Free credits today" + "Premium credits"
- Premium upgrade modal when free user hits 0 → link `/premium`
- Style picker: premium styles show 👑 badge, click → upgrade modal for free users

---

## Phase 2 — Premium Styles +