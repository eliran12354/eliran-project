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

3. Fill in your Supabase credentials in `.env`:
```env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

4. Run in development mode:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

### Health
- `GET /health` - Health check

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

