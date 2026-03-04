# Top Revenue per Employee

SolidJS + shadcn-style dashboard for exploring the top public companies by market cap and comparing how efficiently they generate revenue per employee.

## Features

- **Main dashboard**
  - sleek infographic cards focused on revenue-per-employee leaders,
  - sortable company table (market cap, revenue, employees, revenue / employee),
  - annual + quarterly time-bucket selector (`2025`, `2024Q3`, etc.),
  - visible source attribution in the UI.
- **Comparison playground**
  - select multiple companies,
  - bubble chart comparison (market cap vs revenue per employee, sized by employee count),
  - extensible visualization registry for adding new chart types.
- **Nightly automation**
  - refreshes source data,
  - archives snapshots in the repo,
  - publishes refreshed static site to GitHub Pages.

## Tech stack

- SolidJS + Vite + TypeScript
- TailwindCSS (shadcn-style component system)
- Node data pipeline scripts (`tsx`)
- GitHub Actions for CI and nightly refresh/deploy

## Data sources

- [CompaniesMarketCap](https://companiesmarketcap.com/)
  - top-company universe by market cap,
  - market-cap ranking baseline,
  - fallback employee snapshot.
- [StockAnalysis](https://stockanalysis.com/)
  - annual/quarterly revenue enrichment,
  - market-cap history enrichment.

> Notes:
> - Employee history coverage differs across companies and exchanges.
> - Where historical employee data is unavailable, a current employee snapshot fallback is used and flagged.

## Local development

```bash
npm install
npm run data:refresh
npm run dev
```

### Quality checks

```bash
npm run test
npm run typecheck
npm run build
npm run build:pages
npm run data:validate
```

For GitHub Pages-style local validation (repo subpath base URL):

```bash
VITE_BASE_PATH=/top-revenue-per-employee/ npm run build
```

`npm run build:pages` also creates `dist/404.html` for SPA route fallback on GitHub Pages.

## Data pipeline

Refresh dataset and archive snapshots:

```bash
npm run data:refresh
```

Outputs:

- `data/raw/<YYYY-MM-DD>/...` — archived raw source snapshots
- `data/processed/companies-timeseries.json` — normalized intermediate dataset
- `data/processed/metadata.json` — refresh metadata
- `public/data/companies-data.json` — frontend-consumable dataset

## GitHub Actions

- `CI` workflow (`.github/workflows/ci.yml`)
  - validates dataset, runs tests, typechecks, and builds.
- `Nightly Refresh and Deploy` workflow (`.github/workflows/nightly-refresh-deploy.yml`)
  - runs on schedule + manual trigger,
  - refreshes and commits data changes to `main`,
  - builds and deploys static site to GitHub Pages.