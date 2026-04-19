import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../services/adminApi';

export default function AdminLoginPage() {
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
      const res = await adminApi.post('/login', { email, password });
      localStorage.setItem('admin_token', res.data.token);
      localStorage.setItem('admin_info', JSON.stringify(res.data.admin));
      navigate('/admin');
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
      background: 'radial-gradient(ellipse at 40% 60%, #0d1020 0%, #0a0c10 70%)',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: 40,
        animation: 'fadeIn 0.3s ease',
      }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: 'inline-block',
            padding: '4px 10px',
            background: 'rgba(255,176,32,0.12)',
            border: '1px solid rgba(255,176,32,0.3)',
            borderRadius: 20,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--warning)',
            letterSpacing: 2,
            marginBottom: 16,
          }}>
            ADMIN ACCESS
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.2 }}>
            Control Panel
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 6 }}>
            CampusTrack administrator login
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'EMAIL', type: 'email', value: email, set: setEmail },
            { label: 'PASSWORD', type: 'password', value: password, set: setPassword },
          ].map(({ label, type, value, set }) => (
            <div key={label}>
              <label style={{
                display: 'block',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-dim)',
                letterSpacing: 1,
                marginBottom: 6,
              }}>
                {label}
              </label>
              <input
                type={type}
                value={value}
                onChange={(e) => set(e.target.value)}
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
          ))}

          {error && (
            <div style={{ color: 'var(--danger)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              padding: 13,
              background: loading ? 'var(--border)' : 'var(--warning)',
              color: '#0a0c10',
              borderRadius: 'var(--radius)',
              fontWeight: 700,
              fontSize: 14,
              fontFamily: 'var(--font-mono)',
              letterSpacing: 1,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <a href="/login" style={{ color: 'var(--text-dim)', fontSize: 13, textDecoration: 'none' }}>
            ← Driver login
          </a>
        </div>
      </div>
    </div>
  );
}