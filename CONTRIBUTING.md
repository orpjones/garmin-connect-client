# Contributing

Thank you for your interest in contributing to this project!

## Development Setup

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Create a `.env` file in the project root with your Garmin Connect credentials:
   ```
   GARMIN_USERNAME=your-email@example.com
   GARMIN_PASSWORD=your-password
   GARMIN_MFA_USERNAME=mfa-email@example.com  # Optional, for MFA tests
   GARMIN_MFA_PASSWORD=mfa-password            # Optional, for MFA tests
   ```

## Running Tests and Checks

Before submitting a PR, ensure all checks pass:

```bash
npm run lint            # Check linting
npm run format:check    # Check formatting
npm run build           # Build the project
npm run test:run        # Run all tests (requires credentials in .env)
```

## Submitting a Pull Request

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all checks pass locally (see above)
4. Submit your PR

### Tests on Fork PRs

Integration tests that require Garmin Connect credentials are **not run** on PRs from forks due to practical limitations:

- **Credential variety**: Contributors may have basic credentials OR only MFA credentials (which require interactive input and cannot run in CI)
- **Data availability**: Even with basic credentials, there's no guarantee about what data is associated with those accounts (e.g., golf activities, activity history), which could lead to test gaps
- **GitHub security**: Fork PRs cannot access repository secrets, which adds another layer of complexity

**What runs on fork PRs:**
- ✅ Linting
- ✅ Format checking  
- ✅ Type checking
- ✅ Build verification

**Safety net:** A post-merge build runs automatically after PRs are merged to `main` with full test coverage, so any issues will be caught even if they merge without tests running.

**For local development:** You can run all tests locally using your own credentials in a `.env` file (see Development Setup above).

## Pull Request Process

1. All PRs must pass CI checks (lint, format, type-check, build)
2. At least one approval is required before merging
3. PRs should be kept up to date with `main` branch

## Questions?

Feel free to open an issue if you have questions or need help!

