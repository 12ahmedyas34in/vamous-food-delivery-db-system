// frontend/src/pages/AdminDashboard.js

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const STATUS_COLORS = {
  PENDING:          'orange',
  PENDING_PAYMENT:  '#b45309',
  CONFIRMED:        'blue',
  PREPARING:        'purple',
  READY:            'teal',
  OUT_FOR_DELIVERY: 'goldenrod',
  COMPLETED:        'green',
  CANCELLED:        'red',
};

// ─── Tab IDs ──────────────────────────────────────────────────────────────────
const TAB_ORDERS   = 'orders';
const TAB_APPS     = 'applications';
const TAB_PARTNERS = 'partners';

const AdminDashboard = () => {
  const [tab,         setTab]         = useState(TAB_ORDERS);
  const [orders,      setOrders]      = useState([]);
  const [stats,       setStats]       = useState({ activeOrders: 0, todaysRevenue: 0 });
  const [apps,        setApps]        = useState([]);
  const [partners,    setPartners]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [appsLoading, setAppsLoading] = useState(false);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [error,       setError]       = useState('');
  const [actionMsg,   setActionMsg]   = useState('');
  const [credModal,   setCredModal]   = useState(null); // { email, temp_password }

  const isFetching = useRef(false);
  const navigate   = useNavigate();

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user')) || {}; }
    catch { return {}; }
  })();

  // Route is already restricted to 'admin' via RestrictedRoute in App.js
  const isAdmin = currentUser.role === 'admin';

  // ── Fetch orders + stats ─────────────────────────────────────────────────
  const fetchOrders = async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const [ordersRes, statsRes] = await Promise.all([
        axios.get('/orders?limit=50&offset=0'),
        axios.get('/orders/admin/stats'),
      ]);
      setOrders(ordersRes.data.data);
      setStats(statsRes.data.data);
      setError('');
    } catch {
      setError('Connection lost. Could not sync with server.');
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  // ── Fetch pending applications ───────────────────────────────────────────
  const fetchApplications = async () => {
    setAppsLoading(true);
    try {
      const res = await axios.get('/admin/applications');
      setApps(res.data.data);
    } catch {
      setError('Failed to load applications.');
    } finally {
      setAppsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // ── Fetch active partners ────────────────────────────────────────────────
  const fetchPartners = async () => {
    setPartnersLoading(true);
    try {
      const res = await axios.get('/admin/partners');
      setPartners(res.data.data);
    } catch {
      setError('Failed to load active partners.');
    } finally {
      setPartnersLoading(false);
    }
  };

  // Load applications or partners when tab is first opened
  useEffect(() => {
    if (tab === TAB_APPS && isAdmin) fetchApplications();
    if (tab === TAB_PARTNERS && isAdmin) fetchPartners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ── Toggle partner status ────────────────────────────────────────────────
  const handleTogglePartner = async (type, id) => {
    if (!window.confirm(`Are you sure you want to toggle the status of this ${type}?`)) return;
    try {
      const res = await axios.patch(`/admin/partners/${type}/${id}/toggle-active`);
      setActionMsg(res.data.message);
      setTimeout(() => setActionMsg(''), 3000);
      fetchPartners(); // Refresh the list
    } catch (err) {
      setActionMsg(err.response?.data?.message || 'Failed to toggle status.');
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  // ── Application approve / reject ─────────────────────────────────────────
  const handleAppAction = async (type, id, action) => {
    try {
      const res = await axios.post(`/admin/applications/${type}/${id}/${action}`);
      if (action === 'approve' && res.data.temp_password) {
        // Find the app to get the email for display
        const app = apps.find(a => String(a.id) === String(id) && a.type === type);
        setCredModal({
          email:         app?.owner_email || '(see application)',
          temp_password: res.data.temp_password,
        });
      } else {
        setActionMsg('Rejected successfully.');
        setTimeout(() => setActionMsg(''), 3000);
      }
      fetchApplications();
    } catch (err) {
      setActionMsg(err.response?.data?.message || `Failed to ${action}.`);
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  // ── Confirm payment ───────────────────────────────────────────────────────
  const handleConfirmPayment = async (orderId) => {
    try {
      await axios.post(`/admin/confirm-payment/${orderId}`);
      setActionMsg(`Payment confirmed for Order #${orderId}.`);
      fetchOrders();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg(err.response?.data?.message || 'Failed to confirm payment.');
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!isAdmin) return (
    <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Arial' }}>
      <h2 style={{ color: 'red' }}>Access Denied: Admins Only</h2>
      <button onClick={() => navigate('/restaurants')} style={styles.btn}>Go Back</button>
    </div>
  );

  if (loading) return (
    <h2 style={{ textAlign: 'center', padding: '40px', fontFamily: 'Arial' }}>Loading Dashboard…</h2>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>System Dashboard</h2>
        <div>
          <button onClick={() => navigate('/restaurants')} style={{ ...styles.btn, marginRight: '10px' }}>
            Home
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              navigate('/login');
            }}
            style={styles.btnDanger}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner}>
          <p style={{ color: '#cf1322', fontWeight: 'bold', margin: '0 0 10px 0' }}>{error}</p>
          <button onClick={fetchOrders} style={styles.btn}>Retry Now</button>
        </div>
      )}

      {/* Action message toast */}
      {actionMsg && (
        <div style={styles.toastBanner}>
          <p style={{ margin: 0 }}>{actionMsg}</p>
        </div>
      )}

      {/* ── Credentials modal (shown once after approval) ── */}
      {credModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>✅ Application Approved</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#374151' }}>
              Share these credentials with the new partner. This password will <strong>not</strong> be shown again.
            </p>
            <div style={styles.credRow}>
              <span style={styles.credLabel}>Email</span>
              <span style={styles.credValue}>{credModal.email}</span>
            </div>
            <div style={styles.credRow}>
              <span style={styles.credLabel}>Temp password</span>
              <span style={{ ...styles.credValue, fontFamily: 'monospace', fontSize: '16px', letterSpacing: '0.08em' }}>
                {credModal.temp_password}
              </span>
            </div>
            <button
              onClick={() => setCredModal(null)}
              style={{ ...styles.btnApprove, marginTop: '20px', width: '100%', padding: '10px' }}
            >
              I've noted the credentials — close
            </button>
          </div>
        </div>
      )}

      {/* Stats — always visible */}
      <div style={styles.statsContainer}>
        <div style={styles.statBoxActive}>
          <h3 style={{ margin: '0 0 10px 0', color: '#0050b3' }}>Active Orders</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#000' }}>
            {stats.activeOrders}
          </p>
        </div>
        <div style={styles.statBoxRevenue}>
          <h3 style={{ margin: '0 0 10px 0', color: '#237804' }}>Today's Revenue</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: 'green' }}>
            ${Number(stats.todaysRevenue).toFixed(2)}
          </p>
        </div>
        <div style={styles.statBoxApps}>
          <h3 style={{ margin: '0 0 10px 0', color: '#7c3aed' }}>Pending Applications</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#7c3aed' }}>
            {apps.length > 0 ? apps.length : '—'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        <button
          onClick={() => setTab(TAB_ORDERS)}
          style={tab === TAB_ORDERS ? { ...styles.tabBtn, ...styles.tabBtnActive } : styles.tabBtn}
        >
          Live Orders
        </button>
        <button
          onClick={() => setTab(TAB_APPS)}
          style={tab === TAB_APPS ? { ...styles.tabBtn, ...styles.tabBtnActive } : styles.tabBtn}
        >
          Partner Applications {apps.length > 0 && `(${apps.length})`}
        </button>
        <button
          onClick={() => setTab(TAB_PARTNERS)}
          style={tab === TAB_PARTNERS ? { ...styles.tabBtn, ...styles.tabBtnActive } : styles.tabBtn}
        >
          Active Partners
        </button>
      </div>

      {/* ── TAB: Live Orders ── */}
      {tab === TAB_ORDERS && (
        <div style={styles.list}>
          {orders.length === 0 && !error
            ? <p style={{ textAlign: 'center', color: 'gray' }}>No orders in the system.</p>
            : null}
          {orders.map((order) => (
            <div key={order.id} style={styles.orderCard}>
              <div
                onClick={() => navigate(`/orders/${order.id}`)}
                style={{ cursor: 'pointer', flex: 1 }}
              >
                <h4 style={{ margin: '0 0 5px 0' }}>Order #{order.id}</h4>
                <p style={styles.meta}>{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <span style={{ ...styles.badge, background: STATUS_COLORS[order.status] || 'gray' }}>
                  {order.status}
                </span>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '15px' }}>
                  ${parseFloat(order.total_amount).toFixed(2)}
                </p>
                {order.status === 'PENDING_PAYMENT' && (
                  <button
                    onClick={() => handleConfirmPayment(order.id)}
                    style={styles.btnConfirm}
                  >
                    ✓ Confirm Payment
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: Partner Applications ── */}
      {tab === TAB_APPS && (
        <div>
          {appsLoading && (
            <p style={{ textAlign: 'center', color: 'gray', padding: '30px' }}>Loading applications…</p>
          )}
          {!appsLoading && apps.length === 0 && (
            <p style={{ textAlign: 'center', color: 'gray', padding: '40px' }}>No pending applications. 🎉</p>
          )}
          {!appsLoading && apps.length > 0 && (
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Contact</th>
                  <th style={styles.th}>Details</th>
                  <th style={styles.th}>Submitted</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => (
                  <tr key={`${app.type}-${app.id}`} style={styles.tbodyRow}>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        background: app.type === 'restaurant' ? '#e0f2fe' : '#fef9c3',
                        color:      app.type === 'restaurant' ? '#0369a1' : '#854d0e',
                      }}>
                        {app.type === 'restaurant' ? '🍽 Restaurant' : '🛵 Driver'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <strong>{app.entity_name}</strong>
                      {app.owner_name && app.type === 'restaurant' && (
                        <p style={{ ...styles.meta, marginTop: '2px' }}>by {app.owner_name}</p>
                      )}
                    </td>
                    <td style={styles.td}>
                      <p style={{ margin: 0 }}>{app.owner_email}</p>
                      {app.owner_phone && <p style={styles.meta}>{app.owner_phone}</p>}
                    </td>
                    <td style={styles.td}>
                      {app.type === 'restaurant' && <p style={styles.meta}>{app.address}</p>}
                      {app.type === 'driver'     && <p style={styles.meta}>Vehicle: {app.vehicle_type}</p>}
                    </td>
                    <td style={styles.td}>
                      <p style={styles.meta}>
                        {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '—'}
                      </p>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleAppAction(app.type, app.id, 'approve')}
                          style={styles.btnApprove}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAppAction(app.type, app.id, 'reject')}
                          style={styles.btnReject}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── TAB: Active Partners ── */}
      {tab === TAB_PARTNERS && (
        <div style={{ marginTop: '16px', background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e0e0e0' }}>
          {partnersLoading ? <p style={{ textAlign: 'center', padding: '20px' }}>Loading partners...</p> : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Name / Entity</th>
                  <th style={styles.th}>Owner Email</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {partners.map(p => (
                  <tr key={`${p.type}-${p.id}`} style={styles.tbodyRow}>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: p.type === 'restaurant' ? '#dbeafe' : '#f3e8ff', color: p.type === 'restaurant' ? '#1d4ed8' : '#7e22ce' }}>
                        {p.type}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <strong>{p.entity_name}</strong>
                    </td>
                    <td style={styles.td}>{p.owner_email}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: p.is_active ? '#dcfce7' : '#fef2f2', color: p.is_active ? '#15803d' : '#991b1b' }}>
                        {p.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={p.is_active ? styles.btnDanger : styles.btnApprove}
                        onClick={() => handleTogglePartner(p.type, p.id)}
                      >
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {partners.length === 0 && (
                  <tr><td colSpan="5" style={{...styles.td, textAlign: 'center', color: '#888'}}>No partners found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page:           { padding: '24px 20px', fontFamily: 'Arial, sans-serif', maxWidth: '1100px', margin: '0 auto' },
  header:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  statsContainer: { display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' },
  statBoxActive:  { flex: 1, minWidth: '160px', padding: '24px', background: '#e6f7ff', borderRadius: '10px', border: '1px solid #91d5ff', textAlign: 'center' },
  statBoxRevenue: { flex: 1, minWidth: '160px', padding: '24px', background: '#f6ffed', borderRadius: '10px', border: '1px solid #b7eb8f', textAlign: 'center' },
  statBoxApps:    { flex: 1, minWidth: '160px', padding: '24px', background: '#f5f3ff', borderRadius: '10px', border: '1px solid #c4b5fd', textAlign: 'center' },
  tabBar:         { display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '0' },
  tabBtn:         { padding: '10px 20px', cursor: 'pointer', border: 'none', background: 'transparent', fontSize: '14px', fontWeight: '600', color: '#888', borderBottom: '3px solid transparent', marginBottom: '-2px' },
  tabBtnActive:   { color: '#000', borderBottom: '3px solid #000' },
  list:           { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' },
  orderCard:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '16px 20px', background: '#fff' },
  meta:           { margin: 0, color: '#888', fontSize: '13px' },
  badge:          { padding: '4px 12px', borderRadius: '20px', color: '#fff', fontWeight: '600', fontSize: '12px', display: 'inline-block' },
  btn:            { padding: '8px 16px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', fontSize: '14px', fontWeight: 'bold' },
  btnDanger:      { padding: '8px 16px', cursor: 'pointer', border: 'none', borderRadius: '6px', background: '#ff4d4f', color: '#fff', fontSize: '14px', fontWeight: 'bold' },
  btnConfirm:     { padding: '6px 14px', cursor: 'pointer', border: 'none', borderRadius: '6px', background: '#16a34a', color: '#fff', fontSize: '13px', fontWeight: 'bold' },
  btnApprove:     { padding: '6px 14px', cursor: 'pointer', border: 'none', borderRadius: '6px', background: '#22c55e', color: '#fff', fontSize: '13px', fontWeight: '600' },
  btnReject:      { padding: '6px 14px', cursor: 'pointer', border: '1px solid #f87171', borderRadius: '6px', background: '#fff', color: '#dc2626', fontSize: '13px', fontWeight: '600' },
  errorBanner:    { background: '#fff1f0', border: '1px solid #ffa39e', padding: '15px', borderRadius: '8px', textAlign: 'center', marginBottom: '20px' },
  toastBanner:    { background: '#f0fdf4', border: '1px solid #86efac', padding: '12px 20px', borderRadius: '8px', marginBottom: '16px', color: '#166534', fontWeight: '600' },
  table:          { width: '100%', borderCollapse: 'collapse', marginTop: '8px' },
  theadRow:       { borderBottom: '2px solid #eee' },
  tbodyRow:       { borderBottom: '1px solid #f3f4f6' },
  th:             { padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' },
  td:             { padding: '14px 12px', fontSize: '14px', verticalAlign: 'middle' },
  modalOverlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox:       { background: '#fff', borderRadius: '12px', padding: '28px', maxWidth: '420px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  credRow:        { display: 'flex', flexDirection: 'column', gap: '4px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px', marginBottom: '10px' },
  credLabel:      { fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' },
  credValue:      { fontSize: '14px', fontWeight: '600', color: '#111827', wordBreak: 'break-all' },
};

export default AdminDashboard;
