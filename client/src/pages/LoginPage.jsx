import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('driver_token', res.data.token);
      localStorage.setItem('driver_info', JSON.stringify(res.data.driver));
      navigate('/driver');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(ellipse at 60% 40%, #0d1a12 0%, var(--bg) 70%)',
    }}>
      <div className="fade-in" style={{
        width: '100%',
        maxWidth: 400,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 40,
      }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--accent)',
            letterSpacing: 3,
            marginBottom: 8,
          }}>
            CAMPUSTRACK
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.2 }}>
            Driver Portal
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 6 }}>
            Sign in to start tracking your route
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '11px 14px',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                fontSize: 14,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '11px 14px',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                fontSize: 14,
              }}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--danger)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              padding: '13px',
              background: loading ? 'var(--border)' : 'var(--accent)',
              color: loading ? 'var(--text-dim)' : '#0a0c10',
              borderRadius: 'var(--radius)',
              fontWeight: 700,
              fontSize: 14,
              fontFamily: 'var(--font-mono)',
              letterSpacing: 1,
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a href="/" style={{ color: 'var(--text-dim)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
              ← Home
            </a>
            <a href="/track" style={{ color: 'var(--text-dim)', fontSize: 13 }}>
              Student view →
            </a>
          </div>
          <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13, color: 'var(--text-dim)' }}>
            New driver?{' '}
            <a href="/register" style={{ color: 'var(--accent)', fontWeight: 500 }}>
              Create an account
            </a>
          </div>
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <a href="/admin/login" style={{ color: 'var(--text-faint)', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
              ADMIN PANEL
            </a>
          </div>
      </div>
    </div>
  );
}