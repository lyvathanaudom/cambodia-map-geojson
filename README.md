# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
components/  
├── 🗺️ maps/  
│   ├── 🌐 Map3DContainer.vue # Main container component  
│   │  
│   ├── 🧠 composables/ # Reusable Vue composables  
│   │   ├── 🎲 useThreeJS.ts # Three.js initialization and core functionality  
│   │   ├── 🎮 useMapControls.ts # Camera and orbit controls  
│   │   ├── 🖱️ useMapInteractions.ts # Click, hover, and navigation logic  
│   │   ├── 🗂️ useMapLayers.ts # Layer management (loading, styling)  
│   │   └── 🎬 useMapAnimations.ts # GSAP animations for transitions  
│   │  
│   ├── 🧮 utils/ # Utility functions  
│   │   ├── 🌍 geoUtils.ts # Geographic calculations and conversions  
│   │   ├── 🛠️ threeUtils.ts # Three.js helper functions  
│   │   └── 🏷️ labelUtils.ts # Text sprite generation and management  
│   │  
│   ├── 📂 types/ # TypeScript type definitions  
│   │   ├── 🗺️ mapTypes.ts # Interfaces for map data and configuration  
│   │   └── 📐 geoTypes.ts # GeoJSON and feature type definitions  
│   │  
│   └── 📑 constants/ # Configuration constants  
│       ├── ⚙️ mapSettings.ts # Default camera settings, colors, etc.  
│       └── 🧭 layerConfig.ts # Layer-specific settings  
