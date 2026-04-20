import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── Replace these with your actual image paths ── */
const TEAM = [
  {
    name:   'Your Name Here',
    role:   'Full Stack Developer',
    tag:    'FULL STACK',
    tagColor: 'var(--accent)',
    image:  '/team/fullstack.jpg',   // put image in client/public/team/
    github: 'https://github.com/',
    linkedin: 'https://linkedin.com/',
    description: 'Architected the entire system from the ground up — designing the real-time WebSocket pipeline, Redis state management, MongoDB schemas, and the adaptive GPS tracking logic that keeps the bus visible even when signal drops.',
    skills: ['Node.js', 'React', 'WebSocket', 'Redis', 'MongoDB', 'System Design'],
    highlight: 'Built the offline-first GPS buffering system that never loses a single ping.',
  },
  {
    name:   'Your Name Here',
    role:   'Frontend Developer',
    tag:    'FRONTEND',
    tagColor: 'var(--info)',
    image:  '/team/frontend.jpg',
    github: 'https://github.com/',
    linkedin: 'https://linkedin.com/',
    description: 'Crafted every pixel of the three portals — the live tracking map, driver dashboard, and admin panel. Built the smooth bus marker interpolation that makes the map feel alive between GPS pings.',
    skills: ['React', 'Leaflet.js', 'CSS Animations', 'Responsive Design', 'UX Design'],
    highlight: 'Designed the road-following route visualisation using OSRM with zero API cost.',
  },
  {
    name:   'Your Name Here',
    role:   'Backend Developer',
    tag:    'BACKEND',
    tagColor: 'var(--warning)',
    image:  '/team/backend.jpg',
    github: 'https://github.com/',
    linkedin: 'https://linkedin.com/',
    description: 'Built the server infrastructure that handles thousands of GPS pings — the SSE broadcaster, ETA prediction engine with segment-based learning, and the MongoDB data layer that gets smarter after every trip.',
    skills: ['Node.js', 'Express', 'MongoDB', 'ETA Algorithms', 'REST APIs', 'Deployment'],
    highlight: 'Engineered the self-learning ETA model that improves accuracy with each completed trip.',
  },
];

