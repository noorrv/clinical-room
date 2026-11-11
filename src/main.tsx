import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import App from './App';
import { watchScrolling } from './lib/motion';
import { bakeTextures } from './lib/textures';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// after the first paint: turn the drawn SVG textures into bitmaps (same look, far cheaper to scroll)
bakeTextures();
watchScrolling();
