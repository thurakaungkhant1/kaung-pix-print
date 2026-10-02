# Game Catalog and KGameShop Product Improvements

## What will change
- Add a name search field to the View All game screen and filter the 200+ VPS games instantly.
- Replace the current list with the same compact image-card grid style used on Home, using four columns on mobile and comfortable wider layouts on larger screens.
- Keep Home limited to nine games; View All continues to show the full catalog.
- Move VPS products below the Player ID / Server ID fields, inside the existing “Select Diamond” area.
- Restyle VPS product choices to match the existing manually-added package cards rather than using a separate plain card design.
- Convert `price_usd` to MMK throughout these VPS product cards.
- Add an admin-editable USD → MMK exchange-rate setting, starting at **1 USD = 4,500 MMK**.
- Add the mobile-only admin destinations, including KGameShop and related settings, to the desktop admin sidebar so they remain accessible on larger screens.

## Behavior and states
- Product requests remain lazy: only the selected game’s products are fetched.
- Successful product responses remain cached per game for the browser session.
- Loading, empty, network error, and `game_disabled` states remain available with retry or “choose another game” actions.
- No KGameShop API key or direct KGameShop request will be added; the browser will use only the two existing VPS endpoints.

## Technical details
- Preserve the VPS `game` slug through the catalog mapping and URL-encode it for product requests.
- Store the global exchange rate as a protected admin-managed setting and read it for storefront price conversion.
- Use the current semantic colors and existing card/control components.
- Verify filtering, four-column mobile layout, selected-game product placement, MMK conversion at 4,500, desktop admin access, and current preview build health.