function TeamCard({ member, index }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      ref={ref}
      style={{
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius: 20,
        overflow:     'hidden',
        opacity:      visible ? 1 : 0,
        transform:    visible ? 'translateY(0)' : 'translateY(32px)',
        transition:   `opacity 0.6s ease ${index * 0.15}s, transform 0.6s ease ${index * 0.15}s`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = member.tagColor;
        e.currentTarget.style.transform   = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform   = 'translateY(0)';
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 4, background: member.tagColor, opacity: 0.8 }} />

      {/* Photo + name section */}
      <div style={{ padding: '28px 28px 20px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Avatar */}
        <div style={{
          width: 80, height: 80,
          borderRadius: 16,
          overflow: 'hidden',
          border: `2px solid ${member.tagColor}40`,
          flexShrink: 0,
          background: 'var(--surface2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {!imgError ? (
            <img
              src={member.image}
              alt={member.name}
              onError={() => setImgError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 24, fontWeight: 700,
              color: member.tagColor,
            }}>
              {initials}
            </span>
          )}
        </div>

        {/* Name + role */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display:      'inline-block',
            padding:      '3px 10px',
            background:   `${member.tagColor}15`,
            border:       `1px solid ${member.tagColor}35`,
            borderRadius: 20,
            fontFamily:   'var(--font-mono)',
            fontSize:     9, letterSpacing: 2,
            color:        member.tagColor,
            marginBottom: 8,
          }}>
            {member.tag}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, marginBottom: 3 }}>
            {member.name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 400 }}>
            {member.role}
          </div>

          {/* Social links */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            
              href={member.github}
              target="_blank"
              rel="noreferrer"
              style={{
                padding:      '5px 12px',
                background:   'var(--surface2)',
                border:       '1px solid var(--border2)',
                borderRadius: 6,
                fontFamily:   'var(--font-mono)',
                fontSize:     10, color: 'var(--text-dim)',
                letterSpacing: 0.5,
                transition:   'all 0.2s',
                display:      'flex', alignItems: 'center', gap: 5,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </a>
            
              href={member.linkedin}
              target="_blank"
              rel="noreferrer"
              style={{
                padding:      '5px 12px',
                background:   'var(--surface2)',
                border:       '1px solid var(--border2)',
                borderRadius: 6,
                fontFamily:   'var(--font-mono)',
                fontSize:     10, color: 'var(--text-dim)',
                letterSpacing: 0.5,
                transition:   'all 0.2s',
                display:      'flex', alignItems: 'center', gap: 5,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--info)'; e.currentTarget.style.color = 'var(--info)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </a>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', margin: '0 28px' }} />

      {/* Description */}
      <div style={{ padding: '20px 28px' }}>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.8, marginBottom: 16 }}>
          {member.description}
        </p>

        {/* Highlight quote */}
        <div style={{
          background:   `${member.tagColor}08`,
          border:       `1px solid ${member.tagColor}25`,
          borderLeft:   `3px solid ${member.tagColor}`,
          borderRadius: '0 8px 8px 0',
          padding:      '10px 14px',
          marginBottom: 18,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: member.tagColor, letterSpacing: 1, marginBottom: 5,
          }}>
            KEY CONTRIBUTION
          </div>
          <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, fontStyle: 'italic' }}>
            "{member.highlight}"
          </div>
        </div>

        {/* Skills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {member.skills.map((skill) => (
            <span key={skill} style={{
              padding:      '4px 10px',
              background:   'var(--surface2)',
              border:       '1px solid var(--border)',
              borderRadius: 6,
              fontFamily:   'var(--font-mono)',
              fontSize:     10, color: 'var(--text-dim)',
              letterSpacing: 0.5,
            }}>
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatBox({ value, label, color }) {
  const ref = useRef(null);
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) { setStarted(true); obs.disconnect(); }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let c = 0;
    const end  = parseInt(value);
    const step = Math.max(1, Math.floor(end / 30));
    const t = setInterval(() => {
      c += step;
      if (c >= end) { setCount(end); clearInterval(t); }
      else setCount(c);
    }, 40);
    return () => clearInterval(t);
  }, [started, value]);

  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 40, fontFamily: 'var(--font-mono)',
        fontWeight: 700, color: color || 'var(--accent)',
        lineHeight: 1, marginBottom: 6,
      }}>
        {count}{typeof value === 'string' && value.replace(/[0-9]/g, '')}
      </div>
      <div style={{
        fontSize: 10, fontFamily: 'var(--font-mono)',
        color: 'var(--text-dim)', letterSpacing: 2,
      }}>
        {label}
      </div>
    </div>
  );
}

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>

      {/* ══ HERO ══ */}
      <section style={{
        position:   'relative',
        padding:    '120px 24px 80px',
        textAlign:  'center',
        overflow:   'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: 800, height: 400,
          background: 'radial-gradient(ellipse, rgba(0,229,160,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: 700, margin: '0 auto',
        }}>
          <div style={{
            display:    'inline-block',
            padding:    '5px 14px',
            background: 'rgba(0,229,160,0.08)',
            border:     '1px solid rgba(0,229,160,0.25)',
            borderRadius: 20,
            fontFamily: 'var(--font-mono)',
            fontSize:   10, letterSpacing: 3,
            color:      'var(--accent)', marginBottom: 24,
            opacity: 0, animation: 'fadeUp 0.4s ease 0.1s forwards',
          }}>
            BUILT BY STUDENTS, FOR STUDENTS
          </div>

          <h1 style={{
            fontSize:   'clamp(36px, 6vw, 60px)',
            fontWeight: 700, lineHeight: 1.1,
            letterSpacing: -1, marginBottom: 20,
            opacity: 0, animation: 'fadeUp 0.5s ease 0.2s forwards',
          }}>
            The team behind{' '}
            <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
              CampusTrack
            </span>
          </h1>

          <p style={{
            fontSize: 17, color: 'var(--text-dim)',
            lineHeight: 1.8, maxWidth: 520, margin: '0 auto 36px',
            opacity: 0, animation: 'fadeUp 0.5s ease 0.3s forwards',
          }}>
            Three developers who got tired of missing the bus.
            We built a real-time tracking system that works even when
            the campus Wi-Fi doesn't.
          </p>

          <div style={{
            display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap',
            opacity: 0, animation: 'fadeUp 0.5s ease 0.4s forwards',
          }}>
            <button
              onClick={() => navigate('/track')}
              style={{
                padding: '12px 24px',
                background: 'var(--accent)', color: '#080a0f',
                border: 'none', borderRadius: 9,
                fontFamily: 'var(--font-mono)',
                fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#00b87e'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'none'; }}
            >
              Try Live Map →
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '12px 24px',
                background: 'transparent', color: 'var(--text)',
                border: '1px solid var(--border2)', borderRadius: 9,
                fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)'; }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </section>

      {/* ══ PROJECT STATS ══ */}
      <section style={{
        padding:      '60px 24px',
        background:   'var(--surface)',
        borderTop:    '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          maxWidth: 800, margin: '0 auto',
          display:  'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 40,
        }}>
          <StatBox value="3"    label="DEVELOPERS"      color="var(--accent)"  />
          <StatBox value="8"    label="WEEKS BUILT IN"  color="var(--info)"    />
          <StatBox value="15"   label="FEATURES"        color="var(--warning)" />
          <StatBox value="100"  label="% OPEN SOURCE"   color="var(--accent)"  />
        </div>
      </section>

      {/* ══ TEAM ══ */}
      <section style={{ padding: '90px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--accent)', letterSpacing: 3, marginBottom: 14,
            }}>
              THE TEAM
            </div>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700, marginBottom: 14, lineHeight: 1.2,
            }}>
              Three roles, one mission
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 15, maxWidth: 460, margin: '0 auto' }}>
              Each member owned their domain end-to-end.
              No hand-offs. No silos. Just shipping.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {TEAM.map((member, i) => (
              <TeamCard key={member.role} member={member} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ TECH STACK ══ */}
      <section style={{
        padding:      '80px 24px',
        background:   'var(--surface)',
        borderTop:    '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--accent)', letterSpacing: 3, marginBottom: 14,
            }}>
              TECH STACK
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 700 }}>
              What we built it with
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {[
              { category: 'FRONTEND',  color: 'var(--info)',    items: ['React 18', 'Vite', 'Leaflet.js', 'React Router'] },
              { category: 'BACKEND',   color: 'var(--accent)',  items: ['Node.js', 'Express', 'WebSocket (ws)', 'SSE'] },
              { category: 'DATABASE',  color: 'var(--warning)', items: ['MongoDB Atlas', 'Upstash Redis', 'Mongoose'] },
              { category: 'MAPS/GEO',  color: 'var(--danger)',  items: ['OpenStreetMap', 'OSRM Routing', 'Nominatim', 'Haversine'] },
              { category: 'DEPLOY',    color: 'var(--accent)',  items: ['Vercel', 'Render', 'GitHub'] },
              { category: 'ALGORITHMS',color: 'var(--info)',    items: ['Dead Reckoning', 'Segment ETA', 'Delta Compression', 'Store-Forward'] },
            ].map(({ category, color, items }) => (
              <div key={category} style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '18px 20px',
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  color, letterSpacing: 2, marginBottom: 12,
                }}>
                  {category}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {items.map((item) => (
                    <div key={item} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: color, flexShrink: 0, opacity: 0.8,
                      }} />
                      <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ STORY ══ */}
      <section style={{ padding: '90px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--accent)', letterSpacing: 3, marginBottom: 20,
          }}>
            THE STORY
          </div>
          <h2 style={{
            fontSize: 'clamp(26px, 4vw, 38px)',
            fontWeight: 700, marginBottom: 28, lineHeight: 1.2,
          }}>
            Why we built this
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
            {[
              'Every morning, hundreds of students stand at the college gate wondering — did the bus leave already? Is it stuck in traffic? Should I take an auto instead? There was no answer.',
              'Existing solutions needed expensive hardware, stable internet, or charged students for an app. None of them worked in the weak-signal dead zones around our campus.',
              'So we built CampusTrack. The driver\'s phone becomes the tracker — no special hardware. GPS pings adapt to signal strength. If the connection drops, pings buffer locally and sync automatically when it returns.',
              'After three trips, the system starts predicting ETAs from real data. After thirty, it\'s accurate to within two minutes. The more it\'s used, the smarter it gets.',
            ].map((para, i) => (
              <p key={i} style={{
                fontSize: 15, color: i === 0 ? 'var(--text)' : 'var(--text-dim)',
                lineHeight: 1.85,
                paddingLeft: 16,
                borderLeft: `2px solid ${i === 0 ? 'var(--accent)' : 'var(--border2)'}`,
              }}>
                {para}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{
        padding:    '70px 24px',
        background: 'var(--surface)',
        borderTop:  '1px solid var(--border)',
        textAlign:  'center',
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 700, marginBottom: 14 }}>
            Ready to try it?
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 15, marginBottom: 32, lineHeight: 1.7 }}>
            No account needed to track. Drivers register in two minutes.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/track')}
              style={{
                padding: '13px 28px', background: 'var(--accent)',
                color: '#080a0f', border: 'none', borderRadius: 9,
                fontFamily: 'var(--font-mono)', fontSize: 13,
                fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#00b87e'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'none'; }}
            >
              Track Live Now →
            </button>
            <button
              onClick={() => navigate('/register')}
              style={{
                padding: '13px 28px', background: 'transparent',
                color: 'var(--text)', border: '1px solid var(--border2)',
                borderRadius: 9, fontSize: 13, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--info)'; e.currentTarget.style.color = 'var(--info)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)'; }}
            >
              Register as Driver
            </button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{
        padding: '28px 24px',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
        }}>
          Campus<span style={{ color: 'var(--accent)' }}>Track</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)', letterSpacing: 1 }}>
          MADE WITH ♥ FOR CAMPUS COMMUTERS
        </div>
      </footer>
    </div>
  );
}