import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TEAM = [
  {
    name:        'Bhuvaneshwari B',
    role:        'Full Stack Developer',
    tag:         'FULL STACK',
    color:       '#00e5a0',
    image:       '/team/bhuvana.jpeg',
    github:      'https://github.com/',
    linkedin:    'https://linkedin.com/',
    description: 'Architected the entire system end-to-end — WebSocket pipeline, Redis state, MongoDB schemas, and adaptive GPS logic that keeps tracking alive even when signal drops.',
    highlight:   'Built offline-first GPS buffering — zero pings lost even on 2G.',
    skills:      ['Node.js', 'React', 'WebSocket', 'Redis', 'MongoDB'],
  },
  {
    name:        'Vishnuvarthan N',
    role:        'Frontend Developer',
    tag:         'FRONTEND',
    color:       '#4d9fff',
    image:       '/team/vishnu.jpeg',
    github:      'https://github.com/',
    linkedin:    'https://linkedin.com/',
    description: 'Crafted every pixel of the three portals. Built smooth bus marker interpolation that makes the map feel alive between GPS pings using dead-reckoning animation.',
    highlight:   'Road-following routes via OSRM — free, accurate, zero API cost.',
    skills:      ['React', 'Leaflet.js', 'CSS', 'Responsive Design', 'UX'],
  },
  {
    name:        'Ramanathan R',
    role:        'Backend Developer',
    tag:         'BACKEND',
    color:       '#ffb020',
    image:       '/team/Ram.jpeg',
    github:      'https://github.com/',
    linkedin:    'https://linkedin.com/',
    description: 'Built the server infrastructure handling thousands of GPS pings — SSE broadcaster, ETA prediction engine with segment learning, and MongoDB data layer.',
    highlight:   'Self-learning ETA model — gets more accurate after every trip.',
    skills:      ['Node.js', 'Express', 'MongoDB', 'ETA Algorithms', 'APIs'],
  },
];

