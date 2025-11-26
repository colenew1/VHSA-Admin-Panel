import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import DashboardNew from './pages/DashboardNew';
import DashboardLegacy from './pages/Dashboard';
import Search from './pages/Search';
import Import from './pages/Import';
import Export from './pages/Export';
import Advanced from './pages/Advanced';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // 30 seconds
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-gray-50">
              <Navbar />
              <main className="container mx-auto px-4 py-6">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardNew />} />
                  <Route path="/dashboard-legacy" element={<DashboardLegacy />} />
                  <Route path="/students" element={<Search />} />
                  <Route path="/import" element={<Import />} />
                  <Route path="/export" element={<Export />} />
                  <Route path="/advanced" element={<Advanced />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
