import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { staffDashboardRoute } from '../../lib/routes';

export default function DashboardRedirect() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const role = user?.role || 'mozo';
    navigate(staffDashboardRoute(role), { replace: true });
  }, [user, navigate]);

  return null;
}
