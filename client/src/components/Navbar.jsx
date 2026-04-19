import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [scrolled, setScrolled] = useState(false);

  const isDriver = !!localStorage.getItem('driver_token');
  const isAdmin  = !!localStorage.getItem('admin_token');

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const hideOn = ['/driver/route-setup'];
  if (hideOn.includes(location.pathname)) return null;

  const links = [
    { label: 'Home',      path: '/' },
    { label: 'Live Track',path: '/track' },
    { label: 'Driver',    path: isDriver ? '/driver'  : '/login' },
    { label: 'Admin',     path: isAdmin  ? '/admin'   : '/admin/login' },
  ];

  const active = (path) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path);

  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 1000,
      padding: '0 32px',
      height: 62,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: scrolled ? 'rgba(8,10,15,0.96)' : 'transparent',
      borderBottom: `1px solid ${scrolled ? 'var(--border)' : 'transparent'}`,
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      transition: 'background 0.3s, border-color 0.3s',
    }}>

      {/* Logo */}
      <div
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
      >
        <div style={{
          width: 34, height: 34,
          background: 'rgba(0,229,160,0.1)',
          border: '1px solid rgba(0,229,160,0.4)',
          borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
            <circle cx="8.5" cy="8.5" r="3.5" fill="#00e5a0" />
            <path d="M8.5 1v2.5M8.5 13.5V16M1 8.5h2.5M13.5 8.5H16" stroke="#00e5a0" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: 0.5,
        }}>
          Campus<span style={{ color: 'var(--accent)' }}>Track</span>
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {links.map(({ label, path }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            style={{
              padding: '7px 15px',
              background: active(path) ? 'rgba(0,229,160,0.08)' : 'transparent',
              border: `1px solid ${active(path) ? 'rgba(0,229,160,0.25)' : 'transparent'}`,
              borderRadius: 8,
              color: active(path) ? 'var(--accent)' : 'var(--text-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: 0.5,
              cursor: 'pointer',
              transition: 'all 0.18s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { if (!active(path)) { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}}
            onMouseLeave={(e) => { if (!active(path)) { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'transparent'; }}}
          >
            {label}
          </button>
        ))}

        <button
          onClick={() => navigate('/track')}
          style={{
            marginLeft: 10,
            padding: '8px 18px',
            background: 'var(--accent)',
            color: '#080a0f',
            border: 'none',
            borderRadius: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            cursor: 'pointer',
            transition: 'background 0.2s, transform 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#00b87e'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'none'; }}
        >
          Live Map →
        </button>
      </div>
    </nav>
  );
}