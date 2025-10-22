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

## Google Maps on /map

The map at `/map` uses `@vis.gl/react-google-maps`.

Setup:

1. Enable the Google Maps JavaScript API and create an API key.
2. Add the key to a Vite env var named `VITE_GOOGLE_MAPS_API_KEY`.
   - Create `.env.local` in the project root:

```
VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY
```

3. Restart the dev server (`npm run dev`). If the key is missing, the map box will show a short message.

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