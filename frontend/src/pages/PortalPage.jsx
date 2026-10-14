import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { portalService } from '../services/portalService';
import { attendanceService } from '../services/attendanceService';
import { 
  Clock, Calendar, CheckCircle2, AlertCircle, ArrowRight,
  TrendingUp, Shield, Users, Briefcase, Sparkles, Laptop, 
  HelpCircle, Award, Heart, Gift, Compass
} from 'lucide-react';

export const PortalPage = () => {
  const { user, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Live clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumData, profileRes] = await Promise.allSettled([
        portalService.getSummary(),
        api.get('/employees/me')
      ]);

      if (sumData.status === 'fulfilled') {
        setSummary(sumData.value);
      }
      if (profileRes.status === 'fulfilled') {
        setEmployeeProfile(profileRes.value.data);
      }

      // If user is Admin or Manager, fetch colleagues/direct reports for team milestone celebrations
      if (isAdmin || isManager) {
        try {
          const empRes = await api.get('/employees');
          if (Array.isArray(empRes.data)) {
            setTeamMembers(empRes.data);
          }
        } catch {
          // Non-blocking
        }
      }
    } catch (err) {
      console.error('Failed to load portal data:', err);
      showToast('error', 'Could not refresh portal data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await attendanceService.checkIn();
      showToast('success', 'Checked in successfully. Wishing you a focused and rewarding day.');
      await loadData();
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
      showToast('success', 'Checked out successfully. Rest well and enjoy your evening.');
      await loadData();
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
        <div style={{ textAlign: 'center', color: 'var(--color-ink-muted)' }}>
          <Clock className="animate-spin" size={32} style={{ margin: '0 auto 12px auto', color: 'var(--color-accent)' }} />
          <p style={{ fontWeight: 500, fontFamily: 'var(--font-body)' }}>Preparing your personalized workspace...</p>
        </div>
      </div>
    );
  }

  const att = summary?.todayAttendance || summary?.TodayAttendance;
  const leave = summary?.leaveBalance || summary?.LeaveBalance;
  const nextLeave = summary?.nextLeave || summary?.NextLeave;

  const empName = summary?.employeeName || summary?.EmployeeName || employeeProfile?.name || user?.name || 'Valued Colleague';
  const position = summary?.position || summary?.Position || employeeProfile?.position || 'Team Contributor';
  const department = summary?.department || summary?.Department || employeeProfile?.department || 'General';
  const managerName = summary?.managerName || summary?.ManagerName || employeeProfile?.managerName;

  const attState = att?.state || att?.State;
  const canCheckIn = att?.canCheckIn ?? att?.CanCheckIn ?? false;
  const canCheckOut = att?.canCheckOut ?? att?.CanCheckOut ?? false;
  const checkInAt = att?.checkInAt || att?.CheckInAt;
  const checkOutAt = att?.checkOutAt || att?.CheckOutAt;
  const isLate = att?.isLate ?? att?.IsLate ?? false;
  const totalHours = att?.totalHours ?? att?.TotalHours ?? 0;

  const totalLeaves = leave?.totalLeaves ?? leave?.TotalLeaves ?? employeeProfile?.totalLeaves ?? 24;
  const remainingLeaves = leave?.remainingLeaves ?? leave?.RemainingLeaves ?? employeeProfile?.remainingLeaves ?? 0;
  const availableToRequest = leave?.availableToRequest ?? leave?.AvailableToRequest ?? 0;
  const pendingDays = leave?.pendingDays ?? leave?.PendingDays ?? 0;

  const myAssetsCount = summary?.myAssetsCount ?? summary?.MyAssetsCount ?? 0;
  const openTicketsCount = summary?.openTicketsCount ?? summary?.OpenTicketsCount ?? 0;
  const pendingApprovalsCount = summary?.pendingApprovalsCount ?? summary?.PendingApprovalsCount ?? 0;

  // Real Tenure & Milestone calculation from joiningDate
  const joiningDateRaw = employeeProfile?.joiningDate || employeeProfile?.JoiningDate;
  let tenureText = 'Active Contributor';
  let anniversaryFormatted = '';
  let yearsCount = 0;
  let monthsCount = 0;

  if (joiningDateRaw) {
    const joinDate = new Date(joiningDateRaw);
    const now = new Date();
    yearsCount = now.getFullYear() - joinDate.getFullYear();
    monthsCount = now.getMonth() - joinDate.getMonth();
    if (monthsCount < 0) {
      yearsCount--;
      monthsCount += 12;
    }
    if (yearsCount > 0) {
      tenureText = `${yearsCount} yr${yearsCount > 1 ? 's' : ''}${monthsCount > 0 ? `, ${monthsCount} mo${monthsCount > 1 ? 's' : ''}` : ''}`;
    } else {
      tenureText = `${monthsCount} month${monthsCount !== 1 ? 's' : ''}`;
    }

    const nextAnniv = new Date(now.getFullYear(), joinDate.getMonth(), joinDate.getDate());
    anniversaryFormatted = nextAnniv.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  }

  // Filter team upcoming milestones if Admin/Manager
  const upcomingTeamMilestones = teamMembers
    .filter(m => m.joiningDate && m.name !== empName && m.status === 'Active')
    .slice(0, 3)
    .map(m => {
      const jDate = new Date(m.joiningDate);
      const now = new Date();
      let y = now.getFullYear() - jDate.getFullYear();
      if (now.getMonth() < jDate.getMonth()) y--;
      return {
        name: m.name,
        department: m.department,
        position: m.position,
        years: Math.max(1, y),
        dateStr: jDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      };
    });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '8px 4px 40px 4px' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '14px 20px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 10px 25px -5px rgba(28, 25, 23, 0.12)',
          background: toast.type === 'success' ? '#F4F7F4' : '#FDF4F4',
          border: `1px solid ${toast.type === 'success' ? '#A7C4AF' : '#E8B4B4'}`,
          color: toast.type === 'success' ? '#1E4D2B' : '#8A2C2C',
          fontWeight: 600,
          fontSize: '0.92rem',
          fontFamily: 'var(--font-body)'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Atelier Warm Ivory Hero Banner */}
      <section style={{
        background: 'linear-gradient(135deg, #FAF6EE 0%, #F4ECE1 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px 36px',
        color: 'var(--color-ink)',
        marginBottom: '28px',
        border: '1px solid var(--color-rule)',
        boxShadow: 'var(--shadow-warm-sm)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative leaf watermark */}
        <div style={{
          position: 'absolute',
          right: '-20px',
          bottom: '-30px',
          opacity: 0.04,
          pointerEvents: 'none'
        }}>
          <Compass size={240} color="var(--color-accent)" />
        </div>

        <div style={{ zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'var(--color-accent-soft)',
              color: 'var(--color-accent)',
              fontSize: '0.76rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              <Sparkles size={13} />
              People & Culture Portal
            </span>
            {joiningDateRaw && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '999px',
                background: '#FFF9E6',
                color: '#8A5D00',
                border: '1px solid #F0DCA0',
                fontSize: '0.76rem',
                fontWeight: 600
              }}>
                <Award size={13} />
                Tenure: {tenureText}
              </span>
            )}
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.15rem',
            fontWeight: 600,
            color: 'var(--color-ink)',
            margin: '0 0 8px 0',
            letterSpacing: '-0.025em',
            lineHeight: 1.2
          }}>
            Welcome back, {empName}
          </h1>

          <p style={{
            margin: 0,
            color: 'var(--color-ink-muted)',
            fontSize: '0.94rem',
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            flexWrap: 'wrap'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Briefcase size={15} style={{ color: 'var(--color-accent)' }} />
              <strong>{position}</strong> &bull; {department}
            </span>
            {managerName && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Users size={15} style={{ color: 'var(--color-accent)' }} />
                Reports to: <strong style={{ color: 'var(--color-ink)' }}>{managerName}</strong>
              </span>
            )}
          </p>
        </div>

        {/* Live Date/Time Dial with Tabular Clock */}
        <div style={{
          zIndex: 1,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(10px)',
          padding: '16px 24px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-rule)',
          boxShadow: 'var(--shadow-warm-sm)',
          textAlign: 'right'
        }}>
          <div style={{
            fontSize: '1.65rem',
            fontWeight: 700,
            color: 'var(--color-accent)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.02em',
            fontFamily: 'var(--font-body)'
          }}>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{
            fontSize: '0.82rem',
            fontWeight: 500,
            color: 'var(--color-ink-muted)',
            marginTop: '3px'
          }}>
            {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </section>

      {/* Main Grid: Attendance Tactile Punch Widget + Leave Widget */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
        marginBottom: '28px'
      }}>
        
        {/* Widget 1: Today's Daily Attendance Punch Widget */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          padding: '28px',
          boxShadow: 'var(--shadow-warm-sm)',
          border: '1px solid var(--color-rule)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'var(--color-accent-soft)',
                  color: 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Clock size={20} />
                </div>
                <div>
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    margin: 0,
                    color: 'var(--color-ink)'
                  }}>
                    Daily Attendance
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>Core Working Hours: 09:30 AM &ndash; 06:30 PM</span>
                </div>
              </div>

              {/* Status Badge */}
              <span style={{
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                background: attState === 'CheckedIn' ? 'var(--color-accent-soft)' :
                            attState === 'CheckedOut' ? '#EAEFF8' :
                            attState === 'OnLeave' ? '#F4EFFB' :
                            attState === 'Weekend' ? '#EFECE6' : '#FDF0EE',
                color: attState === 'CheckedIn' ? 'var(--color-accent)' :
                       attState === 'CheckedOut' ? '#2152A3' :
                       attState === 'OnLeave' ? '#683AB7' :
                       attState === 'Weekend' ? 'var(--color-ink-muted)' : '#A83226',
                border: `1px solid ${
                  attState === 'CheckedIn' ? '#B8D6BF' :
                  attState === 'CheckedOut' ? '#BED0ED' :
                  attState === 'OnLeave' ? '#D6C5EE' :
                  attState === 'Weekend' ? 'var(--color-rule)' : '#F2B8B1'
                }`
              }}>
                {attState === 'CheckedIn' ? 'Present & Working' :
                 attState === 'CheckedOut' ? 'Shift Completed' :
                 attState === 'OnLeave' ? 'On Scheduled Leave' :
                 attState === 'Weekend' ? 'Rest Day / Weekend' : 'Not Clocked In'}
              </span>
            </div>

            {/* Swiss Precision Ledger for Timestamps */}
            <div style={{
              background: 'var(--color-paper)',
              borderRadius: 'var(--radius-sm)',
              padding: '18px 20px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '16px',
              marginBottom: '22px',
              border: '1px solid var(--color-rule)'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Check In</span>
                <span style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {checkInAt ? new Date(checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </span>
                {isLate && (
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#B45309', fontWeight: 600, marginTop: '2px' }}>Late Shift Entry</span>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Check Out</span>
                <span style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {checkOutAt ? new Date(checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Logged Time</span>
                <span style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--color-accent)',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {totalHours ? `${totalHours} hrs` : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Punch Buttons */}
          <div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCheckIn}
                disabled={!canCheckIn || actionLoading}
                style={{
                  flex: 1,
                  padding: '13px 18px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: canCheckIn ? 'var(--color-accent)' : '#E7E1D8',
                  color: canCheckIn ? '#FFFFFF' : '#8C827A',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  cursor: canCheckIn ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                  boxShadow: canCheckIn ? '0 3px 10px rgba(30, 77, 43, 0.25)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle2 size={16} />
                <span>Web Check-In</span>
              </button>

              <button
                onClick={handleCheckOut}
                disabled={!canCheckOut || actionLoading}
                style={{
                  flex: 1,
                  padding: '13px 18px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-rule)',
                  background: canCheckOut ? '#FFFFFF' : 'var(--color-paper)',
                  color: canCheckOut ? 'var(--color-ink)' : '#8C827A',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  cursor: canCheckOut ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease'
                }}
              >
                Check-Out
              </button>
            </div>

            <div style={{ marginTop: '14px', textAlign: 'center' }}>
              <button
                onClick={() => navigate('/attendance')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-accent)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                View Attendance Ledger & Timesheet <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Widget 2: Leave Stewardship & Balance */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          padding: '28px',
          boxShadow: 'var(--shadow-warm-sm)',
          border: '1px solid var(--color-rule)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'var(--color-accent-soft)',
                  color: 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Calendar size={20} />
                </div>
                <div>
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    margin: 0,
                    color: 'var(--color-ink)'
                  }}>
                    Rest & Leave Balance
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>Annual Entitlement: {totalLeaves} Days</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/leave')}
                style={{
                  background: 'var(--color-accent-soft)',
                  border: '1px solid #B8D6BF',
                  color: 'var(--color-accent)',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
              >
                Request Time Off
              </button>
            </div>

            {/* Leave Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                background: 'var(--color-paper)',
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'center',
                border: '1px solid var(--color-rule)'
              }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Remaining</span>
                <span style={{
                  fontSize: '1.6rem',
                  fontWeight: 700,
                  color: 'var(--color-accent)',
                  fontFamily: 'var(--font-display)'
                }}>
                  {remainingLeaves}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)' }}>days</span>
              </div>

              <div style={{
                background: 'var(--color-paper)',
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'center',
                border: '1px solid var(--color-rule)'
              }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Available</span>
                <span style={{
                  fontSize: '1.6rem',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  fontFamily: 'var(--font-display)'
                }}>
                  {availableToRequest}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)' }}>eligible</span>
              </div>

              <div style={{
                background: 'var(--color-paper)',
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'center',
                border: '1px solid var(--color-rule)'
              }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Pending</span>
                <span style={{
                  fontSize: '1.6rem',
                  fontWeight: 700,
                  color: '#92400E',
                  fontFamily: 'var(--font-display)'
                }}>
                  {pendingDays}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)' }}>under review</span>
              </div>
            </div>

            {/* Upcoming Approved Leave Box */}
            <div style={{
              background: nextLeave ? '#FAF8F3' : 'var(--color-paper)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px 16px',
              border: `1px solid ${nextLeave ? '#E3D7C5' : 'var(--color-rule)'}`
            }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: nextLeave ? 'var(--color-accent)' : 'var(--color-ink-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Upcoming Approved Leave
              </span>
              {nextLeave ? (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: '0.92rem' }}>
                      {nextLeave.leaveType || nextLeave.LeaveType} Leave ({nextLeave.days || nextLeave.Days} {(nextLeave.days || nextLeave.Days) === 1 ? 'day' : 'days'})
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {nextLeave.startDate || nextLeave.StartDate} to {nextLeave.endDate || nextLeave.EndDate}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--color-ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nextLeave.reason || nextLeave.Reason}
                  </p>
                </div>
              ) : (
                <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: 'var(--color-ink-muted)' }}>
                  No upcoming leaves scheduled. Take time when needed for rest and renewal.
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
                color: 'var(--color-accent)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Review Leave History & Approvals <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Workplace Recognition & Milestones Section (Human-centered belonging) */}
      <section style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        padding: '28px 32px',
        marginBottom: '28px',
        border: '1px solid var(--color-rule)',
        boxShadow: 'var(--shadow-warm-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#FFF6E0',
              color: '#8A5D00',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Award size={22} />
            </div>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.3rem',
                fontWeight: 600,
                margin: 0,
                color: 'var(--color-ink)'
              }}>
                Workplace Milestones & Belonging
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--color-ink-muted)' }}>
                Recognizing commitment, shared tenure, and purposeful teamwork
              </p>
            </div>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '999px',
            background: 'var(--color-accent-soft)',
            color: 'var(--color-accent)',
            fontSize: '0.8rem',
            fontWeight: 600
          }}>
            <Heart size={14} />
            <span>Culture of Mutual Respect</span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {/* Milestone 1: Personal Career Standing */}
          <div style={{
            background: 'var(--color-paper)',
            borderRadius: 'var(--radius-sm)',
            padding: '20px',
            border: '1px solid var(--color-rule)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <Gift size={18} color="var(--color-accent)" />
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.05rem',
                fontWeight: 600,
                margin: 0,
                color: 'var(--color-ink)'
              }}>
                Your Career Milestone
              </h3>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--color-ink-muted)', lineHeight: 1.5 }}>
              You have contributed <strong>{tenureText}</strong> of craft and leadership to our collective mission. 
              {anniversaryFormatted && (
                <> Your next workplace anniversary is on <strong style={{ color: 'var(--color-accent)' }}>{anniversaryFormatted}</strong>.</>
              )}
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              paddingTop: '10px',
              borderTop: '1px dashed var(--color-rule)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--color-accent)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem'
              }}>
                {empName.charAt(0)}
              </div>
              <div style={{ fontSize: '0.8rem' }}>
                <strong style={{ color: 'var(--color-ink)', display: 'block' }}>{empName}</strong>
                <span style={{ color: 'var(--color-ink-muted)' }}>Verified Member &bull; {department}</span>
              </div>
            </div>
          </div>

          {/* Milestone 2: Team Anniversaries (if Manager/Admin) or Organization Spirit */}
          <div style={{
            background: 'var(--color-paper)',
            borderRadius: 'var(--radius-sm)',
            padding: '20px',
            border: '1px solid var(--color-rule)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <Users size={18} color="var(--color-accent)" />
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.05rem',
                fontWeight: 600,
                margin: 0,
                color: 'var(--color-ink)'
              }}>
                {upcomingTeamMilestones.length > 0 ? 'Colleague Anniversaries' : 'Organizational Dignity & Purpose'}
              </h3>
            </div>

            {upcomingTeamMilestones.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {upcomingTeamMilestones.map((colleague, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#FFFFFF',
                    border: '1px solid var(--color-rule)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-ink)' }}>{colleague.name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-ink-muted)' }}>{colleague.position} &bull; {colleague.department}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: 'var(--color-accent-soft)',
                        color: 'var(--color-accent)',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}>
                        {colleague.years} yr anniversary
                      </span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', marginTop: '2px' }}>{colleague.dateStr}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--color-ink-muted)', lineHeight: 1.5 }}>
                  Every colleague brings unique insight and craft. We maintain clear working boundaries, fair compensation, and proactive support so you can do your finest work.
                </p>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                  &ldquo;Great work happens when people feel safe, valued, and trusted.&rdquo;
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Module Shortcuts & Action Tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px'
      }}>
        
        {/* Pending Approvals Card (for Manager or Admin) */}
        {(isAdmin || isManager) && (
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            padding: '22px 24px',
            border: '1px solid var(--color-rule)',
            boxShadow: 'var(--shadow-warm-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#FEF3C7',
                color: '#92400E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Shield size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--color-ink)' }}>Action Inbox</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>{pendingApprovalsCount} items awaiting review</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/attendance')}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-rule)',
                background: 'var(--color-paper)',
                fontWeight: 600,
                fontSize: '0.8rem',
                color: 'var(--color-accent)',
                cursor: 'pointer'
              }}
            >
              Review
            </button>
          </div>
        )}

        {/* Team Overview Card */}
        {(isAdmin || isManager) && (
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            padding: '22px 24px',
            border: '1px solid var(--color-rule)',
            boxShadow: 'var(--shadow-warm-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'var(--color-accent-soft)',
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Users size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--color-ink)' }}>Team Directory</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>Colleague rosters & records</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/employees')}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-rule)',
                background: 'var(--color-paper)',
                fontWeight: 600,
                fontSize: '0.8rem',
                color: 'var(--color-accent)',
                cursor: 'pointer'
              }}
            >
              Directory
            </button>
          </div>
        )}

        {/* Company Documents Card */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          padding: '22px 24px',
          border: '1px solid var(--color-rule)',
          boxShadow: 'var(--shadow-warm-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'var(--color-accent-soft)',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--color-ink)' }}>Culture & Policies</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>Handbooks, POSH, benefits</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/documents')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-rule)',
              background: 'var(--color-paper)',
              fontWeight: 600,
              fontSize: '0.8rem',
              color: 'var(--color-accent)',
              cursor: 'pointer'
            }}
          >
            Explore
          </button>
        </div>

        {/* My Assets Card */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          padding: '22px 24px',
          border: '1px solid var(--color-rule)',
          boxShadow: 'var(--shadow-warm-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'var(--color-accent-soft)',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Laptop size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--color-ink)' }}>Assigned Tools</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>{myAssetsCount} hardware devices</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/my-assets')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-rule)',
              background: 'var(--color-paper)',
              fontWeight: 600,
              fontSize: '0.8rem',
              color: 'var(--color-accent)',
              cursor: 'pointer'
            }}
          >
            View
          </button>
        </div>

        {/* Helpdesk Support Card */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          padding: '22px 24px',
          border: '1px solid var(--color-rule)',
          boxShadow: 'var(--shadow-warm-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'var(--color-accent-soft)',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <HelpCircle size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--color-ink)' }}>Helpdesk</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>{openTicketsCount} tickets open</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/helpdesk')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-rule)',
              background: 'var(--color-paper)',
              fontWeight: 600,
              fontSize: '0.8rem',
              color: 'var(--color-accent)',
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
