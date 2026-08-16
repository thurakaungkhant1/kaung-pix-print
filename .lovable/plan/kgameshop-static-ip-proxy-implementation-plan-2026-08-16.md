# KGameShop Static-IP Proxy Implementation Plan

## Goal
Route all KGameShop API calls from Lovable Edge Functions through a single stable DigitalOcean IPv4 proxy so KGameShop can whitelist one address, while keeping both `KGAMESHOP_API_KEY` and `KGAMESHOP_PROXY_SECRET` strictly server-side.

## Architecture
```text
Lovable Edge Function
        ↓  HTTPS + X-Proxy-Key
DigitalOcean Nginx Proxy (static IPv4)
        ↓  HTTPS + X-API-Key
KGameShop API (admin.kokhantgaming.com/api/v1)
```

## What you need to provide first
1. The public static IPv4 address of your DigitalOcean droplet.
2. A domain or subdomain you can point at that IPv4 (e.g., `kg-proxy.kaungcomputer.com`).

I will then give you the exact DNS record and server configuration.

---

## Phase 1: DNS Record

Create an **A record** on your DNS provider:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A    | `kg-proxy` (or your chosen subdomain) | `<your-droplet-ipv4>` | 300–600 |

Example:
```
kg-proxy.kaungcomputer.com → A → 203.0.113.45
```

This is the only DNS record needed.

---

## Phase 2: DigitalOcean Server Configuration

### Droplet
- **Provider**: DigitalOcean
- **OS**: Ubuntu 24.04 LTS
- **Plan**: Basic Droplet (1 vCPU / 512 MB or 1 GB RAM)
- **Estimated cost**: ~$4–6/month
- **Public IPv4**: Provided by you

### Packages to install
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Firewall (UFW)
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

This only opens ports 22, 80, and 443.

---

## Phase 3: Nginx Reverse Proxy Configuration

I will provide the exact Nginx config file after you give me the IP and subdomain. It will look like the following template.

### Site config
File: `/etc/nginx/sites-available/kg-proxy`

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name kg-proxy.kaungcomputer.com;

    # SSL via Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/kg-proxy.kaungcomputer.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kg-proxy.kaungcomputer.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Drop requests without proxy secret
    if ($http_x_proxy_key = "") {
        return 403;
    }

    # Allowed KGameShop paths only
    location ~ ^/(balance|games|products|check-player|orders)(/.*)?$ {
        # Validate proxy secret
        if ($http_x_proxy_key != "PROXY_SECRET_PLACEHOLDER") {
            return 403;
        }

        proxy_pass https://admin.kokhantgaming.com/api/v1/$1$2;
        proxy_ssl_server_name on;
        proxy_set_header Host admin.kokhantgaming.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-API-Key $http_x_api_key;

        # Do NOT forward the proxy secret to KGameShop
        proxy_hide_header X-Proxy-Key;
        proxy_hide_header Authorization;

        proxy_connect_timeout 10s;
        proxy_send_timeout 20s;
        proxy_read_timeout 20s;
    }

    # Everything else is denied
    location / {
        return 404;
    }
}
```

### Notes
- `proxy_pass` rewrites only the five allowed paths.
- `X-Proxy-Key` is validated then stripped from the upstream request.
- `X-API-Key` is forwarded explicitly.
- No API keys or secrets are logged.

### Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/kg-proxy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Phase 4: SSL Certificate (Let's Encrypt)

```bash
sudo certbot --nginx -d kg-proxy.kaungcomputer.com
```

This obtains and installs a free HTTPS certificate.

---

## Phase 5: Lovable Edge Function Changes

### File to update
`supabase/functions/_shared/kgameshop.ts`

### Changes
1. Replace the base URL with the proxy domain:
   ```ts
   export const KG_BASE_URL =
     (Deno.env.get('KGAMESHOP_BASE_URL') || 'https://kg-proxy.kaungcomputer.com').replace(/\/+$/, '');
   ```

2. Add a helper to read the proxy secret:
   ```ts
   export function getProxyKey(): string | null {
     return Deno.env.get('KGAMESHOP_PROXY_SECRET') || null;
   }
   ```

3. In `kgFetch`, send `X-Proxy-Key` and `X-API-Key` together:
   ```ts
   headers: {
     'X-API-Key': key,
     'X-Proxy-Key': getProxyKey(),
     'Content-Type': 'application/json',
     Accept: 'application/json',
   }
   ```
   If `X-Proxy-Key` is missing, the function returns an error before calling the proxy.

### No other files change
- `kgameshop-fulfill/index.ts` stays the same.
- `kgameshop-status/index.ts` stays the same.
- No frontend files change.
- The manual order workflow is untouched.

---

## Phase 6: Lovable Cloud Secrets

Add the following secret using the secure secret form:

| Secret Name | Value | Notes |
|-------------|-------|-------|
| `KGAMESHOP_PROXY_SECRET` | Strong random string (e.g., 32–64 characters) | Authenticates Edge Function → Proxy |

The existing `KGAMESHOP_API_KEY` remains as-is.

I will generate the proxy secret using the secure secret generator so it is never shown in plain text.

---

## Phase 7: Verification (No Orders Created)

1. Test proxy connectivity from the Edge Function by calling `/balance` via `kgameshop-status`.
2. Verify the KGameShop API key is never returned in the response.
3. Confirm the response includes the IP-whitelisted provider's balance or a non-401 error.
4. Keep **Global Auto Top-Up OFF**.
5. Do not create any orders.

Only after the connection test succeeds will we ask the KGameShop admin to whitelist the droplet IPv4.

---

## Phase 8: KGameShop Whitelist

After successful proxy test, give the KGameShop admin exactly this IP:

```text
<your-droplet-ipv4>
```

No other IPs or domains are needed.

---

## Out of Scope / Explicitly Not Changed

- Global Auto Top-Up remains OFF.
- No KGameShop orders are created.
- Manual fulfillment workflow is unchanged.
- Deposit and Telegram notification logic is unchanged.
- No unrelated application features are modified.
- No frontend UI changes.

---

## Deliverables

After you provide the droplet IPv4 and subdomain, I will deliver:
1. The exact DNS A record.
2. The exact Nginx config file with your real domain and a generated proxy secret.
3. The exact `ufw` commands.
4. The exact `kgameshop.ts` patch.
5. The secure secret form for `KGAMESHOP_PROXY_SECRET`.

Implementation will only begin after you confirm the droplet is ready and the DNS record is applied.
