# Deploy R Package as Web App

Deploy any R package or local R scripts as a full-stack web application with an R Plumber API backend (Fly.io) and Next.js frontend (Vercel), fully automated.

## Usage

```
/deploy-r-webapp --package <name|path> [--app-name <name>]
```

Tokens and GitHub username are read automatically from environment variables. Set these in your `~/.zshrc` once:

```bash
export DEPLOY_GITHUB_TOKEN="ghp_..."
export DEPLOY_GITHUB_USER="your-username"
export DEPLOY_VERCEL_TOKEN="..."
export DEPLOY_FLY_TOKEN="..."
```

## Arguments

- `--package` — One of:
  - CRAN package name: `rpact`, `survival`, `gsDesign`
  - Local R scripts directory: `./my-scripts/`
  - Local R package source: `./my-package/` or `./my-package.tar.gz`
- `--app-name` — (optional) Override the app name. Default: derived from package name

## What Gets Created

- GitHub repo: `https://github.com/{user}/{appname}-webapp`
- API: `https://{appname}-api.fly.dev`
- Frontend: `https://{appname}-{user}.vercel.app`

---

## Agent Pipeline

You are the orchestrator. Run the following 7 agents in sequence. Each agent receives the outputs of previous agents. Stop and report to the user if any agent fails after 3 fix attempts.

Parse the arguments from the user's command first:
- Extract `--package` and optionally `--app-name` from the command
- Read tokens from environment variables using Bash:
  ```bash
  echo "GITHUB_TOKEN=${DEPLOY_GITHUB_TOKEN:0:8}..."   # verify set
  echo "GITHUB_USER=$DEPLOY_GITHUB_USER"
  echo "VERCEL_TOKEN=${DEPLOY_VERCEL_TOKEN:0:8}..."
  echo "FLY_TOKEN=${DEPLOY_FLY_TOKEN:0:8}..."
  ```
  If any env var is empty, stop and tell the user: "Please set DEPLOY_GITHUB_TOKEN, DEPLOY_GITHUB_USER, DEPLOY_VERCEL_TOKEN, DEPLOY_FLY_TOKEN in your ~/.zshrc and restart your shell."
- Set: `GITHUB_TOKEN=$DEPLOY_GITHUB_TOKEN`, `GITHUB_USER=$DEPLOY_GITHUB_USER`, `VERCEL_TOKEN=$DEPLOY_VERCEL_TOKEN`, `FLY_TOKEN=$DEPLOY_FLY_TOKEN`
- Derive `APP_NAME`: if `--app-name` provided use it, else use the package name lowercased with non-alphanumeric replaced by `-`
- Derive `REPO_NAME`: `{APP_NAME}-webapp`
- Derive `FLY_APP`: `{APP_NAME}-api`
- Derive `VERCEL_ALIAS`: `{APP_NAME}-{github-user}.vercel.app`
- Derive `API_URL`: `https://{FLY_APP}.fly.dev`
- Derive `FRONTEND_URL`: `https://{VERCEL_ALIAS}`

---

### AGENT 1: Analyst

**Goal**: Understand the R package/scripts and produce a structured JSON spec.

**Instructions**:

1. Detect input type:
   - If `--package` is a directory path starting with `.` or `/`: read all `.R` files in the directory recursively
   - If `--package` ends with `.tar.gz`: note it's a package source archive, extract and read `R/*.R` and `man/*.Rd`
   - If `--package` is a plain name (no slashes): it's a CRAN package name

2. For **CRAN package**:
   - Run: `Rscript -e "library({package}); fns <- ls('package:{package}'); cat(paste(fns, collapse='\n'))"`
   - For each public function, run: `Rscript -e "library({package}); args('{fn}')"`
   - For each public function, run: `Rscript -e "library({package}); cat(deparse(formals('{fn}')))"`
   - Read help pages: `Rscript -e "library({package}); help('{fn}', package='{package}')"`
   - Focus on functions that: take numeric/logical inputs and return structured results (not utility/internal functions)
   - Skip functions starting with `.` or that are clearly internal

