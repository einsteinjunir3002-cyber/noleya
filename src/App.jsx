import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import Donate from './components/Donate';
import Volunteer from './components/Volunteer';

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => {
    return window.location.pathname || '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    if (path === currentPath) return;
    window.history.pushState(null, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const normalized = currentPath.toLowerCase().replace(/\/$/, '') || '/';

  if (normalized === '/donate') {
    return <Donate onNavigate={navigate} />;
  }

  if (normalized === '/volunteer') {
    return <Volunteer onNavigate={navigate} />;
  }

  return <Home onNavigate={navigate} />;
}
