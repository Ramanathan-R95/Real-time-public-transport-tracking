import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  const isDriver = !!localStorage.getItem('driver_token');
  const isAdmin  = !!localStorage.getItem('admin_token');

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const hideOn = ['/driver/route-setup'];
  if (hideOn.includes(location.pathname)) return null;

 const links = [
    { label: 'Home',     path: '/' },
    { label: 'Track',    path: '/track' },
    // { label: 'About',    path: '/about' },
    { label: 'Driver',   path: isDriver ? '/driver'  : '/login' },
    { label: 'Admin',    path: isAdmin  ? '/admin'   : '/admin/login' },
  ];
    const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const navBg = scrolled || menuOpen
    ? 'rgba(8,10,15,0.97)'
    : 'transparent';

  return (
    <>
      <nav style={{
        position:     'fixed',
        top: 0, left: 0, right: 0,
        zIndex:       1000,
        height:       60,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        padding:      '0 20px',
        background:   navBg,
        borderBottom: `1px solid ${scrolled || menuOpen ? 'var(--border)' : 'transparent'}`,
        backdropFilter: scrolled || menuOpen ? 'blur(16px)' : 'none',
        transition:   'background 0.3s, border-color 0.3s',
      }}>

        {/* Logo */}
        <div
          onClick={() => navigate('/')}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            flexShrink: 0,
          }}
        >
          <div style={{
            width: 32, height: 32,
            background: 'rgba(0,229,160,0.1)',
            border: '1px solid rgba(0,229,160,0.35)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="#00e5a0" />
              <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2"
                stroke="#00e5a0" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 14, fontWeight: 700, letterSpacing: 0.5,
          }}>
            Campus<span style={{ color: 'var(--accent)' }}>Track</span>
          </span>
        </div>

        {/* Desktop links */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
          className="hide-mobile"
        >
          {links.map(({ label, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              style={{
                padding: '7px 14px',
                background: isActive(path) ? 'rgba(0,229,160,0.08)' : 'transparent',
                border: `1px solid ${isActive(path) ? 'rgba(0,229,160,0.25)' : 'transparent'}`,
                borderRadius: 8,
                color: isActive(path) ? 'var(--accent)' : 'var(--text-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12, letterSpacing: 0.5,
                cursor: 'pointer',
                transition: 'all 0.18s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!isActive(path)) {
                  e.currentTarget.style.color = 'var(--text)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(path)) {
                  e.currentTarget.style.color = 'var(--text-dim)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {label}
            </button>
          ))}
          {/* After the links map, before Live Map button */}
          {!isDriver && (
            <button
              onClick={() => navigate('/register')}
              style={{
                marginLeft: 6,
                padding: '7px 14px',
                background: 'transparent',
                color: 'var(--text-dim)',
                border: '1px solid var(--border2)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 12, letterSpacing: 0.5,
                cursor: 'pointer', transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
            >
              Register
            </button>
          )}

          <button
            onClick={() => navigate('/track')}
            style={{
              marginLeft: 8,
              padding: '8px 18px',
              background: 'var(--accent)',
              color: '#080a0f',
              border: 'none',
              borderRadius: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#00b87e';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            Live Map →
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="hide-desktop"
          onClick={() => setMenuOpen((o) => !o)}
          style={{
            width: 40, height: 40,
            background: menuOpen ? 'rgba(0,229,160,0.08)' : 'transparent',
            border: `1px solid ${menuOpen ? 'rgba(0,229,160,0.25)' : 'var(--border)'}`,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.2s',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: menuOpen ? (i === 1 ? 0 : 18) : 18,
              height: 1.5,
              background: menuOpen ? 'var(--accent)' : 'var(--text-dim)',
              borderRadius: 2,
              transition: 'all 0.2s',
              transform: menuOpen
                ? i === 0 ? 'rotate(45deg) translate(4px, 4px)'
                : i === 2 ? 'rotate(-45deg) translate(4px, -4px)'
                : 'scaleX(0)'
                : 'none',
            }} />
          ))}
        </button>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div
          className="hide-desktop"
          style={{
            position: 'fixed',
            top: 60, left: 0, right: 0,
            zIndex: 999,
            background: 'rgba(8,10,15,0.97)',
            borderBottom: '1px solid var(--border)',
            backdropFilter: 'blur(16px)',
            padding: '12px 16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {links.map(({ label, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              style={{
                padding: '12px 16px',
                background: isActive(path) ? 'rgba(0,229,160,0.08)' : 'transparent',
                border: `1px solid ${isActive(path) ? 'rgba(0,229,160,0.2)' : 'transparent'}`,
                borderRadius: 10,
                color: isActive(path) ? 'var(--accent)' : 'var(--text)',
                fontFamily: 'var(--font-mono)',
                fontSize: 14, letterSpacing: 0.5,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}

          <button
            onClick={() => navigate('/track')}
            style={{
              marginTop: 8,
              padding: '13px 16px',
              background: 'var(--accent)',
              color: '#080a0f',
              border: 'none',
              borderRadius: 10,
              fontFamily: 'var(--font-mono)',
              fontSize: 14, fontWeight: 700, letterSpacing: 0.5,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            Live Map →
          </button>
        </div>
      )}
    </>
  );
}