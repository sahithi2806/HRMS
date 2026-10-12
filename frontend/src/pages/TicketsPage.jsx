import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketService } from '../services/ticketService';
import { 
  HelpCircle, Plus, Search, MessageSquare, Clock, CheckCircle2, 
  AlertCircle, X, User, Shield, Star, ChevronRight, Sparkles, Filter
} from 'lucide-react';

const STATUS_BADGES = {
  Open: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  InProgress: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
  Resolved: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  Closed: { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' }
};

const PRIORITY_BADGES = {
  High: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  Medium: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  Low: { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' }
};

export const TicketsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'Admin';

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState('IT');
  const [priority, setPriority] = useState('Medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (categoryFilter) params.category = categoryFilter;

      const data = await ticketService.getTickets(params);
      setTickets(data);
    } catch (err) {
      console.error('Failed to load tickets:', err);
      showToast('error', 'Could not load helpdesk tickets.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      showToast('error', 'Please fill in both subject and description.');
      return;
    }

    setSubmitting(true);
    try {
      await ticketService.createTicket({
        category,
        priority,
        subject: subject.trim(),
        description: description.trim()
      });
      showToast('success', 'Ticket submitted successfully.');
      setModalOpen(false);
      setSubject('');
      setDescription('');
      loadTickets();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Could not submit ticket.';
      showToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (!search) return true;
    const query = search.toLowerCase();
    return t.Subject?.toLowerCase().includes(query) ||
           t.Description?.toLowerCase().includes(query) ||
           t.EmployeeName?.toLowerCase().includes(query) ||
           `#${t.TicketID}`.includes(query);
  });

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

      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0A1A5C 0%, #0047AB 60%, #2563EB 100%)',
        borderRadius: '16px',
        padding: '30px 36px',
        color: '#FFFFFF',
        marginBottom: '28px',
        boxShadow: '0 12px 30px -10px rgba(0, 71, 171, 0.35)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sparkles size={16} style={{ color: '#38BDF8' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#93C5FD' }}>
              Support Center
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            {isAdmin ? 'Helpdesk & Ticket Management' : 'Employee Support Helpdesk'}
          </h1>
          <p style={{ margin: 0, opacity: 0.85, fontSize: '0.95rem' }}>
            {isAdmin 
              ? 'Triage, assign, resolve and provide staff assistance on all company support requests.'
              : 'Raise inquiries or report issues regarding IT, HR, Payroll, Facilities, and Administration.'}
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            padding: '12px 22px',
            borderRadius: '10px',
            border: 'none',
            background: '#FFFFFF',
            color: '#0047AB',
            fontWeight: 700,
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
        >
          <Plus size={18} />
          Submit Ticket
        </button>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '240px' }}>
          <Search size={18} style={{ color: '#64748B' }} />
          <input
            type="text"
            placeholder="Search tickets by subject, description, or #ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '0.92rem',
              color: '#0F172A',
              background: 'transparent'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '0.85rem',
              color: '#334155',
              background: '#F8FAFC',
              fontWeight: 500
            }}
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="InProgress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '0.85rem',
              color: '#334155',
              background: '#F8FAFC',
              fontWeight: 500
            }}
          >
            <option value="">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '0.85rem',
              color: '#334155',
              background: '#F8FAFC',
              fontWeight: 500
            }}
          >
            <option value="">All Categories</option>
            <option value="IT">IT</option>
            <option value="HR">HR</option>
            <option value="Payroll">Payroll</option>
            <option value="Facilities">Facilities</option>
            <option value="Admin">Admin</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748B' }}>
            <Clock className="animate-spin" size={32} style={{ margin: '0 auto 12px auto', color: '#0047AB' }} />
            <p>Loading helpdesk tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#64748B' }}>
            <HelpCircle size={44} style={{ margin: '0 auto 14px auto', color: '#94A3B8' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', margin: '0 0 6px 0' }}>No tickets found</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {search || statusFilter || priorityFilter || categoryFilter
                ? 'Try adjusting your search criteria or filter tags.'
                : 'No support requests have been filed yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Ticket</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Priority</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Status</th>
                  {isAdmin && <th style={{ padding: '14px 20px', fontWeight: 600 }}>Requester</th>}
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Assignee</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Last Updated</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t) => {
                  const statusBadge = STATUS_BADGES[t.Status] || STATUS_BADGES.Open;
                  const priorityBadge = PRIORITY_BADGES[t.Priority] || PRIORITY_BADGES.Medium;
                  return (
                    <tr
                      key={t.TicketID}
                      onClick={() => navigate(`/helpdesk/${t.TicketID}`)}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#64748B', fontWeight: 700 }}>
                            #{t.TicketID}
                          </span>
                          <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.94rem' }}>
                            {t.Subject}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.78rem', color: '#64748B' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MessageSquare size={13} /> {t.CommentsCount} replies
                          </span>
                          {t.FeedbackRating && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#D97706', fontWeight: 600 }}>
                              <Star size={13} fill="#D97706" /> {t.FeedbackRating}/5
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: '#F1F5F9',
                          color: '#334155',
                          border: '1px solid #E2E8F0'
                        }}>
                          {t.Category}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: priorityBadge.bg,
                          color: priorityBadge.text,
                          border: `1px solid ${priorityBadge.border}`
                        }}>
                          {t.Priority}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: statusBadge.bg,
                          color: statusBadge.text,
                          border: `1px solid ${statusBadge.border}`
                        }}>
                          {t.Status}
                        </span>
                      </td>

                      {isAdmin && (
                        <td style={{ padding: '16px 20px', color: '#334155' }}>
                          <div style={{ fontWeight: 600 }}>{t.EmployeeName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{t.Department}</div>
                        </td>
                      )}

                      <td style={{ padding: '16px 20px', color: '#475569' }}>
                        {t.AssignedToName ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                            <Shield size={14} style={{ color: '#0047AB' }} />
                            {t.AssignedToName}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '0.8rem', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>

                      <td style={{ padding: '16px 20px', color: '#64748B', fontSize: '0.82rem' }}>
                        {new Date(t.UpdatedAt).toLocaleDateString()}
                      </td>

                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <span style={{ color: '#0047AB', display: 'inline-flex', alignItems: 'center' }}>
                          <ChevronRight size={18} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raise Ticket Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Submit Support Request
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      background: '#FFFFFF'
                    }}
                  >
                    <option value="IT">IT Support</option>
                    <option value="HR">HR & People</option>
                    <option value="Payroll">Payroll & Salary</option>
                    <option value="Facilities">Facilities & Office</option>
                    <option value="Admin">Administration</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Priority *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      background: '#FFFFFF'
                    }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High (Urgent)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Subject / Summary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cannot connect to staging VPN, need monitor cable..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Detailed Description *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide complete steps, error messages, or details to assist our team in resolving this promptly..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0047AB',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketsPage;
