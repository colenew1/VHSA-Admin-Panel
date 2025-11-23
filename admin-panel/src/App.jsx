import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// AUTH REMOVED: Rebuilding auth as separate system
// import { AuthProvider } from './contexts/AuthContext';
// import ProtectedRoute from './components/ProtectedRoute';
// import Login from './pages/Login';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import Import from './pages/Import';
import Export from './pages/Export';
import Advanced from './pages/Advanced';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* AUTH REMOVED: All routes are now public while we rebuild auth system */}
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="container mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/students" element={<Search />} />
              <Route path="/import" element={<Import />} />
              <Route path="/export" element={<Export />} />
              <Route path="/advanced" element={<Advanced />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