3. For **local R scripts**:
   - Read each `.R` file using the Read tool
   - Extract all function definitions: `function_name <- function(params) { ... }`
   - Parse roxygen2 comments above each function if present (`#' @param name type description`, `#' @return`)
   - If no roxygen: infer parameter types from default values, usage patterns, and variable names
   - Infer return structure by reading what the function returns

4. For **local package source**:
   - Read `DESCRIPTION` for package name and dependencies
   - Read `NAMESPACE` for exported functions
   - Read `man/*.Rd` for parameter documentation
   - Read `R/*.R` for function implementations

5. **Critical parameter type rules** (learned from rpact experience):
   - If a parameter name ends in `Ratio` and has a numeric default → it is numeric, NOT boolean
   - If a parameter is documented as "logical" or has default `TRUE`/`FALSE` → it is boolean
   - If a parameter accepts a vector of values → mark as `vector` type, use a single representative default for UI
   - If a parameter name is `alternative`, `effect`, `delta`, `theta` → it is the effect size, type numeric
   - Never confuse a parameter that SOUNDS like a boolean with one that IS numeric
   - If a parameter expects a time vector like `c(0, end)` (e.g. `accrualTime`) → the frontend sends a scalar end value; the API must prepend `0` automatically: `if (length(x) == 1) x <- c(0, x)`

6. Group functions into logical UI categories:
   - Look for common prefixes: `getDesign*`, `getSampleSize*`, `getPower*`, `getSimulation*`
   - If no clear grouping: put all functions in one "Functions" category
   - Maximum 8 categories, maximum 6 functions per category

7. For each function determine outputs:
   - Run the function with default params and inspect the result structure
   - Identify which outputs are: scalar numbers, numeric vectors (per-stage), strings
   - Mark the most important scalar output as the "headline" metric

8. Produce this JSON spec (store in memory as SPEC):

```json
{
  "package": "rpact",
  "app_name": "rpact",
  "api_url": "https://rpact-api.fly.dev",
  "r_dependencies": ["rpact", "rappdirs"],
  "categories": [
    {
      "id": "design",
      "label": "Trial Design",
      "functions": [
        {
          "id": "design",
          "label": "Group Sequential Design",
          "r_function": "getDesignGroupSequential",
          "endpoint": "/design",
          "params": [
            {
              "name": "kMax",
              "r_name": "kMax",
              "label": "Stages (kMax)",
              "type": "integer",
              "default": 3,
              "min": 1,
              "max": 10,
              "help": "Number of planned interim analyses"
            },
            {
              "name": "alpha",
              "r_name": "alpha",
              "label": "Alpha",
              "type": "number",
              "default": 0.025,
              "min": 0.001,
              "max": 0.5,
              "step": 0.001,
              "help": "One-sided significance level"
            },
            {
              "name": "typeOfDesign",
              "r_name": "typeOfDesign",
              "label": "Design Type",
              "type": "select",
              "default": "OF",
              "options": [
                {"value": "OF", "label": "O'Brien-Fleming"},
                {"value": "P", "label": "Pocock"},
                {"value": "WT", "label": "Wang-Tsiatis"},
                {"value": "asP", "label": "Alpha Spending (Pocock)"}
              ]
            }
          ],
          "outputs": {
            "headline": "maxNumberOfSubjects",
            "arrays": ["criticalValues", "informationRates", "alphaSpent"],
            "scalars": ["alpha", "beta", "kMax"]
          }
        }
      ]
    }
  ]
}
```

---

### AGENT 2: API Builder

**Goal**: Generate `api/plumber.R`, `api/Dockerfile`, `api/fly.toml` from SPEC.

**Instructions**:

Create the directory structure: `{REPO_NAME}/api/`

**Generate `api/plumber.R`**:

