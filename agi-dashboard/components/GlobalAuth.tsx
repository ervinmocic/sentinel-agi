'use client';

import { useState, useEffect } from 'react';

export function GlobalAuth({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const auth = sessionStorage.getItem('sentinel_global_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'P0hi7lsp0ldj.') {
      sessionStorage.setItem('sentinel_global_auth', 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Access Denied');
    }
  };

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-black text-white">
        <div className="w-full max-w-md space-y-8 p-8 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter text-red-600">SENTINEL SYSTEM</h1>
            <p className="text-gray-400">Restricted Access // Authorized Personnel Only</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-800 bg-gray-900/50 px-4 py-3 text-center text-white placeholder-gray-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              placeholder="Enter Access Code"
              autoFocus
            />
            {error && <p className="text-sm text-red-500 animate-pulse">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-md bg-red-700 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-600"
            >
              INITIALIZE CONNECTION
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
