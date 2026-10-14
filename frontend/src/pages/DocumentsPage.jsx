import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, Upload, Download, Search, 
  Trash2, CheckCircle, FileCheck, X 
} from 'lucide-react';

export const DocumentsPage = () => {
  const { isAdmin } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modal & Upload states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Policies');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      const res = await api.get('/documents', { params });
      setDocuments(res.data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [categoryFilter]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Selected file exceeds maximum allowed limit of 10 MB.');
      setSelectedFile(null);
      return;
    }

    // Check extensions: pdf, jpeg, jpg, png
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    const validExts = ['.pdf', '.jpg', '.jpeg', '.png'];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!allowed.includes(file.type) && !hasValidExt) {
      setErrorMessage('Invalid file type. Only PDF, JPEG, and PNG files are supported.');
      setSelectedFile(null);
      return;
    }

    setErrorMessage('');
    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a file to upload.');
      return;
    }

    if (!title.trim()) {
      setErrorMessage('Document title is required.');
      return;
    }

    try {
      setUploading(true);
      setErrorMessage('');

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title.trim());
      formData.append('category', category);

      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setIsUploadOpen(false);
      setTitle('');
      setSelectedFile(null);
      showToast('Document uploaded successfully!');
      fetchDocuments();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      showToast(`Downloading "${doc.title}"...`);
      const res = await api.get(`/documents/${doc.documentID}/download`, {
        responseType: 'blob'
      });

      // Extract filename or fallback
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.title.replace(/\s+/g, '_')}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast('Failed to download file.');
    }
  };

  const handleDeactivate = async (docId) => {
    try {
      await api.patch(`/documents/${docId}/deactivate`);
      showToast('Document deactivated successfully.');
      fetchDocuments();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to deactivate document.');
    }
  };

  const filteredDocs = documents.filter((d) =>
    search ? d.title.toLowerCase().includes(search.toLowerCase()) : true
  );

  const policyCount = documents.filter((d) => d.category?.toLowerCase().includes('policy') || d.category?.toLowerCase().includes('policies')).length;
  const complianceCount = documents.filter((d) => d.category?.toLowerCase().includes('compliance')).length;

  return (
    <div className="page-body" style={{ maxWidth: '1280px', margin: '0 auto', padding: '8px 4px 40px 4px' }}>
      {/* Toast */}
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

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.95rem', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.025em', margin: '0 0 4px 0' }}>
            Company Documents & Policies
          </h1>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.9rem', margin: 0 }}>
            Official handbooks, compliance guidelines, templates, and corporate notices
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="btn btn-primary"
            style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Upload size={18} />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* Category Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
            <FileText size={22} />
          </div>
          <div>
            <div className="stat-value" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>{documents.length}</div>
            <div className="stat-label">Total Published Documents</div>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)' }}>
          <div className="stat-icon" style={{ backgroundColor: '#EAF5EE', color: 'var(--color-accent)' }}>
            <FileCheck size={22} />
          </div>
          <div>
            <div className="stat-value" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>{policyCount || documents.length}</div>
            <div className="stat-label">HR Policies & Handbooks</div>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)' }}>
          <div className="stat-icon" style={{ backgroundColor: '#FAF6EE', color: 'var(--color-ink)' }}>
            <FileText size={22} />
          </div>
          <div>
            <div className="stat-value" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>{complianceCount || 0}</div>
            <div className="stat-label">Compliance & Legal Notices</div>
          </div>
        </div>
      </div>


      {/* Search & Category Filter Bar */}
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
              placeholder="Search documents by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '180px' }}>
            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Policies">Policies</option>
              <option value="Handbook">Handbook</option>
              <option value="Guidelines">Guidelines</option>
              <option value="Templates">Templates</option>
              <option value="Compliance">Compliance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
          Loading document catalog...
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
          <FileText size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>No documents found</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {isAdmin ? 'Upload standard company handbooks and guidelines using the button above.' : 'Check back later for company updates.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px' }}>
          {filteredDocs.map((doc) => (
            <div key={doc.documentID} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FileText size={22} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="badge badge-employee">
                    {doc.category}
                  </span>
                  {!doc.isActive && (
                    <span className="badge badge-inactive">Deactivated</span>
                  )}
                </div>
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', lineHeight: 1.3 }}>
                {doc.title}
              </h3>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Uploaded by {doc.uploaderName} • {new Date(doc.uploadedAt).toLocaleDateString()}
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  onClick={() => handleDownload(doc)}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <Download size={14} />
                  <span>Download File</span>
                </button>

                {isAdmin && doc.isActive && (
                  <button
                    onClick={() => handleDeactivate(doc.documentID)}
                    className="btn btn-secondary btn-sm"
                    title="Deactivate Document"
                    style={{ color: '#dc2626' }}
                  >
                    <Trash2 size={14} />
                    <span>Deactivate</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Upload Corporate Document</h2>
              <button onClick={() => setIsUploadOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            {errorMessage && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '16px', fontSize: '0.85rem' }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleUploadSubmit}>
              <div className="form-group">
                <label className="form-label">Document Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Employee Code of Conduct 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Policies">Policies</option>
                  <option value="Handbook">Handbook</option>
                  <option value="Guidelines">Guidelines</option>
                  <option value="Templates">Templates</option>
                  <option value="Compliance">Compliance</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Choose File (PDF, JPEG, PNG • Max 10MB) *</label>
                <input
                  type="file"
                  className="form-input"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  required
                />
                {selectedFile && (
                  <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileCheck size={14} />
                    <span>Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
