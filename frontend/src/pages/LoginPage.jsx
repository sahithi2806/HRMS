import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Users,
  Shield,
  User,
  KeyRound,
  CheckCircle2,
  Fingerprint
} from 'lucide-react';

const DEMO_ROLES = [
  {
    id: 'admin',
    label: 'HR Admin',
    email: 'admin@hrms.com',
    pass: 'Admin@123',
    tier: 'Governance',
    icon: Shield,
    detail: 'Rosters, directory & policies'
  },
  {
    id: 'manager',
    label: 'Team Lead',
    email: 'manager@hrms.com',
    pass: 'Manager@123',
    tier: 'Management',
    icon: Users,
    detail: 'Team rosters & leave review'
  },
  {
    id: 'employee',
    label: 'Staff Member',
    email: 'employee@hrms.com',
    pass: 'Employee@123',
    tier: 'Self-Service',
    icon: User,
    detail: 'Personal records & requests'
  }
];

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both corporate email and password.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      const user = await login(email, password);
      navigate('/portal');
    } catch (err) {
      let msg = err.response?.data?.message;
      if (!msg) {
        if (err.message === 'Network Error' || !err.response) {
          msg = 'Cannot connect to backend server (http://localhost:5000). Please check that the API service is active.';
        } else {
          msg = 'Authentication failed. Please verify your credentials.';
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (roleItem) => {
    setSelectedRole(roleItem.id);
    setEmail(roleItem.email);
    setPassword(roleItem.pass);
    setError('');
  };

  return (
    <main className="login-shell">
      {/* 2 Soft Radial Glows layered over the main gradient */}
      <div className="login-aurora-blobs" aria-hidden="true">
        <div className="login-glow login-glow--top-right" />
        <div className="login-glow login-glow--bottom-left" />
      </div>

      {/* Monochromatic Fine Grain Noise Texture Overlay */}
      <div className="login-noise-overlay" aria-hidden="true" />

      {/* Subtle Dot Grid Texture */}
      <div className="login-backdrop-grid" aria-hidden="true" />

      {/* Spacious Balanced Container */}
      <div className="login-container">
        {/* Left Column: Aether Brand Authority & Security Telemetry */}
        <section className="login-context" aria-labelledby="login-title">
          <header className="login-brand" aria-label="Aether HR">
            <span className="login-mark" aria-hidden="true">
              <ShieldCheck size={24} strokeWidth={2.4} />
            </span>
            <div>
              <div className="login-brand-name">Aether HR</div>
              <div className="login-brand-meta">Enterprise Workforce Platform</div>
            </div>
            <div className="login-system-pill">
              <span className="login-system-dot" aria-hidden="true" />
              <span>TLS 1.3 Active</span>
            </div>
          </header>

          <div className="login-copy">
            <p className="login-kicker">Workforce Orchestration</p>
            <h1 id="login-title">Unified workforce operations, clearly delivered.</h1>
            <p className="login-lede">
              Authorized single sign-on gateway for corporate personnel directory,
              leave lifecycle governance, and compliance policies.
            </p>

            {/* Enterprise Security Telemetry Card */}
            <div className="login-telemetry-card" role="region" aria-label="System security status">
              <div className="login-telemetry-header">
                <div className="login-telemetry-title">
                  <Fingerprint size={16} aria-hidden="true" />
                  <span>Access & Security Posture</span>
                </div>
                <span className="login-telemetry-badge">Encrypted Session</span>
              </div>

              <div className="login-telemetry-grid">
                <div className="login-telemetry-item">
                  <span className="telemetry-label">Directory Sync</span>
                  <div className="telemetry-value">
                    <CheckCircle2 size={13} aria-hidden="true" className="telemetry-icon-success" />
                    <span>Synchronized (Azure AD)</span>
                  </div>
                </div>

                <div className="login-telemetry-item">
                  <span className="telemetry-label">Access Policy</span>
                  <div className="telemetry-value">
                    <span>Role-Based (RBAC Tier 1)</span>
                  </div>
                </div>

                <div className="login-telemetry-item">
                  <span className="telemetry-label">Active Node</span>
                  <div className="telemetry-value">
                    <span className="telemetry-node-tag">Prod-AP-South</span>
                  </div>
                </div>

                <div className="login-telemetry-item">
                  <span className="telemetry-label">Audit Protocol</span>
                  <div className="telemetry-value">
                    <span>Immutable Hash Log</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer className="login-context__footer">
            <div className="login-meta-row">
              <span className="login-meta-pill">Aether Core 2026.4</span>
              <span className="login-meta-pill">OIDC Compliant</span>
              <span className="login-meta-pill">Zero-Trust Verified</span>
            </div>
          </footer>
        </section>

        {/* Right Column: Spacious High-Craft Authentication Card */}
        <section className="login-panel-wrap" aria-label="Authentication form">
          <div className="login-panel">
            <header className="login-panel-head">
              <div className="login-panel-kicker">
                <KeyRound size={13} aria-hidden="true" />
                <span>Secure Sign-In</span>
              </div>
              <h2>Access your workspace</h2>
              <p>Select your assigned credential profile or enter corporate details.</p>
            </header>

            {/* Spacious Role Selection Cards */}
            <div className="login-role-strip" role="group" aria-label="Quick profile selector">
              <div className="login-role-strip-header">
                <span className="login-role-strip-title">Fast Access Profiles</span>
                <span className="login-role-strip-hint">Click to auto-populate</span>
              </div>
              <div className="login-role-cards">
                {DEMO_ROLES.map((roleItem) => {
                  const IconComponent = roleItem.icon;
                  const isSelected = selectedRole === roleItem.id;
                  return (
                    <button
                      key={roleItem.id}
                      type="button"
                      onClick={() => handleSelectRole(roleItem)}
                      className={`login-role-card ${isSelected ? 'is-selected' : ''}`}
                      aria-pressed={isSelected}
                    >
                      <div className="login-role-card-top">
                        <span className="login-role-card-icon" aria-hidden="true">
                          <IconComponent size={15} strokeWidth={2.2} />
                        </span>
                        <span className="login-role-tier">{roleItem.tier}</span>
                      </div>
                      <div className="login-role-card-name">{roleItem.label}</div>
                      <div className="login-role-card-detail">{roleItem.detail}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="login-alert" role="alert" aria-live="assertive">
                <AlertCircle size={18} style={{ flexShrink: 0 }} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="login-form">
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">
                  Corporate Email
                </label>
                <div className="login-field">
                  <Mail size={18} aria-hidden="true" />
                  <input
                    id="login-email"
                    type="email"
                    className="form-input"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setSelectedRole(null);
                    }}
                    aria-describedby="login-email-helper"
                    autoComplete="username"
                    required
                  />
                </div>
                <p id="login-email-helper" className="field-helper">
                  Assigned workplace identifier.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-password">
                  Security Key / Password
                </label>
                <div className="login-field">
                  <Lock size={18} aria-hidden="true" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input login-input-password"
                    placeholder="Enter security key"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setSelectedRole(null);
                    }}
                    aria-describedby="login-password-helper"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-toggle-password"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p id="login-password-helper" className="field-helper">
                  Permissions resolve automatically according to role.
                </p>
              </div>

              <button
                type="submit"
                className="btn btn-primary login-submit"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="btn-spinner" aria-hidden="true" />
                    <span>Validating Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <footer className="login-panel-footer">
              <p className="login-compliance-note">
                Confidential system. Access is monitored and encrypted under AES-256 & ISO-27001 standards.
              </p>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
};

export default LoginPage;
