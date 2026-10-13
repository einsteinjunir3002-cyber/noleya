import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, HandHeart, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Volunteer({ onNavigate }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    location: '',
    interest: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [appId, setAppId] = useState('');
  const [submitError, setSubmitError] = useState('');

  const handleNav = (e, path) => {
    e.preventDefault();
    if (onNavigate) onNavigate(path);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    const generatedId = `NLY-VOL-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      if (supabase) {
        const { error } = await supabase.from('volunteers').insert([
          {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            location: formData.location,
            interest: formData.interest,
            message: formData.message || null,
            status: 'new'
          }
        ]);
        if (error) {
          console.warn('Supabase volunteer insert error:', error.message);
        }
      }

      // Keep record in local storage for user's record
      try {
        const past = JSON.parse(localStorage.getItem('noleya_volunteer_records') || '[]');
        past.push({ ...formData, id: generatedId, date: new Date().toISOString() });
        localStorage.setItem('noleya_volunteer_records', JSON.stringify(past));
      } catch {
        // Ignore local storage error
      }

      setAppId(generatedId);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Failed to submit application:', err);
      setSubmitError('Unable to send at this moment. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flow-page">
      <header className="flow-header">
        <a className="brand" href="/" aria-label="Noleya home" onClick={(e) => handleNav(e, "/")}>
          <span className="brand-mark" aria-hidden="true">✳</span>
          <span>NOLEYA</span>
        </a>
        <a className="back-link" href="/" onClick={(e) => handleNav(e, "/")}>
          <ArrowLeft size={16} /> Back to home
        </a>
      </header>

      <div className="volunteer-layout">
        <section className="flow-intro volunteer-intro">
          <span className="flow-kicker">
            <HandHeart size={15} /> GROW WITH US
          </span>
          <h1>
            Good things grow
            <br />
            when we grow them
            <br />
            together.
          </h1>
          <p>Share a little about yourself and how you would like to make a difference. Our team will review your application and be in touch.</p>
          <div className="impact-note">
            <span className="impact-mark">✳</span>
            <span>
              <strong>Every helping hand matters.</strong>
              <br />
              Find a way to contribute that feels right for you.
            </span>
          </div>
        </section>

        <section className="flow-panel volunteer-panel" aria-labelledby="volunteer-title">
          {isSubmitted ? (
            <div className="success-state" role="status">
              <span className="success-icon">
                <Check size={26} />
              </span>
              <span className="step-label">APPLICATION REGISTERED</span>
              <h2>
                Thank you for
                <br />
                raising your hand, {formData.firstName}.
              </h2>
              <p>Your volunteer application has been received (Ref: <strong>{appId}</strong>). A member of our community team will reach out via <strong>{formData.email}</strong>.</p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <a className="text-link" href="/" onClick={(e) => handleNav(e, "/")}>
                  Return to Noleya <ArrowRight size={16} />
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="panel-heading">
                <div>
                  <span className="step-label">VOLUNTEER WITH NOLEYA</span>
                  <h2 id="volunteer-title">Let's get to know you</h2>
                </div>
                <span className="step-count">01 / 01</span>
              </div>

              {submitError && (
                <div style={{ padding: '10px 14px', background: '#fdf2f2', border: '1px solid #f8b4b4', borderRadius: '4px', color: '#9b1c1c', fontSize: '13px', marginBottom: '14px' }}>
                  {submitError}
                </div>
              )}

              <form className="volunteer-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <label className="form-field">
                    <span>First name</span>
                    <input
                      name="firstName"
                      autoComplete="given-name"
                      placeholder="e.g. Ama"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                    />
                  </label>
                  <label className="form-field">
                    <span>Last name</span>
                    <input
                      name="lastName"
                      autoComplete="family-name"
                      placeholder="e.g. Mensah"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                  </label>
                </div>

                <label className="form-field">
                  <span>Email address</span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    value={formData.email}
                    onChange={handleChange}
                  />
                </label>

                <label className="form-field">
                  <span>Where are you based?</span>
                  <input
                    name="location"
                    autoComplete="address-level2"
                    placeholder="City, country (e.g. Accra, Ghana)"
                    required
                    value={formData.location}
                    onChange={handleChange}
                  />
                </label>

                <label className="form-field">
                  <span>How would you like to help?</span>
                  <select
                    name="interest"
                    required
                    value={formData.interest}
                    onChange={handleChange}
                  >
                    <option value="" disabled>Select an area of interest</option>
                    <option value="Community outreach">Community outreach</option>
                    <option value="Education and mentoring">Education and mentoring</option>
                    <option value="Fundraising and events">Fundraising and events</option>
                    <option value="Communications and creative">Communications and creative</option>
                    <option value="General volunteering">General volunteering</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>
                    Anything else you'd like us to know? <small>Optional</small>
                  </span>
                  <textarea
                    name="message"
                    rows={3}
                    placeholder="Your skills, availability, or what inspires you..."
                    value={formData.message}
                    onChange={handleChange}
                  />
                </label>

                <button className="submit-button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Submitting application...
                    </>
                  ) : (
                    <>
                      Submit Application <ArrowRight size={18} />
                    </>
                  )}
                </button>
                <p className="form-note">🔒 Your information is confidential and will only be used to contact you regarding volunteer opportunities.</p>
              </form>
            </>
          )}
        </section>
      </div>

      <footer className="flow-footer">
        <span>NOLEYA / AFRICA</span>
        <span>Care that travels further.</span>
      </footer>
    </main>
  );
}
