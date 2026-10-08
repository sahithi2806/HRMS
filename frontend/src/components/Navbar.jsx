import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, Shield, Briefcase } from 'lucide-react';

export const Navbar = () => {
  const { user, role, logout } = useAuth();

  const getRoleBadgeClass = () => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'badge-admin';
      case 'manager':
        return 'badge-manager';
      default:
        return 'badge-employee';
    }
  };

  const getRoleIcon = () => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return <Shield size={12} />;
      case 'manager':
        return <Briefcase size={12} />;
      default:
        return <UserIcon size={12} />;
    }
  };

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
          HRMS Portal
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))',
              color: 'var(--primary-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.95rem',
              border: '1px solid var(--primary-300)'
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {user?.name || 'User'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`badge ${getRoleBadgeClass()}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                {getRoleIcon()}
                {role}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          title="Sign out"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
