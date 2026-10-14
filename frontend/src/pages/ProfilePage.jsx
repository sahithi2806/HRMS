import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Briefcase, Calendar, Shield, Award, 
  CheckCircle, ArrowRight, IndianRupee 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProfilePage = () => {
  const { user, role } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get('/employees/me');
        setProfile(res.data);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="page-body">
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="page-body" style={{ maxWidth: '1280px', margin: '0 auto', padding: '8px 4px 40px 4px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.95rem', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.025em', margin: '0 0 4px 0' }}>
          My Profile & Employment Details
        </h1>
        <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.9rem', margin: 0 }}>
          Personal identity, role credentials, assigned manager, and leave allocations
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Profile Card */}
        <div className="card" style={{ textAlign: 'center', padding: '36px 24px', background: 'var(--color-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)' }}>
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1E4D2B, #2E6B3E)',
              color: '#FFFFFF',
              fontSize: '2.2rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              boxShadow: '0 8px 24px rgba(30, 77, 43, 0.25)',
              border: '2px solid #B8D6BF'
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
            {profile?.name || user?.name}
          </h2>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.9rem', marginBottom: '14px' }}>
            {profile?.email || user?.email}
          </p>

          <div style={{ display: 'inline-flex', gap: '8px', marginBottom: '24px' }}>
            <span className="badge badge-admin" style={{ fontSize: '0.78rem' }}>
              <Shield size={12} />
              {role}
            </span>
            <span className="badge badge-active" style={{ fontSize: '0.78rem' }}>
              <CheckCircle size={12} />
              {profile?.status || 'Active'}
            </span>
          </div>

          <div style={{ borderTop: '1px solid var(--color-rule)', paddingTop: '20px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.88rem' }}>
              <Briefcase size={16} color="var(--color-accent)" />
              <span style={{ color: 'var(--color-ink-muted)' }}>Role:</span>
              <strong style={{ marginLeft: 'auto', color: 'var(--color-ink)' }}>{profile?.position || 'N/A'}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.88rem' }}>
              <Award size={16} color="var(--color-accent)" />
              <span style={{ color: 'var(--color-ink-muted)' }}>Department:</span>
              <strong style={{ marginLeft: 'auto', color: 'var(--color-ink)' }}>{profile?.department || 'N/A'}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.88rem' }}>
              <Calendar size={16} color="var(--color-accent)" />
              <span style={{ color: 'var(--color-ink-muted)' }}>Joining Date:</span>
              <strong style={{ marginLeft: 'auto', color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums' }}>
                {profile?.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : 'N/A'}
              </strong>
            </div>

            {profile?.salary != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.88rem' }}>
                <IndianRupee size={16} color="var(--color-accent)" />
                <span style={{ color: 'var(--color-ink-muted)' }}>Annual CTC:</span>
                <strong style={{ marginLeft: 'auto', color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums' }}>
                  ₹{Number(profile.salary).toLocaleString('en-IN')}
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* Right Details Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Leave Balance Overview */}
          <div className="card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '16px' }}>
              Annual Leave Balance
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'var(--color-paper)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', fontWeight: 600 }}>Total Allocated</div>
                <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-accent)', marginTop: '4px' }}>
                  {profile?.totalLeaves ?? 20} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-ink-muted)' }}>days</span>
                </div>
              </div>

              <div style={{ padding: '16px', background: 'var(--color-paper)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', fontWeight: 600 }}>Leaves Used</div>
                <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#B45309', marginTop: '4px' }}>
                  {profile?.usedLeaves ?? 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-ink-muted)' }}>days</span>
                </div>
              </div>

              <div style={{ padding: '16px', background: 'var(--color-accent-soft)', borderRadius: 'var(--radius-sm)', border: '1px solid #B8D6BF' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 600 }}>Remaining Balance</div>
                <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-accent)', marginTop: '4px' }}>
                  {profile?.remainingLeaves ?? 20} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-accent)' }}>days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reporting Line Card */}
          <div className="card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '16px' }}>
              Management Hierarchy
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--color-paper)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--color-accent-soft)',
                  color: 'var(--color-accent)',
                  border: '1px solid #B8D6BF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}
              >
                M
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-ink-muted)', fontWeight: 600 }}>Direct Reporting Manager</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-ink)', marginTop: '2px' }}>
                  {profile?.managerName || 'Top Level (No assigned direct manager)'}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access to Documents */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Company Policies & Handbooks</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                View employee handbook, code of conduct, and corporate guidelines
              </p>
            </div>
            <Link to="/documents" className="btn btn-primary btn-sm">
              <span>View Documents</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
