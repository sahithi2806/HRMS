import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketService } from '../services/ticketService';
import api from '../services/api';
import { 
  ArrowLeft, MessageSquare, Clock, CheckCircle2, AlertCircle, 
  Send, Lock, Shield, User, Star, RotateCcw, Check, Sparkles
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

export const TicketDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [ticket, setTicket] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // New Comment state
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Rating & Feedback state
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Status Action state
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadTicket = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ticketService.getTicketById(id);
      setTicket(data);
    } catch (err) {
      console.error('Failed to load ticket:', err);
      showToast('error', 'Could not load ticket details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadEmployees = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/employees', { params: { status: 'Active' } });
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to load employees for assignment:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadTicket();
    loadEmployees();
  }, [loadTicket, loadEmployees]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      await ticketService.addComment(id, {
        body: newComment.trim(),
        isInternal: isAdmin ? isInternal : false
      });
      setNewComment('');
      setIsInternal(false);
      showToast('success', 'Reply posted.');
      loadTicket();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to post reply.';
      showToast('error', msg);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    setActionLoading(true);
    try {
      await ticketService.updateTicket(id, { status: newStatus });
      showToast('success', `Ticket status updated to ${newStatus}.`);
      loadTicket();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Status update failed.';
      showToast('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignTicket = async (employeeId) => {
    setActionLoading(true);
    try {
      await ticketService.updateTicket(id, { assignedTo: employeeId ? Number(employeeId) : null });
      showToast('success', 'Ticket assignment updated.');
      loadTicket();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Assignment failed.';
      showToast('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseTicket = async () => {
    setActionLoading(true);
    try {
      await ticketService.closeTicket(id);
      showToast('success', 'Ticket closed successfully.');
      loadTicket();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Could not close ticket.';
      showToast('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenTicket = async () => {
    setActionLoading(true);
    try {
      await ticketService.reopenTicket(id);
      showToast('success', 'Ticket reopened successfully.');
      loadTicket();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Could not reopen ticket.';
      showToast('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      await ticketService.submitFeedback(id, {
        rating,
        comment: feedbackComment.trim()
      });
      showToast('success', 'Thank you for your feedback rating!');
      loadTicket();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || 'Could not submit feedback.';
      showToast('error', msg);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-ink-muted)' }}>
          <Clock className="animate-spin" size={32} style={{ margin: '0 auto 12px auto', color: 'var(--color-accent)' }} />
          <p>Loading ticket discussion...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center' }}>
        <h2>Ticket Not Found</h2>
        <button onClick={() => navigate('/helpdesk')} style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--color-accent)', color: '#FFF' }}>
          Back to Helpdesk
        </button>
      </div>
    );
  }

  const ticketId = ticket.ticketID ?? ticket.ticketId ?? ticket.TicketID;
  const status = ticket.status || ticket.Status;
  const priority = ticket.priority || ticket.Priority;
  const category = ticket.category || ticket.Category;
  const subject = ticket.subject || ticket.Subject;
  const description = ticket.description || ticket.Description;
  const empName = ticket.employeeName || ticket.EmployeeName;
  const dept = ticket.department || ticket.Department;
  const assignedTo = ticket.assignedTo ?? ticket.AssignedTo;
  const feedbackRating = ticket.feedbackRating ?? ticket.FeedbackRating;
  const feedbackCommentVal = ticket.feedbackComment || ticket.FeedbackComment;
  const createdAt = ticket.createdAt || ticket.CreatedAt;
  const resolvedAt = ticket.resolvedAt || ticket.ResolvedAt;
  const comments = ticket.comments || ticket.Comments || [];
  const empId = ticket.employeeID ?? ticket.employeeId ?? ticket.EmployeeID;

  const statusBadge = STATUS_BADGES[status] || STATUS_BADGES.Open;
  const priorityBadge = PRIORITY_BADGES[priority] || PRIORITY_BADGES.Medium;
  const isRaiser = user?.employeeId === empId;

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Toast Alert */}
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
          boxShadow: '0 10px 25px -5px rgba(28,25,23,0.12)',
          background: toast.type === 'success' ? '#F4F7F4' : '#FDF4F4',
          border: `1px solid ${toast.type === 'success' ? '#A7C4AF' : '#E8B4B4'}`,
          color: toast.type === 'success' ? '#1E4D2B' : '#8A2C2C',
          fontWeight: 600,
          fontSize: '0.92rem'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Back button */}
      <button
        onClick={() => navigate('/helpdesk')}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-accent)',
          fontWeight: 600,
          fontSize: '0.88rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        <ArrowLeft size={16} /> Back to All Tickets
      </button>

      {/* Ticket Header Card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '28px 32px',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontFamily: 'monospace', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: '6px' }}>
                #{ticketId}
              </span>
              <span style={{
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 700,
                background: statusBadge.bg,
                color: statusBadge.text,
                border: `1px solid ${statusBadge.border}`
              }}>
                {status}
              </span>
              <span style={{
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 700,
                background: priorityBadge.bg,
                color: priorityBadge.text,
                border: `1px solid ${priorityBadge.border}`
              }}>
                {priority} Priority
              </span>
              <span style={{
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: '#F1F5F9',
                color: '#334155'
              }}>
                {category}
              </span>
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px 0', color: '#0F172A' }}>
              {subject}
            </h1>

            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <span>Raised by: <strong>{empName}</strong> ({dept})</span>
              <span>&bull;</span>
              <span>Created on: {createdAt ? new Date(createdAt).toLocaleString() : 'N/A'}</span>
              {resolvedAt && (
                <>
                  <span>&bull;</span>
                  <span>Resolved on: {new Date(resolvedAt).toLocaleString()}</span>
                </>
              )}
            </p>
          </div>

          {/* Quick Action buttons */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {isAdmin && (
              <>
                {status === 'Open' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus('InProgress')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid #FDE68A',
                      background: '#FFFBEB',
                      color: '#B45309',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Start Progress
                  </button>
                )}

                {status === 'InProgress' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus('Resolved')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid #A7F3D0',
                      background: '#ECFDF5',
                      color: '#059669',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Mark Resolved
                  </button>
                )}
              </>
            )}

            {/* Employee or Admin Close button */}
            {status === 'Resolved' && (
              <button
                disabled={actionLoading}
                onClick={handleCloseTicket}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F1F5F9',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Check size={14} /> Close Ticket
              </button>
            )}

            {/* Reopen button */}
            {(status === 'Resolved' || status === 'Closed') && (
              <button
                disabled={actionLoading}
                onClick={handleReopenTicket}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#2563EB',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={14} /> Reopen Ticket
              </button>
            )}
          </div>
        </div>

        {/* Admin Assignee Control Row */}
        {isAdmin && (
          <div style={{ paddingTop: '16px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Assignee:</span>
              <select
                value={assignedTo || ''}
                onChange={(e) => handleAssignTicket(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.82rem',
                  background: '#FFFFFF'
                }}
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => {
                  const empOptionId = emp.employeeID ?? emp.employeeId ?? emp.EmployeeID;
                  const empOptionName = emp.name || emp.Name;
                  const empOptionDept = emp.department || emp.Department;
                  return (
                    <option key={empOptionId} value={empOptionId}>
                      {empOptionName} ({empOptionDept})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Rating & Feedback Box */}
      {(status === 'Resolved' || status === 'Closed') && (
        <div style={{
          background: '#FFFDF5',
          borderRadius: '16px',
          border: '1px solid #FDE68A',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 10px rgba(217, 119, 6, 0.05)'
        }}>
          {feedbackRating ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={18}
                      fill={star <= feedbackRating ? '#D97706' : 'none'}
                      color={star <= feedbackRating ? '#D97706' : '#CBD5E1'}
                    />
                  ))}
                </div>
                <span style={{ fontWeight: 700, color: '#92400E', fontSize: '0.95rem' }}>
                  Resolution Satisfaction Rating ({feedbackRating}/5)
                </span>
              </div>
              {feedbackCommentVal && (
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#78350F', fontStyle: 'italic' }}>
                  &ldquo;{feedbackCommentVal}&rdquo;
                </p>
              )}
            </div>
          ) : isRaiser ? (
            <form onSubmit={handleSubmitFeedback}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px 0', color: '#92400E' }}>
                Rate Your Resolution Experience
              </h3>
              <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#78350F' }}>
                This ticket is resolved. Please take a moment to rate our support assistance.
              </p>

              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                  >
                    <Star
                      size={24}
                      fill={star <= rating ? '#D97706' : 'none'}
                      color={star <= rating ? '#D97706' : '#CBD5E1'}
                    />
                  </button>
                ))}
                <span style={{ marginLeft: '10px', fontWeight: 700, color: '#B45309', fontSize: '0.9rem' }}>
                  {rating} of 5 Stars
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <input
                  type="text"
                  placeholder="Optional feedback notes for our IT / HR team..."
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #FCD34D',
                    fontSize: '0.88rem'
                  }}
                />
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#D97706',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: submittingFeedback ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submittingFeedback ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      )}

      {/* Discussion Timeline */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={20} style={{ color: 'var(--color-accent)' }} />
          Discussion Thread ({1 + comments.length})
        </h2>

        {/* 1. Opening Description by Requester */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-rule)',
          padding: '22px 24px',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-warm-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--color-accent-soft)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                {(empName?.charAt(0)) || 'U'}
              </div>
              <div>
                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>{empName}</span>
                <span style={{ fontSize: '0.78rem', color: '#64748B', marginLeft: '8px' }}>Original Issue Description</span>
              </div>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{createdAt ? new Date(createdAt).toLocaleString() : 'N/A'}</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.92rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {description}
          </p>
        </div>

        {/* 2. Subsequent Comments */}
        {comments.map((c) => {
          const commentId = c.commentID ?? c.commentId ?? c.CommentID;
          const isInternal = c.isInternal ?? c.IsInternal;
          const authorRole = c.authorRole || c.AuthorRole;
          const authorName = c.authorName || c.AuthorName;
          const commentCreatedAt = c.createdAt || c.CreatedAt;
          const body = c.body || c.Body;

          return (
            <div
              key={commentId}
              style={{
                background: isInternal ? '#FFFBEB' : '#FFFFFF',
                borderRadius: '14px',
                border: isInternal ? '1px solid #FDE68A' : '1px solid #E2E8F0',
                padding: '20px 24px',
                marginBottom: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: isInternal ? '#FEF3C7' : (authorRole === 'Admin' ? '#EEF2FF' : '#F1F5F9'),
                    color: isInternal ? '#B45309' : (authorRole === 'Admin' ? '#4F46E5' : '#475569'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}>
                    {authorName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>{authorName}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', background: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                        {authorRole}
                      </span>
                      {isInternal && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#FEF3C7',
                          color: '#B45309',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          border: '1px solid #FDE68A'
                        }}>
                          <Lock size={11} /> Internal Note &bull; Admins Only
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{commentCreatedAt ? new Date(commentCreatedAt).toLocaleString() : 'N/A'}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.92rem', color: isInternal ? '#78350F' : '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {body}
              </p>
            </div>
          );
        })}
      </div>

      {/* Reply Composer */}
      {status !== 'Closed' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '24px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 12px 0', color: '#0F172A' }}>
            Add Response
          </h3>

          <form onSubmit={handleAddComment}>
            <textarea
              rows={4}
              required
              placeholder="Write your reply or assistance notes here..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '0.92rem',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                marginBottom: '14px'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              {isAdmin ? (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569' }}>
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: isInternal ? 700 : 500, color: isInternal ? '#B45309' : '#475569' }}>
                    <Lock size={14} /> Post as Internal Staff Note (hidden from requester)
                  </span>
                </label>
              ) : <div />}

              <button
                type="submit"
                disabled={submittingComment}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isInternal ? '#B45309' : 'var(--color-accent)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: submittingComment ? 'not-allowed' : 'pointer'
                }}
              >
                <Send size={16} />
                {submittingComment ? 'Sending...' : (isInternal ? 'Post Internal Note' : 'Send Reply')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TicketDetailPage;
