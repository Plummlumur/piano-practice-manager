# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Piano Practice Manager - a single-page web application for tracking piano practice sessions, pieces, and exercises. It's built with vanilla JavaScript and uses SQL.js for client-side data storage.

## Architecture

### Core Components
- **App (`js/app.js`)**: Main application controller handling navigation, view management, and global state
- **DatabaseManager (`js/database.js`)**: Handles all data operations using SQL.js with localStorage persistence
- **Component Architecture**: Modular components for each view (dashboard, calendar, pieces, exercises, sessions)

### Data Model
The application uses a relational database schema with these main tables:
- `piano_pieces`: Stores pieces with composer, status (In Training/Repertoire), play counters
- `finger_exercises`: Practice exercises with descriptions
- `training_sessions`: Practice sessions with duration and status
- Junction tables for session-piece/exercise associations
- `practice_statistics`: Daily practice time tracking

### View System
- Single-page application with hash-based routing
- Views are dynamically shown/hidden using CSS classes
- Each view has a corresponding component class that handles rendering and interactions

## Key Features

### Data Persistence
- Uses SQL.js for in-browser SQLite database
- Automatic saves to localStorage on data changes
- Sample data is inserted on first run

### UI/UX
- Responsive design with card and table view toggles
- Modal system for forms and detailed views
- Internationalization support (currently English only)
- Chart.js integration for practice statistics visualization

### Session Management
- Sessions can be planned or completed
- Completion automatically updates piece/exercise last-played dates
- Practice statistics are automatically calculated

## Development Workflow

Since this is a vanilla JavaScript application with no build process:

1. **Local Development**: Open `index.html` in a web browser
2. **Testing**: Manual testing in browser (no automated test suite)
3. **Debugging**: Use browser developer tools

## File Structure

```
Piano-App/
├── index.html           # Main HTML file
├── css/
│   └── styles.css       # All styles
├── js/
│   ├── app.js          # Main application controller
│   ├── database.js     # Database operations
│   ├── components/     # UI components
│   │   ├── calendar.js
│   │   ├── dashboard.js
│   │   ├── exercises.js
│   │   ├── modal.js
│   │   ├── pieces.js
│   │   └── sessions.js
│   └── lang/
│       └── en.js       # Language strings
```

## Common Operations

### Adding New Features
1. Update database schema in `database.js` if needed
2. Add new methods to relevant component classes
3. Update modal system if forms are needed
4. Add language strings to `lang/en.js`

### Database Changes
- Schema changes require database migration logic
- All database operations go through `DatabaseManager` class
- Always call `saveToLocalStorage()` after data modifications

### UI Components
- Components follow a consistent pattern: render() method for initial display
- Use `window.app.refreshCurrentView()` to update UI after data changes
- Modal forms are handled by the `Modal` component class

## Dependencies

- **SQL.js**: Client-side SQLite database (loaded from CDN)
- **Chart.js**: Data visualization for practice statistics (loaded from CDN)
- No build tools or package managers required

## Notes

- No backend server required - everything runs in the browser
- Data is lost if localStorage is cleared
- Export/import functionality is partially implemented
- Service worker support is planned but not implemented
- No automated testing framework in place