import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, UserPlus, Search, Edit2, CheckCircle, 
  XCircle, X, Shield, Briefcase
} from 'lucide-react';

export const EmployeesPage = () => {
  const { isAdmin, isManager } = useAuth();
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
      showToast('Employee onboarded successfully!');
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
      showToast('Employee details updated successfully!');
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
    <div className="page-body" style={{ maxWidth: '1280px', margin: '0 auto', padding: '8px 4px 40px 4px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: '#1E4D2B',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 25px -3px rgba(28, 25, 23, 0.2)',
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.95rem',
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '-0.025em',
            margin: '0 0 4px 0'
          }}>
            {isManager && !isAdmin ? 'Direct Reports & Team Roster' : 'Employee Directory & Roster'}
          </h1>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.9rem', margin: 0 }}>
            {isManager && !isAdmin
              ? 'View and manage team reporting lines, positions, and active records'
              : 'Organizational staff ledger, compensation governance, and onboarding controls'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="btn btn-primary"
            style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <UserPlus size={18} />
            <span>Onboard Employee</span>
          </button>
        )}
      </div>

      {/* Swiss Disciplined Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="stat-value" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>{employees.length}</div>
            <div className="stat-label">Total Colleagues</div>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)' }}>
          <div className="stat-icon" style={{ backgroundColor: '#EAF5EE', color: 'var(--color-accent)' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="stat-value" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>{activeCount}</div>
            <div className="stat-label">Active Members</div>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)' }}>
          <div className="stat-icon" style={{ backgroundColor: '#FDF0EE', color: '#A83226' }}>
            <XCircle size={22} />
          </div>
          <div>
            <div className="stat-value" style={{ fontFamily: 'var(--font-display)', color: '#A83226' }}>{inactiveCount}</div>
            <div className="stat-label">Inactive Records</div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card" style={{ marginBottom: '24px', padding: '18px 22px', background: 'var(--color-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-muted)' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '40px', background: 'var(--color-paper)' }}
              placeholder="Filter by name, email, or job position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              className="form-select"
              style={{ background: 'var(--color-paper)' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>

          <div style={{ minWidth: '180px' }}>
            <select
              className="form-select"
              style={{ background: 'var(--color-paper)' }}
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

      {/* Employees Ledger Table with Swiss Grid Discipline */}
      <div className="table-wrapper" style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-rule)',
        overflow: 'hidden'
      }}>
        <table>
          <thead>
            <tr>
              <th>Colleague</th>
              <th>Department & Role</th>
              <th>Status</th>
              <th>Reporting Manager</th>
              <th>Joining Date</th>
              {isAdmin && <th>Compensation</th>}
              {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 5} style={{ textAlign: 'center', padding: '48px', color: 'var(--color-ink-muted)' }}>
                  Loading employee records...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 5} style={{ textAlign: 'center', padding: '48px', color: 'var(--color-ink-muted)' }}>
                  No colleagues match the specified search or filter criteria.
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
                          background: 'var(--color-accent-soft)',
                          color: 'var(--color-accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.86rem',
                          border: '1px solid #B8D6BF'
                        }}
                      >
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)' }}>{emp.email}</div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{emp.position}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
                      {emp.department} &bull; <span className="badge badge-employee" style={{ padding: '1px 6px', fontSize: '0.68rem' }}>{emp.role}</span>
                    </div>
                  </td>

                  <td>
                    <span className={`badge ${emp.status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>
                      {emp.status}
                    </span>
                  </td>

                  <td>
                    <span style={{
                      color: emp.managerName ? 'var(--color-ink)' : 'var(--color-ink-muted)',
                      fontStyle: emp.managerName ? 'normal' : 'italic',
                      fontSize: '0.88rem'
                    }}>
                      {emp.managerName || 'None (Top Level)'}
                    </span>
                  </td>

                  <td style={{ color: 'var(--color-ink-muted)', fontVariantNumeric: 'tabular-nums', fontSize: '0.88rem' }}>
                    {new Date(emp.joiningDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>

                  {isAdmin && (
                    <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--color-ink)' }}>
                      ₹{Number(emp.salary).toLocaleString('en-IN')}
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
                          title={emp.status === 'Active' ? 'Deactivate record' : 'Activate record'}
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

      {/* Onboard Employee Modal */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
                Onboard New Colleague
              </h2>
              <button onClick={() => setIsAddOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--color-ink-muted)" />
              </button>
            </div>

            {formError && (
              <div style={{
                padding: '10px 14px',
                background: '#FDF0EE',
                border: '1px solid #F2B8B1',
                borderRadius: 'var(--radius-sm)',
                color: '#8A2C2C',
                marginBottom: '16px',
                fontSize: '0.85rem'
              }}>
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

                <div className="form-group">
                  <label className="form-label">Initial Password *</label>
                  <input
                    type="password"
                    className="form-input"
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
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Job Position *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Annual Salary (₹) *</label>
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
                  <label className="form-label">Annual Leave Entitlement</label>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
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
                  {submitting ? 'Creating...' : 'Onboard Colleague'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {isEditOpen && selectedEmployee && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
                Edit Colleague Record: {selectedEmployee.name}
              </h2>
              <button onClick={() => setIsEditOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--color-ink-muted)" />
              </button>
            </div>

            {formError && (
              <div style={{
                padding: '10px 14px',
                background: '#FDF0EE',
                border: '1px solid #F2B8B1',
                borderRadius: 'var(--radius-sm)',
                color: '#8A2C2C',
                marginBottom: '16px',
                fontSize: '0.85rem'
              }}>
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
                <label className="form-label">Annual Salary (₹)</label>
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

export default EmployeesPage;
