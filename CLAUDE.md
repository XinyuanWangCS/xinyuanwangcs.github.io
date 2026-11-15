# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jekyll-based academic personal website built on the [al-folio](https://github.com/alshedivat/al-folio) theme. Generates a static site deployed to GitHub Pages.

## Build & Development Commands

```bash
bundle install                          # Install Ruby dependencies
bundle exec jekyll serve                 # Local development server
bundle exec jekyll build                 # Production build (output: _site/)
docker-compose up                       # Run via Docker (prebuilt image)
docker-compose -f docker-local.yml up   # Build and run local Docker image
bin/cibuild                             # CI build wrapper
```

There is no test suite. Validate changes by running `bundle exec jekyll build --lsi` and checking for build warnings or Liquid errors.

## Architecture

**Build pipeline:** Markdown/BibTeX content → Jekyll + plugins → Liquid templates → SCSS compilation → static HTML/CSS/JS in `_site/`

Key processing layers:
- **Content sources:** `_pages/*.md` (main pages), `_news/*.md` (announcements), `_bibliography/papers.bib` (publications), `_data/*.yml` (CV, co-authors, venues)
- **Jekyll plugins:** `jekyll-scholar` processes BibTeX into publication listings; `jekyll-archives` generates year/tag/category pages; custom plugins in `_plugins/`
- **Templates:** `_layouts/` defines page structures (notably `bib.html` for bibliography rendering); `_includes/` has reusable components (header, footer, social links)
- **Styling:** `assets/css/main.scss` is the entrypoint, `@use`-ing modules from `_sass/`: `_tokens.scss` (CSS custom properties; light is the default theme, dark via `[data-theme="dark"]`), `_fonts.scss` (self-hosted fonts in `assets/fonts/`), `_base.scss` (reset, quiet gradient wallpaper on `html`, grain, links), `_glass.scss` (the glass material shared by the dock, cards, sheets and chips), `_layout.scss` (floating dock, sections, footer), and per-area modules (`_home`, `_news`, `_publications`, `_cv`, `_motion`). No Bootstrap/jQuery
- **Scripts:** `assets/js/site.js` is the only script (theme toggle, liquid glass, pointer-driven rim light, dock lens, publication panels, scroll reveal); the theme is set by an inline snippet in `_includes/head.html` before first paint
- **Glass:** each glass surface gets a `.glass__surface` child (injected by `site.js`) holding a copy of the wallpaper aligned with the page; it is refracted across a curved bezel by an SVG displacement filter in Chromium and frosted with a CSS blur elsewhere. These are static element filters, so scrolling stays cheap; only the fixed dock refracts its live backdrop. The wallpaper itself is two soft CSS radial gradients (`--wp-a`, `--wp-b` in `_tokens.scss`)

**Configuration hierarchy:** `_config.yml` controls site metadata, enabled plugins, feature flags (`enable_darkmode`, `enable_math`, etc.), library versions, and jekyll-scholar settings. Edit this before modifying layouts.

## Coding Conventions

- 2-space indentation in SCSS and YAML
- Markdown files require YAML front matter
- Posts follow `YYYY-MM-DD-title.md` naming; news items use `announcement_<n>.md`
- Lowercase kebab-case for new content filenames and assets
- Commit messages: short, imperative (e.g., "update", "beautify", "remove")

## Key Files

- `_config.yml` — all site-wide settings, plugin config, feature flags
- `_bibliography/papers.bib` — BibTeX source for publications page
- `_sass/_tokens.scss` — colors, fonts, spacing for both themes
- `_layouts/about.html` — homepage (hero, news, selected publications)
- `_layouts/bib.html` — bibliography entry template (complex Liquid logic)
- `_data/cv.yml` — structured CV data
- `_data/coauthors.yml` — co-author metadata for publication rendering
