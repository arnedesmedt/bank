import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const router = (
  <BrowserRouter>
    <Routes>
      {/* Add routes for new list pages */}
      <Route path="/bank-accounts" element={<div>Bank Accounts List Page</div>} />
      <Route path="/labels" element={<div>Labels List Page</div>} />
      {/* Existing routes */}
    </Routes>
  </BrowserRouter>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {router}
  </StrictMode>
);
