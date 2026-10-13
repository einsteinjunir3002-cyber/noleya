import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Smartphone,
  CreditCard,
  ShieldCheck,
  Check,
  Copy,
  Printer,
  Loader2,
  Radio,
  RefreshCw
} from 'lucide-react';
import PaystackPop from '@paystack/inline-js';
import { supabase } from '../lib/supabase';

function formatReceiptDate() {
  return new Date().toLocaleDateString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const AMOUNTS = [25, 50, 100, 250];

const PROVIDERS = [
  {
    id: 'mtn',
    name: 'MTN MoMo',
    short: 'MTN',
    logo: '/images/mtn-momo-badge.svg',
    color: '#FFCC00',
    number: '054 392 1084',
    merchantId: '184920',
    accountName: 'Noleya Foundation',
    ussd: '*170#',
    approvalSteps: 'Dial *170# > 6 (My Wallet) > 3 (My Approvals)'
  },
  {
    id: 'telecel',
    name: 'Telecel Cash',
    short: 'Telecel',
    logo: '/images/telecel-cash.svg',
    color: '#EA0029',
    number: '020 819 4032',
    merchantId: '294810',
    accountName: 'Noleya Foundation',
    ussd: '*110#',
    approvalSteps: 'Dial *110# > 4 (Make Payments)'
  },
  {
    id: 'at',
    name: 'AT Money',
    short: 'AT',
    logo: '/images/at-money.svg',
    color: '#002D72',
    number: '027 491 8203',
    merchantId: '392011',
    accountName: 'Noleya Foundation',
    ussd: '*110#',
    approvalSteps: 'Dial *110# > 5 (Pending Approvals)'
  }
];

const BANK_DETAILS = {
  bankName: 'Ecobank Ghana Limited',
  accountName: 'Noleya Foundation Limited',
  accountNumber: '1441002345678',
  branch: 'Accra Central (High Street)',
  swift: 'ECOGGHAC',
  currency: 'GHS'
};

export default function Donate({ onNavigate }) {
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [isMonthly, setIsMonthly] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('momo'); // 'momo' | 'card' | 'bank'
  const [selectedProvider, setSelectedProvider] = useState(PROVIDERS[0]);

  // Donor form fields
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');

  // Flow states: 'form' -> 'prompting' (MoMo push) | 'instruction' (Bank) -> 'success'
  const [step, setStep] = useState('form');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [receipt, setReceipt] = useState(null);

  // MoMo prompt timer state
  const [countdown, setCountdown] = useState(60);
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  const finalAmount = customAmount ? Number(customAmount) || 0 : selectedAmount;
  const currencyFormatter = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2
  });

  const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

  const handleNav = (e, path) => {
    e.preventDefault();
    if (onNavigate) onNavigate(path);
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2200);
  };

  const generateReference = (prefix = 'NLY') => {
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${Date.now().toString().slice(-4)}${rand}`;
  };

  const recordDonation = async (donationRecord) => {
    if (supabase) {
      try {
        await supabase.from('donations').insert([donationRecord]);
      } catch (err) {
        console.warn('Supabase donation record notice:', err);
      }
    }

    try {
      const past = JSON.parse(localStorage.getItem('noleya_donations') || '[]');
      past.unshift(donationRecord);
      localStorage.setItem('noleya_donations', JSON.stringify(past.slice(0, 20)));
    } catch {
      // Ignore local storage error
    }
  };

  const handlePaymentConfirmed = async (status = 'completed') => {
    setIsProcessing(true);
    if (receipt) {
      const finalReceipt = {
        ...receipt,
        status
      };
      await recordDonation({
        reference: receipt.reference,
        amount: receipt.amount,
        currency: 'GHS',
        is_monthly: isMonthly,
        payment_method: receipt.paymentMethod,
        provider: receipt.provider,
        donor_name: receipt.donorName,
        donor_email: receipt.donorEmail,
        donor_phone: receipt.donorPhone,
        status
      });
      setReceipt(finalReceipt);
    }
    setIsProcessing(false);
    setStep('success');
  };

  const handlePaymentConfirmedRef = useRef(handlePaymentConfirmed);
  useEffect(() => {
    handlePaymentConfirmedRef.current = handlePaymentConfirmed;
  });

  // Countdown timer & status polling for MoMo prompt
  useEffect(() => {
    if (step === 'prompting') {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      if (receipt?.reference) {
        pollRef.current = setInterval(async () => {
          try {
            const res = await fetch(`/api/momo-status?reference=${encodeURIComponent(receipt.reference)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.data?.status === 'success' || data.status === 'success') {
                clearInterval(pollRef.current);
                handlePaymentConfirmedRef.current('completed');
              }
            }
          } catch {
            // Ignore polling network blips
          }
        }, 4000);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, receipt?.reference]);

  const handleProceed = async (e) => {
    e.preventDefault();
    if (finalAmount <= 0) {
      setErrorMsg('Please select or enter a valid donation amount.');
      return;
    }
    if (!donorName.trim() || !donorEmail.trim()) {
      setErrorMsg('Please provide your name and email address for receipting.');
      return;
    }
    if (paymentMethod === 'momo' && !donorPhone.trim()) {
      setErrorMsg('Please enter your Mobile Money phone number.');
      return;
    }

    setErrorMsg('');

    // If Bank Wire selected:
    if (paymentMethod === 'bank') {
      const ref = generateReference('BANK');
      const newReceipt = {
        reference: ref,
        amount: finalAmount,
        currency: 'GHS',
        isMonthly,
        paymentMethod: 'bank',
        provider: 'Bank Wire',
        donorName,
        donorEmail,
        donorPhone,
        date: formatReceiptDate(),
        status: 'pending_verification'
      };
      setReceipt(newReceipt);
      setStep('instruction');
      return;
    }

    // If Card selected:
    if (paymentMethod === 'card') {
      if (paystackPublicKey) {
        launchPaystack();
      } else {
        setErrorMsg('Card payments via Paystack are currently undergoing gateway connection. Please select Mobile Money for instant prompt payment.');
      }
      return;
    }

    // If Mobile Money selected: INITIATE USSD PUSH PROMPT TO PHONE!
    setIsProcessing(true);
    const ref = generateReference('MOMO');

    try {
      const res = await fetch('/api/momo-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          email: donorEmail,
          phone: donorPhone,
          provider: selectedProvider.id,
          donorName,
          isMonthly
        })
      });

      const data = await res.json();

      if (data.hasGateway) {
        // A live gateway dispatched the push to the carrier
        const newReceipt = {
          reference: data.reference || ref,
          amount: finalAmount,
          currency: 'GHS',
          isMonthly,
          paymentMethod: 'momo',
          provider: selectedProvider.name,
          donorName,
          donorEmail,
          donorPhone,
          date: formatReceiptDate(),
          status: 'pending_authorization',
          hasGateway: true,
          displayText: data.displayText
        };

        setReceipt(newReceipt);
        setCountdown(60);
        setStep('prompting');
      } else {
        // No gateway key in env: take donor straight to genuine manual transfer steps
        const newReceipt = {
          reference: ref,
          amount: finalAmount,
          currency: 'GHS',
          isMonthly,
          paymentMethod: 'momo',
          provider: selectedProvider.name,
          donorName,
          donorEmail,
          donorPhone,
          date: formatReceiptDate(),
          status: 'pending_verification',
          hasGateway: false
        };

        setReceipt(newReceipt);
        setStep('instruction');
      }
    } catch (err) {
      console.warn('API charge call error, falling back to manual transfer:', err);
      const newReceipt = {
        reference: ref,
        amount: finalAmount,
        currency: 'GHS',
        isMonthly,
        paymentMethod: 'momo',
        provider: selectedProvider.name,
        donorName,
        donorEmail,
        donorPhone,
        date: formatReceiptDate(),
        status: 'pending_verification',
        hasGateway: false
      };
      setReceipt(newReceipt);
      setStep('instruction');
    } finally {
      setIsProcessing(false);
    }
  };

  const launchPaystack = () => {
    setIsProcessing(true);
    const ref = generateReference('PSTK');

    try {
      const paystack = new PaystackPop();
      paystack.newTransaction({
        key: paystackPublicKey,
        email: donorEmail,
        amount: Math.round(finalAmount * 100),
        currency: 'GHS',
        ref,
        metadata: {
          custom_fields: [
            { display_name: 'Donor Name', variable_name: 'donor_name', value: donorName },
            { display_name: 'Phone', variable_name: 'donor_phone', value: donorPhone },
            { display_name: 'Frequency', variable_name: 'frequency', value: isMonthly ? 'Monthly' : 'One-time' }
          ]
        },
        onSuccess: async (transaction) => {
          setIsProcessing(false);
          const completedReceipt = {
            reference: ref,
            paystackReference: transaction.reference,
            amount: finalAmount,
            currency: 'GHS',
            isMonthly,
            paymentMethod: 'card',
            provider: 'Card (Paystack)',
            donorName,
            donorEmail,
            donorPhone,
            date: formatReceiptDate(),
            status: 'completed'
          };

          await recordDonation({
            reference: ref,
            paystack_reference: transaction.reference,
            amount: finalAmount,
            currency: 'GHS',
            is_monthly: isMonthly,
            payment_method: 'card',
            provider: 'Card',
            donor_name: donorName,
            donor_email: donorEmail,
            donor_phone: donorPhone,
            status: 'completed'
          });

          setReceipt(completedReceipt);
          setStep('success');
        },
        onCancel: () => {
          setIsProcessing(false);
        }
      });
    } catch (err) {
      setIsProcessing(false);
      console.error('Paystack initialization error:', err);
      setErrorMsg('Could not open card checkout modal. Please use Mobile Money.');
    }
  };

  const handleReset = () => {
    setStep('form');
    setReceipt(null);
    setDonorPhone('');
    setErrorMsg('');
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  return (
    <main className="flow-page">
      <header className="flow-header">
        <a className="brand" href="/" aria-label="Noleya home" onClick={(e) => handleNav(e, '/')}>
          <span className="brand-mark" aria-hidden="true">✳</span>
          <span>NOLEYA</span>
        </a>
        <a className="back-link" href="/" onClick={(e) => handleNav(e, '/')}>
          <ArrowLeft size={16} /> Back to home
        </a>
      </header>

      <div className="flow-layout">
        <section className="flow-intro">
          <h1>
            Your kindness
            <br />
            goes a long way.
          </h1>
          <p>
            Every contribution directly helps local African communities through sustainable education, healthcare access, and community self-reliance.
          </p>
          <div className="impact-note">
            <span className="impact-mark">✳</span>
            <span>
              <strong>Small acts. Lasting change.</strong>
              <br />
              All contributions are managed transparently.
            </span>
          </div>
        </section>

        <section className="flow-panel" aria-labelledby="donation-title">
          {/* STEP 1: AMOUNT & PAYMENT DETAILS FORM */}
          {step === 'form' && (
            <form onSubmit={handleProceed}>
              <div className="panel-heading">
                <div>
                  <span className="step-label">YOUR CONTRIBUTION</span>
                  <h2 id="donation-title">Choose an amount</h2>
                </div>
                <span className="step-count">01 / 02</span>
              </div>

              {errorMsg && (
                <div style={{ padding: '10px 14px', background: '#fdf2f2', border: '1px solid #f8b4b4', borderRadius: '4px', color: '#9b1c1c', fontSize: '13px', marginBottom: '14px' }}>
                  {errorMsg}
                </div>
              )}

              <div className="amount-grid" role="group" aria-label="Suggested donation amount">
                {AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    className={`amount-option${selectedAmount === amt && !customAmount ? ' is-selected' : ''}`}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(amt);
                      setCustomAmount('');
                    }}
                  >
                    GH₵{amt}
                  </button>
                ))}
              </div>

              <label className="field-label" htmlFor="custom-amount">
                Or enter a custom amount
              </label>
              <div className="money-input">
                <span>GH₵</span>
                <input
                  id="custom-amount"
                  inputMode="decimal"
                  placeholder="Other amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value.replace(/[^\d.]/g, ''))}
                />
              </div>

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={isMonthly}
                  onChange={(e) => setIsMonthly(e.target.checked)}
                />
                <span className="custom-check" aria-hidden="true" />
                <span>Make this a monthly gift</span>
              </label>

              {/* PAYMENT METHOD SELECTOR */}
              <span className="field-label payment-label">Select payment method</span>
              <div className="payment-methods" role="group" aria-label="Payment method">
                <button
                  type="button"
                  className={`payment-method${paymentMethod === 'momo' ? ' is-selected' : ''}`}
                  aria-pressed={paymentMethod === 'momo'}
                  onClick={() => setPaymentMethod('momo')}
                >
                  <Smartphone size={18} />
                  <span>Mobile Money</span>
                </button>
                <button
                  type="button"
                  className={`payment-method${paymentMethod === 'card' ? ' is-selected' : ''}`}
                  aria-pressed={paymentMethod === 'card'}
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard size={18} />
                  <span>Card / Visa / MC</span>
                </button>
                <button
                  type="button"
                  className={`payment-method${paymentMethod === 'bank' ? ' is-selected' : ''}`}
                  aria-pressed={paymentMethod === 'bank'}
                  onClick={() => setPaymentMethod('bank')}
                >
                  <Building2 size={18} />
                  <span>Bank Wire</span>
                </button>
              </div>

              {/* MOBILE MONEY NETWORK SELECTOR WITH OFFICIAL LOGOS */}
              {paymentMethod === 'momo' && (
                <div className="provider-picker">
                  <span className="field-label">Select Mobile Money Network</span>
                  <div className="provider-options" role="group" aria-label="Mobile Money network">
                    {PROVIDERS.map((prov) => (
                      <button
                        key={prov.id}
                        type="button"
                        className={`provider-option${selectedProvider.id === prov.id ? ' is-selected' : ''}`}
                        aria-pressed={selectedProvider.id === prov.id}
                        onClick={() => setSelectedProvider(prov)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '10px 8px',
                          gap: '6px',
                          minHeight: '74px'
                        }}
                      >
                        <img
                          src={prov.logo}
                          alt={`${prov.name} logo`}
                          style={{
                            height: '24px',
                            maxWidth: '100%',
                            objectFit: 'contain'
                          }}
                        />
                        <span style={{ fontSize: '11px', fontWeight: '700' }}>{prov.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* DONOR INFORMATION FIELDS */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5ebe4' }}>
                <span className="field-label" style={{ marginBottom: '10px' }}>Donor Information</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <label className="form-field" style={{ margin: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#586b5f' }}>Your full name</span>
                    <input
                      name="donorName"
                      placeholder="e.g. Kwame Mensah"
                      required
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                    />
                  </label>
                  <label className="form-field" style={{ margin: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#586b5f' }}>Email address</span>
                    <input
                      name="donorEmail"
                      type="email"
                      placeholder="e.g. kwame@example.com"
                      required
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                    />
                  </label>
                </div>

                {paymentMethod === 'momo' && (
                  <label className="form-field" style={{ margin: '0 0 10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#586b5f' }}>
                      {selectedProvider.name} phone number (receives the PIN prompt)
                    </span>
                    <input
                      name="donorPhone"
                      type="tel"
                      placeholder="e.g. 024 123 4567"
                      required
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value)}
                    />
                  </label>
                )}
              </div>

              {paymentMethod === 'bank' && (
                <div className="bank-preview">
                  <Building2 size={20} />
                  <span>
                    <strong>Official Institutional Account: {BANK_DETAILS.bankName}</strong>
                    <small>Full bank wire details, account numbers, and swift codes are provided in the next step.</small>
                  </span>
                </div>
              )}

              <div className="donation-summary">
                <span>{isMonthly ? 'Monthly gift' : 'One-time gift'}</span>
                <strong>
                  {currencyFormatter.format(finalAmount)} <small>GHS</small>
                </strong>
              </div>

              <button className="submit-button" type="submit" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Sending MoMo Prompt...
                  </>
                ) : (
                  <>
                    {paymentMethod === 'momo' ? (
                      <>Send MoMo Prompt & Pay {currencyFormatter.format(finalAmount)} <ArrowRight size={18} /></>
                    ) : (
                      <>Proceed to Donate {currencyFormatter.format(finalAmount)} <ArrowRight size={18} /></>
                    )}
                  </>
                )}
              </button>

              <p className="secure-note" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}>
                <ShieldCheck size={16} /> 256-Bit SSL Encrypted & Secure Giving
              </p>
            </form>
          )}

          {/* STEP 2A: LIVE MOMO USSD / HANDSET PUSH PROMPT ACTIVE STATE */}
          {step === 'prompting' && receipt && (
            <div className="momo-prompt-view" role="region" aria-label="Mobile Money Prompt Authorization">
              <div className="panel-heading">
                <div>
                  <span className="step-label" style={{ color: '#23865e', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Radio size={14} className="animate-pulse" /> PUSH PROMPT SENT TO PHONE
                  </span>
                  <h2>Check Your Phone Screen</h2>
                </div>
                <span className="step-count">02 / 02</span>
              </div>

              {/* PULSING PHONE BEACON CARD */}
              <div className="momo-prompt-card">
                <div className="momo-pulse-container">
                  <Smartphone size={32} />
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '20px', color: '#17472f' }}>
                  Authorize on Your Handset
                </h3>
                <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#44614e' }}>
                  A payment prompt for <strong>{currencyFormatter.format(receipt.amount)} GHS</strong> was dispatched to:
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '8px 16px', borderRadius: '30px', border: '1px solid #d2e4cf', marginBottom: '14px' }}>
                  <img src={selectedProvider.logo} alt={selectedProvider.name} style={{ height: '18px' }} />
                  <strong style={{ fontSize: '15px', color: '#1a3325', letterSpacing: '0.5px' }}>{receipt.donorPhone}</strong>
                </div>

                {/* COUNTDOWN TIMER BAR */}
                <div className="momo-timer-bar">
                  <div
                    className="momo-timer-progress"
                    style={{ width: `${(countdown / 60) * 100}%` }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#687e6d' }}>
                  <span>Waiting for PIN entry...</span>
                  <span><strong>{countdown}s</strong> remaining</span>
                </div>
              </div>

              {/* 3-STEP PIN INSTRUCTIONS */}
              <div style={{ background: '#fff', border: '1px solid #dce6dc', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#193a29', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                  Steps to Authorize on Your Phone:
                </span>
                <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#385342', lineHeight: 1.6 }}>
                  <li>Look at your phone screen for the <strong>{selectedProvider.name}</strong> popup.</li>
                  <li>Enter your secret <strong>4-digit Mobile Money PIN</strong>.</li>
                  <li>Press <strong>1</strong> or <strong>OK</strong> to confirm your donation to <strong>Noleya Foundation</strong>.</li>
                </ol>
              </div>

              {/* IF PROMPT DOES NOT APPEAR FALLBACK GUIDE */}
              <div style={{ background: '#fdfbeb', border: '1px solid #fae8a4', borderRadius: '6px', padding: '12px 14px', marginBottom: '18px', fontSize: '12px', color: '#7a5a0d' }}>
                <strong>Prompt didn't pop up?</strong>
                <p style={{ margin: '4px 0 0', lineHeight: 1.5 }}>
                  {selectedProvider.approvalSteps}.
                </p>
              </div>

              {errorMsg && (
                <div style={{ padding: '10px 14px', background: '#fdf2f2', border: '1px solid #f8b4b4', borderRadius: '6px', color: '#9b1c1c', fontSize: '13px', marginBottom: '14px', lineHeight: 1.5 }}>
                  {errorMsg}
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  className="submit-button"
                  disabled={isProcessing}
                  onClick={async () => {
                    setIsProcessing(true);
                    setErrorMsg('');
                    try {
                      const res = await fetch(`/api/momo-status?reference=${encodeURIComponent(receipt.reference)}`);
                      const data = await res.json();
                      if (data.data?.status === 'success' || data.status === 'success') {
                        handlePaymentConfirmed('completed');
                      } else {
                        setErrorMsg('⚠️ Payment confirmation has not yet been received from your network. Please ensure you approved the prompt on your phone or check pending approvals (*170# > 6 > 3 for MTN).');
                      }
                    } catch {
                      setErrorMsg('Could not verify status with carrier. Please confirm on your handset.');
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Verifying Carrier Status...
                    </>
                  ) : (
                    <>
                      <Check size={18} /> I Have Entered My PIN & Approved
                    </>
                  )}
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="text-link"
                    style={{ flex: 1, padding: '10px', background: '#f0f5ee', border: '1px solid #dce6dc', borderRadius: '4px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}
                    onClick={(e) => handleProceed(e)}
                  >
                    <RefreshCw size={14} /> Resend Prompt to Phone
                  </button>
                  <button
                    type="button"
                    className="text-link"
                    style={{ flex: 1, padding: '10px', background: '#f0f5ee', border: '1px solid #dce6dc', borderRadius: '4px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
                    onClick={() => setStep('instruction')}
                  >
                    Manual Merchant Steps
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2B: MANUAL USSD / BANK WIRE DETAILS */}
          {step === 'instruction' && receipt && (
            <div className="payment-instructions" role="region" aria-label="Manual Payment Details">
              <div className="panel-heading">
                <div>
                  <span className="step-label">MANUAL TRANSFER DETAILS</span>
                  <h2>{paymentMethod === 'momo' ? `${selectedProvider.name} Direct Transfer` : 'Bank Wire Instructions'}</h2>
                </div>
                <span className="step-count">02 / 02</span>
              </div>

              <div style={{ background: '#f8faf7', border: '1px solid #dce6dc', borderRadius: '8px', padding: '16px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e1ebe0', paddingBottom: '12px', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#68786e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount to Transfer</span>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#176141' }}>
                      {currencyFormatter.format(receipt.amount)} <span style={{ fontSize: '14px', fontWeight: '600' }}>GHS</span>
                    </div>
                  </div>
                  {paymentMethod === 'momo' && (
                    <img
                      src={selectedProvider.logo}
                      alt={selectedProvider.name}
                      style={{ height: '36px', maxWidth: '120px', objectFit: 'contain' }}
                    />
                  )}
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#586b5f' }}>Transaction Reference:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '13px', fontFamily: 'monospace', color: '#1a3325', background: '#eef5ec', padding: '3px 8px', borderRadius: '4px' }}>
                        {receipt.reference}
                      </strong>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(receipt.reference, 'ref')}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#23865e', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                      >
                        {copiedKey === 'ref' ? <Check size={14} /> : <Copy size={14} />}
                        {copiedKey === 'ref' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {paymentMethod === 'momo' ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#586b5f' }}>Merchant / Till ID:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '13px', color: '#1a3325' }}>{selectedProvider.merchantId}</strong>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedProvider.merchantId, 'merchant')}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#23865e', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                          >
                            {copiedKey === 'merchant' ? <Check size={14} /> : <Copy size={14} />}
                            {copiedKey === 'merchant' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#586b5f' }}>MoMo Phone Number:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '13px', color: '#1a3325' }}>{selectedProvider.number}</strong>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedProvider.number, 'phone')}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#23865e', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                          >
                            {copiedKey === 'phone' ? <Check size={14} /> : <Copy size={14} />}
                            {copiedKey === 'phone' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#586b5f' }}>Account Name:</span>
                        <strong style={{ fontSize: '13px', color: '#1a3325' }}>{selectedProvider.accountName}</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#586b5f' }}>Bank:</span>
                        <strong style={{ fontSize: '13px', color: '#1a3325' }}>{BANK_DETAILS.bankName}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#586b5f' }}>Account Number:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '13px', color: '#1a3325' }}>{BANK_DETAILS.accountNumber}</strong>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(BANK_DETAILS.accountNumber, 'banknum')}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#23865e', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                          >
                            {copiedKey === 'banknum' ? <Check size={14} /> : <Copy size={14} />}
                            {copiedKey === 'banknum' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#586b5f' }}>SWIFT Code:</span>
                        <strong style={{ fontSize: '13px', color: '#1a3325' }}>{BANK_DETAILS.swift}</strong>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="submit-button"
                  style={{ flex: 1 }}
                  disabled={isProcessing}
                  onClick={() => handlePaymentConfirmed('pending_verification')}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      <Check size={18} /> I Have Completed Transfer
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="text-link"
                  style={{ background: '#f0f5ee', padding: '0 16px', borderRadius: '4px', textDecoration: 'none', border: '1px solid #dce6dc' }}
                  onClick={() => setStep('form')}
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: OFFICIAL TRANSACTION RECEIPT */}
          {step === 'success' && receipt && (
            <div className="payment-preview" role="status" style={{ minHeight: 'auto' }}>
              <span className="success-icon">
                <Check size={28} />
              </span>
              <span className="step-label">OFFICIAL DONATION RECEIPT</span>
              <h3 style={{ margin: '8px 0 4px', fontSize: '24px' }}>
                {receipt.status === 'completed' ? `Thank You, ${receipt.donorName}!` : `Transfer Logged, ${receipt.donorName}`}
              </h3>
              <p style={{ color: '#43594a', fontSize: '14px', marginBottom: '16px' }}>
                {receipt.status === 'completed'
                  ? `Your generous gift of ${currencyFormatter.format(receipt.amount)} has been successfully paid and verified.`
                  : `Your transfer notification for ${currencyFormatter.format(receipt.amount)} has been recorded. Our team will verify it against the transaction reference.`}
              </p>

              {/* RECEIPT TICKET */}
              <div style={{ width: '100%', background: '#f8faf7', border: '1px solid #dce6dc', borderRadius: '8px', padding: '16px', marginBottom: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#74867b', display: 'block' }}>Reference No:</span>
                    <strong style={{ fontFamily: 'monospace', color: '#176141' }}>{receipt.reference}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#74867b', display: 'block' }}>Status:</span>
                    <strong style={{ color: receipt.status === 'completed' ? '#176141' : '#b45309' }}>
                      {receipt.status === 'completed' ? '✓ Payment Received & Verified' : '⏳ Pending Manual Verification'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#74867b', display: 'block' }}>Payment Method:</span>
                    <strong>{receipt.provider}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#74867b', display: 'block' }}>Date:</span>
                    <strong>{receipt.date}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#74867b', display: 'block' }}>Frequency:</span>
                    <strong>{receipt.isMonthly ? 'Monthly Partner' : 'One-time Gift'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#74867b', display: 'block' }}>Donor Email:</span>
                    <strong>{receipt.donorEmail}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button
                  type="button"
                  className="submit-button"
                  style={{ flex: 1 }}
                  onClick={() => window.print()}
                >
                  <Printer size={16} /> Print / Save Receipt
                </button>
                <button
                  type="button"
                  className="text-link"
                  style={{ background: '#f0f5ee', padding: '0 16px', borderRadius: '4px', textDecoration: 'none', border: '1px solid #dce6dc' }}
                  onClick={handleReset}
                >
                  New Donation
                </button>
              </div>

              <div style={{ marginTop: '16px', textAlign: 'center', width: '100%' }}>
                <a className="text-link" href="/" onClick={(e) => handleNav(e, '/')}>
                  Return to Noleya Home <ArrowRight size={16} />
                </a>
              </div>
            </div>
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
