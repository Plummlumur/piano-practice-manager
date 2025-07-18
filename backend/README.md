# Con Bravura Backend API

Backend API for the Con Bravura Practice & Repertoire Assistant, a classical music practice management application.

## Features

- **RESTful API** with comprehensive endpoints for pieces, exercises, sessions, and statistics
- **JWT Authentication** with secure user management
- **MariaDB Database** with optimized schema and relationships
- **Input Validation** using express-validator
- **Logging** with Winston for comprehensive error tracking
- **Security** with Helmet, CORS, and rate limiting
- **Statistics & Analytics** with detailed practice tracking
- **Data Export** capabilities for user data portability

## Tech Stack

- **Node.js** with Express.js framework
- **MariaDB** database with connection pooling
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Winston** for logging
- **Express Validator** for input validation
- **Helmet** for security headers
- **CORS** for cross-origin resource sharing

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MariaDB (v10.5 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository and navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database credentials and configuration.

4. **Initialize the database:**
   ```bash
   npm run db:init
   ```

5. **Seed the database with sample data (optional):**
   ```bash
   npm run db:seed
   ```

6. **Start the server:**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

The API will be available at `http://localhost:3000`

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password
- `POST /api/auth/logout` - Logout user

### Pieces Endpoints

- `GET /api/pieces` - Get all pieces for user
- `GET /api/pieces/:id` - Get piece by ID
- `POST /api/pieces` - Create new piece
- `PUT /api/pieces/:id` - Update piece
- `DELETE /api/pieces/:id` - Delete piece
- `GET /api/pieces/status/:status` - Get pieces by status
- `POST /api/pieces/:id/play` - Mark piece as played

### Exercises Endpoints

- `GET /api/exercises` - Get all exercises for user
- `GET /api/exercises/:id` - Get exercise by ID
- `POST /api/exercises` - Create new exercise
- `PUT /api/exercises/:id` - Update exercise
- `DELETE /api/exercises/:id` - Delete exercise
- `POST /api/exercises/:id/practice` - Mark exercise as practiced

### Sessions Endpoints

- `GET /api/sessions` - Get all sessions for user
- `GET /api/sessions/:id` - Get session by ID
- `POST /api/sessions` - Create new session
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session
- `GET /api/sessions/range/:from/:to` - Get sessions by date range

### Statistics Endpoints

- `GET /api/statistics/dashboard` - Get dashboard statistics
- `GET /api/statistics/practice/:days` - Get practice statistics for N days
- `GET /api/statistics/pieces` - Get piece statistics
- `GET /api/statistics/exercises` - Get exercise statistics
- `GET /api/statistics/monthly/:year/:month` - Get monthly practice summary
- `GET /api/statistics/streak` - Get practice streak information

### User Endpoints

- `GET /api/users/preferences` - Get user preferences
- `PUT /api/users/preferences` - Update user preferences
- `GET /api/users/activity` - Get user activity summary
- `GET /api/users/profile/summary` - Get user profile summary
- `GET /api/users/export` - Export user data
- `DELETE /api/users/account` - Delete user account

## Database Schema

The database includes the following main tables:

- **users** - User accounts and authentication
- **piano_pieces** - Musical pieces in user's repertoire
- **finger_exercises** - Technical exercises
- **training_sessions** - Practice sessions
- **session_piano_pieces** - Junction table for session-piece relationships
- **session_finger_exercises** - Junction table for session-exercise relationships
- **practice_statistics** - Aggregated practice statistics
- **user_preferences** - User preferences and settings
- **api_tokens** - API authentication tokens

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error type",
  "message": "Human readable error message",
  "details": [] // Optional validation details
}
```

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm run test` - Run tests
- `npm run db:init` - Initialize database schema
- `npm run db:seed` - Seed database with sample data

### Environment Variables

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=con_bravura
DB_USER=root
DB_PASSWORD=your_password
DB_CONNECTION_LIMIT=10

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development

# Security
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:8080
```

## Security Features

- **Password Hashing** with bcryptjs
- **JWT Authentication** with configurable expiration
- **Input Validation** on all endpoints
- **Rate Limiting** to prevent abuse
- **CORS Configuration** for secure cross-origin requests
- **Security Headers** with Helmet
- **SQL Injection Prevention** with parameterized queries

## Logging

The application uses Winston for comprehensive logging:

- **Console Logging** in development mode
- **File Logging** for production
- **Error Tracking** with stack traces
- **Request Logging** with Morgan

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.