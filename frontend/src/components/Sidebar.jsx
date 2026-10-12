import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, FileText, User, Calendar, LogOut, Shield, Briefcase, UserCheck, Clock } from 'lucide-react';

export const Sidebar = () => {
  const { user, role, isAdmin, isManager, logout } = useAuth();

  const getRoleIcon = () => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return <Shield size={12} />;
      case 'manager':
        return <Briefcase size={12} />;
      default:
        return <UserCheck size={12} />;
    }
  };

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
        {/* Employee Portal (Home) */}
        <NavLink
          to="/portal"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Briefcase size={18} />
          <span>My Portal</span>
        </NavLink>

        {/* Attendance & Time Tracking */}
        <NavLink
          to="/attendance"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Clock size={18} />
          <span>Attendance</span>
        </NavLink>

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

      {/* Pinned Bottom User & Logout Section */}
      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <div className="sidebar-user-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name || 'User'}</span>
            <span className="sidebar-user-role">
              {getRoleIcon()}
              <span>{role}</span>
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="sidebar-logout-btn"
          title="Sign out of HRMS"
        >
          <LogOut size={16} />
          <span>Sign Out / Logout</span>
        </button>
      </div>
    </aside>
  );
};
