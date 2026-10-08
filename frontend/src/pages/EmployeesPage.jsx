import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, UserPlus, Search, Filter, Edit2, CheckCircle, 
  XCircle, AlertCircle, X, Shield, Briefcase, DollarSign, Calendar
} from 'lucide-react';

export const EmployeesPage = () => {
  const { isAdmin, isManager, user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Employee',
    department: '',
    position: '',
    salary: '',
    joiningDate: new Date().toISOString().split('T')[0],
    managerId: '',
    totalLeaves: 20
  });

  const [editData, setEditData] = useState({
    department: '',
    position: '',
    salary: '',
    managerId: ''
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (departmentFilter) params.department = departmentFilter;

      const res = await api.get('/employees', { params });
      setEmployees(res.data);

      // Extract managers list for dropdown
      if (isAdmin) {
        const mgrs = res.data.filter((e) => e.role?.toLowerCase() === 'manager' || e.role?.toLowerCase() === 'admin');
        setManagers(mgrs);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, statusFilter, departmentFilter]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        department: formData.department,
        position: formData.position,
        salary: parseFloat(formData.salary) || 0,
        joiningDate: formData.joiningDate,
        managerId: formData.managerId ? parseInt(formData.managerId) : null,
        totalLeaves: parseInt(formData.totalLeaves) || 20
      };

      await api.post('/employees', payload);
      setIsAddOpen(false);
      showToast('Employee created successfully!');
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'Employee',
        department: '',
        position: '',
        salary: '',
        joiningDate: new Date().toISOString().split('T')[0],
        managerId: '',
        totalLeaves: 20
      });
      fetchEmployees();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create employee record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (emp) => {
    setSelectedEmployee(emp);
    setEditData({
      department: emp.department,
      position: emp.position,
      salary: emp.salary,
      managerId: emp.managerID ? emp.managerID.toString() : ''
    });
    setIsEditOpen(true);
    setFormError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    setFormError('');
    setSubmitting(true);

    try {
      const payload = {
        department: editData.department,
        position: editData.position,
        salary: parseFloat(editData.salary) || 0,
        managerId: editData.managerId ? parseInt(editData.managerId) : null
      };

      await api.put(`/employees/${selectedEmployee.employeeID}`, payload);
      setIsEditOpen(false);
      showToast('Employee updated successfully!');
      fetchEmployees();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update employee.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async (emp) => {
    const nextStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    if (!window.confirm(`Are you sure you want to mark ${emp.name} as ${nextStatus}?`)) {
      return;
    }

    try {
      await api.patch(`/employees/${emp.employeeID}/status`, { status: nextStatus });
      showToast(`Employee marked as ${nextStatus}`);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update employee status.');
    }
  };

  const activeCount = employees.filter((e) => e.status === 'Active').length;
  const inactiveCount = employees.filter((e) => e.status === 'Inactive').length;

  return (
    <div className="page-body">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: '#065f46',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 600
          }}
        >
          <CheckCircle size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {isManager && !isAdmin ? 'Direct Reports & Team' : 'Employee Directory'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            {isManager && !isAdmin
              ? 'View and manage team reporting lines and profile details'
              : 'Enterprise organizational staff directory and profile controls'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="btn btn-primary"
            style={{ padding: '10px 20px' }}
          >
            <UserPlus size={18} />
            <span>Add Employee</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#eef2ff', color: '#4f46e5' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="stat-value">{employees.length}</div>
            <div className="stat-label">Total Listed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">Active Members</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
            <XCircle size={22} />
          </div>
          <div>
            <div className="stat-value">{inactiveCount}</div>
            <div className="stat-label">Inactive Records</div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px' }}
              placeholder="Search by name, email, or position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div style={{ minWidth: '180px' }}>
            <select
              className="form-select"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Finance">Finance</option>
              <option value="Marketing">Marketing</option>
              <option value="Operations">Operations</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department & Role</th>
              <th>Status</th>
              <th>Manager</th>
              <th>Joining Date</th>
              {isAdmin && <th>Salary</th>}
              {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading employee records...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No employees found matching criteria.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.employeeID}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
                          color: '#4338ca',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}
                      >
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div style={{ fontWeight: 500 }}>{emp.position}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {emp.department} • <span className="badge badge-employee" style={{ padding: '1px 6px', fontSize: '0.68rem' }}>{emp.role}</span>
                    </div>
                  </td>

                  <td>
                    <span className={`badge ${emp.status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>
                      {emp.status}
                    </span>
                  </td>

                  <td>
                    <span style={{ color: emp.managerName ? 'var(--text-main)' : 'var(--text-light)', fontStyle: emp.managerName ? 'normal' : 'italic' }}>
                      {emp.managerName || 'None (Top Level)'}
                    </span>
                  </td>

                  <td style={{ color: 'var(--text-muted)' }}>
                    {new Date(emp.joiningDate).toLocaleDateString()}
                  </td>

                  {isAdmin && (
                    <td style={{ fontWeight: 600 }}>
                      ${Number(emp.salary).toLocaleString()}
                    </td>
                  )}

                  {isAdmin && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEditClick(emp)}
                          className="btn btn-secondary btn-sm"
                          title="Edit Details"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleStatusToggle(emp)}
                          className={`btn btn-sm ${emp.status === 'Active' ? 'btn-secondary' : 'btn-primary'}`}
                          title={emp.status === 'Active' ? 'Deactivate' : 'Activate'}
                        >
                          {emp.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Employee Modal */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Onboard New Employee</h2>
              <button onClick={() => setIsAddOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '16px', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Initial Password *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">System Role *</label>
                  <select
                    className="form-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin (HR)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Engineering"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Job Position / Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Frontend Developer"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Annual Salary ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="form-input"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Joining Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Reporting Manager</label>
                  <select
                    className="form-select"
                    value={formData.managerId}
                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                  >
                    <option value="">No Manager (Top Level)</option>
                    {managers.map((m) => (
                      <option key={m.employeeID} value={m.employeeID}>
                        {m.name} ({m.position})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Annual Leave Balance</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    className="form-input"
                    value={formData.totalLeaves}
                    onChange={(e) => setFormData({ ...formData, totalLeaves: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Employee Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {isEditOpen && selectedEmployee && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Edit Employee: {selectedEmployee.name}</h2>
              <button onClick={() => setIsEditOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '16px', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  type="text"
                  className="form-input"
                  value={editData.department}
                  onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Job Position</label>
                <input
                  type="text"
                  className="form-input"
                  value={editData.position}
                  onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Annual Salary ($)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  className="form-input"
                  value={editData.salary}
                  onChange={(e) => setEditData({ ...editData, salary: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Reporting Manager</label>
                <select
                  className="form-select"
                  value={editData.managerId}
                  onChange={(e) => setEditData({ ...editData, managerId: e.target.value })}
                >
                  <option value="">No Manager (Top Level)</option>
                  {managers
                    .filter((m) => m.employeeID !== selectedEmployee.employeeID)
                    .map((m) => (
                      <option key={m.employeeID} value={m.employeeID}>
                        {m.name} ({m.position})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
