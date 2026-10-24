import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/inter';
import { store } from './app/store';
import { ThemeProvider } from './theme/ThemeProvider';
import { RealtimeProvider } from './realtime/RealtimeProvider';
import { ToastProvider } from './components/common/Toast';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <ToastProvider>
            <RealtimeProvider>
              <App />
            </RealtimeProvider>
          </ToastProvider>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </StrictMode>
);
