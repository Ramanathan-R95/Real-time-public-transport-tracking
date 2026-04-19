import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── Animated grid background ── */
function GridBackground() {
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      pointerEvents: 'none', zIndex: 0,
    }}>
      {/* Grid */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.06 }}>
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#00e5a0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Glow orbs */}
      <div style={{
        position: 'absolute', top: '-10%', left: '20%',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(0,229,160,0.07) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '10%',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(77,159,255,0.06) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />
    </div>
  );
}

/* ── Animated bus SVG ── */
function AnimatedBus() {
  return (
    <div className="floating" style={{ position: 'relative' }}>
      {/* Glow ring */}
      <div style={{
        position: 'absolute', inset: -20,
        background: 'radial-gradient(circle, rgba(0,229,160,0.12) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'glow-pulse 3s ease-in-out infinite',
      }} />

      <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
        {/* Bus body */}
        <rect x="10" y="30" width="190" height="90" rx="12" fill="#0f1219" stroke="#1e2535" strokeWidth="1.5" />

        {/* Roof accent */}
        <rect x="20" y="30" width="170" height="6" rx="3" fill="#00e5a0" opacity="0.8" />

        {/* Windows row */}
        {[30, 70, 110, 150].map((x) => (
          <rect key={x} x={x} y="48" width="28" height="22" rx="4"
            fill="#161b26" stroke="#2a3347" strokeWidth="1" />
        ))}

        {/* Door */}
        <rect x="158" y="56" width="24" height="44" rx="4"
          fill="#161b26" stroke="#2a3347" strokeWidth="1" />
        <line x1="170" y1="56" x2="170" y2="100"
          stroke="#2a3347" strokeWidth="1" />

        {/* Front face */}
        <rect x="188" y="40" width="14" height="60" rx="6"
          fill="#161b26" stroke="#1e2535" strokeWidth="1" />
        {/* Headlight */}
        <circle cx="198" cy="60" r="5" fill="#00e5a0" opacity="0.9" />
        <circle cx="198" cy="60" r="8" fill="#00e5a0" opacity="0.15" />

        {/* Wheels */}
        <circle cx="50"  cy="122" r="16" fill="#0f1219" stroke="#2a3347" strokeWidth="2" />
        <circle cx="50"  cy="122" r="8"  fill="#161b26" stroke="#00e5a0" strokeWidth="1.5" />
        <circle cx="50"  cy="122" r="3"  fill="#00e5a0" />

        <circle cx="160" cy="122" r="16" fill="#0f1219" stroke="#2a3347" strokeWidth="2" />
        <circle cx="160" cy="122" r="8"  fill="#161b26" stroke="#00e5a0" strokeWidth="1.5" />
        <circle cx="160" cy="122" r="3"  fill="#00e5a0" />

        {/* Route indicator */}
        <rect x="20" y="80" width="60" height="18" rx="4" fill="rgba(0,229,160,0.1)" stroke="rgba(0,229,160,0.3)" strokeWidth="1" />
        <text x="50" y="93" fontFamily="monospace" fontSize="9" fill="#00e5a0" textAnchor="middle" fontWeight="bold">ROUTE R1</text>

        {/* Ping dot (live indicator) */}
        <circle cx="30" cy="45" r="4" fill="#00e5a0">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="30" cy="45" r="8" fill="#00e5a0" opacity="0.2">
          <animate attributeName="r" values="4;12;4" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0;0.3" dur="1.5s" repeatCount="indefinite" />
        </circle>
      </svg>

      {/* Road beneath */}
      <div style={{
        position: 'absolute',
        bottom: -8, left: 0, right: 0,
        height: 3,
        background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
        opacity: 0.4,
        borderRadius: 2,
      }} />
    </div>
  );
}

/* ── Feature card ── */
function FeatureCard({ icon, title, desc, delay }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '28px 24px',
      opacity: 0,
      animation: `fadeUp 0.5s ease ${delay}s forwards`,
      transition: 'border-color 0.2s, transform 0.2s',
      cursor: 'default',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'rgba(0,229,160,0.3)';
      e.currentTarget.style.transform = 'translateY(-3px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--border)';
      e.currentTarget.style.transform = 'none';
    }}>
      <div style={{
        width: 44, height: 44,
        background: 'rgba(0,229,160,0.08)',
        border: '1px solid rgba(0,229,160,0.2)',
        borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 18,
        fontSize: 20,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7 }}>{desc}</div>
    </div>
  );
}

