## Overview
၄ ပိုင်း ခွဲပြီး လုပ်ပါမယ်။ ရှိပြီးသား `/messages` chat နဲ့ `friend_requests` system တွေကို reuse လုပ်ပါမယ်။

---

## 1. Account → dedicated Chat page (text + emoji only)

**New route:** `/account/chat` (ProtectedRoute)

**New file:** `src/pages/AccountChat.tsx`
- Friends list ကို ဘယ်ဘက် / အပေါ်ဆုံးမှာ ပြ (Messages page ရဲ့ friends tab logic reuse — `friend_requests` accepted rows)
- Friend တစ်ယောက်ချင်းစီရဲ့ ဘေးမှာ **coin balance** (points + game_points) badge ပြ — `public_profiles` view ကနေ points/game_points ဆွဲထုတ်
- Friend row နှိပ်ရင် conversation view ဖွင့် (getOrCreateConversation reuse)
- Chat composer — **text + emoji picker only** (emoji-picker-react သုံး)၊ image/voice/attachment button တွေ **ဖျောက်ထား**
- `messages` table ကို INSERT တဲ့အခါ `content` text only, `image_url`/`voice_url` fields null
- Realtime subscribe — new message → append; delete/edit — existing pattern reuse

**Account page changes:** "Chat" menu row ကို `/account/chat` navigate

**Note:** BottomNav ရဲ့ `/messages` route ကတော့ ဒီအတိုင်း ရှိထားပါမယ် (existing chat)၊ ဒါပေမဲ့ Account က entry point သီးသန့် ဖြစ်ပါမယ်။

---

## 2. Coin badge in friends list (Messages page ပါ)

- `Messages.tsx` ရဲ့ friends tab နဲ့ conversation rows မှာ friend တစ်ယောက်ချင်းစီ့ **coin balance** ကို ဘေးမှာ ပြ
- `public_profiles` view မှာ `points`, `game_points` column expose ဖြစ်ဖို့ လိုတယ် → migration တစ်ခု: `public_profiles` view ကို drop-and-recreate လုပ်ပြီး `total_coins` (points+game_points) ကို ထည့်
- Friends list load လုပ်တဲ့အခါ ဒီ field ကို select — Coin icon + number ပြ

---

## 3. Top referrers admin bonus page

**Database migration:**
- SQL function `get_top_referrers(limit_count int)` — `profiles.referred_by` ကို group by ပြီး count, sorted DESC
- Admin-only (has_role check)

**New route:** `/admin/top-referrers`
- New file: `src/pages/admin/TopReferrersManage.tsx`
- Leaderboard table: rank, user (avatar+name), referral count, current coins, "Give Bonus" button
- Bonus dialog: amount input + note → `profiles.points` increment + `point_transactions` INSERT (`transaction_type: 'admin_bonus'`) via edge function `award-points` (already exists) or new `admin-grant-bonus` function using service role
- Admin panel menu link ထည့်

---

## 4. Shop / Home restructure

**Shop page (`/game`):**
- Mobile services (Phone Top-up, Data Plans, Voice Plans) tab/section ကို ဖျောက်
- Tab UI ကို ဖျက်ပြီး **Games only** (MLBB + PUBG) + **Order History (game orders only)** နှစ်ခုစီ ပြ
- Order history filter: `order_type = 'game'` only
- Mobile-related state, filters, `MOBILE_CATEGORIES` constants တွေကို remove

**Home page (`/`):**
- Mobile Services section အသစ်ထည့် — Phone Top-up / Data Plans / Voice Plans quick-access cards
- Card နှိပ်ရင် `/category/Phone Top-up` စသည်ကို navigate (existing CategoryProducts route reuse)
- Operator quick chips (MPT/Ooredoo/Mytel/Atom) ထည့်ရင် ပိုကောင်း

---

## Technical Details

**Files created:**
- `src/pages/AccountChat.tsx` — new dedicated chat page
- `src/pages/admin/TopReferrersManage.tsx` — new admin page
- `src/components/EmojiComposer.tsx` — text+emoji only composer (shared)
- 1 migration file:
  - Recreate `public_profiles` view with `points`, `game_points` exposed
  - `get_top_referrers()` SQL function (admin-only, security definer)
  - `admin_grant_coin_bonus(target uuid, amount int, note text)` SQL function

**Files edited:**
- `src/App.tsx` — add 2 routes
- `src/pages/Account.tsx` — Chat menu → `/account/chat`
- `src/pages/Messages.tsx` — show coin next to each friend
- `src/pages/GamePage.tsx` — remove mobile sections; games + game-order-history only
- `src/pages/Home.tsx` — add Mobile Services section
- `src/pages/admin/AdminDashboard.tsx` — link to Top Referrers page

**Dependencies:**
- `emoji-picker-react` (bun add)

**No breaking changes** to existing `/messages`, `friend_requests`, or order system — all additive/removals within Shop page.

---

## Out of scope
- Push notifications for new chat (already exists via `MessageNotifier`)
- Physical product shop redesign
- Smile.one auto-topup integration (previous request)

Approve လုပ်ရင် implement စလုပ်ပါမယ်။
