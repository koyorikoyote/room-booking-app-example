import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import '../shared/utils/i18n';

const container = document.getElementById('root');
if (!container) {
    throw new Error('Root element not found');
}

const appElement = (
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>
);

// Check if we're hydrating from SSR or doing client-side rendering
if (container.hasChildNodes()) {
    // Hydrate from SSR
    hydrateRoot(container, appElement);
} else {
    // Client-side rendering
    const root = createRoot(container);
    root.render(appElement);
}