/* ── Role card ── */
function RoleCard({ title, subtitle, badge, badgeColor, items, cta, ctaPath, delay, navigate }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 20,
      padding: 32,
      display: 'flex',
      flexDirection: 'column',
      opacity: 0,
      animation: `fadeUp 0.5s ease ${delay}s forwards`,
    }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'inline-block',
          padding: '4px 12px',
          background: `${badgeColor}18`,
          border: `1px solid ${badgeColor}40`,
          borderRadius: 20,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: badgeColor,
          letterSpacing: 2,
          marginBottom: 14,
        }}>
          {badge}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7 }}>{subtitle}</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 6, height: 6,
              borderRadius: '50%',
              background: badgeColor,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{item}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate(ctaPath)}
        style={{
          width: '100%',
          padding: '13px',
          background: badgeColor === 'var(--accent)' ? 'var(--accent)' : 'transparent',
          color: badgeColor === 'var(--accent)' ? '#080a0f' : badgeColor,
          border: badgeColor === 'var(--accent)' ? 'none' : `1.5px solid ${badgeColor}`,
          borderRadius: 10,
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 0.5,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
      >
        {cta} →
      </button>
    </div>
  );
}

/* ── Live counter ── */
function LiveCounter({ label, value, color }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    const step = end / 40;
    const t = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(t); }
      else setDisplay(Math.floor(start));
    }, 30);
    return () => clearInterval(t);
  }, [value]);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 48,
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        color: color || 'var(--accent)',
        lineHeight: 1,
        marginBottom: 8,
      }}>
        {display}
        <span style={{ fontSize: 28, opacity: 0.5 }}>+</span>
      </div>
      <div style={{
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-dim)',
        letterSpacing: 2,
      }}>
        {label}
      </div>
    </div>
  );
}

