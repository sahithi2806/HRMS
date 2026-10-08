import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, FileText, User, Calendar, Award } from 'lucide-react';

export const Sidebar = () => {
  const { role, isAdmin, isManager } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">H</div>
        <div>
          <h1 className="sidebar-title">HRMS</h1>
          <p className="sidebar-subtitle">Enterprise Suite</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* Admin and Manager see Employee Directory */}
        {(isAdmin || isManager) && (
          <NavLink
            to="/employees"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Employee Directory</span>
          </NavLink>
        )}

        {/* All roles have access to Documents & Policies */}
        <NavLink
          to="/documents"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <FileText size={18} />
          <span>Documents & Policies</span>
        </NavLink>

        {/* My Profile */}
        <NavLink
          to="/profile"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <User size={18} />
          <span>My Profile</span>
        </NavLink>

        {/* Leave Management */}
        <NavLink
          to="/leave"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Calendar size={18} />
          <span>Leave Management</span>
        </NavLink>
      </nav>

      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', color: '#64748b' }}>
        Logged in as <strong style={{ color: '#cbd5e1' }}>{role}</strong>
      </div>
    </aside>
  );
};
