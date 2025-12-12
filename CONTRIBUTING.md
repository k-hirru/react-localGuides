# Contributing

## Branch naming

Create branches from `main` using:

- `feat/...` for new features
- `fix/...` for bug fixes
- `docs/...` for documentation changes
- `test/...` for test-only changes
- `chore/...` for maintenance

Examples:

- `feat/offline-mutation-queue`
- `fix/review-card-avatar-fallback`
- `docs/add-development-guide`

## Commit messages

We follow a Conventional Commit style:

```text
<type>(optional-scope): short, imperative subject

Optional longer body describing what and why, wrapped at ~72 chars.
```

Common types:

- `feat` – new feature
- `fix` – bug fix
- `docs` – docs only
- `test` – tests only
- `chore` – tooling/infra
- `refactor` – code change without behaviour change

Examples:

```text
docs: add development and contributing guides

- Add docs/DEVELOPMENT.md
- Add CONTRIBUTING.md
- Link both from README
```

```text
fix(reviews): handle missing avatar urls safely
```

Multi-line commits are preferred for anything non-trivial so the body can list bullets.

## Before opening a PR

- Make sure tests pass:
  ```bash
  npm test
  ```
- Run lint and format:
  ```bash
  npm run lint
  npm run format
  ```
- Update docs if you changed public behaviour, env vars, or APIs.

## PR checklist (informal)

- [ ] Good, descriptive title (same style as a commit subject)
- [ ] Summary of the change and why
- [ ] Notes on how you tested it
- [ ] Screenshots or videos for any visible UI change

Keeping to these conventions makes the history easy to read and review over time.