/* ── Main HomePage ── */
export default function HomePage() {
  const navigate = useNavigate();
  const [serverOk, setServerOk] = useState(null);

  useEffect(() => {
    fetch('/health')
      .then((r) => r.ok ? setServerOk(true) : setServerOk(false))
      .catch(() => setServerOk(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>

      {/* ══ HERO ══ */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px 24px 60px',
      }}>
        <GridBackground />

        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: 1100, width: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 60,
          alignItems: 'center',
        }}>
          {/* Left — text */}
          <div>
            {/* Status pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              background: serverOk === true
                ? 'rgba(0,229,160,0.08)'
                : serverOk === false
                ? 'rgba(255,77,77,0.08)'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${serverOk === true ? 'rgba(0,229,160,0.25)' : serverOk === false ? 'rgba(255,77,77,0.25)' : 'var(--border)'}`,
              borderRadius: 20,
              marginBottom: 28,
              opacity: 0,
              animation: 'fadeUp 0.4s ease 0.1s forwards',
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: serverOk === true ? 'var(--accent)' : serverOk === false ? 'var(--danger)' : 'var(--text-dim)',
                animation: serverOk === true ? 'pulse 1.5s infinite' : 'none',
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1,
                color: serverOk === true ? 'var(--accent)' : serverOk === false ? 'var(--danger)' : 'var(--text-dim)',
              }}>
                {serverOk === true ? 'SYSTEM ONLINE' : serverOk === false ? 'SERVER OFFLINE' : 'CHECKING...'}
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontSize: 'clamp(36px, 5vw, 58px)',
              fontWeight: 700,
              lineHeight: 1.1,
              marginBottom: 20,
              letterSpacing: -1,
              opacity: 0,
              animation: 'fadeUp 0.5s ease 0.2s forwards',
            }}>
              Know where your{' '}
              <span style={{
                color: 'var(--accent)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9em',
              }}>
                bus is.
              </span>
              <br />
              Right now.
            </h1>

            <p style={{
              fontSize: 17,
              color: 'var(--text-dim)',
              lineHeight: 1.7,
              maxWidth: 440,
              marginBottom: 36,
              opacity: 0,
              animation: 'fadeUp 0.5s ease 0.3s forwards',
            }}>
              Real-time college bus tracking that works even with poor signal.
              Live GPS, smart ETAs, and offline resilience — built for campus life.
            </p>

            {/* CTA buttons */}
            <div style={{
              display: 'flex', gap: 12, flexWrap: 'wrap',
              opacity: 0, animation: 'fadeUp 0.5s ease 0.4s forwards',
            }}>
              <button
                onClick={() => navigate('/track')}
                style={{
                  padding: '14px 28px',
                  background: 'var(--accent)',
                  color: '#080a0f',
                  border: 'none',
                  borderRadius: 10,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#00b87e'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'none'; }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#080a0f', animation: 'pulse 1.5s infinite',
                }} />
                Track Live Now
              </button>

              <button
                onClick={() => navigate('/login')}
                style={{
                  padding: '14px 28px',
                  background: 'transparent',
                  color: 'var(--text)',
                  border: '1px solid var(--border2)',
                  borderRadius: 10,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)'; }}
              >
                Driver Portal
              </button>
            </div>

            {/* Tech stack pills */}
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 32,
              opacity: 0, animation: 'fadeUp 0.5s ease 0.5s forwards',
            }}>
              {['Node.js', 'WebSocket', 'Redis', 'MongoDB', 'Leaflet', 'OSRM'].map((t) => (
                <span key={t} style={{
                  padding: '4px 10px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--text-dim)',
                  letterSpacing: 0.5,
                }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — bus illustration */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            animation: 'fadeUp 0.6s ease 0.35s forwards',
          }}>
            <AnimatedBus />
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          opacity: 0, animation: 'fadeUp 0.5s ease 0.8s forwards',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', letterSpacing: 2 }}>
            SCROLL
          </span>
          <div style={{
            width: 1, height: 40,
            background: 'linear-gradient(to bottom, var(--text-faint), transparent)',
            animation: 'pulse 2s infinite',
          }} />
        </div>
      </section>

      {/* ══ STATS ══ */}
      <section style={{
        padding: '80px 24px',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 40,
          textAlign: 'center',
        }}>
          <LiveCounter label="ROUTES SUPPORTED"  value={12}  />
          <LiveCounter label="GPS PINGS / TRIP"  value={240} color="var(--info)" />
          <LiveCounter label="SECOND LATENCY"    value={2}   color="var(--warning)" />
          <LiveCounter label="UPTIME %"          value={99}  color="var(--accent)" />
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--accent)', letterSpacing: 3, marginBottom: 14,
            }}>
              CAPABILITIES
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>
              Built for real campus conditions
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 15, maxWidth: 500, margin: '0 auto' }}>
              Poor signal? Network drops? We handle it — so students always know where their bus is.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {[
              {
                icon: '◎',
                title: 'Live GPS Tracking',
                desc: 'Real-time vehicle positions updated every 5 seconds on 4G, adapting automatically to weaker signals.',
                delay: 0.05,
              },
              {
                icon: '⟳',
                title: 'Offline Buffering',
                desc: 'Pings store locally when signal drops and flush automatically when connection restores. No data lost.',
                delay: 0.12,
              },
              {
                icon: '≈',
                title: 'Path Interpolation',
                desc: 'Marker moves smoothly between GPS pings using dead-reckoning so the map never jumps.',
                delay: 0.19,
              },
              {
                icon: '◈',
                title: 'Road-Following Routes',
                desc: 'Route lines follow actual roads via OSRM routing, not straight lines between stops.',
                delay: 0.26,
              },
              {
                icon: '⌀',
                title: 'Adaptive Frequency',
                desc: 'System detects signal strength and adjusts ping interval from 5s to 30s to conserve bandwidth.',
                delay: 0.33,
              },
              {
                icon: '◆',
                title: 'Multi-Bus Support',
                desc: 'Track multiple buses per route simultaneously. Students pick which bus to follow.',
                delay: 0.40,
              },
            ].map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section style={{
        padding: '100px 24px',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--accent)', letterSpacing: 3, marginBottom: 14,
            }}>
              HOW IT WORKS
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 700 }}>
              Three steps, zero confusion
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, position: 'relative' }}>
            {/* Connector line */}
            <div style={{
              position: 'absolute',
              top: 32, left: '16.6%', right: '16.6%',
              height: 1,
              background: 'linear-gradient(90deg, var(--accent), var(--info), var(--warning))',
              opacity: 0.3,
              zIndex: 0,
            }} />

            {[
              { step: '01', title: 'Driver sets route',  desc: 'Draw stops on the map once. OSRM plots the actual road path automatically.', color: 'var(--accent)' },
              { step: '02', title: 'Start trip',         desc: 'Driver taps Start. GPS streams live to the server via WebSocket with offline buffering.', color: 'var(--info)' },
              { step: '03', title: 'Students track',     desc: 'Open the live map, pick a bus, and watch it move in real time with ETA.', color: 'var(--warning)' },
            ].map(({ step, title, desc, color }, i) => (
              <div key={step} style={{
                padding: '0 32px',
                textAlign: 'center',
                position: 'relative', zIndex: 1,
                opacity: 0,
                animation: `fadeUp 0.5s ease ${0.1 + i * 0.12}s forwards`,
              }}>
                <div style={{
                  width: 64, height: 64,
                  borderRadius: '50%',
                  background: `${color}14`,
                  border: `2px solid ${color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 18, fontWeight: 700,
                  color,
                }}>
                  {step}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PORTALS ══ */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--accent)', letterSpacing: 3, marginBottom: 14,
            }}>
              PORTALS
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 700, marginBottom: 12 }}>
              One platform, three roles
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <RoleCard
              title="Student Tracking"
              subtitle="Open the live map and see all active buses on your route in real time."
              badge="STUDENT"
              badgeColor="var(--accent)"
              items={[
                'Live bus marker on map',
                'Choose which bus to follow',
                'ETA countdown per stop',
                'Offline staleness alert',
                'No login required',
              ]}
              cta="Open Live Map"
              ctaPath="/track"
              delay={0.1}
              navigate={navigate}
            />
            <RoleCard
              title="Driver Portal"
              subtitle="Set up your route once, then start and end trips from your phone."
              badge="DRIVER"
              badgeColor="var(--info)"
              items={[
                'Draw route on map',
                'GPS auto-streams on trip start',
                'Offline buffer — no data lost',
                'Signal quality indicator',
                'Trip history with stats',
              ]}
              cta="Driver Login"
              ctaPath="/login"
              delay={0.2}
              navigate={navigate}
            />
            <RoleCard
              title="Admin Panel"
              subtitle="Manage drivers, routes, and monitor all active buses from one dashboard."
              badge="ADMIN"
              badgeColor="var(--warning)"
              items={[
                'Live bus dashboard',
                'Add / edit / remove drivers',
                'View all routes and stops',
                'Full trip log history',
                'Per-trip ping analytics',
              ]}
              cta="Admin Login"
              ctaPath="/admin/login"
              delay={0.3}
              navigate={navigate}
            />
          </div>
        </div>
      </section>

      {/* ══ CTA BANNER ══ */}
      <section style={{
        padding: '80px 24px',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{
          maxWidth: 700, margin: '0 auto', textAlign: 'center',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: -60,
            background: 'radial-gradient(circle, rgba(0,229,160,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--accent)', letterSpacing: 3, marginBottom: 20,
          }}>
            GET STARTED
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, marginBottom: 16, lineHeight: 1.2 }}>
            Stop guessing when your bus arrives
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 15, marginBottom: 36, lineHeight: 1.7 }}>
            Open the live map — no account needed.
            Drivers can register and set up a route in under 2 minutes.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/track')}
              style={{
                padding: '15px 32px',
                background: 'var(--accent)',
                color: '#080a0f',
                border: 'none',
                borderRadius: 10,
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 0.5,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#00b87e'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'none'; }}
            >
              Track Bus Now →
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '15px 32px',
                background: 'transparent',
                color: 'var(--text)',
                border: '1px solid var(--border2)',
                borderRadius: 10,
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--info)'; e.currentTarget.style.color = 'var(--info)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)'; }}
            >
              I'm a Driver
            </button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{
        padding: '32px 24px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28,
            background: 'rgba(0,229,160,0.08)',
            border: '1px solid rgba(0,229,160,0.3)',
            borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="2.5" fill="#00e5a0" />
              <path d="M6.5 1v2M6.5 10v2M1 6.5h2M10 6.5h2" stroke="#00e5a0" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>
            Campus<span style={{ color: 'var(--accent)' }}>Track</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: 24 }}>
          {[
            { label: 'Track', path: '/track' },
            { label: 'Driver', path: '/login' },
            { label: 'Admin', path: '/admin/login' },
          ].map(({ label, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12, cursor: 'pointer',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)', letterSpacing: 1 }}>
          REAL-TIME · RESILIENT · OPEN
        </div>
      </footer>
    </div>
  );
}