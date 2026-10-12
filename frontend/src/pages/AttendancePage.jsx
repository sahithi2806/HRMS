import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceService } from '../services/attendanceService';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  CheckCircle2, AlertCircle, X
} from 'lucide-react';

const STATUS_CONFIG = {
  Present: { label: 'Present', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  Late: { label: 'Late Arrival', bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  HalfDay: { label: 'Half Day', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  Absent: { label: 'Absent', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  OnLeave: { label: 'On Leave', bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
  Weekend: { label: 'Weekend', bg: '#F8FAFC', text: '#94A3B8', border: '#E2E8F0' },
  MissingCheckOut: { label: 'Missed Out-Punch', bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3' },
  NotCheckedIn: { label: 'Pending', bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' }
};

export const AttendancePage = () => {
  const { user, isManager, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar', 'regularizations', 'team'
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [monthlyData, setMonthlyData] = useState(null);
  const [regularizations, setRegularizations] = useState([]);
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [selectedTeamDate, setSelectedTeamDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Regularize modal state
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [regDate, setRegDate] = useState('');
  const [regInTime, setRegInTime] = useState('09:30');
  const [regOutTime, setRegOutTime] = useState('18:30');
  const [regReason, setRegReason] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null); // { id, action: 'approve' | 'reject' }
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadCalendar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await attendanceService.getMyMonthly(currentMonth);
      setMonthlyData(data);
    } catch (err) {
      console.error('Failed to load monthly attendance:', err);
      showToast('error', 'Could not load attendance calendar.');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  const loadRegularizations = useCallback(async () => {
    try {
      const list = await attendanceService.getRegularizations();
      setRegularizations(list);
    } catch (err) {
      console.error('Failed to load regularizations:', err);
    }
  }, []);

  const loadTeam = useCallback(async () => {
    if (!isManager && !isAdmin) return;
    try {
      const data = await attendanceService.getTeamAttendance(selectedTeamDate);
      setTeamAttendance(data);
    } catch (err) {
      console.error('Failed to load team attendance:', err);
    }
  }, [isManager, isAdmin, selectedTeamDate]);

  useEffect(() => {
    if (activeTab === 'calendar') {
      loadCalendar();
    } else if (activeTab === 'regularizations') {
      loadRegularizations();
    } else if (activeTab === 'team') {
      loadTeam();
    }
  }, [activeTab, loadCalendar, loadRegularizations, loadTeam]);

  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setCurrentMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setCurrentMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const openRegularizeModal = (dayDate) => {
    setRegDate(dayDate);
    setRegInTime('09:30');
    setRegOutTime('18:30');
    setRegReason('');
    setRegModalOpen(true);
  };

  const handleSubmitRegularization = async (e) => {
    e.preventDefault();
    if (!regReason.trim()) {
      showToast('error', 'Please state a reason for regularization.');
      return;
    }

    setRegSubmitting(true);
    try {
      const inDateTime = `${regDate}T${regInTime}:00`;
      const outDateTime = `${regDate}T${regOutTime}:00`;

      await attendanceService.createRegularization({
        workDate: regDate,
        requestedCheckIn: inDateTime,
        requestedCheckOut: outDateTime,
        reason: regReason
      });

      showToast('success', 'Regularization submitted successfully for approval.');
      setRegModalOpen(false);
      loadCalendar();
      loadRegularizations();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Submission failed.';
      showToast('error', msg);
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleReviewAction = async () => {
    if (!reviewTarget) return;
    setReviewSubmitting(true);
    try {
      if (reviewTarget.action === 'approve') {
        await attendanceService.approveRegularization(reviewTarget.id, reviewComment);
        showToast('success', 'Regularization approved.');
      } else {
        await attendanceService.rejectRegularization(reviewTarget.id, reviewComment);
        showToast('success', 'Regularization rejected.');
      }
      setReviewModalOpen(false);
      setReviewTarget(null);
      setReviewComment('');
      loadRegularizations();
      if (activeTab === 'calendar') loadCalendar();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Review action failed.';
      showToast('error', msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleCancelRegularization = async (id) => {
    if (!window.confirm('Cancel this pending regularization request?')) return;
    try {
      await attendanceService.cancelRegularization(id);
      showToast('success', 'Request cancelled.');
      loadRegularizations();
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not cancel request.';
      showToast('error', msg);
    }
  };

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
            Attendance & Work Logs
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '0.9rem' }}>
            Track daily clock-ins, review monthly attendance trends, and regularize missed punches.
          </p>
        </div>

        {/* Tab Controls */}
        <div style={{
          display: 'flex',
          background: '#F1F5F9',
          padding: '4px',
          borderRadius: '10px',
          gap: '4px'
        }}>
          <button
            onClick={() => setActiveTab('calendar')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: activeTab === 'calendar' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'calendar' ? '#0047AB' : '#64748B',
              boxShadow: activeTab === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            My Calendar
          </button>

          <button
            onClick={() => setActiveTab('regularizations')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: activeTab === 'regularizations' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'regularizations' ? '#0047AB' : '#64748B',
              boxShadow: activeTab === 'regularizations' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Regularizations
          </button>

          {(isManager || isAdmin) && (
            <button
              onClick={() => setActiveTab('team')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: activeTab === 'team' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'team' ? '#0047AB' : '#64748B',
                boxShadow: activeTab === 'team' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Team Daily
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div>
          {loading && !monthlyData && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
              Loading attendance data...
            </div>
          )}

          {/* Monthly Summary Strip */}
          {monthlyData && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Working Days</span>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {monthlyData.WorkingDays}
                </span>
              </div>
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>Present Days</span>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                  {monthlyData.PresentDays}
                </span>
              </div>
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: 600, textTransform: 'uppercase' }}>Late Arrivals</span>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
                  {monthlyData.LateDays}
                </span>
              </div>
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 600, textTransform: 'uppercase' }}>Half Days</span>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
                  {monthlyData.HalfDays}
                </span>
              </div>
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, textTransform: 'uppercase' }}>Absent / Missed</span>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
                  {monthlyData.AbsentDays}
                </span>
              </div>
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#7C3AED', fontWeight: 600, textTransform: 'uppercase' }}>On Leave</span>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#7C3AED', marginTop: '4px' }}>
                  {monthlyData.LeaveDays}
                </span>
              </div>
            </div>
          )}

          {/* Month Selector Bar */}
          <div style={{
            background: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <button
              onClick={handlePrevMonth}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#1E293B',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              <ChevronLeft size={16} /> Previous
            </button>

            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarIcon size={20} style={{ color: '#0047AB' }} />
              {new Date(`${currentMonth}-01`).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            </div>

            <button
              onClick={handleNextMonth}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#1E293B',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>

          {/* Calendar Table Grid */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '12px',
              padding: '16px'
            }}>
              {monthlyData?.Days.map((d) => {
                const conf = STATUS_CONFIG[d.Status] || STATUS_CONFIG.NotCheckedIn;
                return (
                  <div
                    key={d.Date}
                    style={{
                      background: conf.bg,
                      borderRadius: '12px',
                      padding: '14px',
                      border: `1px solid ${conf.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                            {new Date(`${d.Date}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#64748B', marginLeft: '6px' }}>
                            {d.DayOfWeek.substring(0, 3)}
                          </span>
                        </div>

                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: conf.text,
                          background: '#FFFFFF',
                          border: `1px solid ${conf.border}`
                        }}>
                          {conf.label}
                        </span>
                      </div>

                      {/* Punches or Leave Note */}
                      <div style={{ fontSize: '0.8rem', color: '#334155', minHeight: '36px' }}>
                        {d.Status === 'OnLeave' ? (
                          <span style={{ color: '#7C3AED', fontWeight: 600 }}>{d.LeaveType} Leave</span>
                        ) : d.Status === 'Weekend' ? (
                          <span style={{ color: '#94A3B8' }}>Weekly Off</span>
                        ) : d.CheckInAt ? (
                          <div>
                            <div>In: <strong>{new Date(d.CheckInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                              {d.CheckOutAt && <span> &bull; Out: <strong>{new Date(d.CheckOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>}
                            </div>
                            <div style={{ color: '#64748B', marginTop: '2px' }}>Total: <strong>{d.TotalHours} hrs</strong></div>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>No punches recorded</span>
                        )}
                      </div>
                    </div>

                    {/* Regularize Action Button */}
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      {d.CanRegularize ? (
                        <button
                          onClick={() => openRegularizeModal(d.Date)}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            color: '#0047AB',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Regularize Punch
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', textAlign: 'center' }}>
                          {d.Status === 'Weekend' || d.Status === 'OnLeave' ? 'Off Day' : 'Completed'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REGULARIZATIONS LIST */}
      {activeTab === 'regularizations' && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
              Attendance Regularization Requests
            </h2>
            <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
              Window: Within 7 days of missed punch
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                  <th style={{ padding: '12px 20px' }}>Employee</th>
                  <th style={{ padding: '12px 20px' }}>Work Date</th>
                  <th style={{ padding: '12px 20px' }}>Requested Times</th>
                  <th style={{ padding: '12px 20px' }}>Reason</th>
                  <th style={{ padding: '12px 20px' }}>Status</th>
                  <th style={{ padding: '12px 20px' }}>Review Info</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {regularizations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                      No regularization requests found.
                    </td>
                  </tr>
                ) : (
                  regularizations.map((r) => {
                    const isPending = r.Status === 'Pending';
                    const isOwn = r.EmployeeID === user?.employeeId;
                    const canReview = isPending && !isOwn && (isManager || isAdmin);

                    return (
                      <tr key={r.RegularizationID} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0F172A' }}>
                          {r.EmployeeName}
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', fontWeight: 400 }}>{r.Department}</span>
                        </td>
                        <td style={{ padding: '14px 20px', color: '#334155', fontWeight: 500 }}>
                          {r.WorkDate}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#334155' }}>
                          {new Date(r.RequestedCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &ndash; {new Date(r.RequestedCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#475569', maxWidth: '240px' }}>
                          {r.Reason}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: r.Status === 'Approved' ? '#ECFDF5' :
                                        r.Status === 'Rejected' ? '#FEF2F2' :
                                        r.Status === 'Cancelled' ? '#F1F5F9' : '#FFFBEB',
                            color: r.Status === 'Approved' ? '#059669' :
                                   r.Status === 'Rejected' ? '#DC2626' :
                                   r.Status === 'Cancelled' ? '#64748B' : '#D97706'
                          }}>
                            {r.Status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: '0.78rem', color: '#64748B' }}>
                          {r.ApproverName ? (
                            <div>
                              <span>By: {r.ApproverName}</span>
                              {r.ManagerComment && <div style={{ fontStyle: 'italic', color: '#475569' }}>"{r.ManagerComment}"</div>}
                            </div>
                          ) : '--'}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          {canReview ? (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => {
                                  setReviewTarget({ id: r.RegularizationID, action: 'approve' });
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
                                  setReviewTarget({ id: r.RegularizationID, action: 'reject' });
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
                          ) : isOwn && isPending ? (
                            <button
                              onClick={() => handleCancelRegularization(r.RegularizationID)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                color: '#64748B',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>None</span>
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

      {/* TAB 3: TEAM ATTENDANCE (Manager / Admin) */}
      {activeTab === 'team' && (isManager || isAdmin) && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px 0', color: '#0F172A' }}>
                Team Daily Punch Records
              </h2>
              <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
                Showing active reports & attendance timestamps
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Date:</label>
              <input
                type="date"
                value={selectedTeamDate}
                onChange={(e) => setSelectedTeamDate(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                  <th style={{ padding: '12px 20px' }}>Employee</th>
                  <th style={{ padding: '12px 20px' }}>Department</th>
                  <th style={{ padding: '12px 20px' }}>First Check-In</th>
                  <th style={{ padding: '12px 20px' }}>Last Check-Out</th>
                  <th style={{ padding: '12px 20px' }}>Logged Hours</th>
                  <th style={{ padding: '12px 20px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {teamAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                      No attendance data found for this date.
                    </td>
                  </tr>
                ) : (
                  teamAttendance.map((t) => (
                    <tr key={t.EmployeeID} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0F172A' }}>
                        {t.EmployeeName}
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', fontWeight: 400 }}>{t.Position}</span>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#475569' }}>
                        {t.Department}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#1E293B' }}>
                        {t.CheckInAt ? (
                          <span>
                            {new Date(t.CheckInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {t.IsLate && <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: '#D97706', fontWeight: 700 }}>LATE</span>}
                          </span>
                        ) : '--:--'}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#1E293B' }}>
                        {t.CheckOutAt ? new Date(t.CheckOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </td>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0047AB' }}>
                        {t.TotalHours ? `${t.TotalHours} hrs` : '--'}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: t.Status === 'Present' ? '#ECFDF5' :
                                      t.Status === 'HalfDay' ? '#EFF6FF' :
                                      t.Status === 'Absent' ? '#FEF2F2' : '#F1F5F9',
                          color: t.Status === 'Present' ? '#059669' :
                                 t.Status === 'HalfDay' ? '#2563EB' :
                                 t.Status === 'Absent' ? '#DC2626' : '#64748B'
                        }}>
                          {t.Status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: REGULARIZE PUNCH */}
      {regModalOpen && (
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
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Regularize Attendance
              </h3>
              <button
                onClick={() => setRegModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitRegularization}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Work Date
                </label>
                <input
                  type="date"
                  value={regDate}
                  disabled
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#64748B',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Requested In-Time
                  </label>
                  <input
                    type="time"
                    value={regInTime}
                    onChange={(e) => setRegInTime(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Requested Out-Time
                  </label>
                  <input
                    type="time"
                    value={regOutTime}
                    onChange={(e) => setRegOutTime(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Reason for Regularization *
                </label>
                <textarea
                  rows={3}
                  value={regReason}
                  onChange={(e) => setRegReason(e.target.value)}
                  placeholder="e.g. Worked at client site, biometric scanner offline..."
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setRegModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#64748B',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regSubmitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0047AB',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {regSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: APPROVE / REJECT REGULARIZATION */}
      {reviewModalOpen && reviewTarget && (
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
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 12px 0', color: '#0F172A' }}>
              {reviewTarget.action === 'approve' ? 'Approve Regularization' : 'Reject Regularization'}
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#64748B', fontSize: '0.88rem' }}>
              {reviewTarget.action === 'approve'
                ? 'Approving will overwrite or create the attendance row atomically.'
                : 'Please provide reason for rejecting this regularization request.'}
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Manager Comment (Optional)
              </label>
              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Add optional notes or feedback..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#64748B',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReviewAction}
                disabled={reviewSubmitting}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: reviewTarget.action === 'approve' ? '#059669' : '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {reviewSubmitting ? 'Processing...' : (reviewTarget.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default AttendancePage;
