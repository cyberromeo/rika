import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// NOTE: must be 'framework7/lite' — framework7-react imports the same module,
// and the plugin has to be registered on that exact class instance.
import Framework7 from 'framework7/lite';
import Framework7React from 'framework7-react';
import { initTelegram } from './telegram';
import App from './App';
// Framework7 core + icons. Imported BEFORE index.css so the app's own rules
// win wherever the two overlap (see the F7 overrides block in index.css).
import 'framework7/css';
import 'framework7-icons/css/framework7-icons.css';
import './index.css';

Framework7.use(Framework7React);

// Initialize Telegram WebApp
const tg = initTelegram();

// Apply Telegram theme CSS variables if available
if (tg?.themeParams) {
  const root = document.documentElement;
  const params = tg.themeParams;
  if (params.bg_color) root.style.setProperty('--tg-theme-bg-color', params.bg_color);
  if (params.text_color) root.style.setProperty('--tg-theme-text-color', params.text_color);
  if (params.hint_color) root.style.setProperty('--tg-theme-hint-color', params.hint_color);
  if (params.link_color) root.style.setProperty('--tg-theme-link-color', params.link_color);
  if (params.button_color) root.style.setProperty('--tg-theme-button-color', params.button_color);
  if (params.button_text_color) root.style.setProperty('--tg-theme-button-text-color', params.button_text_color);
  if (params.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', params.secondary_bg_color);
  if (params.header_bg_color) root.style.setProperty('--tg-theme-header-bg-color', params.header_bg_color);
  if (params.accent_text_color) root.style.setProperty('--tg-theme-accent-text-color', params.accent_text_color);
  if (params.section_bg_color) root.style.setProperty('--tg-theme-section-bg-color', params.section_bg_color);
  if (params.section_header_text_color) root.style.setProperty('--tg-theme-section-header-text-color', params.section_header_text_color);
  if (params.subtitle_text_color) root.style.setProperty('--tg-theme-subtitle-text-color', params.subtitle_text_color);
  if (params.destructive_text_color) root.style.setProperty('--tg-theme-destructive-text-color', params.destructive_text_color);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
