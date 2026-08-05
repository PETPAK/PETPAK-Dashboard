# PETPAK Dashboard Data Update Guide

This guide explains how to add or update data in the dashboard using the Excel file (`PETPAK Dashboard.xlsx`).

## How to Update the Dashboard

1. **Update Excel Sheet**: Open [PETPAK Dashboard.xlsx](file:///e:/Desktop/PETPAK%20DASHBOARD/PETPAK%20Dashboard.xlsx) in Excel and add, modify, or delete rows under the respective sheets (`Main Data`, `Product`, and `Erema`). Make sure to keep the header rows intact and follow the existing column order.
2. **Save the Excel File**: Save your changes and close Excel.
3. **Run the Update Script**: Double-click [Update Dashboard.bat](file:///e:/Desktop/PETPAK%20DASHBOARD/Update%20Dashboard.bat). This runs [update_dashboard.py](file:///e:/Desktop/PETPAK%20DASHBOARD/update_dashboard.py) in the background to automatically read the updated data, format it into JSON, and inject it into [dashboard.html](file:///e:/Desktop/PETPAK%20DASHBOARD/dashboard.html).
4. **View the Dashboard**: Refresh or double-click [dashboard.html](file:///e:/Desktop/PETPAK%20DASHBOARD/dashboard.html) to view the updated charts, OEE metrics, and tables in your web browser.

`update_dashboard.py` also writes `index.html` (same content) for GitHub Pages hosting.

---

## Publish to GitHub Pages

The live site only needs three files at the repo root:

| File | Purpose |
|------|---------|
| `index.html` | Entry page (auto-synced from `dashboard.html` when you run the update script) |
| `dashboard.html` | Local working copy (optional on Pages, but fine to include) |
| `bopet_plant_bg.png` | Background image |

### One-time setup

1. Create a new public repo on GitHub (e.g. `petpak-dashboard`).
2. In this folder, run:

```powershell
cd "E:\Desktop\PETPAK DASHBOARD"
git add .gitignore index.html dashboard.html bopet_plant_bg.png README.md update_dashboard.py "Update Dashboard.bat" "PETPAK Dashboard.xlsx"
git commit -m "Add PETPAK dashboard for GitHub Pages"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/petpak-dashboard.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `petpak-dashboard` with your GitHub username and repo name.

3. On GitHub: **Settings → Pages → Build and deployment → Source** → choose **Deploy from a branch**.
4. Set **Branch** to `main`, folder **`/ (root)`**, then Save.
5. After 1–2 minutes, the site will be at:

`https://YOUR_USERNAME.github.io/petpak-dashboard/`

### Updating the live site

1. Edit `PETPAK Dashboard.xlsx` and save.
2. Run **Update Dashboard.bat** (updates both `dashboard.html` and `index.html`).
3. Commit and push:

```powershell
git add index.html dashboard.html
git commit -m "Update dashboard data"
git push
```

GitHub Pages redeploys automatically on push (usually within a minute).

### Notes

- **Data is public**: All production data is embedded in the HTML. Anyone with the URL can view it. Use a **private repo** only if you accept that Pages still makes the site publicly reachable (GitHub Pages on private repos requires a paid plan for access control).
- **Repo size**: `dashboard.html` / `index.html` are ~700 KB each; `bopet_plant_bg.png` is ~900 KB. Well within GitHub limits.
- **Excel stays local workflow**: You still update via Excel + batch file on your PC; only the generated HTML is published.

---

## Data Structure Guidelines

### 1. `Main Data` Sheet
* **Headers**: The data starts at row 3 (row 1 is for group headers, row 2 contains column names).
* **Key Fields**:
  - **Dates** (Column A): Must be in a valid date format (e.g. `YYYY-MM-DD`).
  - **Waste Break-Up** (Columns F to K): Maps process, planning, electrical, mechanical, powerhouse, and shortages waste.
  - **Down Time Break-Up** (Columns T to AC): Maps various downtime breakdown components.
  - **OEE %** (Column AJ) and other performance metrics are read directly from their respective columns.

### 2. `Product` Sheet
* **Headers**: Column names start at row 1.
* **Fields**:
  - `Dates` (Column A): Date of production.
  - `Product Type` (Column B): Classification (e.g., Plain PET, Chemical Treated PET).
  - `Product` (Column C): Product name.
  - `Production` (Column D): Production tonnage/quantity.

### 3. `Erema` Sheet
* **Headers**: Column names start at row 1.
* **Fields**:
  - `Dates` (Column A): Date of recycled production.
  - `Production` (Column B): Tonnage/yield of recycled material.
