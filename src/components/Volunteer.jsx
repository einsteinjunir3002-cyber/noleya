import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, HandHeart } from 'lucide-react';

export default function Volunteer({ onNavigate }) {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleNav = (e, path) => {
    e.preventDefault();
    if (onNavigate) onNavigate(path);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
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
          <p>Share a little about yourself and how you would like to make a difference. Our team will be in touch.</p>
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
              <span className="step-label">APPLICATION RECEIVED</span>
              <h2>
                Thank you for
                <br />
                raising your hand.
              </h2>
              <p>Your interest means a lot to us. The Noleya team will be in touch soon.</p>
              <a className="text-link" href="/" onClick={(e) => handleNav(e, "/")}>
                Return to Noleya <ArrowRight size={16} />
              </a>
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

              <form className="volunteer-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <label className="form-field">
                    <span>First name</span>
                    <input name="firstName" autoComplete="given-name" placeholder="e.g. Ama" required />
                  </label>
                  <label className="form-field">
                    <span>Last name</span>
                    <input name="lastName" autoComplete="family-name" placeholder="e.g. Mensah" required />
                  </label>
                </div>

                <label className="form-field">
                  <span>Email address</span>
                  <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
                </label>

                <label className="form-field">
                  <span>Where are you based?</span>
                  <input name="location" autoComplete="address-level2" placeholder="City, country" required />
                </label>

                <label className="form-field">
                  <span>How would you like to help?</span>
                  <select name="interest" defaultValue="" required>
                    <option value="" disabled>Select an area of interest</option>
                    <option>Community outreach</option>
                    <option>Education and mentoring</option>
                    <option>Fundraising and events</option>
                    <option>Communications and creative</option>
                    <option>General volunteering</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>
                    Anything else you'd like us to know? <small>Optional</small>
                  </span>
                  <textarea name="message" rows={3} placeholder="Your skills, availability, or what inspires you..." />
                </label>

                <button className="submit-button" type="submit">
                  Send my interest <ArrowRight size={18} />
                </button>
                <p className="form-note">This demo form does not send or store your details.</p>
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
