import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { portalService } from '../services/portalService';
import { attendanceService } from '../services/attendanceService';
import { 
  Clock, Calendar, CheckCircle2, AlertCircle, ArrowRight,
  TrendingUp, Shield, Users, Briefcase, Sparkles, Laptop, HelpCircle
} from 'lucide-react';

export const PortalPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Clock ticker for interactive punch widget
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadSummary = async () => {
    try {
      const data = await portalService.getSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load portal summary:', err);
      showToast('error', 'Could not load portal data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await attendanceService.checkIn();
      showToast('success', 'Checked in successfully! Have a productive day.');
      await loadSummary();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Check-in failed.';
      showToast('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await attendanceService.checkOut();
      showToast('success', 'Checked out successfully! Good job today.');
      await loadSummary();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Check-out failed.';
      showToast('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <Clock className="animate-spin" size={32} style={{ margin: '0 auto 12px auto', color: '#0047AB' }} />
          <p style={{ fontWeight: 500 }}>Loading employee portal...</p>
        </div>
      </div>
    );
  }

  const att = summary?.TodayAttendance;
  const leave = summary?.LeaveBalance;
  const nextLeave = summary?.NextLeave;

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

      {/* Top Banner / Hero Greeting */}
      <div style={{
        background: 'linear-gradient(135deg, #0A1A5C 0%, #0047AB 60%, #2563EB 100%)',
        borderRadius: '16px',
        padding: '32px 36px',
        color: '#FFFFFF',
        marginBottom: '28px',
        boxShadow: '0 12px 30px -10px rgba(0, 71, 171, 0.35)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', opacity: 0.9 }}>
            <Sparkles size={16} style={{ color: '#38BDF8' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#93C5FD' }}>
              Employee Self-Service Portal
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Welcome back, {summary?.EmployeeName}
          </h1>
          <p style={{ margin: 0, opacity: 0.85, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span><Briefcase size={14} style={{ display: 'inline', marginRight: '5px' }} />{summary?.Position} &bull; {summary?.Department}</span>
            {summary?.ManagerName && (
              <span><Users size={14} style={{ display: 'inline', marginRight: '5px' }} />Reports to: <strong>{summary.ManagerName}</strong></span>
            )}
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(8px)',
          padding: '12px 20px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          textAlign: 'right'
        }}>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '2px' }}>
            {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Grid: Attendance Punch Widget + Leave Widget */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        
        {/* Widget 1: Today's Interactive Attendance Punch Widget */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.05)',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', color: '#0047AB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>Today's Attendance</h2>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Shift: 09:30 AM &ndash; 06:30 PM</span>
                </div>
              </div>

              {/* Status Badge */}
              <span style={{
                padding: '5px 12px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                background: att?.State === 'CheckedIn' ? '#ECFDF5' :
                            att?.State === 'CheckedOut' ? '#EFF6FF' :
                            att?.State === 'OnLeave' ? '#F5F3FF' :
                            att?.State === 'Weekend' ? '#F1F5F9' : '#FEF2F2',
                color: att?.State === 'CheckedIn' ? '#059669' :
                       att?.State === 'CheckedOut' ? '#2563EB' :
                       att?.State === 'OnLeave' ? '#7C3AED' :
                       att?.State === 'Weekend' ? '#64748B' : '#DC2626',
                border: `1px solid ${
                  att?.State === 'CheckedIn' ? '#A7F3D0' :
                  att?.State === 'CheckedOut' ? '#BFDBFE' :
                  att?.State === 'OnLeave' ? '#DDD6FE' :
                  att?.State === 'Weekend' ? '#CBD5E1' : '#FECACA'
                }`
              }}>
                {att?.State === 'CheckedIn' ? 'Checked In' :
                 att?.State === 'CheckedOut' ? 'Checked Out' :
                 att?.State === 'OnLeave' ? 'On Leave' :
                 att?.State === 'Weekend' ? 'Weekend' : 'Not Checked In'}
              </span>
            </div>

            {/* Attendance Punch Timestamps */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px',
              marginBottom: '20px',
              border: '1px solid #EDF2F7'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', fontWeight: 500 }}>First In</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B' }}>
                  {att?.CheckInAt ? new Date(att.CheckInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </span>
                {att?.IsLate && (
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#D97706', fontWeight: 600 }}>Late Arrival</span>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', fontWeight: 500 }}>Last Out</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B' }}>
                  {att?.CheckOutAt ? new Date(att.CheckOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', fontWeight: 500 }}>Logged Hours</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0047AB' }}>
                  {att?.TotalHours ? `${att.TotalHours} hrs` : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Punch Buttons */}
          <div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCheckIn}
                disabled={!att?.CanCheckIn || actionLoading}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: att?.CanCheckIn ? '#0047AB' : '#E2E8F0',
                  color: att?.CanCheckIn ? '#FFFFFF' : '#94A3B8',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: att?.CanCheckIn ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  boxShadow: att?.CanCheckIn ? '0 4px 12px rgba(0, 71, 171, 0.25)' : 'none'
                }}
              >
                Web Check-In
              </button>

              <button
                onClick={handleCheckOut}
                disabled={!att?.CanCheckOut || actionLoading}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: att?.CanCheckOut ? '#FFFFFF' : '#F8FAFC',
                  color: att?.CanCheckOut ? '#0F172A' : '#94A3B8',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: att?.CanCheckOut ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease'
                }}
              >
                Check-Out
              </button>
            </div>

            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <button
                onClick={() => navigate('/attendance')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0047AB',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                View Attendance Calendar & Logs <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Widget 2: Leave Balance & Upcoming Leave Widget */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.05)',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>Leave Balance</h2>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Annual Allocation: {leave?.TotalLeaves || 24} Days</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/leave')}
                style={{
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#0047AB',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Apply Leave
              </button>
            </div>

            {/* Leave Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', textAlign: 'center', border: '1px solid #EDF2F7' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', fontWeight: 500 }}>Remaining</span>
                <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#10B981' }}>{leave?.RemainingLeaves ?? 0}</span>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>days</span>
              </div>

              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', textAlign: 'center', border: '1px solid #EDF2F7' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', fontWeight: 500 }}>Available</span>
                <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0047AB' }}>{leave?.AvailableToRequest ?? 0}</span>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>to apply</span>
              </div>

              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', textAlign: 'center', border: '1px solid #EDF2F7' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', fontWeight: 500 }}>Pending</span>
                <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#F59E0B' }}>{leave?.PendingDays ?? 0}</span>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>in review</span>
              </div>
            </div>

            {/* Next Approved Leave Box */}
            <div style={{
              background: nextLeave ? '#F0F9FF' : '#F8FAFC',
              borderRadius: '12px',
              padding: '14px 16px',
              border: `1px solid ${nextLeave ? '#BAE6FD' : '#E2E8F0'}`
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: nextLeave ? '#0369A1' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Upcoming Scheduled Leave
              </span>
              {nextLeave ? (
                <div style={{ marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>
                      {nextLeave.LeaveType} Leave ({nextLeave.Days} {nextLeave.Days === 1 ? 'day' : 'days'})
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#0369A1', fontWeight: 600 }}>
                      {nextLeave.StartDate} to {nextLeave.EndDate}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nextLeave.Reason}
                  </p>
                </div>
              ) : (
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                  No upcoming leaves scheduled. Enjoy your work days!
                </p>
              )}
            </div>
          </div>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              onClick={() => navigate('/leave')}
              style={{
                background: 'none',
                border: 'none',
                color: '#0047AB',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              View Full Leave History <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>

      {/* Module Shortcuts & Action Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        
        {/* Pending Approvals Card (for Manager or Admin) */}
        {(user?.role === 'Manager' || user?.role === 'Admin') && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            padding: '20px 24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 2px 0', color: '#0F172A' }}>Action Inbox</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>{summary?.PendingApprovalsCount ?? 0} items awaiting review</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/attendance')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                fontWeight: 600,
                fontSize: '0.8rem',
                color: '#0047AB',
                cursor: 'pointer'
              }}
            >
              Review
            </button>
          </div>
        )}

        {/* Team Overview Card */}
        {(user?.role === 'Manager' || user?.role === 'Admin') && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            padding: '20px 24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 2px 0', color: '#0F172A' }}>Team Daily Logs</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Track report attendance</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/attendance')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                fontWeight: 600,
                fontSize: '0.8rem',
                color: '#4F46E5',
                cursor: 'pointer'
              }}
            >
              View Team
            </button>
          </div>
        )}

        {/* Company Documents Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          padding: '20px 24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 2px 0', color: '#0F172A' }}>Company Policies</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Handbooks, POSH, insurance</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/documents')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              fontWeight: 600,
              fontSize: '0.8rem',
              color: '#16A34A',
              cursor: 'pointer'
            }}
          >
            Explore
          </button>
        </div>

        {/* My Assets Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          padding: '20px 24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#F0F9FF', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Laptop size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 2px 0', color: '#0F172A' }}>My Hardware</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>{summary?.MyAssetsCount ?? 0} assigned devices</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/my-assets')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              fontWeight: 600,
              fontSize: '0.8rem',
              color: '#0284C7',
              cursor: 'pointer'
            }}
          >
            View
          </button>
        </div>

        {/* Helpdesk Support Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          padding: '20px 24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FAF5FF', color: '#9333EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HelpCircle size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 2px 0', color: '#0F172A' }}>Helpdesk Support</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>IT, HR & facilities tickets</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/helpdesk')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              fontWeight: 600,
              fontSize: '0.8rem',
              color: '#9333EA',
              cursor: 'pointer'
            }}
          >
            Support
          </button>
        </div>

      </div>
    </div>
  );
};
export default PortalPage;
