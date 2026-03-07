# rpact-web

Web application for the [rpact](https://www.rpact.org) R package — Confirmatory Adaptive Clinical Trial Design and Analysis.

**Frontend:** Next.js 14 → Vercel
**Backend:** R Plumber API → Posit Connect Cloud
**CI/CD:** GitHub Actions + Claude AI code review

---

## Project structure

```
rpact-web/
├── frontend/          # Next.js 14 app
├── api/               # R Plumber API
├── tests/             # Playwright E2E tests
└── .github/workflows/ # CI/CD pipelines
```

---

## Local development

### 1. Start R API

```bash
cd api
Rscript -e 'renv::restore()'   # first time only
Rscript -e 'plumber::plumb("plumber.R")$run(port=8000)'
# Swagger UI: http://localhost:8000/__docs__/
```

### 2. Start Next.js frontend

```bash
cd frontend
cp .env.example .env.local      # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
# App: http://localhost:3000
```

### 3. Run E2E tests

```bash
cd tests
npm install && npx playwright install chromium
npx playwright test
```

---

## GitHub Actions secrets required

| Secret | Workflow | Description |
|---|---|---|
| `VERCEL_TOKEN` | deploy-frontend | Vercel personal access token |
| `VERCEL_ORG_ID` | deploy-frontend | Vercel org ID |
| `VERCEL_PROJECT_ID` | deploy-frontend | Vercel project ID |
| `POSIT_CONNECT_URL` | deploy-api | Posit Connect base URL |
| `POSIT_CONNECT_API_KEY` | deploy-api | Posit Connect API key |
| `ANTHROPIC_API_KEY` | code-review | Claude AI review bot |

---

## Adding a new rpact function

1. Add a `POST /your-endpoint` route in `api/plumber.R`
2. Add `api.yourEndpoint()` to `frontend/src/lib/api.ts`
3. Create `frontend/src/components/modules/YourModule.tsx`
4. Add tab entry in `frontend/src/components/TabNav.tsx`
5. Wire into `frontend/src/app/page.tsx`
6. Open PR → CI tests + Claude review run automatically
