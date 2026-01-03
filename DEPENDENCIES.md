# Project Dependencies

## Runtime Dependencies

*Currently none. All core logic uses Node.js standard libraries.*

## Development Dependencies

### `electron`
- **Purpose**: Core framework for building the cross-platform desktop application.
- **Justification**: Allows us to use web technologies (HTML/CSS/JS) for the UI while having access to the filesystem for data storage. Matches the architecture of the associated `PromptWaffle` project.

## Future Dependencies (Planned)

### `electron-store` (Possible)
- **Purpose**: For simple configuration storage.
- **Justification**: Easier than manually managing JSON files for app-wide settings.
