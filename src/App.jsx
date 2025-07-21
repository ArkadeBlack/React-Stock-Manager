import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppContext } from './context/AppProvider';
import ComponenteInicio from './components/ComponenteInicio';
import Dashboard from './components/Dashboard';
import Login from './components/Login';

// Un componente para proteger rutas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAppContext();

  if (loading) {
    // Muestra un indicador de carga mientras se verifica el estado de autenticación
    return <div>Cargando...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Componente para redirigir si ya está autenticado
const RedirectIfAuthenticated = ({ children }) => {
  const { isAuthenticated, loading } = useAppContext();

  if (loading) {
    return <div>Cargando...</div>;
  }

  return isAuthenticated ? <Navigate to="/dashboard" /> : children;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route 
          path="/login" 
          element={
            <RedirectIfAuthenticated>
              <Login />
            </RedirectIfAuthenticated>
          } 
        />
        <Route path="/inicio" element={<ComponenteInicio />} />
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
