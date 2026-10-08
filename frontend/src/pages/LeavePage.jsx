import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, Clock, CheckCircle2, XCircle, Plus, 
  AlertCircle, Check, X, Filter, User, HelpCircle 
} from 'lucide-react';

export const LeavePage = () => {
  const { user, role, isAdmin, isManager } = useAuth();
  const [requests, setRequests] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All'); // All, Pending, Approved, Rejected

  // Modal states
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const fetchLeaveData = async () => {
    try {
      setLoading(true);

      // Fetch requests
      const params = {};
      if (activeTab !== 'All') {
        params.status = activeTab;
      }
      const reqRes = await api.get('/leave', { params });
      setRequests(reqRes.data);

      // Fetch balance (for current user)
      try {
        const balRes = await api.get('/leave/balance');
        setBalance(balRes.data);
      } catch (err) {
        // Top-level admins without employee record might not have a balance
        console.warn('Balance not found:', err);
      }
    } catch (err) {
      console.error('Failed to load leave data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, [activeTab]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (e < s) return 0;
    const diff = Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const days = calculateDays();
    if (days <= 0) {
      setFormError('End date must be on or after start date.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (startDate < today) {
      setFormError('Leave cannot be scheduled in the past.');
      return;
    }

    if (balance && days > balance.remainingLeaves) {
      setFormError(`Requested ${days} days exceeds your remaining balance of ${balance.remainingLeaves} days.`);
      return;
    }

    if (!reason.trim()) {
      setFormError('Please enter a valid reason for leave.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/leave', {
        leaveType,
        startDate,
        endDate,
        reason: reason.trim()
      });

      setIsApplyOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      showToast('Leave request submitted successfully!');
      fetchLeaveData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (leaveId) => {
    if (!window.confirm('Are you sure you want to approve this leave request and deduct employee balance?')) {
      return;
    }

    try {
      await api.put(`/leave/${leaveId}/approve`);
      showToast('Leave request approved and balance updated!');
      fetchLeaveData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve request.');
    }
  };

  const handleReject = async (leaveId) => {
    if (!window.confirm('Are you sure you want to reject this leave request?')) {
      return;
    }

    try {
      await api.put(`/leave/${leaveId}/reject`);
      showToast('Leave request marked as Rejected.');
      fetchLeaveData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject request.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <span className="badge badge-active"><Check size={12} /> Approved</span>;
      case 'Rejected':
        return <span className="badge badge-inactive"><X size={12} /> Rejected</span>;
      default:
        return (
          <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
            <Clock size={12} /> Pending
          </span>
        );
    }
  };

  const getLeaveTypeBadge = (type) => {
    switch (type) {
      case 'Sick':
        return <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>Sick Leave</span>;
      case 'Earned':
        return <span className="badge" style={{ backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' }}>Earned Leave</span>;
      default:
        return <span className="badge" style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>Casual Leave</span>;
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'Pending').length;
  const approvedCount = requests.filter((r) => r.status === 'Approved').length;

  return (
    <div className="page-body">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: '#065f46',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 600
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {isManager && !isAdmin ? 'Team Leave Management' : 'Leave Tracking & Requests'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            Submit time off, review requests, and monitor annual leave quotas
          </p>
        </div>

        {/* Anyone with employee role can apply */}
        <button
          onClick={() => setIsApplyOpen(true)}
          className="btn btn-primary"
          style={{ padding: '10px 20px' }}
        >
          <Plus size={18} />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Balance Cards */}
      {balance && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#eef2ff', color: '#4f46e5' }}>
              <Calendar size={22} />
            </div>
            <div>
              <div className="stat-value">{balance.totalLeaves} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>days</span></div>
              <div className="stat-label">Total Allocated Quota</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
              <Clock size={22} />
            </div>
            <div>
              <div className="stat-value">{balance.usedLeaves} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>days</span></div>
              <div className="stat-label">Leaves Consumed</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div className="stat-value">{balance.remainingLeaves} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>days</span></div>
              <div className="stat-label">Available Remaining Balance</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Filter Navigation */}
      <div className="card" style={{ marginBottom: '20px', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['All', 'Pending', 'Approved', 'Rejected'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '7px 16px', fontWeight: 600 }}
            >
              <span>{tab}</span>
              {tab === 'Pending' && pendingCount > 0 && (
                <span
                  style={{
                    marginLeft: '4px',
                    backgroundColor: activeTab === tab ? '#ffffff' : '#f59e0b',
                    color: activeTab === tab ? '#4f46e5' : '#ffffff',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontSize: '0.72rem'
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Dates & Duration</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Approver Info</th>
              {(isAdmin || isManager) && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading leave records...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No leave requests found for status "{activeTab}".
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.leaveID}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{req.employeeName}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{req.department}</div>
                  </td>

                  <td>{getLeaveTypeBadge(req.leaveType)}</td>

                  <td>
                    <div style={{ fontWeight: 600 }}>
                      {new Date(req.startDate).toLocaleDateString()} – {new Date(req.endDate).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 600 }}>
                      {req.totalDays} {req.totalDays === 1 ? 'day' : 'days'}
                    </div>
                  </td>

                  <td style={{ maxWidth: '280px', fontSize: '0.86rem', color: '#334155' }}>
                    {req.reason}
                  </td>

                  <td>{getStatusBadge(req.status)}</td>

                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {req.approverName ? (
                      <div>
                        <div>{req.approverName}</div>
                        <div style={{ fontSize: '0.72rem' }}>{new Date(req.approvedAt).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Pending Decision</span>
                    )}
                  </td>

                  {(isAdmin || isManager) && (
                    <td style={{ textAlign: 'right' }}>
                      {req.status === 'Pending' ? (
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => handleApprove(req.leaveID)}
                            className="btn btn-sm"
                            style={{ backgroundColor: '#059669', color: '#ffffff', gap: '4px' }}
                            title="Approve Leave and Deduct Balance"
                          >
                            <Check size={14} />
                            <span>Approve</span>
                          </button>

                          <button
                            onClick={() => handleReject(req.leaveID)}
                            className="btn btn-sm btn-secondary"
                            style={{ color: '#dc2626', gap: '4px' }}
                            title="Reject Leave"
                          >
                            <X size={14} />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>Actioned</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Apply Leave Modal */}
      {isApplyOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Apply for Time Off</h2>
              <button onClick={() => setIsApplyOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '16px', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleApplySubmit}>
              <div className="form-group">
                <label className="form-label">Leave Type *</label>
                <select
                  className="form-select"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                >
                  <option value="Casual">Casual Leave (General Time Off)</option>
                  <option value="Sick">Sick Leave (Medical/Health)</option>
                  <option value="Earned">Earned / Annual Vacation</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={startDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={endDate}
                    min={startDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {startDate && endDate && (
                <div style={{ padding: '10px 14px', background: '#eef2ff', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', color: '#4338ca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Requested Duration:</span>
                  <strong>{calculateDays()} {calculateDays() === 1 ? 'day' : 'days'}</strong>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Reason / Justification *</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="State the reason for taking leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setIsApplyOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