```r
library(plumber)
library(jsonlite)
library({package})  # eager load — never lazy load, causes cold start timeouts

# ── Type coercion helpers ──────────────────────────────────────────────────────
`%||%` <- function(x, y) if (!is.null(x) && length(x) > 0 && !identical(x, "")) x else y
.toNum <- function(x) { if (is.null(x) || (length(x) == 1 && is.na(x))) return(NA_real_); as.numeric(x) }
.toInt <- function(x, default = NA_integer_) { if (is.null(x)) return(default); as.integer(x) }
.toBool <- function(x, default = FALSE) { if (is.null(x)) return(default); isTRUE(as.logical(x)) }
.cleanNum <- function(x) { if (is.null(x)) return(NULL); x <- as.numeric(x); x[is.infinite(x) | is.nan(x)] <- NA_real_; x }

# ── CORS filter ────────────────────────────────────────────────────────────────
#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req$REQUEST_METHOD == "OPTIONS") { res$status <- 204; return(list()) }
  plumber::forward()
}
```

Then for each function in SPEC, generate an endpoint:
- Use `.toNum()` for numeric params, `.toInt()` for integer, `.toBool()` for boolean
- Use `%||%` with the default value from spec for optional params
- Wrap the R function call in `tryCatch` returning `list(success=FALSE, error=conditionMessage(e))` with `res$status <- 400` on error
- Return `list(success=TRUE, result=list(...))` with all outputs from spec
- Apply `.cleanNum()` to all numeric outputs to strip Inf/NaN

Generate `/health` endpoint last — returns only `list(status="ok", time=format(Sys.time(), tz="UTC", usetz=TRUE))` — NO package function calls.

**Generate `api/Dockerfile`**:

```dockerfile
FROM rocker/r-ver:4.4

# System dependencies — full set required for plumber and most R packages
# DO NOT reduce this list — missing libs cause silent install failures
RUN apt-get update && apt-get install -y \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libsodium-dev \
    libfontconfig1-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libfreetype6-dev \
    libpng-dev \
    libtiff5-dev \
    libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

# Install plumber — verbose so failures are visible in build logs
RUN R -e " \
  options(repos=c(CRAN='https://cloud.r-project.org')); \
  install.packages('plumber', verbose=TRUE, INSTALL_opts='--no-test-load'); \
  cat('plumber installed:', requireNamespace('plumber', quietly=TRUE), '\n')"

# Verify plumber installed — fail build immediately if not
RUN R -e "if (!requireNamespace('plumber', quietly=TRUE)) stop('plumber not installed') else cat('plumber OK\n')"

# Install target package(s)
RUN R -e "install.packages(c({comma_quoted_deps}), repos='https://cloud.r-project.org'); \
  if (!requireNamespace('{package}', quietly=TRUE)) stop('{package} failed')"

# Verify ALL packages load — build fails here if anything is broken
# This prevents deploying a broken image to Fly.io
RUN R -e "library(plumber); library({package}); cat('All packages OK\n')"

WORKDIR /api
COPY plumber.R .

EXPOSE 8080

CMD ["Rscript", "-e", "port <- as.integer(Sys.getenv('PORT', '8080')); plumber::plumb('plumber.R')$run(host='0.0.0.0', port=port)"]
```

**Generate `api/fly.toml`**:

```toml
app = "{FLY_APP}"
primary_region = "sin"

[env]
  PORT = "8080"

[[vm]]
  memory = "1gb"
  cpu_kind = "shared"
  cpus = 1

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

  [[http_service.checks]]
    grace_period = "30s"
    interval = "15s"
    method = "GET"
    path = "/health"
    timeout = "10s"
```

---

### AGENT 3: Frontend Builder

**Goal**: Generate the complete Next.js frontend from SPEC.

**Instructions**:

Create directory structure: `{REPO_NAME}/frontend/`

Copy the exact structure from rpact-web frontend but regenerate these files from SPEC:

**`frontend/src/lib/api.ts`**:
- One exported method per function in SPEC
- Method name: camelCase of the function id
- All use `post<T>(endpoint, body)`

**`frontend/src/types/rpact.ts`**:
- `ApiResponse<T>` type with `success`, `result`, `error`, `rCode` fields
- Result types for each category

**`frontend/src/components/TabNav.tsx`**:
- One tab group per category in SPEC
- Tab ids matching function ids

