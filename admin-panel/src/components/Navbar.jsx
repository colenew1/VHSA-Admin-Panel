import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;
  
  const navClass = (path) => `
    px-4 py-2 rounded-lg font-medium transition-colors
    ${isActive(path) 
      ? 'bg-blue-600 text-white' 
      : 'text-gray-700 hover:bg-gray-100'
    }
  `;
  
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <h1 className="text-xl font-bold text-blue-600">
            VHSA Screening Admin
          </h1>
          
          <nav className="flex gap-2">
            <Link to="/dashboard" className={navClass('/dashboard')}>
              Dashboard
            </Link>
            <Link to="/students" className={navClass('/students')}>
              Students
            </Link>
            <Link to="/incomplete" className={navClass('/incomplete')}>
              Incomplete
            </Link>
            <Link to="/reports" className={navClass('/reports')}>
              Reports
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

