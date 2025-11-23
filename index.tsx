
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GlobalAuthProvider } from './components/context/GlobalAuthContext';
import 'recharts'; // Dummy import to satisfy dependency checker, recharts is loaded via script in production.

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GlobalAuthProvider>
      <App />
    </GlobalAuthProvider>
  </React.StrictMode>
);
