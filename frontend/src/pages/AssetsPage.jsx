import React, { useState, useEffect, useCallback } from 'react';
import { assetService } from '../services/assetService';
import api from '../services/api';
import { 
  Laptop, Monitor, Smartphone, Headphones, Box, Plus, 
  CheckCircle2, AlertCircle, X, Check, Search, Shield, RefreshCw
} from 'lucide-react';

const CATEGORY_ICONS = {
  Laptop: Laptop,
  Monitor: Monitor,
  Mobile: Smartphone,
  Accessory: Headphones,
  Other: Box
};

const STATUS_BADGES = {
  Available: { bg: '#F4ECE1', text: 'var(--color-ink)', border: 'var(--color-rule)' },
  Assigned: { bg: 'var(--color-accent-soft)', text: 'var(--color-accent)', border: '#B8D6BF' },
  UnderRepair: { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  Retired: { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' }
};

export const AssetsPage = () => {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'requests'
  const [assets, setAssets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  // Add Asset Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [assetTag, setAssetTag] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Laptop');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [savingAsset, setSavingAsset] = useState(false);

  // Assign Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Review Request Modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null); // { id, action: 'approve' | 'reject' }
  const [reviewComment, setReviewComment] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await assetService.getAllAssets(statusFilter, categoryFilter);
      setAssets(data);
    } catch (err) {
      console.error('Failed to load assets:', err);
      showToast('error', 'Could not load asset inventory.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  const loadRequests = useCallback(async () => {
    try {
      const data = await assetService.getRequests();
      setRequests(data);
    } catch (err) {
      console.error('Failed to load asset requests:', err);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await api.get('/employees', { params: { status: 'Active' } });
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to load employees for assignment:', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'inventory') {
      loadAssets();
      loadEmployees();
    } else {
      loadRequests();
    }
  }, [activeTab, loadAssets, loadRequests, loadEmployees]);

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    setSavingAsset(true);
    try {
      await assetService.createAsset({
        AssetTag: assetTag,
        Name: name,
        Category: category,
        SerialNumber: serialNumber || null,
        PurchaseDate: purchaseDate || null
      });
      showToast('success', `Asset ${assetTag} added successfully.`);
      setAddModalOpen(false);
      setAssetTag('');
      setName('');
      setSerialNumber('');
      setPurchaseDate('');
      loadAssets();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to create asset.';
      showToast('error', msg);
    } finally {
      setSavingAsset(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedAsset || !selectedEmployeeId) return;
    const assetId = selectedAsset.assetID ?? selectedAsset.assetId ?? selectedAsset.AssetID;
    const assetTag = selectedAsset.assetTag || selectedAsset.AssetTag;
    setAssigning(true);
    try {
      await assetService.assignAsset(assetId, parseInt(selectedEmployeeId, 10));
      showToast('success', `Asset ${assetTag} assigned successfully.`);
      setAssignModalOpen(false);
      setSelectedAsset(null);
      setSelectedEmployeeId('');
      loadAssets();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Assignment failed.';
      showToast('error', msg);
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async (asset) => {
    const assetId = asset.assetID ?? asset.assetId ?? asset.AssetID;
    const assetTag = asset.assetTag || asset.AssetTag;
    const name = asset.name || asset.Name;
    if (!window.confirm(`Unassign and return ${assetTag} (${name}) to available inventory?`)) return;
    try {
      await assetService.unassignAsset(assetId);
      showToast('success', `Asset ${assetTag} unassigned.`);
      loadAssets();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to unassign asset.';
      showToast('error', msg);
    }
  };

  const handleStatusChange = async (asset, newStatus) => {
    const assetId = asset.assetID ?? asset.assetId ?? asset.AssetID;
    try {
      await assetService.updateStatus(assetId, newStatus);
      showToast('success', `Asset status updated to ${newStatus}.`);
      loadAssets();
    } catch (err) {
      const msg = err.response?.data?.message || 'Status update failed.';
      showToast('error', msg);
    }
  };

  const handleReviewAction = async () => {
    if (!selectedRequest) return;
    setReviewing(true);
    try {
      if (selectedRequest.action === 'approve') {
        await assetService.approveRequest(selectedRequest.id, reviewComment);
        showToast('success', 'Asset request approved.');
      } else {
        await assetService.rejectRequest(selectedRequest.id, reviewComment);
        showToast('success', 'Asset request rejected.');
      }
      setReviewModalOpen(false);
      setSelectedRequest(null);
      setReviewComment('');
      loadRequests();
    } catch (err) {
      const msg = err.response?.data?.message || 'Action failed.';
      showToast('error', msg);
    } finally {
      setReviewing(false);
    }
  };

  const filteredAssets = assets.filter((a) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const tag = (a.assetTag || a.AssetTag || '').toLowerCase();
    const name = (a.name || a.Name || '').toLowerCase();
    const assigned = (a.assignedToEmployeeName || a.AssignedToEmployeeName || '').toLowerCase();
    return tag.includes(term) || name.includes(term) || assigned.includes(term);
  });

  const totalCount = assets.length;
  const assignedCount = assets.filter(a => (a.status || a.Status) === 'Assigned').length;
  const availableCount = assets.filter(a => (a.status || a.Status) === 'Available').length;
  const repairCount = assets.filter(a => (a.status || a.Status) === 'UnderRepair').length;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Toast Alert */}
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
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 6px 0', color: '#0F172A' }}>
            Office Asset Management
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '0.9rem' }}>
            Track laptops, monitors, accessories, active assignments, and lifecycle requests.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Tab Switcher */}
          <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '10px', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('inventory')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: activeTab === 'inventory' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'inventory' ? 'var(--color-accent)' : 'var(--color-ink-muted)',
                boxShadow: activeTab === 'inventory' ? 'var(--shadow-warm-sm)' : 'none'
              }}
            >
              Inventory ({totalCount})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: activeTab === 'requests' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'requests' ? 'var(--color-accent)' : 'var(--color-ink-muted)',
                boxShadow: activeTab === 'requests' ? 'var(--shadow-warm-sm)' : 'none'
              }}
            >
              Requests
            </button>
          </div>

          {activeTab === 'inventory' && (
            <button
              onClick={() => setAddModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--color-accent)',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(30,77,43,0.25)'
              }}
            >
              <Plus size={18} /> Add Asset
            </button>
          )}
        </div>
      </div>

      {/* Metric Tiles (Inventory View) */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '14px', border: '1px solid var(--color-rule)', boxShadow: 'var(--shadow-warm-sm)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', fontWeight: 600 }}>Total Assets</span>
            <span style={{ display: 'block', fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-ink)', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>{totalCount}</span>
          </div>
          <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '14px', border: '1px solid var(--color-rule)', boxShadow: 'var(--shadow-warm-sm)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 600 }}>Assigned</span>
            <span style={{ display: 'block', fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-accent)', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>{assignedCount}</span>
          </div>
          <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '14px', border: '1px solid var(--color-rule)', boxShadow: 'var(--shadow-warm-sm)' }}>
            <span style={{ fontSize: '0.8rem', color: '#16A34A', fontWeight: 600 }}>Available</span>
            <span style={{ display: 'block', fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#16A34A', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>{availableCount}</span>
          </div>
          <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '14px', border: '1px solid var(--color-rule)', boxShadow: 'var(--shadow-warm-sm)' }}>
            <span style={{ fontSize: '0.8rem', color: '#D97706', fontWeight: 600 }}>Under Repair</span>
            <span style={{ display: 'block', fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#D97706', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>{repairCount}</span>
          </div>
        </div>
      )}

      {/* TAB 1: INVENTORY TABLE */}
      {activeTab === 'inventory' && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {/* Filter Bar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', background: '#F8FAFC' }}>
            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search tag, model, employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
            >
              <option value="">All Categories</option>
              <option value="Laptop">Laptops</option>
              <option value="Monitor">Monitors</option>
              <option value="Mobile">Mobiles</option>
              <option value="Accessory">Accessories</option>
              <option value="Other">Other</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Assigned">Assigned</option>
              <option value="UnderRepair">Under Repair</option>
              <option value="Retired">Retired</option>
            </select>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                  <th style={{ padding: '12px 20px' }}>Asset Tag</th>
                  <th style={{ padding: '12px 20px' }}>Name / Model</th>
                  <th style={{ padding: '12px 20px' }}>Category</th>
                  <th style={{ padding: '12px 20px' }}>Status</th>
                  <th style={{ padding: '12px 20px' }}>Current Custodian</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                      {loading ? 'Loading assets...' : 'No assets found.'}
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const assetId = asset.assetID ?? asset.assetId ?? asset.AssetID;
                    const status = asset.status || asset.Status;
                    const category = asset.category || asset.Category;
                    const assetTag = asset.assetTag || asset.AssetTag;
                    const name = asset.name || asset.Name;
                    const serialNumber = asset.serialNumber || asset.SerialNumber;
                    const assignedName = asset.assignedToEmployeeName || asset.AssignedToEmployeeName;
                    const assignedDept = asset.assignedToDepartment || asset.AssignedToDepartment;
                    const badge = STATUS_BADGES[status] || STATUS_BADGES.Available;
                    const IconComp = CATEGORY_ICONS[category] || Box;

                    return (
                      <tr key={assetId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '14px 20px', fontWeight: 700, fontFamily: 'monospace', color: '#0F172A' }}>
                          {assetTag}
                        </td>
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: '#1E293B' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <IconComp size={16} style={{ color: 'var(--color-accent)' }} />
                            <span>{name}</span>
                          </div>
                          {serialNumber && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                              S/N: {serialNumber}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#475569' }}>
                          {category}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`
                          }}>
                            {status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          {assignedName ? (
                            <div>
                              <span style={{ fontWeight: 600, color: '#0F172A' }}>{assignedName}</span>
                              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748B' }}>{assignedDept}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>In Inventory</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {status === 'Available' && (
                              <button
                                onClick={() => {
                                  setSelectedAsset(asset);
                                  setSelectedEmployeeId('');
                                  setAssignModalOpen(true);
                                }}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: 'var(--color-accent)',
                                  color: '#FFFFFF',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Assign
                              </button>
                            )}

                            {status === 'Assigned' && (
                              <button
                                onClick={() => handleUnassign(asset)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  background: '#FFFFFF',
                                  color: '#DC2626',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Return
                              </button>
                            )}

                            {status === 'UnderRepair' && (
                              <button
                                onClick={() => handleStatusChange(asset, 'Available')}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: '#059669',
                                  color: '#FFFFFF',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Mark Ready
                              </button>
                            )}

                            <select
                              value={status}
                              onChange={(e) => handleStatusChange(asset, e.target.value)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                fontSize: '0.75rem',
                                background: '#FFFFFF'
                              }}
                            >
                              <option value="Available">Available</option>
                              <option value="UnderRepair">Under Repair</option>
                              <option value="Retired">Retired</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ASSET REQUESTS TABLE (Admin review) */}
      {activeTab === 'requests' && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
              Employee Repair & Return Requests
            </h2>
            <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
              Approving Return frees the asset; Approving Repair marks asset UnderRepair
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                  <th style={{ padding: '12px 20px' }}>Employee</th>
                  <th style={{ padding: '12px 20px' }}>Asset</th>
                  <th style={{ padding: '12px 20px' }}>Request Type</th>
                  <th style={{ padding: '12px 20px' }}>Description</th>
                  <th style={{ padding: '12px 20px' }}>Status</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                      No asset requests pending review.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => {
                    const reqId = r.assetRequestID ?? r.assetRequestId ?? r.AssetRequestID;
                    const status = r.status || r.Status;
                    const isPending = status === 'Pending';
                    const empName = r.employeeName || r.EmployeeName;
                    const dept = r.department || r.Department;
                    const assetTag = r.assetTag || r.AssetTag;
                    const assetName = r.assetName || r.AssetName;
                    const reqType = r.requestType || r.RequestType;
                    const desc = r.description || r.Description;

                    return (
                      <tr key={reqId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0F172A' }}>
                          {empName}
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', fontWeight: 400 }}>{dept}</span>
                        </td>
                        <td style={{ padding: '14px 20px', color: '#1E293B' }}>
                          <strong>{assetTag}</strong>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748B' }}>{assetName}</span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: reqType === 'Repair' ? '#FEF3C7' : '#EFF6FF',
                            color: reqType === 'Repair' ? '#D97706' : '#2563EB'
                          }}>
                            {reqType}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', color: '#475569', maxWidth: '300px' }}>
                          {desc}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: status === 'Approved' ? '#ECFDF5' :
                                        status === 'Rejected' ? '#FEF2F2' :
                                        status === 'Cancelled' ? '#F1F5F9' : '#FFFBEB',
                            color: status === 'Approved' ? '#059669' :
                                   status === 'Rejected' ? '#DC2626' :
                                   status === 'Cancelled' ? '#64748B' : '#D97706'
                          }}>
                            {status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          {isPending ? (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => {
                                  setSelectedRequest({ id: reqId, action: 'approve' });
                                  setReviewComment('');
                                  setReviewModalOpen(true);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: '#059669',
                                  color: '#FFFFFF',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRequest({ id: reqId, action: 'reject' });
                                  setReviewComment('');
                                  setReviewModalOpen(true);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: '#DC2626',
                                  color: '#FFFFFF',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Reviewed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD ASSET */}
      {addModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>Register New Asset</h3>
              <button onClick={() => setAddModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAsset}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Asset Tag (Unique) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. AST-LP-010"
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Asset Name / Model *
                </label>
                <input
                  type="text"
                  placeholder="e.g. MacBook Pro 14 M3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Mobile">Mobile</option>
                    <option value="Accessory">Accessory</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Serial Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. C02G10JPMD"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#64748B', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAsset}
                  style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'var(--color-accent)', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}
                >
                  {savingAsset ? 'Saving...' : 'Add Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN ASSET */}
      {assignModalOpen && selectedAsset && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px 0', color: '#0F172A' }}>
              Assign Asset: {selectedAsset.assetTag || selectedAsset.AssetTag}
            </h3>
            <p style={{ margin: '0 0 18px 0', color: '#64748B', fontSize: '0.88rem' }}>
              {selectedAsset.name || selectedAsset.Name} ({selectedAsset.category || selectedAsset.Category})
            </p>

            <form onSubmit={handleAssign}>
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Assign to Employee *
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                >
                  <option value="">Select Active Employee...</option>
                  {employees.map((emp) => {
                    const empId = emp.employeeID ?? emp.employeeId ?? emp.EmployeeID;
                    const empName = emp.name || emp.Name;
                    const dept = emp.department || emp.Department;
                    const pos = emp.position || emp.Position;
                    return (
                      <option key={empId} value={empId}>
                        {empName} ({dept} - {pos})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#64748B', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'var(--color-accent)', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}
                >
                  {assigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REVIEW ASSET REQUEST */}
      {reviewModalOpen && selectedRequest && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 10px 0', color: '#0F172A' }}>
              {selectedRequest.action === 'approve' ? 'Approve Asset Request' : 'Reject Asset Request'}
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#64748B', fontSize: '0.85rem' }}>
              {selectedRequest.action === 'approve'
                ? 'Approving a Return marks the asset Available; approving a Repair marks it UnderRepair.'
                : 'State reason for rejecting this asset request.'}
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Admin Comment
              </label>
              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Optional notes or instructions..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem', resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#64748B', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReviewAction}
                disabled={reviewing}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: selectedRequest.action === 'approve' ? '#059669' : '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {reviewing ? 'Processing...' : (selectedRequest.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default AssetsPage;
