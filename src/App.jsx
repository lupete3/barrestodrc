import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useStore from './store/useStore';
import POS from './pages/POS';
import Admin from './pages/Admin';
import Login from './pages/Login';
import ReceiptPrinter from './components/ReceiptPrinter';

// Protected Route Components
const RequireAuth = ({ children }) => {
  const { currentUser } = useStore();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const RequireAdmin = ({ children }) => {
  const { currentUser } = useStore();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (currentUser.role !== 'admin') {
    alert("Accès refusé. Vous devez être gérant pour accéder à cette page.");
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  const { theme } = useStore();

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/" 
          element={
            <RequireAuth>
              <POS />
            </RequireAuth>
          } 
        />
        
        <Route 
          path="/admin" 
          element={
            <RequireAdmin>
              <Admin />
            </RequireAdmin>
          } 
        />
      </Routes>
      <ReceiptPrinter />
    </>
  );
}

export default App;
