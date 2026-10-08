import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  User, Mail, Briefcase, Calendar, Shield, Award, 
  CheckCircle, ArrowRight 
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

  return (
    <div className="page-body">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          My Profile & Employment Details
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
          Personal identity, role credentials, assigned manager, and leave allocations
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Profile Card */}
        <div className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#ffffff',
              fontSize: '2.2rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              boxShadow: '0 10px 20px rgba(79, 70, 229, 0.3)'
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {profile?.name || user?.name}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '14px' }}>
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

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.88rem' }}>
              <Briefcase size={16} color="#6366f1" />
              <span style={{ color: 'var(--text-muted)' }}>Role:</span>
              <strong style={{ marginLeft: 'auto' }}>{profile?.position || 'N/A'}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.88rem' }}>
              <Award size={16} color="#6366f1" />
              <span style={{ color: 'var(--text-muted)' }}>Department:</span>
              <strong style={{ marginLeft: 'auto' }}>{profile?.department || 'N/A'}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.88rem' }}>
              <Calendar size={16} color="#6366f1" />
              <span style={{ color: 'var(--text-muted)' }}>Joining Date:</span>
              <strong style={{ marginLeft: 'auto' }}>
                {profile?.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : 'N/A'}
              </strong>
            </div>
          </div>
        </div>

        {/* Right Details Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Leave Balance Overview */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
              Annual Leave Balance
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Allocated</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4f46e5', marginTop: '4px' }}>
                  {profile?.totalLeaves ?? 20} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>days</span>
                </div>
              </div>

              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Leaves Used</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                  {profile?.usedLeaves ?? 0} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>days</span>
                </div>
              </div>

              <div style={{ padding: '16px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 600 }}>Remaining Balance</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                  {profile?.remainingLeaves ?? 20} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reporting Line Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
              Management Hierarchy
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#e0e7ff',
                  color: '#4338ca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}
              >
                M
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Direct Reporting Manager</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
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
