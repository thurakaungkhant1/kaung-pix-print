# VPS Game Package Orders

## Goal
Admin က VPS game/package ကိုရွေး၊ MMK ဈေးသတ်မှတ်ပြီး store မှာရောင်းနိုင်မည်။ User ဝယ်လျှင် wallet မှ ချက်ချင်းဖြတ်ပြီး ပုံမှန် order တစ်ခုအဖြစ် Admin Orders စာရင်းထဲ ဝင်မည်။

## Changes
- KGameShop admin page မှာ VPS games ကို ရှာပြီးရွေးနိုင်သော selector ထည့်မည်။
- ရွေးထားသော game အတွက် VPS packages ကို လိုအပ်ချိန်မှသာ ဆွဲပြီး USD ဈေးနှင့် လက်ရှိ MMK rate ဖြင့်တွက်ထားသော MMK ဈေးကို ပြမည်။
- VPS package တစ်ခုကိုရွေးကာ package နာမည်နှင့် MMK ရောင်းဈေးကို ပြင်ပြီး store package အဖြစ် သိမ်းနိုင်မည်။
- သိမ်းထားသော package များကို game အလိုက် စာရင်းပြ၍ ပြင်/ဖျက်နိုင်မည်။ VPS game slug နှင့် product ID ကို လက်ရှိ product fields ထဲတွင် ချိတ်ထားမည်။
- Customer game page မှာ VPS live package အားလုံးအစား Admin သိမ်းထားသော packages ကိုသာ ဝယ်ယူနိုင်သော cards အဖြစ် ပြမည်။
- Package ကိုနှိပ်လျှင် Player ID / Server ID စစ်ဆေးပြီး wallet balance ကို atomic purchase flow ဖြင့် ဖြတ်ကာ pending order ဖန်တီးမည်။
- ဖန်တီးသည့် order သည် လက်ရှိ Admin Orders စာရင်း၊ game-order filter နှင့် user order history တွင် ပေါ်မည်။
- MMK rate setting ကို KGameShop admin page တွင် သီးသန့် Save ခလုတ်နှင့် ထည့်ပြီး rate ပြောင်းသည့်အခါ VPS package preview MMK ဈေးကို ချက်ချင်းပြန်တွက်မည်။

## Technical details
- Browser API calls remain restricted to `https://study.kaungcomputer.com/api/kgameshop/*`; no API key or Authorization header is added.
- Existing `products.kgameshop_*` fields identify curated VPS packages; existing `purchase_product_wallet` remains the server-authoritative wallet/order operation.
- VPS USD values are previews only. The saved MMK selling price is the amount charged, preventing later exchange-rate changes from altering an already configured product unexpectedly.
- Preserve existing layouts and unrelated pages; add loading, empty, disabled-game, and retry states.

## Verification
- Test VPS game search, lazy package loading, USD→MMK recalculation, save/edit/delete package, and storefront display.
- Complete one authenticated wallet purchase and confirm balance deduction plus order visibility in user history and Admin Orders.
- Check mobile and desktop admin layouts and confirm no direct KGameShop/API-key traffic from the browser.
