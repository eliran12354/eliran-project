# Map My Home View

A modern property mapping application built with React, TypeScript, and Vite.

## Features

- Interactive property mapping
- Property listings and search
- Modern UI with shadcn/ui components
- Responsive design
- Hebrew language support

## Technologies Used

This project is built with:

- **Vite** - Fast build tool and development server
- **TypeScript** - Type-safe JavaScript
- **React** - UI library
- **shadcn/ui** - Modern UI components
- **Tailwind CSS** - Utility-first CSS framework
- **Leaflet** - Interactive maps
- **React Router** - Client-side routing

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <YOUR_GIT_URL>
cd map-my-home-view
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:8080`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Google Maps API Key (Required for /map page)
# Get your API key from: https://console.cloud.google.com/google/maps-apis
# Make sure to enable "Maps JavaScript API" for your project
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Backend API URL (Optional, default: http://localhost:3000)
VITE_API_URL=http://localhost:3000

# GovMap API Token (Optional)
VITE_GOVMAP_TOKEN=your_govmap_token_here

# Supabase Configuration (Optional, has defaults)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Google Maps Setup

The map at `/map` (מפת יעודי קרקע) uses Google Maps via `@vis.gl/react-google-maps`.

1. **Get a Google Maps API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
   - Create a new project or select an existing one
   - Enable the following APIs:
     - **Maps JavaScript API** (required)
     - **Places API** (required for address search)
     - **Geocoding API** (required for address search)
   - Create credentials (API Key)
   - (Optional) Restrict the API key to your domain for security

2. **Add the key to `.env.local`:**
   - Create a file named `.env.local` in the project root
   - Add: `VITE_GOOGLE_MAPS_API_KEY=your_api_key_here`
   - Replace `your_api_key_here` with your actual API key

3. **Restart the dev server:**
   ```bash
   npm run dev
   ```

4. **Note:** If the API key is missing, the map will display a helpful error message with instructions.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   └── ...             # Custom components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
└── main.tsx           # Application entry point
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.