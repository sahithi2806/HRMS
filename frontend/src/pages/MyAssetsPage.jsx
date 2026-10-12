import React, { useState, useEffect, useCallback } from 'react';
import { assetService } from '../services/assetService';
import { 
  Laptop, Monitor, Smartphone, Headphones, Box, Wrench, 
  RotateCcw, CheckCircle2, AlertCircle, X, Clock, ShieldCheck, 
  Sparkles, History
} from 'lucide-react';

const CATEGORY_ICONS = {
  Laptop: Laptop,
  Monitor: Monitor,
  Mobile: Smartphone,
  Accessory: Headphones,
  Other: Box
};

const REQUEST_STATUS_BADGES = {
  Pending: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
  Approved: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  Rejected: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  Cancelled: { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' }
};

export const MyAssetsPage = () => {
  const [myAssets, setMyAssets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Request Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [requestType, setRequestType] = useState('Repair'); // 'Repair' or 'Return'
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [assetsData, requestsData] = await Promise.all([
        assetService.getMyAssets(),
        assetService.getRequests()
      ]);
      setMyAssets(assetsData);
      setRequests(requestsData);
    } catch (err) {
      console.error('Failed to load my assets:', err);
      showToast('error', 'Could not load your assigned assets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openRequestModal = (asset, type) => {
    setSelectedAsset(asset);
    setRequestType(type);
    setDescription('');
    setModalOpen(true);
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast('error', 'Please provide a reason or description for this request.');
      return;
    }

    setSubmitting(true);
    try {
      await assetService.createRequest({
        assetId: selectedAsset.AssetID,
        requestType,
        description: description.trim()
      });
      showToast('success', `${requestType} request submitted successfully.`);
      setModalOpen(false);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to submit request.';
      showToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this pending request?')) return;
    try {
      await assetService.cancelRequest(requestId);
      showToast('success', 'Request cancelled.');
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Could not cancel request.';
      showToast('error', msg);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '14px 20px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          background: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${toast.type === 'success' ? '#10B981' : '#EF4444'}`,
          color: toast.type === 'success' ? '#065F46' : '#991B1B',
          fontWeight: 500,
          fontSize: '0.95rem'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0A1A5C 0%, #0047AB 60%, #2563EB 100%)',
        borderRadius: '16px',
        padding: '30px 36px',
        color: '#FFFFFF',
        marginBottom: '28px',
        boxShadow: '0 12px 30px -10px rgba(0, 71, 171, 0.35)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sparkles size={16} style={{ color: '#38BDF8' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#93C5FD' }}>
              Hardware & Devices
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            My Assigned Assets
          </h1>
          <p style={{ margin: 0, opacity: 0.85, fontSize: '0.95rem' }}>
            View hardware assigned to you, report maintenance issues, or schedule equipment returns.
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(8px)',
          padding: '12px 20px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {myAssets.length}
          </div>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.85 }}>
            Active Hardware
          </div>
        </div>
      </div>

      {/* Main Grid: My Assigned Devices */}
      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={22} style={{ color: '#0047AB' }} />
          Assigned Equipment ({myAssets.length})
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748B' }}>
            <Clock className="animate-spin" size={32} style={{ margin: '0 auto 12px auto', color: '#0047AB' }} />
            <p>Loading your assigned equipment...</p>
          </div>
        ) : myAssets.length === 0 ? (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px dashed #CBD5E1',
            padding: '48px 24px',
            textAlign: 'center',
            color: '#64748B'
          }}>
            <Box size={44} style={{ margin: '0 auto 14px auto', color: '#94A3B8' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', margin: '0 0 6px 0' }}>No assets currently assigned</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              You do not have any company hardware assigned to your account right now.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {myAssets.map((asset) => {
              const Icon = CATEGORY_ICONS[asset.Category] || Box;
              return (
                <div
                  key={asset.AssetID}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: '#EFF6FF',
                        color: '#0047AB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon size={24} />
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        background: '#F1F5F9',
                        color: '#334155',
                        border: '1px solid #E2E8F0'
                      }}>
                        {asset.AssetTag}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 4px 0', color: '#0F172A' }}>
                      {asset.Name}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '14px' }}>
                      Category: <strong>{asset.Category}</strong>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#475569', background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', marginBottom: '18px' }}>
                      <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Serial Number:</span>
                        <strong style={{ fontFamily: 'monospace' }}>{asset.SerialNumber || 'N/A'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Assigned On:</span>
                        <strong>{asset.AssignedAt ? new Date(asset.AssignedAt).toLocaleDateString() : 'N/A'}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                    <button
                      onClick={() => openRequestModal(asset, 'Repair')}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #FDE68A',
                        background: '#FFFBEB',
                        color: '#B45309',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Wrench size={15} /> Raise Repair
                    </button>
                    <button
                      onClick={() => openRequestModal(asset, 'Return')}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        background: '#F8FAFC',
                        color: '#475569',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <RotateCcw size={15} /> Return Asset
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Requests History Section */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <History size={22} style={{ color: '#0047AB' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
            My Asset Requests History
          </h2>
        </div>

        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: '#94A3B8' }}>
            No repair or return requests raised yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Asset</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Reason / Description</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Admin Review</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Submitted At</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const badge = REQUEST_STATUS_BADGES[req.Status] || REQUEST_STATUS_BADGES.Pending;
                  return (
                    <tr key={req.AssetRequestID} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0F172A' }}>
                        <div>{req.AssetName}</div>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#64748B' }}>
                          {req.AssetTag}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontWeight: 600,
                          color: req.RequestType === 'Repair' ? '#B45309' : '#0369A1'
                        }}>
                          {req.RequestType === 'Repair' ? <Wrench size={14} /> : <RotateCcw size={14} />}
                          {req.RequestType}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`
                        }}>
                          {req.Status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#334155', maxWidth: '280px' }}>
                        {req.Description}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748B', maxWidth: '220px' }}>
                        {req.AdminComment ? (
                          <span style={{ fontStyle: 'italic' }}>&ldquo;{req.AdminComment}&rdquo;</span>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>&mdash;</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748B' }}>
                        {new Date(req.CreatedAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {req.Status === 'Pending' && (
                          <button
                            onClick={() => handleCancelRequest(req.AssetRequestID)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#DC2626',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Raise {requestType} Request
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '10px', marginBottom: '18px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748B' }}>Device:</div>
              <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '1rem' }}>
                {selectedAsset?.Name} ({selectedAsset?.AssetTag})
              </div>
            </div>

            <form onSubmit={handleCreateRequest}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  {requestType === 'Repair' ? 'Describe the issue or malfunction *' : 'Reason for returning equipment *'}
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={requestType === 'Repair' ? 'e.g. Battery not charging properly, trackpad unresponsive...' : 'e.g. Project finished, receiving upgraded device...'}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: requestType === 'Repair' ? '#D97706' : '#0047AB',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Submitting...' : `Submit ${requestType} Request`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAssetsPage;
