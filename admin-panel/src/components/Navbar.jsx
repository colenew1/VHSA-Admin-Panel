import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const isActive = (path) => location.pathname === path;
  
  const tabs = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/students', label: 'Students' },
    { path: '/import', label: 'Import' },
    { path: '/export', label: 'Export' },
    { path: '/advanced', label: 'Advanced' },
  ];
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <h1 className="text-lg font-semibold text-gray-900">
            VHSA Screening Admin
          </h1>
          
          <div className="flex items-center gap-4">
            <nav className="flex gap-1">
              {tabs.map((tab) => (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`
                    px-4 py-2 text-sm font-medium transition-colors border-b-2
                    ${isActive(tab.path)
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
            
            <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
              {user && (
                <span className="text-sm text-gray-600">
                  {user.name}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

