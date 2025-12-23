# Repository Guidelines

## Project Structure & Module Organization
This repository is a Jekyll-based personal site built on the al-folio theme.
Key paths:
- `_config.yml` holds site-wide configuration.
- Content lives in `_pages/`, `_posts/`, `_projects/`, and `_news/` (Markdown with front matter).
- Data files are in `_data/` (YAML) and bibliography in `_bibliography/`.
- Layouts and partials are in `_layouts/` and `_includes/`.
- Styling is in `_sass/` and entrypoint `assets/css/main.scss`.
- Static assets (images, JS, PDFs) are under `assets/`.
- Custom Ruby plugins live in `_plugins/`.

## Build, Test, and Development Commands
- `bundle install`: install Ruby dependencies.
- `bundle exec jekyll serve --lsi`: run the site locally with incremental serve.
- `bundle exec jekyll build --lsi`: generate the static site into `_site/`.
- `docker-compose up`: run using the prebuilt Docker image (recommended on Windows).
- `docker-compose -f docker-local.yml up`: build and run a local Docker image.
- `bin/cibuild`: CI-friendly build wrapper (calls `jekyll build --lsi`).

## Coding Style & Naming Conventions
- Use 2-space indentation in SCSS and YAML; follow the existing style in `_sass/`.
- Keep Markdown files with YAML front matter at the top.
- File naming: posts in `_posts/` follow `YYYY-MM-DD-title.md`; news items use `_news/announcement_<n>.md`.
- Prefer lowercase, kebab-case for new content filenames and asset names unless matching existing patterns.

## Testing Guidelines
There is no dedicated test suite. Validate changes by building the site:
- `bundle exec jekyll build --lsi` or `bin/cibuild`.
Check the console for build warnings or Liquid errors.

## Commit & Pull Request Guidelines
- Recent commit history uses short, simple summaries (e.g., `update`); keep messages concise and imperative.
- For feature or bug work, open or reference an issue and mention it in the PR, per `CONTRIBUTING.md`.
- For minor documentation or content fixes, direct PRs are acceptable.

## Configuration Tips
- Update site-wide settings in `_config.yml` before changing layouts.
- Keep generated files out of version control; `_site/` is build output.
