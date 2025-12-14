# S90 Local Admin — setup guide

## What's in this update

| File | What it is |
|---|---|
| `start-local-admin.bat` | Double-click to start the dashboard |
| `local-admin/server.js` | The local server (login, products, uploads, GitHub publish). No npm packages needed |
| `local-admin/local-admin.html` | The dashboard page |
| `local-admin/patch-site.js` | Adds the catalog loader to `index.html`, `home.html`, `script.js` (once, with backups) |
| `public-catalog.js` | Public-site loader: applies `catalog.json` to the live website |
| `cart.js` | Shopping cart for visitors: Add to Cart button, floating cart button, send whole order to Telegram |
| `catalog.json` | Product data (starts empty) |
| `uploads/products/` | Uploaded product pictures |
| `.vercelignore` | Keeps the admin tool off the public website |

## Part 1 — Install into your repository

1. Open your **cloned GitHub repository** for S90 (the folder that contains the hidden `.git` folder).
2. Copy everything from this update into that folder, keeping the same layout. Don't delete `.git`.
3. Install **Node.js (LTS)** from nodejs.org and **Git for Windows** from git-scm.com (skip if already installed).
4. Double-click `start-local-admin.bat`. The terminal shows:
   ```
   S90 LOCAL ADMIN PASSWORD (save it): ...
   http://127.0.0.1:4177/local-admin.html
   ```
   Keep that window open. The password is created once and only shown on first run.
5. Open the link, sign in.

On first start the dashboard automatically makes small edits (backups are kept in `local-admin/backups/`):
- `index.html` and `home.html`: extra `<script>` lines for `public-catalog.js` and `cart.js`
- `script.js`: a few lines so categories read `data-category` for dashboard products, and a small hook so the cart can read what is selected in the product window

## Part 2 — Add, edit, hide, delete

**My products** tab = products created in the dashboard (SKU, name, category, price, picture).
- Add / Edit / Hide / Show / Delete are all on that tab. Delete also removes the picture file.
- SKU must be new (letters, numbers, `.`, `-`, `_`). A SKU that already exists on the website is refused — use the other tab.
- Categories come from your existing website category buttons.

**Existing site products** tab = the hard-coded products (about 1,900 SKUs).
- Search by SKU or name, then **Edit** (name, price, category, replacement picture), **Hide/Show**, or **Reset** (back to original).
- These are saved as SKU-based overrides in `catalog.json`. Your original HTML is never edited.
- An override applies to every card with that SKU (for example a product that appears in both New Arrivals and its own category).

**Sub-items** (products that list several sizes/types, each with its own price — about 630 of your products):
- In the Add/Edit form there is a **Sub-items** section: one row per item (name + price).
- **Add** with “+ Add sub-item”, **update** by typing in a row, **delete** with ✕, **reorder** with ↑ ↓.
- Existing products load their current sub-items into the form, so you only change what you need.
- Price can be a number (`5` shows as `$5.00`) or text such as `$1x.xx`, shown exactly as typed.
- When a product has sub-items, they replace its single price on the website. A single-price product can be turned into a list by adding rows.
- To go back to the original list of an existing product, delete every row and save (or use Reset).
- For a product you create, leave the single price empty if you use sub-items.

Pictures: JPG, PNG, WEBP or GIF, under 10 MB. Compress large photos first.

## Shopping cart (for your customers)

- In a product's window there are now two buttons: **Order Now** (orders just that product, as before) and **Add to Cart**.
- Add to Cart saves the selected options and quantities, closes the window and shows a short message. The same product/option added again just increases its quantity.
- A round orange **cart button** sits above the Facebook button on every page. The number on it is the total quantity.
- Tap it to see the order details: change quantities (+ / −), remove items, see the total, **Clear** the cart, or press **Order Now** to send everything in one Telegram message to @S90constructionsupply_1.
- The cart is remembered in the customer's browser (also after refresh and between the Home and main pages) until they clear it. The cart is not cleared automatically after Order Now, because the site can't know whether the message was actually sent.
- Prices written as text such as `$1x.xx` are not added to the total; the cart shows a note that those prices will be confirmed.
- Very long orders (over about 3,500 characters) are copied to the clipboard and the customer is asked to paste them into Telegram.

## Part 3 — Publish

1. Click **Publish to GitHub** (confirm). It runs `git add`, `git commit`, `git push` on the website files, `catalog.json`, uploads and the dashboard files.
2. Vercel deploys automatically from GitHub. Check **Deployments** in Vercel, then refresh the public site.

If you also edit from another PC, click **Sync from GitHub** before you start, otherwise the push can be rejected (the dashboard tells you when this happens).

### Daily test checklist
- [ ] Add a test product with a picture
- [ ] Edit its name or price
- [ ] Publish, wait for Vercel, refresh the live site
- [ ] Delete the test product and publish again

## Moving to another PC

1. Install Node.js LTS and Git for Windows.
2. Sign in to GitHub once (Git Credential Manager prompt on first `git push`, or `gh auth login`, or SSH).
3. Set your Git identity once:
   ```
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```
4. `git clone <your repo URL>` into a folder such as `D:\MY WORK\WORK_DESIGN\Web`.
5. Double-click `start-local-admin.bat`. A **new password** is generated for this PC (passwords are not shared between PCs).
6. Click **Sync from GitHub** whenever you switch PCs.

Don't copy the folder by ZIP unless it includes `.git`.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Git not ready" in the header | The folder isn't a Git repo, or `origin` is missing |
| Push says sign-in/authentication problem | Sign in to GitHub (see "Moving to another PC", step 2) |
| Push rejected | Click **Sync from GitHub**, then publish again |
| Forgot password | Close the dashboard, delete `local-admin\.admin-auth.json`, start again for a new one |
| Port in use | The dashboard is already running in another window |
| New product not on live site | Check the latest Vercel deployment succeeded; hard-refresh (Ctrl+F5) |
| Push fails on file size | Compress big images (GitHub blocks files over 100 MB) |

## Security notes
- The server only listens on `127.0.0.1` (this PC), requires the password, and rejects cross-site requests.
- The password is stored only as a salted hash in `local-admin/.admin-auth.json`, which is git-ignored.
- `.vercelignore` keeps `local-admin/` off the public website. Keep a separate backup of your whole project.
