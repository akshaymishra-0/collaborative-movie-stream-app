# StreamTogether

A clean and modern React application for watching movies together with friends in synchronized streaming rooms.

## Features

- **Create & Join Rooms**: Generate unique room codes to watch movies with friends
- **Synchronized Playback**: Everyone stays perfectly in sync
- **Real-time Chat**: Discuss and react during the movie
- **File Upload**: Upload local video files to watch together
- **URL Streaming**: Load videos from URLs (YouTube, Vimeo, etc.)
- **Video Controls**: Play/pause, volume, playback speed, fullscreen
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Frontend**: React 18 with Vite
- **UI Components**: Radix UI primitives with custom styling
- **Styling**: Tailwind CSS with custom animations
- **Video Player**: React Player for multimedia support
- **Routing**: React Router DOM
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. Clone or download the project
2. Navigate to the project directory:
   ```bash
   cd "collabmovie starter 2"
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and visit `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── ui/                    # Reusable UI components
│   │   └── streaming-room/        # Room-specific components
│   ├── pages/                     # Main page components
│   ├── lib/                       # Utility functions
│   └── index.css                  # Global styles
├── public/                        # Static assets
├── index.html                     # HTML template
├── package.json                   # Dependencies and scripts
├── tailwind.config.js            # Tailwind CSS configuration
├── postcss.config.js             # PostCSS configuration
└── vite.config.js                # Vite configuration
```

## Usage

1. **Creating a Room**: Click "Create Room", enter a room name, and share the generated room code
2. **Joining a Room**: Click "Join Room" and enter the room code provided by the host
3. **Uploading Movies**: Use the "Upload" button to select local video files
4. **Loading from URL**: Use "Load URL" to stream from video URLs
5. **Chatting**: Use the chat sidebar to communicate with other viewers

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

This project is open source and available under the MIT License.
