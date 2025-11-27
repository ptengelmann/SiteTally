'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.error) {
          setError('Invalid email or password');
          return;
        }

        router.push(callbackUrl);
        router.refresh();
      } else {
        // Register
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Registration failed');
          return;
        }

        // Auto-login after registration
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.error) {
          setError('Account created but login failed. Please try logging in.');
          setIsLogin(true);
          return;
        }

        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">
          <span className="text-yellow-400">Site</span>
          <span className="text-white">Tally</span>
        </h1>
        <p className="text-gray-400 mt-2">Asset tracking made simple</p>
      </div>

      {/* Form Card */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-6">
          {isLogin ? 'Sign In' : 'Create Account'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  required={!isLogin}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@example.com"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={isLogin ? '••••••••' : 'At least 6 characters'}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              required
              minLength={6}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Phone (Optional)
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="07700 123456"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 text-black font-bold rounded-lg transition-colors"
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-yellow-400 hover:text-yellow-300 text-sm"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>

        {isLogin && (
          <div className="mt-4 p-3 bg-gray-900 rounded-lg">
            <p className="text-xs text-gray-400 text-center">
              Test accounts:<br />
              <code className="text-gray-300">sarah.manager@test.com</code> / <code className="text-gray-300">password123</code><br />
              <code className="text-gray-300">tom.worker@test.com</code> / <code className="text-gray-300">password123</code>
            </p>
          </div>
        )}
      </div>

      <p className="text-center text-gray-500 text-xs mt-6">
        SiteTally - Asset Tracking for Field Teams
      </p>
    </div>
  );
}

function LoginLoading() {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">
          <span className="text-yellow-400">Site</span>
          <span className="text-white">Tally</span>
        </h1>
        <p className="text-gray-400 mt-2">Asset tracking made simple</p>
      </div>
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Suspense fallback={<LoginLoading />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
