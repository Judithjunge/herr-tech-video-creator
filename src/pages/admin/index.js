import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const STATUS_LABEL = { PENDING: 'Ausstehend', ACTIVE: 'Aktiv', DISABLED: 'Deaktiviert' };
const STATUS_COLOR = { PENDING: '#f59e0b', ACTIVE: '#22c55e', DISABLED: '#ef4444' };

export default function AdminPanel() {
  const session = { user: { email: process.env.NEXT_PUBLIC_ADMIN_EMAIL, role: 'admin', status: 'ACTIVE', id: 'admin' } }; const status = 'authenticated';
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const isAdmin = session?.user?.role === 'admin' || session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !isAdmin) { router.replace('/'); return; }
    loadData();
  }, [session, status]);

  async function loadData() {
    setLoading(true);
    const [usersRes, statsRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/stats'),
    ]);
    if (usersRes.ok) setUsers((await usersRes.json()).users);
    if (statsRes.ok) setStats(await statsRes.json());
    setLoading(false);
  }

  async function approveUser(id) {
    await fetch(`/api/admin/users/${id}/approve`, { method: 'POST' });
    loadData();
  }

  async function toggleDisable(id) {
    await fetch(`/api/admin/users/${id}/disable`, { method: 'POST' });
    loadData();
  }

  async function deleteUser(id, email) {
    if (!confirm(`User "${email}" wirklich löschen?`)) return;
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    loadData();
  }

  async function addUser(e) {
    e.preventDefault();
    if (!addEmail.trim()) return;
    setAddLoading(true);
    const res = await fetch('/api/admin/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: addEmail.trim(), name: addName.trim() }),
    });
    setAddLoading(false);
    if (res.ok) {
      setAddEmail('');
      setAddName('');
      loadData();
    } else {
      const data = await res.json();
      alert(data.error || 'Fehler beim Hinzufügen');
    }
  }

  const filtered = users.filter(u =>
    !filter || u.status === filter
  );

  const cell = { padding: '10px 14px', borderBottom: '1px solid #222' };
  const badge = (s) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
    fontSize: 12, background: STATUS_COLOR[s] + '22', color: STATUS_COLOR[s], fontWeight: 600,
  });

  return (
    <>
      <Head><title>Admin Panel</title></Head>
      <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#e5e5e5', fontFamily: 'system-ui, sans-serif', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Admin Panel</h1>
            <button onClick={() => router.push('/')} style={{ background: '#222', border: '1px solid #333', color: '#aaa', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>
              ← Zurück
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
              {[
                { label: 'Gesamt', value: stats.users.total, color: '#FF5757' },
                { label: 'Ausstehend', value: stats.users.pending, color: '#f59e0b' },
                { label: 'Aktiv', value: stats.users.active, color: '#22c55e' },
                { label: 'Deaktiviert', value: stats.users.disabled, color: '#ef4444' },
                { label: 'Projekte', value: stats.usage.projectsCreated, color: '#60a5fa' },
                { label: 'Bilder', value: stats.usage.imagesGenerated, color: '#34d399' },
                { label: 'Videos', value: stats.usage.videosGenerated, color: '#f472b6' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: '#161616', border: '1px solid #222', borderRadius: 8, padding: '16px 20px' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
                  <div style={{ fontSize: 13, color: '#777', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Add User */}
          <div style={{ background: '#161616', border: '1px solid #222', borderRadius: 8, padding: 20, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#FF5757' }}>User direkt hinzufügen</h3>
            <form onSubmit={addUser} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                placeholder="Email"
                type="email"
                required
                style={{ flex: 1, minWidth: 200, background: '#111', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', color: '#e5e5e5', fontSize: 14 }}
              />
              <input
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder="Name (optional)"
                style={{ flex: 1, minWidth: 160, background: '#111', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', color: '#e5e5e5', fontSize: 14 }}
              />
              <button
                type="submit"
                disabled={addLoading}
                style={{ background: '#FF5757', color: '#0d0d0d', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 600, cursor: addLoading ? 'not-allowed' : 'pointer' }}
              >
                {addLoading ? 'Wird hinzugefügt…' : 'Hinzufügen + Email senden'}
              </button>
            </form>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['', 'PENDING', 'ACTIVE', 'DISABLED'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  background: filter === s ? '#FF5757' : '#161616',
                  color: filter === s ? '#0d0d0d' : '#aaa',
                  border: '1px solid #333',
                  borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}
              >
                {s === '' ? 'Alle' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ color: '#666', padding: 32, textAlign: 'center' }}>Wird geladen…</div>
          ) : (
            <div style={{ background: '#161616', border: '1px solid #222', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#111' }}>
                    {['Email', 'Name', 'Status', 'Erstellt', 'Projekte / Bilder / Videos', 'Aktionen'].map(h => (
                      <th key={h} style={{ ...cell, textAlign: 'left', color: '#777', fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} style={{ ...cell, color: '#555', textAlign: 'center', padding: 32 }}>Keine Nutzer</td></tr>
                  ) : filtered.map(u => (
                    <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/admin/users/${u.id}`)}>
                      <td style={cell}>{u.email}</td>
                      <td style={{ ...cell, color: '#aaa' }}>{u.name || '—'}</td>
                      <td style={cell}><span style={badge(u.status)}>{STATUS_LABEL[u.status]}</span></td>
                      <td style={{ ...cell, color: '#666' }}>{new Date(u.createdAt).toLocaleDateString('de')}</td>
                      <td style={{ ...cell, color: '#aaa' }}>{u.projectsCreated} / {u.imagesGenerated} / {u.videosGenerated}</td>
                      <td style={{ ...cell }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {u.status === 'PENDING' && (
                            <button
                              onClick={() => approveUser(u.id)}
                              style={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
                            >
                              Genehmigen
                            </button>
                          )}
                          {u.status !== 'PENDING' && (
                            <button
                              onClick={() => toggleDisable(u.id)}
                              style={{ background: u.status === 'DISABLED' ? '#22c55e22' : '#ef444422', color: u.status === 'DISABLED' ? '#22c55e' : '#ef4444', border: `1px solid ${u.status === 'DISABLED' ? '#22c55e44' : '#ef444444'}`, borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
                            >
                              {u.status === 'DISABLED' ? 'Aktivieren' : 'Deaktivieren'}
                            </button>
                          )}
                          <button
                            onClick={() => deleteUser(u.id, u.email)}
                            style={{ background: '#ef444411', color: '#ef4444', border: '1px solid #ef444433', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
                          >
                            Löschen
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
