import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const STATUS_LABEL = { PENDING: 'Ausstehend', ACTIVE: 'Aktiv', DISABLED: 'Deaktiviert' };
const STATUS_COLOR = { PENDING: '#f59e0b', ACTIVE: '#22c55e', DISABLED: '#ef4444' };

export default function AdminUserDetail() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = session?.user?.role === 'admin' || session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !isAdmin) { router.replace('/'); return; }
    if (!id) return;
    loadData();
  }, [session, status, id]);

  async function loadData() {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${id}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  async function approveUser() {
    await fetch(`/api/admin/users/${id}/approve`, { method: 'POST' });
    loadData();
  }

  async function toggleDisable() {
    await fetch(`/api/admin/users/${id}/disable`, { method: 'POST' });
    loadData();
  }

  async function deleteUser() {
    if (!confirm(`User "${data?.user?.email}" wirklich löschen?`)) return;
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    router.push('/admin');
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Wird geladen…
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      User nicht gefunden.
    </div>
  );

  const { user, projects } = data;
  const badge = (s) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: 4,
    fontSize: 13, background: STATUS_COLOR[s] + '22', color: STATUS_COLOR[s], fontWeight: 600,
  });

  return (
    <>
      <Head><title>{user.email} – Admin</title></Head>
      <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#e5e5e5', fontFamily: 'system-ui, sans-serif', padding: '32px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <button onClick={() => router.push('/admin')} style={{ background: '#222', border: '1px solid #333', color: '#aaa', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>
              ← Zurück
            </button>
          </div>

          {/* User Info */}
          <div style={{ background: '#161616', border: '1px solid #222', borderRadius: 8, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
              {user.image && <img src={user.image} alt="" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }} />}
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{user.name || user.email}</div>
                <div style={{ color: '#888', fontSize: 14 }}>{user.email}</div>
                <div style={{ marginTop: 8 }}>
                  <span style={badge(user.status)}>{STATUS_LABEL[user.status]}</span>
                  {user.role === 'admin' && <span style={{ marginLeft: 8, fontSize: 12, color: '#FF5757', background: '#FF575722', padding: '2px 8px', borderRadius: 4 }}>Admin</span>}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
              {[
                { label: 'Projekte erstellt', value: user.projectsCreated, color: '#60a5fa' },
                { label: 'Bilder generiert', value: user.imagesGenerated, color: '#34d399' },
                { label: 'Videos generiert', value: user.videosGenerated, color: '#f472b6' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: '#111', borderRadius: 8, padding: '12px 16px' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 13, color: '#666', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <span>Registriert: {new Date(user.createdAt).toLocaleString('de')}</span>
              {user.approvedAt && <span>Genehmigt: {new Date(user.approvedAt).toLocaleString('de')} von {user.approvedBy}</span>}
              {user.requestNote && <span>Notiz: {user.requestNote}</span>}
            </div>
          </div>

          {/* Actions */}
          <div style={{ background: '#161616', border: '1px solid #333', borderRadius: 8, padding: 20, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, color: '#888' }}>Aktionen</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {user.status === 'PENDING' && (
                <button
                  onClick={approveUser}
                  style={{ background: '#22c55e', color: '#0d0d0d', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Zugang genehmigen + Email senden
                </button>
              )}
              {user.status !== 'PENDING' && user.id !== session?.user?.id && (
                <button
                  onClick={toggleDisable}
                  style={{
                    background: user.status === 'DISABLED' ? '#22c55e22' : '#ef444422',
                    color: user.status === 'DISABLED' ? '#22c55e' : '#ef4444',
                    border: `1px solid ${user.status === 'DISABLED' ? '#22c55e44' : '#ef444444'}`,
                    borderRadius: 6, padding: '8px 20px', cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  {user.status === 'DISABLED' ? 'Account reaktivieren' : 'Account deaktivieren'}
                </button>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          {user.id !== session?.user?.id && (
            <div style={{ background: '#161616', border: '1px solid #ef444433', borderRadius: 8, padding: 20, marginBottom: 32 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#ef4444' }}>Danger Zone</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#777' }}>
                Account und alle zugehörigen Sessions unwiderruflich löschen. Projekte bleiben erhalten.
              </p>
              <button
                onClick={deleteUser}
                style={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444', borderRadius: 6, padding: '8px 20px', cursor: 'pointer', fontWeight: 600 }}
              >
                Account löschen
              </button>
            </div>
          )}

          {/* Projects */}
          <div>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Projekte ({projects.length})</h3>
            {projects.length === 0 ? (
              <div style={{ color: '#555', fontSize: 14 }}>Keine Projekte vorhanden.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {projects.map(p => (
                  <div key={p.id} style={{ background: '#161616', border: '1px solid #222', borderRadius: 6, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{p.title || `Projekt ${p.id.slice(0, 8)}`}</div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                        {p.scenes?.length ?? 0} Szenen · Status: {p.status} · {new Date(p.createdAt).toLocaleDateString('de')}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/videos/${p.id}`)}
                      style={{ background: '#222', border: '1px solid #333', color: '#aaa', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}
                    >
                      Öffnen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