**`frontend/src/components/modules/{FunctionId}.tsx`** for each function:
- Inputs only — NO result rendering in the module
- `onResult` callback prop: `({ onResult }: { onResult: (r: ApiResponse<unknown>) => void })`
- One `InputField` per param of type `number`/`integer`
- One `SelectField` per param of type `select`
- One checkbox per param of type `boolean`
- Default values from SPEC
- Min/max/step from SPEC
- Help text from SPEC
- Single Calculate/Run button

**`frontend/src/app/page.tsx`**:
- Holds results as a **per-tab map** `Partial<Record<TabId, ApiResponse<unknown>>>` — NOT a single result value
- `onResult` updates only the current tab's entry: `setResults(prev => ({ ...prev, [tab]: r }))`
- Tab switch does NOT clear results — each tab remembers its last result independently
- `ResultPanel` receives `results[tab] ?? null` so switching back to a tab shows the previous result
- `ResultPanel` on the right side — auto-renders from result shape:
  - Scalar metrics as highlight cards (top)
  - Arrays as table rows (middle)
  - Chart of first meaningful array (middle)
  - R code block (bottom)
- `SplitPanel` with both panels having `overflow-auto` and `min-w-0`

**`frontend/src/components/SplitPanel.tsx`**:
```tsx
<div className="flex flex-1 h-full overflow-hidden">
  <aside className="w-full max-w-sm lg:max-w-md xl:max-w-lg shrink-0 overflow-auto border-r ...">
  <main className="flex-1 min-w-0 overflow-auto ...">
```

**`frontend/.env.example`**:
```
NEXT_PUBLIC_API_URL={API_URL}
```

**`frontend/vercel.json`**:
```json
{"framework": "nextjs", "buildCommand": "npm run build", "outputDirectory": ".next"}
```

Copy unchanged from rpact-web:
- `frontend/src/components/ui/InputField.tsx`
- `frontend/src/components/ui/ResultTable.tsx`
- `frontend/src/components/ui/ResultChart.tsx`
- `frontend/src/components/ui/CodeBlock.tsx`
- `frontend/src/components/Header.tsx` (update title to package name)
- `frontend/package.json`
- `frontend/tailwind.config.ts`
- `frontend/tsconfig.json`
- `frontend/next.config.mjs`
- `frontend/postcss.config.js`

---

### AGENT 4: Repo Builder

**Goal**: Create GitHub repo, push all code, create Fly.io app, set all secrets, create Vercel project.

**Instructions**:

1. **Create GitHub repo**:
```bash
curl -s -X POST https://api.github.com/user/repos \
  -H "Authorization: Bearer {GITHUB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "{REPO_NAME}", "private": false, "auto_init": false}'
```

2. **Initialize and push**:
```bash
cd {REPO_NAME}
git init
git add .
git commit -m "Initial: {APP_NAME} web app generated by deploy-r-webapp skill"
git remote add origin https://{GITHUB_TOKEN}@github.com/{GITHUB_USER}/{REPO_NAME}.git
git push -u origin main
```

3. **Create Fly.io app** (if not exists):
```bash
curl -fsSL https://fly.io/install.sh | sh
export PATH="$HOME/.fly/bin:$PATH"
export FLY_API_TOKEN="{FLY_TOKEN}"
flyctl apps create {FLY_APP} --machines 2>/dev/null || echo "App may already exist"
```

4. **Get Vercel org ID**:
```bash
curl -s https://api.vercel.com/v2/teams \
  -H "Authorization: Bearer {VERCEL_TOKEN}"
```
Use the first team's id as `VERCEL_ORG_ID`, or if no teams use the user's id from:
```bash
curl -s https://api.vercel.com/v2/user -H "Authorization: Bearer {VERCEL_TOKEN}"
```

5. **Create Vercel project**:
```bash
curl -s -X POST https://api.vercel.com/v9/projects \
  -H "Authorization: Bearer {VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "{REPO_NAME}",
    "framework": "nextjs",
    "rootDirectory": "frontend",
    "gitRepository": {"type": "github", "repo": "{GITHUB_USER}/{REPO_NAME}"}
  }'
```
Save the returned `id` as `VERCEL_PROJECT_ID`.

