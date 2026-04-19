import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../services/adminApi';

const TABS = ['Dashboard', 'Drivers', 'Routes', 'Trips'];

function StatCard({ label, value, accent }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${accent || 'var(--border)'}`,
      borderRadius: 12,
      padding: '18px 20px',
    }}>
      <div style={{
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-dim)',
        letterSpacing: 2,
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 32,
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        color: accent || 'var(--text)',
        lineHeight: 1,
      }}>
        {value ?? '—'}
      </div>
    </div>
  );
}

function Badge({ children, color }) {
  return (
    <span style={{
      padding: '3px 9px',
      borderRadius: 20,
      border: `1px solid ${color}`,
      color,
      fontSize: 10,
      fontFamily: 'var(--font-mono)',
      letterSpacing: 1,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function formatDuration(start, end) {
  if (!start) return '—';
  const ms = (end ? new Date(end) : new Date()) - new Date(start);
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

// ── Driver Form Modal ──
function DriverModal({ driver, onClose, onSave }) {
  const [form, setForm] = useState({
    name: driver?.name || '',
    email: driver?.email || '',
    password: '',
    vehicleNumber: driver?.vehicleNumber || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      if (driver) {
        await adminApi.put(`/drivers/${driver._id}`, form);
      } else {
        await adminApi.post('/drivers', form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 20,
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 28,
        width: '100%',
        maxWidth: 420,
        animation: 'fadeIn 0.2s ease',
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 24,
          fontFamily: 'var(--font-mono)',
          color: 'var(--accent)',
          letterSpacing: 1,
        }}>
          {driver ? 'EDIT DRIVER' : 'ADD DRIVER'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'NAME', key: 'name', type: 'text' },
            { label: 'EMAIL', key: 'email', type: 'email' },
            { label: 'PASSWORD', key: 'password', type: 'password', placeholder: driver ? 'Leave blank to keep' : '' },
            { label: 'VEHICLE NUMBER', key: 'vehicleNumber', type: 'text' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label style={{
                display: 'block',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-dim)',
                letterSpacing: 1,
                marginBottom: 5,
              }}>
                {label}
              </label>
              <input
                type={type}
                value={form[key]}
                placeholder={placeholder}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 13,
                }}
              />
            </div>
          ))}
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 12, fontFamily: 'var(--font-mono)', marginTop: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, padding: '11px',
              background: 'var(--accent)', color: '#0a0c10',
              borderRadius: 8, fontWeight: 700, fontSize: 13,
              fontFamily: 'var(--font-mono)', letterSpacing: 1,
              border: 'none', cursor: 'pointer',
            }}
          >
            {saving ? 'SAVING...' : 'SAVE'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '11px 18px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text-dim)',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Tab ──
function DashboardTab({ stats, loading }) {
  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', animation: 'pulse 1.5s infinite' }}>
      LOADING...
    </div>
  );

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="TOTAL DRIVERS"   value={stats?.totalDrivers}  accent="var(--accent)" />
        <StatCard label="ACTIVE ROUTES"   value={stats?.totalRoutes}   accent="var(--accent)" />
        <StatCard label="TOTAL TRIPS"     value={stats?.totalTrips}    />
        <StatCard label="ACTIVE TRIPS"    value={stats?.activeTrips}   accent="var(--warning)" />
      </div>

      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--text-dim)',
        letterSpacing: 2,
        marginBottom: 14,
      }}>
        LIVE BUSES ({stats?.activeBuses?.length || 0})
      </div>

      {!stats?.activeBuses?.length ? (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '32px',
          textAlign: 'center',
          color: 'var(--text-dim)',
          fontSize: 13,
        }}>
          No buses currently active
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stats.activeBuses.map((bus) => (
            <div key={bus.driverId} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: 'var(--accent)',
                animation: 'pulse 1.5s infinite',
                flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{bus.vehicleNumber}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{bus.driverName}</div>
              </div>
              {bus.lat && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                  {parseFloat(bus.lat).toFixed(4)}, {parseFloat(bus.lng).toFixed(4)}
                </div>
              )}
              <Badge color="var(--accent)">LIVE</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Drivers Tab ──
function DriversTab() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | driver obj

  async function load() {
    setLoading(true);
    const res = await adminApi.get('/drivers');
    setDrivers(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this driver?')) return;
    await adminApi.delete(`/drivers/${id}`);
    load();
  }

  return (
    <div>
      {modal !== null && (
        <DriverModal
          driver={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2 }}>
          ALL DRIVERS ({drivers.length})
        </div>
        <button
          onClick={() => setModal('add')}
          style={{
            padding: '8px 16px',
            background: 'var(--accent)',
            color: '#0a0c10',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            letterSpacing: 1,
            cursor: 'pointer',
          }}
        >
          + ADD DRIVER
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', animation: 'pulse 1.5s infinite' }}>
          LOADING...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {drivers.map((driver) => (
            <div key={driver._id} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 14,
                color: 'var(--accent)', fontWeight: 700, flexShrink: 0,
              }}>
                {driver.name?.[0]?.toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{driver.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  {driver.email}
                </div>
              </div>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>
                {driver.vehicleNumber}
              </div>

              <Badge color={driver.assignedRoute ? 'var(--accent)' : 'var(--text-dim)'}>
                {driver.assignedRoute ? driver.assignedRoute.routeNumber : 'NO ROUTE'}
              </Badge>

              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => setModal(driver)}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--text-dim)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(driver._id)}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: '1px solid var(--danger)',
                    borderRadius: 6,
                    color: 'var(--danger)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Routes Tab ──
function RoutesTab() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await adminApi.get('/routes');
    setRoutes(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this route?')) return;
    await adminApi.delete(`/routes/${id}`);
    load();
  }

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 16 }}>
        ALL ROUTES ({routes.length})
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', animation: 'pulse 1.5s infinite' }}>
          LOADING...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {routes.map((route) => (
            <div key={route._id} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '14px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                  padding: '3px 10px',
                  background: 'rgba(0,229,160,0.1)',
                  border: '1px solid var(--accent)',
                  borderRadius: 6,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--accent)',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {route.routeNumber}
                </div>
                <div style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>{route.routeName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                  {route.stops?.length} stops
                </div>
                <button
                  onClick={() => handleDelete(route._id)}
                  style={{
                    padding: '5px 10px',
                    background: 'transparent',
                    border: '1px solid var(--danger)',
                    borderRadius: 6,
                    color: 'var(--danger)',
                    fontSize: 12,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Delete
                </button>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {route.stops?.map((s, i) => (
                  <div key={i} style={{
                    padding: '3px 10px',
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    fontSize: 11,
                    color: 'var(--text-dim)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {s.order}. {s.name}
                  </div>
                ))}
              </div>

              {route.createdBy && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  Created by {route.createdBy.name} · {route.createdBy.vehicleNumber}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Trips Tab ──
function TripsTab() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    adminApi.get('/trips').then((r) => { setTrips(r.data); setLoading(false); });
  }, []);

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 16 }}>
        TRIP LOGS ({trips.length})
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', animation: 'pulse 1.5s infinite' }}>
          LOADING...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {trips.map((trip) => (
            <div key={trip._id} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'hidden',
            }}>
              <div
                onClick={() => setExpanded(expanded === trip._id ? null : trip._id)}
                style={{
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {trip.driver?.name || 'Unknown'}
                    <span style={{ color: 'var(--text-dim)', fontWeight: 400, marginLeft: 6, fontSize: 12 }}>
                      {trip.driver?.vehicleNumber}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {trip.route?.routeNumber} · {new Date(trip.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>
                  {trip.pings?.length} pings
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>
                  {formatDuration(trip.startTime, trip.endTime)}
                </div>
                <Badge color={trip.status === 'active' ? 'var(--accent)' : 'var(--text-dim)'}>
                  {trip.status.toUpperCase()}
                </Badge>
                <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                  {expanded === trip._id ? '▲' : '▼'}
                </div>
              </div>

              {expanded === trip._id && (
                <div style={{
                  borderTop: '1px solid var(--border)',
                  padding: '12px 18px',
                  background: 'var(--surface2)',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 10 }}>
                    PING SUMMARY
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      { label: 'TOTAL PINGS', value: trip.pings?.length },
                      { label: 'DURATION', value: formatDuration(trip.startTime, trip.endTime) },
                      { label: 'AVG ACCURACY', value: trip.pings?.length
                        ? `${Math.round(trip.pings.reduce((s, p) => s + (p.accuracy || 0), 0) / trip.pings.length)}m`
                        : '—' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 4 }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>
                          {value ?? '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main AdminPage ──
export default function AdminPage() {
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem('admin_info') || '{}');
  const [tab, setTab] = useState('Dashboard');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) { navigate('/admin/login'); return; }
    loadStats();
    const interval = setInterval(loadStats, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  async function loadStats() {
    try {
      const res = await adminApi.get('/stats');
      setStats(res.data);
    } catch {
      navigate('/admin/login');
    } finally {
      setStatsLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_info');
    navigate('/admin/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Top bar */}
      <div style={{
        padding: '12px 24px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 62,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--warning)', letterSpacing: 3 }}>
              CAMPUSTRACK ADMIN
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 1 }}>{admin.name}</div>
          </div>
          <div style={{
            padding: '3px 10px',
            background: 'rgba(255,176,32,0.1)',
            border: '1px solid rgba(255,176,32,0.3)',
            borderRadius: 20,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--warning)',
            letterSpacing: 1,
          }}>
            ADMINISTRATOR
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {stats?.activeTrips > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
                {stats.activeTrips} ACTIVE
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              padding: '7px 14px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text-dim)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        padding: '0 24px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: 0,
      }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${tab === t ? 'var(--warning)' : 'transparent'}`,
              color: tab === t ? 'var(--text)' : 'var(--text-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: 1,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
        {tab === 'Dashboard' && <DashboardTab stats={stats} loading={statsLoading} />}
        {tab === 'Drivers'   && <DriversTab />}
        {tab === 'Routes'    && <RoutesTab />}
        {tab === 'Trips'     && <TripsTab />}
      </div>
    </div>
  );
}