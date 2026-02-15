# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2026-02-15

### Changed
- Updated schema and tests for golf scorecards
- Prevent concurrent publish attempts

## [1.0.2] - 2026-01-29

### Changed
- **BREAKING**: Renamed `getRecentGolfRounds()` to `getGolfRounds()` for consistency and clarity

### Added
- `startTime` field to `GolfRound` interface - ISO 8601 timestamp of when the round started
- Documentation for `getGolfRounds()` explaining it's a convenience method that combines `getGolfActivities()` and `getGolfScorecardDetail()`

## [1.0.1] - 2026-01-28

### Added
- Expanded `ActivityTypeKey` enum with all 150+ activity types from Garmin Connect
- Expanded `EventTypeKey` enum with new event types.

## [1.0.0] - 2026-01-28

### Changed
- **BREAKING**: Refactored golf API surface for better separation of concerns
  - `getGolfActivities()` now returns raw `GolfActivitiesPage` without course enrichment
  - Removed automatic course summary enrichment from `getGolfActivities()`
  - Methods `getGolfCourses()` and `getGolfCourseSummaries()` have been removed or refactored
  - **Migration**: Use `getGolfScorecardDetail()` to get detailed scorecard information with course snapshots, or use `getRecentGolfRounds()` for combined round data

### Added
- `getGolfScorecardDetail(scorecardId, locale)` - New method to fetch detailed scorecard information with course snapshot
- `getRecentGolfRounds(page, perPage, locale)` - New method that combines golf activities and scorecard details for complete round information
- New types: `GolfScorecardDetailWithSnapshot`, `GolfRound`, `GolfRoundsPage`
- `ActivityTypeKey.MOUNTAINEERING` - Added mountaineering activity type key
- `EventTypeKey.RECREATION` - Added recreation event type key
- CHANGELOG.md to track all future changes
- Proper semantic versioning scripts (patch, minor, major)

## [0.1.13] - Previous Release

Previous versions (0.1.1 - 0.1.12) were published during initial development.

