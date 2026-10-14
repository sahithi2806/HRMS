import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceService } from '../services/attendanceService';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  CheckCircle2, AlertCircle, X, Clock, PlayCircle, StopCircle, RefreshCw
} from 'lucide-react';

const STATUS_CONFIG = {
  Present: { label: 'Present', bg: 'var(--color-accent-soft)', text: 'var(--color-accent)', border: '#B8D6BF' },
  Late: { label: 'Late Arrival', bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  HalfDay: { label: 'Half Day', bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
  Absent: { label: 'Absent', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  OnLeave: { label: 'On Leave', bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
  Weekend: { label: 'Weekend', bg: '#F8FAFC', text: '#94A3B8', border: '#E2E8F0' },
  MissingCheckOut: { label: 'Missed Out-Punch', bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3' },
  NotCheckedIn: { label: 'Pending', bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
  CheckedIn: { label: 'Clocked In', bg: 'var(--color-accent-soft)', text: 'var(--color-accent)', border: '#B8D6BF' }
};

export const AttendancePage = () => {
  const { user, isManager, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar', 'regularizations', 'team'
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [monthlyData, setMonthlyData] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [punchLoading, setPunchLoading] = useState(false);
  const [regularizations, setRegularizations] = useState([]);
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [selectedTeamDate, setSelectedTeamDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Clock ticker for punch widget
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  const loadToday = useCallback(async () => {
    try {
      const data = await attendanceService.getToday();
      setTodayAttendance(data);
    } catch (err) {
      console.error('Failed to load today attendance:', err);
    }
  }, []);

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
      setRegularizations(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load regularizations:', err);
      setRegularizations([]);
    }
  }, []);

  const loadTeam = useCallback(async () => {
    if (!isManager && !isAdmin) return;
    try {
      const data = await attendanceService.getTeamAttendance(selectedTeamDate);
      setTeamAttendance(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load team attendance:', err);
      setTeamAttendance([]);
    }
  }, [isManager, isAdmin, selectedTeamDate]);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

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

  const handleCheckIn = async () => {
    setPunchLoading(true);
    try {
      await attendanceService.checkIn();
      showToast('success', 'Clocked in successfully! Have a productive workday.');
      await loadToday();
      if (activeTab === 'calendar') await loadCalendar();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Check-in failed.';
      showToast('error', msg);
    } finally {
      setPunchLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setPunchLoading(true);
    try {
      await attendanceService.checkOut();
      showToast('success', 'Clocked out successfully! Have a great evening.');
      await loadToday();
      if (activeTab === 'calendar') await loadCalendar();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Check-out failed.';
      showToast('error', msg);
    } finally {
      setPunchLoading(false);
    }
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
      if (activeTab === 'calendar') loadCalendar();
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not cancel request.';
      showToast('error', msg);
    }
  };

  // Normalized monthly summary metrics
  const workingDays = monthlyData?.workingDays ?? monthlyData?.WorkingDays ?? 0;
  const presentDays = monthlyData?.presentDays ?? monthlyData?.PresentDays ?? 0;
  const lateDays = monthlyData?.lateDays ?? monthlyData?.LateDays ?? 0;
  const halfDays = monthlyData?.halfDays ?? monthlyData?.HalfDays ?? 0;
  const absentDays = monthlyData?.absentDays ?? monthlyData?.AbsentDays ?? 0;
  const leaveDays = monthlyData?.leaveDays ?? monthlyData?.LeaveDays ?? 0;
  const daysList = monthlyData?.days ?? monthlyData?.Days ?? [];

  // Normalized today's attendance details
  const todayState = todayAttendance?.state ?? todayAttendance?.State ?? 'NotCheckedIn';
  const canCheckIn = todayAttendance?.canCheckIn ?? todayAttendance?.CanCheckIn ?? false;
  const canCheckOut = todayAttendance?.canCheckOut ?? todayAttendance?.CanCheckOut ?? false;
  const todayCheckInAt = todayAttendance?.checkInAt ?? todayAttendance?.CheckInAt;
  const todayCheckOutAt = todayAttendance?.checkOutAt ?? todayAttendance?.CheckOutAt;
  const todayTotalHours = todayAttendance?.totalHours ?? todayAttendance?.TotalHours ?? 0;
  const todayIsLate = todayAttendance?.isLate ?? todayAttendance?.IsLate ?? false;
  const todayMessage = todayAttendance?.message ?? todayAttendance?.Message;

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
              color: activeTab === 'calendar' ? 'var(--color-accent)' : 'var(--color-ink-muted)',
              boxShadow: activeTab === 'calendar' ? 'var(--shadow-warm-sm)' : 'none'
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
              color: activeTab === 'regularizations' ? 'var(--color-accent)' : 'var(--color-ink-muted)',
              boxShadow: activeTab === 'regularizations' ? 'var(--shadow-warm-sm)' : 'none'
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
                color: activeTab === 'team' ? 'var(--color-accent)' : 'var(--color-ink-muted)',
                boxShadow: activeTab === 'team' ? 'var(--shadow-warm-sm)' : 'none'
              }}
            >
              Team Daily
            </button>
          )}
        </div>
      </div>

      {/* TODAY'S ATTENDANCE QUICK PUNCH WIDGET */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '20px 24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: todayState === 'CheckedIn' ? '#EFF6FF' : (todayState === 'Present' ? '#ECFDF5' : '#F8FAFC'),
            border: `1px solid ${todayState === 'CheckedIn' ? '#BFDBFE' : (todayState === 'Present' ? '#A7F3D0' : '#E2E8F0')}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: todayState === 'CheckedIn' ? 'var(--color-accent)' : (todayState === 'Present' ? 'var(--color-accent)' : 'var(--color-ink-muted)')
          }}>
            <Clock size={26} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--color-ink)' }}>
                Today's Work Log
              </span>
              <span style={{
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                background: todayState === 'CheckedIn' ? 'var(--color-accent-soft)' :
                            todayState === 'Present' ? 'var(--color-accent-soft)' :
                            todayState === 'OnLeave' ? '#F5F3FF' :
                            todayState === 'Weekend' ? '#F8FAFC' : '#F1F5F9',
                color: todayState === 'CheckedIn' ? 'var(--color-accent)' :
                       todayState === 'Present' ? 'var(--color-accent)' :
                       todayState === 'OnLeave' ? '#7C3AED' :
                       todayState === 'Weekend' ? '#94A3B8' : '#64748B'
              }}>
                {todayState === 'CheckedIn' ? 'Currently Clocked In' :
                 todayState === 'Present' ? 'Completed Shift' :
                 todayState === 'OnLeave' ? (todayMessage || 'On Leave') :
                 todayState === 'Weekend' ? 'Weekly Off' : 'Not Clocked In'}
              </span>
              {todayIsLate && (
                <span style={{ fontSize: '0.72rem', background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  LATE
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '0.85rem', color: '#64748B' }}>
              <span>Time: <strong style={{ color: '#0F172A' }}>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong></span>
              {todayCheckInAt && (
                <span>In: <strong style={{ color: '#0F172A' }}>{new Date(todayCheckInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
              )}
              {todayCheckOutAt && (
                <span>Out: <strong style={{ color: '#0F172A' }}>{new Date(todayCheckOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
              )}
              {todayTotalHours > 0 && (
                <span>Hours: <strong style={{ color: 'var(--color-accent)' }}>{todayTotalHours} hrs</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Punch Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {canCheckIn && (
            <button
              onClick={handleCheckIn}
              disabled={punchLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: '#059669',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: punchLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)'
              }}
            >
              <PlayCircle size={18} />
              {punchLoading ? 'Recording...' : 'Clock In Now'}
            </button>
          )}

          {canCheckOut && (
            <button
              onClick={handleCheckOut}
              disabled={punchLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: '#DC2626',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: punchLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
              }}
            >
              <StopCircle size={18} />
              {punchLoading ? 'Recording...' : 'Clock Out Now'}
            </button>
          )}

          {!canCheckIn && !canCheckOut && (
            <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontStyle: 'italic' }}>
              {todayState === 'Present' ? 'Shift complete for today' : 'No punch actions available'}
            </span>
          )}

          <button
            onClick={() => { loadToday(); if (activeTab === 'calendar') loadCalendar(); }}
            title="Refresh status"
            style={{
              padding: '9px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#64748B',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* TAB 1: CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div>
          {loading && !monthlyData && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              Loading attendance calendar data...
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
                  {workingDays}
                </span>
              </div>
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>Present Days</span>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                  {presentDays}
                </span>
              </div>
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: 600, textTransform: 'uppercase' }}>Late Arrivals</span>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
                  {lateDays}
                </span>
              </div>
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 600, textTransform: 'uppercase' }}>Half Days</span>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
                  {halfDays}
                </span>
              </div>
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, textTransform: 'uppercase' }}>Absent / Missed</span>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
                  {absentDays}
                </span>
              </div>
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#7C3AED', fontWeight: 600, textTransform: 'uppercase' }}>On Leave</span>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#7C3AED', marginTop: '4px' }}>
                  {leaveDays}
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

            <div style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarIcon size={20} style={{ color: 'var(--color-accent)' }} />
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
              {daysList.map((d) => {
                const dayDate = d?.date ?? d?.Date;
                const dayOfWeek = d?.dayOfWeek ?? d?.DayOfWeek ?? '';
                const dayStatus = d?.status ?? d?.Status ?? 'NotCheckedIn';
                const conf = STATUS_CONFIG[dayStatus] || STATUS_CONFIG.NotCheckedIn;
                const checkIn = d?.checkInAt ?? d?.CheckInAt;
                const checkOut = d?.checkOutAt ?? d?.CheckOutAt;
                const hours = d?.totalHours ?? d?.TotalHours ?? 0;
                const canReg = d?.canRegularize ?? d?.CanRegularize ?? false;
                const leaveType = d?.leaveType ?? d?.LeaveType;

                return (
                  <div
                    key={dayDate}
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
                            {new Date(`${dayDate}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#64748B', marginLeft: '6px' }}>
                            {dayOfWeek.substring(0, 3)}
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
                        {dayStatus === 'OnLeave' ? (
                          <span style={{ color: '#7C3AED', fontWeight: 600 }}>{leaveType ? `${leaveType} Leave` : 'On Leave'}</span>
                        ) : dayStatus === 'Weekend' ? (
                          <span style={{ color: '#94A3B8' }}>Weekly Off</span>
                        ) : checkIn ? (
                          <div>
                            <div>In: <strong>{new Date(checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                              {checkOut && <span> &bull; Out: <strong>{new Date(checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>}
                            </div>
                            <div style={{ color: '#64748B', marginTop: '2px' }}>Total: <strong>{hours} hrs</strong></div>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>No punches recorded</span>
                        )}
                      </div>
                    </div>

                    {/* Regularize Action Button */}
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      {canReg ? (
                        <button
                          onClick={() => openRegularizeModal(dayDate)}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            color: 'var(--color-accent)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Regularize Punch
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', textAlign: 'center' }}>
                          {dayStatus === 'Weekend' || dayStatus === 'OnLeave' ? 'Off Day' : 'Completed'}
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
                    const regId = r?.regularizationID ?? r?.regularizationId ?? r?.RegularizationID;
                    const empId = r?.employeeID ?? r?.employeeId ?? r?.EmployeeID;
                    const status = r?.status ?? r?.Status ?? 'Pending';
                    const empName = r?.employeeName ?? r?.EmployeeName ?? 'Employee';
                    const dept = r?.department ?? r?.Department ?? '';
                    const workDate = r?.workDate ?? r?.WorkDate ?? '';
                    const reqCheckIn = r?.requestedCheckIn ?? r?.RequestedCheckIn;
                    const reqCheckOut = r?.requestedCheckOut ?? r?.RequestedCheckOut;
                    const reason = r?.reason ?? r?.Reason ?? '';
                    const reviewerName = r?.reviewerName ?? r?.ReviewerName ?? r?.approverName ?? r?.ApproverName;
                    const reviewerComment = r?.reviewerComment ?? r?.ReviewerComment ?? r?.managerComment ?? r?.ManagerComment;

                    const isPending = status === 'Pending';
                    const loggedEmpId = user?.employeeId ?? user?.employeeID ?? user?.id;
                    const isOwn = empId === loggedEmpId;
                    const canReview = isPending && !isOwn && (isManager || isAdmin);

                    return (
                      <tr key={regId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0F172A' }}>
                          {empName}
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', fontWeight: 400 }}>{dept}</span>
                        </td>
                        <td style={{ padding: '14px 20px', color: '#334155', fontWeight: 500 }}>
                          {workDate}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#334155' }}>
                          {reqCheckIn ? new Date(reqCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'} &ndash; {reqCheckOut ? new Date(reqCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#475569', maxWidth: '240px' }}>
                          {reason}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: status === 'Approved' ? '#ECFDF5' :
                                        status === 'Rejected' ? '#FEF2F2' : '#FFFBEB',
                            color: status === 'Approved' ? '#059669' :
                                   status === 'Rejected' ? '#DC2626' : '#D97706'
                          }}>
                            {status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: '0.8rem', color: '#64748B' }}>
                          {reviewerName ? (
                            <div>
                              <div>Reviewed by: <strong style={{ color: '#0F172A' }}>{reviewerName}</strong></div>
                              {reviewerComment && <div style={{ fontStyle: 'italic', color: '#475569' }}>"{reviewerComment}"</div>}
                            </div>
                          ) : '--'}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          {canReview ? (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => {
                                  setReviewTarget({ id: regId, action: 'approve' });
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
                                  setReviewTarget({ id: regId, action: 'reject' });
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
                              onClick={() => handleCancelRegularization(regId)}
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
                  teamAttendance.map((t) => {
                    const empId = t?.employeeID ?? t?.employeeId ?? t?.EmployeeID;
                    const empName = t?.employeeName ?? t?.EmployeeName ?? 'Employee';
                    const position = t?.position ?? t?.Position ?? '';
                    const dept = t?.department ?? t?.Department ?? '';
                    const checkIn = t?.checkInAt ?? t?.CheckInAt;
                    const checkOut = t?.checkOutAt ?? t?.CheckOutAt;
                    const isLate = t?.isLate ?? t?.IsLate ?? false;
                    const totalHours = t?.totalHours ?? t?.TotalHours;
                    const status = t?.status ?? t?.Status ?? 'NotCheckedIn';

                    return (
                      <tr key={empId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0F172A' }}>
                          {empName}
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', fontWeight: 400 }}>{position}</span>
                        </td>
                        <td style={{ padding: '14px 20px', color: '#475569' }}>
                          {dept}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#1E293B' }}>
                          {checkIn ? (
                            <span>
                              {new Date(checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {isLate && <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: '#D97706', fontWeight: 700 }}>LATE</span>}
                            </span>
                          ) : '--:--'}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#1E293B' }}>
                          {checkOut ? new Date(checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </td>
                        <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums' }}>
                          {totalHours ? `${totalHours} hrs` : '--'}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: status === 'Present' ? '#ECFDF5' :
                                        status === 'HalfDay' ? '#EFF6FF' :
                                        status === 'Absent' ? '#FEF2F2' : '#F1F5F9',
                            color: status === 'Present' ? '#059669' :
                                   status === 'HalfDay' ? '#2563EB' :
                                   status === 'Absent' ? '#DC2626' : '#64748B'
                          }}>
                            {status}
                          </span>
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
                    background: 'var(--color-accent)',
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
