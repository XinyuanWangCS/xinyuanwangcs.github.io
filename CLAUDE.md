# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jekyll-based academic personal website built on the [al-folio](https://github.com/alshedivat/al-folio) theme. Generates a static site deployed to GitHub Pages.

## Build & Development Commands

```bash
bundle install                          # Install Ruby dependencies
bundle exec jekyll serve --lsi          # Local dev server with live reload
bundle exec jekyll build --lsi          # Production build (output: _site/)
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
- **Styling:** `assets/css/main.scss` is the entrypoint, importing from `_sass/`. `_themes.scss` defines CSS custom properties for light/dark modes. `_base.scss` contains component styles

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
- `_sass/_themes.scss` — light/dark theme CSS variables
- `_sass/_base.scss` — main component styles
- `_layouts/bib.html` — bibliography entry template (complex Liquid logic)
- `_data/cv.yml` — structured CV data
- `_data/coauthors.yml` — co-author metadata for publication rendering
