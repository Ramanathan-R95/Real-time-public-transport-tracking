import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const STEPS = ['Account', 'Vehicle', 'Done'];

function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 36 }}>
      {STEPS.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32,
                borderRadius: '50%',
                background: done
                  ? 'var(--accent)'
                  : active
                  ? 'rgba(0,229,160,0.15)'
                  : 'var(--surface2)',
                border: `2px solid ${done || active ? 'var(--accent)' : 'var(--border2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 12, fontWeight: 700,
                color: done ? '#080a0f' : active ? 'var(--accent)' : 'var(--text-dim)',
                transition: 'all 0.3s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9, letterSpacing: 1,
                color: active ? 'var(--accent)' : 'var(--text-dim)',
              }}>
                {label.toUpperCase()}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 1,
                background: i < current ? 'var(--accent)' : 'var(--border2)',
                margin: '0 8px', marginBottom: 22,
                transition: 'background 0.3s',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, placeholder, error, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 10,
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 6,
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '11px 14px',
          background: 'var(--surface2)',
          border: `1px solid ${error ? 'var(--danger)' : focused ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 8, color: 'var(--text)',
          fontSize: 14, transition: 'border-color 0.2s',
        }}
      />
      {hint && !error && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 5, fontFamily: 'var(--font-mono)' }}>
          {hint}
        </div>
      )}
      {error && (
        <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 5, fontFamily: 'var(--font-mono)' }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();

  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [errors, setErrors]   = useState({});

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    vehicleNumber: '', phone: '',
  });

  const set = (key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: '' }));
    setApiError('');
  };

  // ── Validate step 0 ──
  function validateStep0() {
    const errs = {};
    if (!form.name.trim())
      errs.name = 'Name is required';
    if (!form.email.trim() || !form.email.includes('@'))
      errs.email = 'Valid email required';
    if (form.password.length < 6)
      errs.password = 'Minimum 6 characters';
    if (form.password !== form.confirmPassword)
      errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Validate step 1 ──
  function validateStep1() {
    const errs = {};
    if (!form.vehicleNumber.trim())
      errs.vehicleNumber = 'Vehicle number is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Step 0 → Step 1 ──
  function handleNext() {
    if (!validateStep0()) return;
    setStep(1);
  }

  // ── Step 1 → Submit ──
  async function handleSubmit() {
    if (!validateStep1()) return;

    setLoading(true);
    setApiError('');

    try {
      const res = await api.post('/auth/register', {
        name:          form.name.trim(),
        email:         form.email.trim().toLowerCase(),
        password:      form.password,
        vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
        phone:         form.phone.trim(),
      });

      const { token, driver } = res.data;

      if (!token) {
        setApiError('Registration failed — no token received. Try again.');
        setLoading(false);
        return;
      }

      // Save auth data
      localStorage.setItem('driver_token', token);
      localStorage.setItem('driver_info',  JSON.stringify(driver));

      // Show success step, then redirect
      setStep(2);
      setTimeout(() => navigate('/driver'), 2000);

    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '80px 20px 32px',
      background: 'radial-gradient(ellipse at 30% 60%, #0a1a10 0%, var(--bg) 65%)',
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: '36px 32px',
        animation: 'fadeIn 0.3s ease',
      }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--accent)', letterSpacing: 3, marginBottom: 8,
          }}>
            CAMPUSTRACK
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2, marginBottom: 6 }}>
            Driver Registration
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6 }}>
            Create your account to start tracking your route live.
          </p>
        </div>

        <StepIndicator current={step} />

        {/* ── Step 0: Account ── */}
        {step === 0 && (
          <div
            key="step0"
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            className="fade-in"
          >
            <Field
              label="FULL NAME"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Ramesh Kumar"
              error={errors.name}
            />
            <Field
              label="EMAIL"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="you@college.edu"
              error={errors.email}
            />
            <Field
              label="PASSWORD"
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="Min 6 characters"
              error={errors.password}
              hint="Use a strong password — you'll log in from your phone"
            />
            <Field
              label="CONFIRM PASSWORD"
              type="password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              placeholder="Same as above"
              error={errors.confirmPassword}
            />
          </div>
        )}

        {/* ── Step 1: Vehicle ── */}
        {step === 1 && (
          <div
            key="step1"
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            className="fade-in"
          >
            <Field
              label="VEHICLE NUMBER"
              value={form.vehicleNumber}
              onChange={set('vehicleNumber')}
              placeholder="e.g. TN-01-AB-1234"
              error={errors.vehicleNumber}
              hint="This appears on the live map for students"
            />
            <Field
              label="PHONE (optional)"
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              placeholder="e.g. 9876543210"
              error={errors.phone}
              hint="For admin contact only — not shown to students"
            />

            {/* What happens next */}
            <div style={{
              background: 'rgba(0,229,160,0.05)',
              border: '1px solid rgba(0,229,160,0.2)',
              borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: 'var(--accent)', letterSpacing: 1, marginBottom: 10,
              }}>
                WHAT HAPPENS NEXT
              </div>
              {[
                'Your account is created immediately',
                'Set up your route on the map (takes 2 min)',
                'Start your first trip — students track you live',
              ].map((t, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start',
                  gap: 10, marginBottom: i < 2 ? 8 : 0,
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'rgba(0,229,160,0.15)',
                    border: '1px solid rgba(0,229,160,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    color: 'var(--accent)', flexShrink: 0, marginTop: 1,
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                    {t}
                  </span>
                </div>
              ))}
            </div>

            {/* API error */}
            {apiError && (
              <div style={{
                background: 'rgba(255,77,77,0.08)',
                border: '1px solid rgba(255,77,77,0.3)',
                borderRadius: 8, padding: '10px 14px',
                color: 'var(--danger)', fontSize: 13,
                fontFamily: 'var(--font-mono)',
              }}>
                {apiError}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Success ── */}
        {step === 2 && (
          <div
            key="step2"
            className="fade-in"
            style={{ textAlign: 'center', padding: '16px 0' }}
          >
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(0,229,160,0.12)',
              border: '2px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 32,
            }}>
              ✓
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Welcome aboard!
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
              Your driver account is ready.
              <br />
              Taking you to your dashboard…
            </div>
            {/* Progress bar */}
            <div style={{
              height: 3, background: 'var(--surface2)',
              borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', background: 'var(--accent)',
                borderRadius: 2, width: '0%',
                animation: 'progressBar 2s linear forwards',
              }} />
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        {step === 0 && (
          <div style={{ marginTop: 24 }}>
            <button
              onClick={handleNext}
              style={{
                width: '100%', padding: '13px',
                background: 'var(--accent)', color: '#080a0f',
                border: 'none', borderRadius: 8,
                fontWeight: 700, fontSize: 14,
                fontFamily: 'var(--font-mono)', letterSpacing: 0.5,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#00b87e'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent)'}
            >
              CONTINUE →
            </button>
          </div>
        )}

        {step === 1 && (
          <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setStep(0); setApiError(''); }}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: '1px solid var(--border2)',
                borderRadius: 8, color: 'var(--text-dim)',
                fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                flex: 1, padding: '12px',
                background: loading ? 'var(--border)' : 'var(--accent)',
                color: loading ? 'var(--text-dim)' : '#080a0f',
                border: 'none', borderRadius: 8,
                fontWeight: 700, fontSize: 14,
                fontFamily: 'var(--font-mono)', letterSpacing: 0.5,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
            </button>
          </div>
        )}

        {/* Bottom links */}
        {step < 2 && (
          <div style={{ marginTop: 20 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 10,
            }}>
              <a href="/" style={{ color: 'var(--text-dim)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                ← Home
              </a>
              <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                Have an account?{' '}
                <a href="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                  Sign in
                </a>
              </span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes progressBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}