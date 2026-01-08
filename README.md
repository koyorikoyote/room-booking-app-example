Room Booking Application

**Room Booking App** (`/room-booking-app/`) - Standalone React 18 + Express SSR application for managing meeting room reservations with visual floor plan interface, calendar-based booking, and conflict detection.

**Key Features:**

- **Visual Floor Plan Interface** - SVG-based floor plan showing four conference rooms (A, B, C, D) with interactive room selection
- **Calendar-Based Booking** - Year-view calendar with existing booking indicators showing time ranges and departments
- **Conflict Detection** - Real-time validation prevents double-bookings with detailed error messages
- **Recurring Bookings** - Weekly repetition patterns for bookings on specific weekdays (Monday-Friday)
- **Multi-language Support** - Full English/Japanese localization with language selector in header
- **Glass-Blue Theme** - Modern glassmorphism design aesthetic matching Manager App visual style
- **Mobile-Responsive** - Touch-friendly interface optimized for both desktop and mobile devices
- **Standalone Database** - Independent MySQL database (booking_app_db) separate from other projects
- **Type-Safe Operations** - Prisma-generated TypeScript types ensure consistency across SSR and client
- **SSR Performance** - Server-side rendering with optimized database queries for fast initial loads

**Architecture:**

```
React 18 SSR (room-booking-app) ↔ Express.js API ↔ MySQL Database (Prisma ORM)
```

**Data Flow:**

- Server-side rendering with initial data fetching via Prisma
- Client-side hydration with API endpoints for booking operations
- MySQL database stores users, rooms, departments, and booking records
- Prisma ORM provides type-safe database operations and automated migrations

**Security Model:**

- JWT tokens for session management and authentication
- Bcrypt password hashing for user credentials
- Input validation and sanitization at API layer
- Conflict detection prevents overlapping bookings
- Secure database operations through Prisma ORM

**Target Users:** Company employees who need to reserve meeting rooms for departmental meetings and events

## Universal Requirements

### Multi-language Support (Required for All Projects)

- **English/Japanese Localization** - All current and future projects must implement comprehensive i18n support for English and Japanese languages
- **Consistent Translation Patterns** - Use standardized localization libraries and file structures across projects
- **Cultural Adaptation** - Consider cultural differences in UI/UX design for Japanese users
