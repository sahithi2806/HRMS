import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, Shield, Briefcase, MapPin } from 'lucide-react';

export const Navbar = () => {
  const { user, role, logout } = useAuth();

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
    <header className="top-navbar" style={{ padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--color-ink)',
          letterSpacing: '-0.02em',
          margin: 0
        }}>
          Aether HR
        </h2>
        <span style={{
          fontSize: '0.72rem',
          background: 'var(--color-accent-soft)',
          color: 'var(--color-accent)',
          padding: '4px 10px',
          borderRadius: '999px',
          fontWeight: 600,
          border: '1px solid var(--color-status-approved-rule)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          <MapPin size={11} />
          Main Studio &bull; Bengaluru
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-accent-soft)',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: '1px solid var(--color-status-approved-rule)'
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-ink)' }}>
              {user?.name || 'User'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-rule)'
          }}
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
