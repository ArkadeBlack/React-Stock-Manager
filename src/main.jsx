import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx';
import { AppProvider } from './context/AppProvider.jsx';
import { StockProvider } from './context/StockContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <LanguageProvider>
        <NotificationProvider>
          <StockProvider>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </StockProvider>
        </NotificationProvider>
      </LanguageProvider>
    </AppProvider>
  </StrictMode>,
)