function useInView(threshold = 0.15) {
  const ref     = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ── Particle background ── */
function Particles() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let animId;
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const dots = Array.from({ length: 60 }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      r:  Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a:  Math.random() * 0.5 + 0.1,
    }));

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach((d) => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = canvas.width;
        if (d.x > canvas.width)  d.x = 0;
        if (d.y < 0) d.y = canvas.height;
        if (d.y > canvas.height) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,229,160,${d.a})`;
        ctx.fill();
      });
      // Draw lines between nearby dots
      dots.forEach((a, i) => {
        dots.slice(i + 1).forEach((b) => {
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(0,229,160,${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth   = 0.5;
            ctx.stroke();
          }
        });
      });
      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', inset: 0,
      width: '100%', height: '100%',
      pointerEvents: 'none', opacity: 0.6,
    }} />
  );
}

/* ── Team card ── */
function TeamCard({ member, index }) {
  const [ref, visible] = useInView(0.1);
  const [hover, setHover] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const initials = member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position:   'relative',
        borderRadius: 24,
        overflow:   'hidden',
        background: 'rgba(15,18,25,0.8)',
        border:     `1px solid ${hover ? member.color + '50' : 'rgba(255,255,255,0.06)'}`,
        backdropFilter: 'blur(20px)',
        transition: 'all 0.4s ease',
        transform:  visible
          ? hover ? 'translateY(-6px)' : 'translateY(0)'
          : 'translateY(40px)',
        opacity:    visible ? 1 : 0,
        transitionDelay: `${index * 0.12}s`,
        cursor:     'default',
      }}
    >
      {/* Animated color glow behind card */}
      <div style={{
        position:   'absolute',
        top: '30%', left: '50%',
        transform:  'translate(-50%,-50%)',
        width:      hover ? 400 : 300,
        height:     hover ? 400 : 300,
        background: `radial-gradient(circle, ${member.color}20 0%, transparent 70%)`,
        transition: 'all 0.5s ease',
        pointerEvents: 'none',
      }} />

      {/* Top accent line */}
      <div style={{
        height:     3,
        background: `linear-gradient(90deg, transparent, ${member.color}, transparent)`,
        opacity:    hover ? 1 : 0.5,
        transition: 'opacity 0.3s',
      }} />

      <div style={{ padding: '32px 28px 28px', position: 'relative', zIndex: 1 }}>

        {/* Tag */}
        <div style={{
          display:      'inline-flex',
          alignItems:   'center',
          gap:          6,
          padding:      '4px 12px',
          borderRadius: 20,
          background:   `${member.color}12`,
          border:       `1px solid ${member.color}30`,
          marginBottom: 24,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: member.color,
            animation:  'pulse 1.5s infinite',
          }} />
          <span style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      9, letterSpacing: 2,
            color:         member.color,
          }}>
            {member.tag}
          </span>
        </div>

        {/* Photo */}
        <div style={{
          width:        120, height: 120,
          borderRadius: '50%',
          margin:       '0 auto 20px',
          position:     'relative',
        }}>
          {/* Spinning ring */}
          <div style={{
            position:     'absolute',
            inset:        -4,
            borderRadius: '50%',
            background:   `conic-gradient(${member.color}, transparent, ${member.color}40, transparent, ${member.color})`,
            animation:    hover ? 'spin 3s linear infinite' : 'none',
            transition:   'opacity 0.3s',
            opacity:      hover ? 1 : 0.4,
          }} />
          <div style={{
            position:     'absolute',
            inset:        2,
            borderRadius: '50%',
            background:   'var(--surface)',
          }} />
          <div style={{
            position:     'absolute',
            inset:        4,
            borderRadius: '50%',
            overflow:     'hidden',
            background:   'var(--surface2)',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
          }}>
            {!imgErr ? (
              <img
                src={member.image}
                alt={member.name}
                onError={() => setImgErr(true)}
                style={{
                  width:      '100%', height: '100%',
                  objectFit:  'cover',
                  transform:  hover ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform 0.5s',
                }}
              />
            ) : (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   32, fontWeight: 700,
                color:      member.color,
              }}>
                {initials}
              </span>
            )}
          </div>
        </div>

        {/* Name + role */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h3 style={{
            fontSize:     20, fontWeight: 700,
            marginBottom: 6, color: 'var(--text)',
          }}>
            {member.name}
          </h3>
          <div style={{
            fontSize:      12, letterSpacing: 2,
            color:         member.color,
            fontFamily:    'var(--font-mono)',
          }}>
            {member.role.toUpperCase()}
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height:     1,
          background: `linear-gradient(90deg, transparent, ${member.color}30, transparent)`,
          marginBottom: 16,
        }} />

        {/* Description */}
        <p style={{
          fontSize:     13, color: 'var(--text-dim)',
          lineHeight:   1.75, marginBottom: 16, textAlign: 'center',
        }}>
          {member.description}
        </p>

        {/* Highlight */}
        <div style={{
          background:   `${member.color}08`,
          border:       `1px solid ${member.color}20`,
          borderLeft:   `3px solid ${member.color}`,
          borderRadius: '0 8px 8px 0',
          padding:      '10px 14px',
          marginBottom: 18,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: member.color, letterSpacing: 2, marginBottom: 4,
          }}>
            KEY CONTRIBUTION
          </div>
          <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, fontStyle: 'italic' }}>
            "{member.highlight}"
          </div>
        </div>

        {/* Skills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {member.skills.map((s) => (
            <span key={s} style={{
              padding:      '4px 10px',
              background:   `${member.color}10`,
              border:       `1px solid ${member.color}25`,
              borderRadius: 6,
              fontFamily:   'var(--font-mono)',
              fontSize:     10, color: member.color,
              letterSpacing: 0.5,
            }}>
              {s}
            </span>
          ))}
        </div>

        {/* Social */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            {
              label: 'GitHub',
              href:  member.github,
              icon: (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              ),
              hoverColor: 'var(--accent)',
            },
            {
              label: 'LinkedIn',
              href:  member.linkedin,
              icon: (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              ),
              hoverColor: 'var(--info)',
            },
          ].map(({ label, href, icon, hoverColor }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              style={{
                flex:         1,
                padding:      '8px 0',
                background:   'rgba(255,255,255,0.03)',
                border:       '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                color:        'var(--text-dim)',
                fontFamily:   'var(--font-mono)',
                fontSize:     11, letterSpacing: 0.5,
                textAlign:    'center',
                display:      'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition:   'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color       = hoverColor;
                e.currentTarget.style.borderColor = hoverColor + '40';
                e.currentTarget.style.background  = hoverColor + '08';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color       = 'var(--text-dim)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.background  = 'rgba(255,255,255,0.03)';
              }}
            >
              {icon} {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Stat counter ── */
function Stat({ value, suffix = '', label, color, delay = 0 }) {
  const [ref, visible] = useInView(0.5);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const end  = parseInt(value);
    const step = Math.max(1, Math.floor(end / 40));
    let c = 0;
    const t = setInterval(() => {
      c += step;
      if (c >= end) { setCount(end); clearInterval(t); }
      else setCount(c);
    }, 35);
    return () => clearInterval(t);
  }, [visible, value]);

  return (
    <div ref={ref} style={{
      textAlign:        'center',
      opacity:          visible ? 1 : 0,
      transform:        visible ? 'none' : 'translateY(20px)',
      transition:       `all 0.5s ease ${delay}s`,
    }}>
      <div style={{
        fontSize:   44, fontFamily: 'var(--font-mono)',
        fontWeight: 700, color: color || 'var(--accent)',
        lineHeight: 1, marginBottom: 8,
      }}>
        {count}{suffix}
      </div>
      <div style={{
        fontSize:      10, fontFamily: 'var(--font-mono)',
        color:         'var(--text-dim)', letterSpacing: 2,
      }}>
        {label}
      </div>
    </div>
  );
}

export default function AboutPage() {
  const navigate = useNavigate();
  const [heroRef, heroVisible] = useInView(0.1);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>

      {/* ══ HERO ══ */}
      <section style={{
        position:   'relative',
        minHeight:  '70vh',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding:    '120px 24px 80px',
        overflow:   'hidden',
      }}>
        <Particles />

        {/* Grid overlay */}
        <svg style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none',
        }}>
          <defs>
            <pattern id="g" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#00e5a0" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)" />
        </svg>

        <div
          ref={heroRef}
          style={{
            position:   'relative', zIndex: 1,
            textAlign:  'center', maxWidth: 720,
          }}
        >
          <div style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          8,
            padding:      '6px 16px',
            background:   'rgba(0,229,160,0.08)',
            border:       '1px solid rgba(0,229,160,0.2)',
            borderRadius: 20,
            fontFamily:   'var(--font-mono)',
            fontSize:     10, letterSpacing: 3,
            color:        'var(--accent)', marginBottom: 28,
            opacity:      heroVisible ? 1 : 0,
            transform:    heroVisible ? 'none' : 'translateY(20px)',
            transition:   'all 0.4s ease 0.1s',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--accent)', animation: 'pulse 1.5s infinite',
            }} />
            BUILT BY STUDENTS · FOR STUDENTS
          </div>

          <h1 style={{
            fontSize:   'clamp(40px, 7vw, 72px)',
            fontWeight: 700, lineHeight: 1.05,
            letterSpacing: -2, marginBottom: 24,
            opacity:    heroVisible ? 1 : 0,
            transform:  heroVisible ? 'none' : 'translateY(24px)',
            transition: 'all 0.5s ease 0.2s',
          }}>
            The team behind{' '}
            <span style={{
              color:      'var(--accent)',
              fontFamily: 'var(--font-mono)',
              display:    'block',
            }}>
              CampusTrack
            </span>
          </h1>

          <p style={{
            fontSize:   17, color: 'var(--text-dim)',
            lineHeight: 1.8, maxWidth: 520, margin: '0 auto 36px',
            opacity:    heroVisible ? 1 : 0,
            transform:  heroVisible ? 'none' : 'translateY(20px)',
            transition: 'all 0.5s ease 0.3s',
          }}>
            Three developers who got tired of missing the campus bus.
            We built real-time tracking that works even when the Wi-Fi doesn't.
          </p>

          <div style={{
            display:    'flex', gap: 12,
            justifyContent: 'center', flexWrap: 'wrap',
            opacity:    heroVisible ? 1 : 0,
            transform:  heroVisible ? 'none' : 'translateY(16px)',
            transition: 'all 0.5s ease 0.4s',
          }}>
            <button
              onClick={() => navigate('/track')}
              style={{
                padding:    '13px 28px',
                background: 'var(--accent)', color: '#080a0f',
                border:     'none', borderRadius: 10,
                fontFamily: 'var(--font-mono)',
                fontSize:   13, fontWeight: 700, letterSpacing: 0.5,
                cursor:     'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#00b87e'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'none'; }}
            >
              Try Live Map →
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                padding:    '13px 28px',
                background: 'transparent', color: 'var(--text)',
                border:     '1px solid var(--border2)', borderRadius: 10,
                fontSize:   13, cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)'; }}
            >
              ← Home
            </button>
          </div>
        </div>
      </section>

      {/* ══ STATS ══ */}
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
          <Stat value="3"   label="DEVELOPERS"     color="var(--accent)"  suffix="" delay={0}    />
          <Stat value="8"   label="WEEKS TO BUILD"  color="var(--info)"    suffix="+" delay={0.1} />
          <Stat value="15"  label="FEATURES"        color="var(--warning)" suffix="+" delay={0.2} />
          <Stat value="100" label="OPEN SOURCE"      color="var(--accent)"  suffix="%" delay={0.3} />
        </div>
      </section>

      {/* ══ TEAM ══ */}
      <section style={{ padding: '90px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--accent)', letterSpacing: 3, marginBottom: 16,
            }}>
              THE TEAM
            </div>
            <h2 style={{
              fontSize:   'clamp(32px, 5vw, 48px)',
              fontWeight: 700, lineHeight: 1.1, marginBottom: 16,
            }}>
              Three roles.{' '}
              <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                One mission.
              </span>
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 15, maxWidth: 420, margin: '0 auto' }}>
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
              <TeamCard key={member.tag} member={member} index={i} />
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
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--accent)', letterSpacing: 3, marginBottom: 14,
            }}>
              TECH STACK
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 700 }}>
              What we built it with
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}>
            {[
              { cat: 'FRONTEND',   color: '#4d9fff',  items: ['React 18', 'Vite', 'Leaflet.js', 'React Router'] },
              { cat: 'BACKEND',    color: '#00e5a0',  items: ['Node.js', 'Express', 'WebSocket', 'SSE'] },
              { cat: 'DATABASE',   color: '#ffb020',  items: ['MongoDB Atlas', 'Upstash Redis', 'Mongoose'] },
              { cat: 'MAPS',       color: '#ff4d4d',  items: ['OpenStreetMap', 'OSRM Routing', 'Nominatim'] },
              { cat: 'DEPLOY',     color: '#00e5a0',  items: ['Vercel', 'Render', 'GitHub'] },
              { cat: 'ALGORITHMS', color: '#4d9fff',  items: ['Dead Reckoning', 'Segment ETA', 'Delta Compression'] },
            ].map(({ cat, color, items }) => (
              <div
                key={cat}
                style={{
                  background:   'rgba(255,255,255,0.02)',
                  border:       `1px solid ${color}20`,
                  borderTop:    `2px solid ${color}`,
                  borderRadius: 12,
                  padding:      '18px 20px',
                  transition:   'transform 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              >
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  color, letterSpacing: 2, marginBottom: 14,
                }}>
                  {cat}
                </div>
                {items.map((item) => (
                  <div key={item} style={{
                    display:      'flex', alignItems: 'center', gap: 8,
                    marginBottom: 8,
                  }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: color, opacity: 0.7, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ STORY ══ */}
      <section style={{ padding: '90px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--accent)', letterSpacing: 3, marginBottom: 14,
            }}>
              THE STORY
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700 }}>
              Why we built this
            </h2>
          </div>
          {[
            { text: 'Every morning, hundreds of students stand at the college gate wondering — did the bus leave already? Is it stuck in traffic? Should I take an auto? There was no answer.', accent: true },
            { text: 'Existing solutions needed expensive hardware, stable internet, or charged students for an app. None worked in the weak-signal dead zones around our campus.', accent: false },
            { text: "So we built CampusTrack. The driver's phone becomes the tracker — no hardware. GPS pings adapt to signal strength. If the connection drops, pings buffer locally and sync on reconnect.", accent: false },
            { text: 'After three trips, the system predicts ETAs from real data. After thirty, it\'s accurate to within two minutes. The more it\'s used, the smarter it gets.', accent: false },
          ].map((para, i) => (
            <p key={i} style={{
              fontSize:     15, lineHeight: 1.85,
              color:        para.accent ? 'var(--text)' : 'var(--text-dim)',
              padding:      '0 0 0 20px',
              borderLeft:   `2px solid ${para.accent ? 'var(--accent)' : 'var(--border2)'}`,
              marginBottom: 20,
            }}>
              {para.text}
            </p>
          ))}
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{
        padding:    '70px 24px',
        background: 'var(--surface)',
        borderTop:  '1px solid var(--border)',
        textAlign:  'center',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(24px, 4vw, 36px)',
            fontWeight: 700, marginBottom: 14,
          }}>
            Ready to try it?
          </h2>
          <p style={{
            color: 'var(--text-dim)', fontSize: 15,
            marginBottom: 32, lineHeight: 1.7,
          }}>
            No account needed to track. Drivers register in two minutes.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/track')}
              style={{
                padding: '13px 28px', background: 'var(--accent)',
                color: '#080a0f', border: 'none', borderRadius: 10,
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
                borderRadius: 10, fontSize: 13, cursor: 'pointer',
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

      {/* Footer */}
      <footer style={{
        padding:      '24px',
        borderTop:    '1px solid var(--border)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        flexWrap:     'wrap', gap: 12,
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>
          Campus<span style={{ color: 'var(--accent)' }}>Track</span>
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--text-faint)', letterSpacing: 1,
        }}>
          MADE WITH ♥ FOR CAMPUS COMMUTERS
        </span>
      </footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}