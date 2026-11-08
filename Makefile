# S.I.E.R.R.A site — developer + CI entrypoints.
# `make help` lists targets. Install deps with `make install` (uses pnpm; bun is
# only used as a script/test runner — `bun install` hangs behind this proxy).

.DEFAULT_GOAL := help
.PHONY: help install dev build preview check lint fmt fmt-check test test-browser \
        screenshots snapshot gen-assets verify ci clean

help: ## List targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies (pnpm)
	pnpm install

dev: ## Start the dev server
	pnpm run dev

build: ## Build the static site to dist/
	pnpm run build

preview: ## Preview the built site
	pnpm run preview

check: ## Type-check (astro check)
	pnpm run check

lint: ## Lint CSS/design tokens (stylelint guardrails)
	pnpm run lint

fmt: ## Format with prettier
	pnpm run fmt

fmt-check: ## Verify formatting
	pnpm run fmt:check

test: ## Unit tests (data layer) via bun
	bun test src/
	node --test scripts/desk-editor-gate.test.mjs

test-browser: ## A11y + smoke tests (Playwright)
	pnpm run test:visual

screenshots: ## Capture deterministic screenshots → tests/screenshots
	pnpm run screenshots

screenshots-live: ## Capture /live + home against the REAL feed → tests/screenshots/_live (needs preview)
	pnpm run screenshots:live

scenarios: ## Screenshot /live under synthetic hazard configs (needs a running preview)
	node scripts/scenario-shots.mjs

snapshot: ## Refresh the checked-in data.sierragridteam.org data snapshot
	pnpm run snapshot

gen-assets: ## Regenerate favicons / OG image / logo mark from the master logo
	pnpm run gen-assets

verify: check lint fmt-check test ## Fast pre-commit checks (no browser)

ci: check lint fmt-check test build test-browser ## Full CI pipeline

clean: ## Remove build + test artifacts
	rm -rf dist .astro test-results playwright-report
