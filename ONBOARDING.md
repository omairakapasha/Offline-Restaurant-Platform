# Setup Guide — New Restaurant

Follow these steps in order. You only do steps 1–4 once. No coding required.

You need a computer with **Docker Desktop** installed and running.

---

## Step 1 — Get the files

Put the project folder on the computer (it contains `docker-compose.yml`).
Open a terminal **inside that folder**.

---

## Step 2 — Create your settings file

Run this once to make your settings file:

```bash
cp .env.example .env
```

Now open `.env` in any text editor and change these lines:

```
BRAND_NAME=Your Restaurant Name
BRAND_TAGLINE=Your short slogan

DEFAULT_ADMIN_PASSWORD=pick-a-strong-password
DEFAULT_KITCHEN_PASSWORD=pick-a-strong-password
DEFAULT_WAITER_PASSWORD=pick-a-strong-password

SESSION_SECRET=type-any-long-random-text-at-least-32-characters-long
INTERNAL_API_SECRET=type-any-long-random-text-here
```

That's all you must change. Save the file.

> Tip: the two "secret" lines can be any long random text — just don't leave them
> blank. To generate one automatically, run **one** of these and paste the result:
>
> - **Windows (PowerShell):**
>   ```powershell
>   [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
>   ```
> - **Mac / Linux / Git Bash:**
>   ```bash
>   openssl rand -hex 32
>   ```

---

## Step 3 — Start the system

```bash
docker compose up -d
```

The first time, this takes a few minutes (it downloads and builds everything).
After that it starts in seconds. The system sets up its own database automatically
and creates 3 staff logins, 20 tables, and a few sample menu items.

Check it's running — open this in a browser:

```
http://localhost:5000
```

You should see the menu page with your restaurant name on it.

---

## Step 4 — Set up your menu (Admin panel)

1. Go to **http://localhost:5000/admin**
2. Log in:
   - **Username:** `admin`
   - **Password:** the `DEFAULT_ADMIN_PASSWORD` you chose in Step 2
3. In the **Menu** tab: add your real dishes (name, price, category, photo). Hide the sample items by clicking **Archive** next to each one.
4. In the **Tables** tab: set your tables, then click **All QRs** to download the QR codes.
5. In the **Staff** tab (optional): add more kitchen/waiter accounts.

---

## Step 5 — Put QR codes on the tables

Print each table's QR code and place it on the matching table.
When a customer scans it, the menu opens already set to that table.

**You're done.** 🎉

---

## Everyday use

| Who | Page | Login |
|---|---|---|
| Customers | `http://localhost:5000/` | none (scan QR) |
| Kitchen staff | `http://localhost:5000/kitchen` | `kitchen` |
| Waiters | `http://localhost:5000/waiter` | `waiter` |
| Owner / manager | `http://localhost:5000/admin` | `admin` |

Customers order → the Kitchen screen shows new orders instantly → staff mark them
preparing, ready, then served. Waiters and the admin see everything live.

---

## Keep it running

**Turn off:**
```bash
docker compose down
```

**Turn back on:**
```bash
docker compose up -d
```

**Back up your data (menu, orders, etc.):**
```bash
docker compose exec -T db pg_dump -U postgres restaurant > backup.sql
```

**Update to a new version:**
```bash
docker compose pull
docker compose up -d
```
Your data stays safe during updates.

> ⚠️ Never run `docker compose down -v` unless you want to erase everything
> (menu, tables, orders, logins) and start over.

---

## If something looks wrong

| Problem | Fix |
|---|---|
| Page won't load | Make sure Docker Desktop is running, then `docker compose up -d`. |
| "Too many login attempts" | Wait 15 minutes (a security limit), or restart: `docker compose restart api`. |
| Forgot a password | Log in as admin, go to the **Staff** tab, and click **Password** next to that user. |
| Restaurant name still wrong | Edit `BRAND_NAME` in `.env`, then run `docker compose up -d` again. |

---

## Optional extras (skip if not needed)

These are off by default and everything works without them. Add them to `.env`,
then run `docker compose up -d` again.

- **AI menu chat** — set `GEMINI_API_KEY=your-key` to enable the "Menu Assistant" bubble.
- **"Notify me when ready" push** — needs a website with **https**. Generate keys
  with `npx web-push generate-vapid-keys`, then fill in `VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`, and set `CORS_ORIGIN` to your public web address.