6. **Set Vercel env var**:
```bash
curl -s -X POST "https://api.vercel.com/v10/projects/{VERCEL_PROJECT_ID}/env" \
  -H "Authorization: Bearer {VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"key":"NEXT_PUBLIC_API_URL","value":"{API_URL}","type":"plain","target":["production","preview","development"]}'
```

7. **Disable Vercel SSO protection** (so the site is publicly accessible):
```bash
curl -s -X PATCH "https://api.vercel.com/v9/projects/{VERCEL_PROJECT_ID}" \
  -H "Authorization: Bearer {VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"ssoProtection": null}'
```

8. **Set GitHub secrets** (one curl per secret):
```bash
# Get repo public key first
KEY=$(curl -s -H "Authorization: Bearer {GITHUB_TOKEN}" \
  https://api.github.com/repos/{GITHUB_USER}/{REPO_NAME}/actions/secrets/public-key)
# Then use PyNaCl or gh CLI to encrypt and set each secret:
# FLY_API_TOKEN, VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
```
Use `gh secret set` if available, otherwise use the GitHub API with libsodium encryption.

9. **Generate GitHub Actions workflows** and push:

**`.github/workflows/deploy-api.yml`**:
```yaml
name: Build & Deploy {APP_NAME} API

on:
  push:
    branches: [main]
    paths: ["api/**", ".github/workflows/deploy-api.yml"]

concurrency:
  group: deploy-api
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Install flyctl
        run: curl -fsSL https://fly.io/install.sh | sh

      - name: Build image (plain docker — NOT buildx, image must be in local daemon)
        run: docker build -t {APP_NAME}-api:local ./api

      - name: Smoke test — verify all packages load
        run: |
          docker run --rm {APP_NAME}-api:local Rscript -e "library(plumber); cat('plumber OK\n')"
          docker run --rm {APP_NAME}-api:local Rscript -e "library({package}); cat('{package} OK\n')"
          docker run --rm {APP_NAME}-api:local Rscript -e "ip <- installed.packages(); cat(ip[,'Package'], sep='\n')"

      - name: Check Fly.io machine state and handle accordingly
        run: |
          export PATH="$HOME/.fly/bin:$PATH"
          STATE=$(flyctl machines list --app {FLY_APP} --json 2>/dev/null | python3 -c "
          import json,sys
          data=json.load(sys.stdin)
          if not data: print('none')
          else: print(data[0].get('state','unknown'))" 2>/dev/null || echo "none")
          echo "Machine state: $STATE"
          # Only destroy if crashed or stopped — preserve healthy running machines
          if [ "$STATE" = "stopped" ] || [ "$STATE" = "failed" ] || [ "$STATE" = "none" ]; then
            echo "Destroying crashed/stopped machines..."
            MACHINES=$(flyctl machines list --app {FLY_APP} --json 2>/dev/null | python3 -c "
            import json,sys
            data=json.load(sys.stdin)
            print(' '.join([m['id'] for m in data]))" 2>/dev/null || echo "")
            for m in $MACHINES; do
              flyctl machines destroy "$m" --app {FLY_APP} --force 2>&1 || true
            done
          else
            echo "Machine is $STATE — will do rolling update"
          fi
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Deploy to Fly.io
        run: |
          export PATH="$HOME/.fly/bin:$PATH"
          flyctl deploy \
            --config api/fly.toml \
            --local-only \
            --image {APP_NAME}-api:local \
            --ha=false \
            --detach \
            2>&1 || true
          echo "Deploy triggered."
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

**`.github/workflows/deploy-frontend.yml`**:
```yaml
name: Deploy {APP_NAME} Frontend

on:
  push:
    branches: [main]
    paths: ["frontend/**", ".github/workflows/deploy-frontend.yml"]

