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

3. Fill in your PostgreSQL connection and Auth config in `.env`:
```env
DATABASE_URL=postgresql://user:password@host:5432/database
DATABASE_SSL=true

JWT_SECRET=your-256-bit-plus-secret-at-least-32-characters-long
JWT_EXPIRY=1h

PORT=3000
CORS_ORIGIN=http://localhost:5173
```
- `DATABASE_URL`: Required. PostgreSQL connection string (Render, pgAdmin, local, etc.).
- `DATABASE_SSL`: `true` for managed providers (Render). Set `false` for a local Postgres without SSL.
- `JWT_SECRET`: Required for auth. Use a long random string (e.g. `openssl rand -base64 48`). Min 32 chars.
- `JWT_EXPIRY`: Token lifetime (e.g. `15m`, `1h`, `7d`). Default `1h`.

4. **Database schema:** The data layer talks to plain PostgreSQL via `pg` (see `src/config/database.ts`).
   Import your schema/data into the target database (e.g. via `pg_dump`/`pg_restore` or pgAdmin).
   The expected tables/columns are documented in `database.md`. PostGIS must be enabled for the
   geometry-backed tables (e.g. `land_use_mavat`, `parcel_ownership_new`).

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

### Auth (JWT)
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

