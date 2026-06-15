import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AynisProvider } from './context/AynisContext';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import { Home } from './pages/Home';
import Sorteos from './pages/Sorteos';
import SorteoDetail from './pages/SorteoDetail';
import Verify from './pages/Verify';
import Auth from './pages/Auth';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import MisAynis from './pages/MisAynis';
import MisTickets from './pages/MisTickets';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AynisProvider>
          <MainLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/sorteos" element={<Sorteos />} />
              <Route path="/sorteos/:id" element={<SorteoDetail />} />
              <Route path="/verificar" element={<Verify />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/mis-aynis" element={<MisAynis />} />
              <Route path="/mis-tickets" element={<MisTickets />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </MainLayout>
        </AynisProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
