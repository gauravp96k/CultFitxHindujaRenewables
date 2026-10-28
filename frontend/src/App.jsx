import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Login from './pages/Login';
import Home from './pages/Home';
import CompareMatrix from './pages/CompareMatrix';
import OptInForm from './pages/OptInForm';
import MyRequests from './pages/MyRequests';
import GymLocator from './pages/GymLocator';
import Policy from './pages/Policy';
import HrConsole from './pages/HrConsole';
import { isAdminRole } from './lib/wellness';

const VIEWS = ['home', 'compare', 'form', 'my', 'gyms', 'policy', 'hr'];

function MainApp() {
  const { token, user } = useAuth();
  const [currentView, setCurrentView] = useState('home');
  const [city, setCity] = useState('Mumbai');
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [activePackage, setActivePackage] = useState(null);

  const isAdmin = isAdminRole(user?.role);

  // Clean slate after logout
  useEffect(() => {
    if (!token) {
      setCurrentView('home');
      setSelectedForCompare([]);
      setActivePackage(null);
    }
  }, [token]);

  const go = (view) => {
    const next = VIEWS.includes(view) ? view : 'home';
    setCurrentView(next === 'hr' && !isAdmin ? 'home' : next);
    window.scrollTo({ top: 0 });
  };

  const changeCity = (c) => {
    setCity(c);
    setSelectedForCompare([]);
  };

  const optIn = (pkg) => {
    setActivePackage({ ...pkg, city: pkg.city || city });
    setCurrentView('form');
    window.scrollTo({ top: 0 });
  };

  if (!token) {
    return <Login onSuccess={(role) => setCurrentView(isAdminRole(role) ? 'hr' : 'home')} />;
  }

  // HR console has its own sidebar layout (wireframe)
  if (currentView === 'hr' && isAdmin) {
    return <HrConsole onExit={() => go('home')} />;
  }

  const view = currentView === 'form' && !activePackage ? 'home' : currentView;

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <Navbar currentView={view} setCurrentView={go} compareCount={selectedForCompare.length} />

      {view === 'home' && (
        <Home
          city={city}
          setCity={changeCity}
          selectedForCompare={selectedForCompare}
          setSelectedForCompare={setSelectedForCompare}
          onCompare={() => go('compare')}
          onOptIn={optIn}
        />
      )}

      {view !== 'home' && (
        <main className="mx-auto w-full max-w-7xl flex-1 p-6">
          {view === 'compare' && (
            <CompareMatrix
              city={city}
              selectedIds={selectedForCompare}
              setSelectedIds={setSelectedForCompare}
              setCurrentView={go}
              setActivePackage={optIn}
            />
          )}
          {view === 'form' && <OptInForm activePackage={activePackage} setCurrentView={go} />}
          {view === 'my' && <MyRequests setCurrentView={go} />}
          {view === 'gyms' && <GymLocator defaultCity={city} />}
          {view === 'policy' && <Policy setCurrentView={go} />}
        </main>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
