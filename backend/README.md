# Backend API - Map My Home

Backend API server for map-my-home-view application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

3. Fill in your Supabase credentials and Auth config in `.env`:
```env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

JWT_SECRET=your-256-bit-plus-secret-at-least-32-characters-long
JWT_EXPIRY=1h

PORT=3000
CORS_ORIGIN=http://localhost:5173
```
- `JWT_SECRET`: Required for auth. Use a long random string (e.g. `openssl rand -base64 48`). Min 32 chars.
- `JWT_EXPIRY`: Token lifetime (e.g. `15m`, `1h`, `7d`). Default `1h`.

4. **Auth users table (Custom JWT):** If you use custom auth (no Supabase Auth), run the migration in Supabase SQL Editor:
   - Project root: `create_auth_users_standalone.sql`
   - This creates a standalone `public.users` table with `id`, `email`, `password_hash`, `role` (replacing any Supabase Auth–based `users` table).

5. Run in development mode:
```bash
npm run dev
```

6. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

### Health
- `GET /health` - Health check

### Auth (JWT, no Supabase Auth)
- `POST /api/auth/signup` - Register. Body: `{ email, password }`. Returns `{ token, user }`.
- `POST /api/auth/login` - Login. Body: `{ email, password }`. Returns `{ token, user }`.
- `GET /api/me` - Current user (requires `Authorization: Bearer <token>`).
- `GET /api/admin/users` - List users (admin only; requires Bearer token).

### Parcels
- `GET /api/parcels` - Get all parcels (with optional viewport filter)
  - Query params: `min_lat`, `max_lat`, `min_lng`, `max_lng`, `limit`
  - Example: `/api/parcels?min_lat=31&max_lat=32&min_lng=34&max_lng=35&limit=1000`
  
- `GET /api/parcels/viewport` - Get parcels within viewport (required params)
  - Query params: `min_lat`, `max_lat`, `min_lng`, `max_lng`, `limit`
  - Example: `/api/parcels/viewport?min_lat=31&max_lat=32&min_lng=34&max_lng=35`
  
- `GET /api/parcels/count` - Get total parcels count

## Project Structure

```
backend/
├── src/
│   ├── config/        # Configuration files
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   ├── controllers/   # Request handlers
│   └── middleware/    # Express middleware
├── package.json
├── tsconfig.json
└── .env.example
```