concurrency:
  group: deploy-frontend
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm install --global vercel@latest
      - name: Pull Vercel env
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
      - name: Build
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
          NEXT_PUBLIC_API_URL: {API_URL}
      - name: Deploy
        run: |
          url=$(vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          echo "Deployed to: $url"
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
      - name: Assign stable alias
        run: |
          DEPLOY_ID=$(curl -s "https://api.vercel.com/v6/deployments?projectId=${{ secrets.VERCEL_PROJECT_ID }}&limit=1&target=production" \
            -H "Authorization: Bearer ${{ secrets.VERCEL_TOKEN }}" | python3 -c "import json,sys; print(json.load(sys.stdin)['deployments'][0]['uid'])")
          curl -s -X POST "https://api.vercel.com/v2/deployments/$DEPLOY_ID/aliases" \
            -H "Authorization: Bearer ${{ secrets.VERCEL_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"alias": "{VERCEL_ALIAS}"}'
          echo "Live at: https://{VERCEL_ALIAS}"
```

---

### AGENT 5: Deploy Monitor

**Goal**: Watch GitHub Actions until both API and frontend workflows succeed. Fix failures.

**Instructions**:

1. Poll GitHub Actions every 30 seconds:
```bash
curl -s "https://api.github.com/repos/{GITHUB_USER}/{REPO_NAME}/actions/runs?per_page=5" \
  -H "Authorization: Bearer {GITHUB_TOKEN}"
```

2. Wait for both `deploy-api` and `deploy-frontend` workflows to reach `completed` status.

3. If **API workflow fails**:
   - Fetch the job logs via GitHub API
   - Identify the failing step by name
   - Apply the known fix:

   | Failing step | Root cause | Fix |
   |---|---|---|
   | `Build image` | Missing system lib or package install failure | Read the log, identify the missing lib, add to Dockerfile apt-get list, re-push |
   | `Smoke test` | Package loads in build but not at runtime | Check if `RUN R -e "library(...)"` verify step passed — if it did and smoke test still fails, it's a platform issue, add `FROM --platform=linux/amd64` |
   | `Deploy to Fly.io` | App name conflict or token issue | Check flyctl output in logs |

4. After API workflow succeeds, poll `{API_URL}/health` every 10 seconds for up to 10 minutes:
```bash
curl -s --max-time 15 {API_URL}/health
```
   - If still failing after 10 min: fetch Fly.io machine logs via:
   ```bash
   curl -s -H "Authorization: Bearer {FLY_TOKEN}" \
     "https://api.machines.dev/v1/apps/{FLY_APP}/machines"
   ```
   Then check machine state. Common fixes:
   - `Error in loadNamespace: no package called 'X'` → package not installed → fix Dockerfile
   - `port already in use` → PORT env var mismatch → fix fly.toml
   - Machine stuck in crash loop → destroy machines, re-deploy

5. If **frontend workflow fails**:
   - Fetch logs, identify step
   - Common fixes:
     - `ENOENT package.json` → rootDirectory not set → patch Vercel project: `PATCH /v9/projects/{id}` with `{"rootDirectory": "frontend"}`
     - TypeScript type error → fix the generated TSX file
     - `NEXT_PUBLIC_API_URL` still old URL in bundle → the env var injection in workflow failed → verify the `env:` block has the correct value

6. After frontend succeeds, verify alias is live:
```bash
curl -s -o /dev/null -w "%{http_code}" https://{VERCEL_ALIAS}
```
   - If 401: SSO protection re-enabled → patch it off again
   - If 404: alias not assigned → assign it manually via API

7. Maximum 3 fix attempts per failure. After 3 attempts, report the error to the user with full context.

---

### AGENT 6: API Validator

**Goal**: Test every endpoint with realistic inputs. Fix any HTTP 400 errors.

**Instructions**:

For each function in SPEC:

1. Build a test payload using the default values from SPEC:
```python
payload = {param["name"]: param["default"] for param in function["params"]}
```

2. POST to the endpoint:
```bash
curl -s -X POST {API_URL}{endpoint} \
  -H "Content-Type: application/json" \
  -d '{payload_json}'
```

3. If response is HTTP 200 with `"success": true` → endpoint passes ✓

4. If response is HTTP 400 or `"success": false`:
   - Read the `error` field
   - Cross-reference with the R function's actual parameter names and types
   - **Common mistakes to check**:
     - Parameter sent as boolean but R expects numeric (e.g. `meanRatio: true` vs `alternative: 0.5`)
     - Parameter name mismatch between frontend and R function (e.g. `mean_diff` vs `alternative`)
     - Vector parameter sent as scalar when R requires vector
     - Missing required parameter with no default in R
     - Value out of valid range (e.g. `alpha > 1`)
   - Fix the corresponding endpoint in `plumber.R`
   - Push the fix, wait for re-deploy (monitor health check)
   - Retry the test

5. Also test edge cases:
   - Empty body `{}` → should return 400 with helpful error, not 500
   - Missing optional params → should use R defaults gracefully

6. Report all results:
```
✓ POST /design          → 200 success
✓ POST /sample-size/means → 200 success
✗ POST /simulation/means  → 400 "meanRatio must be logical" → FIXED → ✓
```

---

### AGENT 7: Frontend Validator

**Goal**: Verify the live frontend is correctly wired to the API.

**Instructions**:

1. **Check correct API URL is baked in**:
```bash
# Find the page bundle URL from the HTML
PAGE_BUNDLE=$(curl -s {FRONTEND_URL} | grep -o 'static/chunks/app/page[^"]*' | head -1)
# Check it contains the fly.dev URL, not any old URL
curl -s "{FRONTEND_URL}/_next/{PAGE_BUNDLE}" | grep -o '{FLY_APP}[^"]*' | head -3
```
   - If it contains an old URL (onrender.com, etc.): the build used stale env → force redeploy with correct env var

2. **Check CORS from frontend origin**:
```bash
curl -s -X OPTIONS {API_URL}/health \
  -H "Origin: {FRONTEND_URL}" \
  -H "Access-Control-Request-Method: POST" \
  -o /dev/null -w "%{http_code}"
```
   - Must return 204. If not: CORS filter missing from plumber.R → fix and redeploy

3. **Verify Vercel SSO is disabled**:
```bash
curl -s -o /dev/null -w "%{http_code}" {FRONTEND_URL}
```
   - Must return 200. If 401: disable SSO via Vercel API

4. **Verify stable alias points to latest deployment**:
```bash
curl -s "https://api.vercel.com/v2/aliases/{VERCEL_ALIAS}" \
  -H "Authorization: Bearer {VERCEL_TOKEN}"
```
   - If alias points to old deployment: re-assign to latest

5. **Report final status**:
```
✓ API live:        {API_URL}
✓ API URL in bundle: confirmed {FLY_APP}.fly.dev
✓ CORS:            preflight 204
✓ Frontend live:   {FRONTEND_URL} (HTTP 200)
✓ All {N} endpoints validated (no HTTP 400s)
✓ GitHub repo:     https://github.com/{GITHUB_USER}/{REPO_NAME}

Your web app is live at: {FRONTEND_URL}
```

---

## Error Recovery Rules

- If any agent fails, do not skip — fix and retry that agent before proceeding
- Maximum 3 fix attempts per agent before escalating to user
- When fixing: push only the changed file(s), do not regenerate everything
- Always re-run the smoke test after a Dockerfile fix before re-deploying
- Keep a running log of what was fixed so the user can see the full history

## Important Notes

- Never use `docker/setup-buildx-action` — use plain `docker build`. BuildKit stores images in its own cache not visible to `docker run` or `flyctl --local-only`
- Never use `--detach` without first verifying the machine isn't healthy (would cause downtime)
- Never use GHCR as intermediate registry — `flyctl --local-only` pushes directly to Fly.io registry
- Always set `min_machines_running = 1` and `auto_stop_machines = false` — prevents cold start timeouts
- Always load the R package eagerly at startup in plumber.R — lazy loading causes first-request timeouts
- The `/health` endpoint must never call any package functions — it must respond instantly
- Always verify `NEXT_PUBLIC_API_URL` is baked into the JS bundle after deploy — check the actual bundle file
