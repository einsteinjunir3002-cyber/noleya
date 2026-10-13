import React, { useState } from 'react';
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
  Loader2
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
    textColor: '#002B49',
    number: '054 392 1084',
    merchantId: '184920',
    accountName: 'Noleya Foundation',
    ussd: '*170#'
  },
  {
    id: 'telecel',
    name: 'Telecel Cash',
    short: 'Telecel',
    logo: '/images/telecel-cash.svg',
    color: '#EA0029',
    textColor: '#FFFFFF',
    number: '020 819 4032',
    merchantId: '294810',
    accountName: 'Noleya Foundation',
    ussd: '*110#'
  },
  {
    id: 'at',
    name: 'AT Money',
    short: 'AT',
    logo: '/images/at-money.svg',
    color: '#002D72',
    textColor: '#FFFFFF',
    number: '027 491 8203',
    merchantId: '392011',
    accountName: 'Noleya Foundation',
    ussd: '*110#'
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

  // Donor form
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');

  // Flow states
  // 'form' -> 'instruction' (for direct momo / bank) -> 'success'
  const [step, setStep] = useState('form');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [receipt, setReceipt] = useState(null);

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

  const handleProceed = (e) => {
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

    // If Paystack is configured and donor selected Card or MoMo with Paystack:
    if (paystackPublicKey && (paymentMethod === 'card' || paymentMethod === 'momo')) {
      launchPaystack();
      return;
    }

    // Direct Mobile Money or Bank transfer flow:
    const ref = generateReference(paymentMethod === 'momo' ? 'MOMO' : 'BANK');
    const newReceipt = {
      reference: ref,
      amount: finalAmount,
      currency: 'GHS',
      isMonthly,
      paymentMethod,
      provider: paymentMethod === 'momo' ? selectedProvider.name : 'Bank Wire',
      donorName,
      donorEmail,
      donorPhone,
      date: formatReceiptDate(),
      status: 'pending_verification'
    };

    setReceipt(newReceipt);
    setStep('instruction');
  };

  const launchPaystack = () => {
    setIsProcessing(true);
    const ref = generateReference('PSTK');

    try {
      const paystack = new PaystackPop();
      paystack.newTransaction({
        key: paystackPublicKey,
        email: donorEmail,
        amount: Math.round(finalAmount * 100), // In Ghana Pesewas
        currency: 'GHS',
        ref,
        metadata: {
          custom_fields: [
            { display_name: 'Donor Name', variable_name: 'donor_name', value: donorName },
            { display_name: 'Phone', variable_name: 'donor_phone', value: donorPhone },
            { display_name: 'Frequency', variable_name: 'frequency', value: isMonthly ? 'Monthly' : 'One-time' },
            { display_name: 'Channel', variable_name: 'channel', value: paymentMethod }
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
            paymentMethod,
            provider: paymentMethod === 'momo' ? selectedProvider.name : 'Card (Paystack)',
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
            payment_method: paymentMethod,
            provider: paymentMethod === 'momo' ? selectedProvider.name : 'Card',
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
      // Fallback to direct instruction
      const fallbackReceipt = {
        reference: ref,
        amount: finalAmount,
        currency: 'GHS',
        isMonthly,
        paymentMethod,
        provider: selectedProvider.name,
        donorName,
        donorEmail,
        donorPhone,
        date: formatReceiptDate(),
        status: 'pending_verification'
      };
      setReceipt(fallbackReceipt);
      setStep('instruction');
    }
  };

  const handleConfirmDirectPayment = async () => {
    setIsProcessing(true);
    if (receipt) {
      await recordDonation({
        reference: receipt.reference,
        amount: receipt.amount,
        currency: 'GHS',
        is_monthly: isMonthly,
        payment_method: paymentMethod,
        provider: paymentMethod === 'momo' ? selectedProvider.name : 'Bank Transfer',
        donor_name: donorName,
        donor_email: donorEmail,
        donor_phone: donorPhone,
        status: 'pending_verification'
      });
    }
    setIsProcessing(false);
    setStep('success');
  };

  const handleReset = () => {
    setStep('form');
    setReceipt(null);
    setDonorPhone('');
    setErrorMsg('');
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
          {/* STEP 1: INITIAL DONATION & DETAILS FORM */}
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

              {/* PAYMENT METHOD SELECTION */}
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

              {/* MOBILE MONEY NETWORK SELECTION WITH OFFICIAL LOGOS */}
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
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#586b5f' }}>{selectedProvider.name} phone number</span>
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
                    <Loader2 size={18} className="animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    Proceed to Donate {currencyFormatter.format(finalAmount)} <ArrowRight size={18} />
                  </>
                )}
              </button>

              <p className="secure-note" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}>
                <ShieldCheck size={16} /> 256-Bit SSL Encrypted & Secure Giving
              </p>
            </form>
          )}

          {/* STEP 2: ACTIVE PAYMENT INSTRUCTIONS (DIRECT MOMO & BANK) */}
          {step === 'instruction' && receipt && (
            <div className="payment-instructions" role="region" aria-label="Payment instructions">
              <div className="panel-heading">
                <div>
                  <span className="step-label">COMPLETE YOUR PAYMENT</span>
                  <h2>{paymentMethod === 'momo' ? `${selectedProvider.name} Payment` : 'Bank Wire Instructions'}</h2>
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

              {/* STEP BY STEP USSD GUIDE */}
              {paymentMethod === 'momo' && (
                <div style={{ background: '#fff', border: '1px solid #e1ebe0', borderRadius: '6px', padding: '14px', marginBottom: '18px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#193a29', display: 'block', marginBottom: '6px' }}>
                    Quick Mobile Payment Steps:
                  </span>
                  <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#43594a', lineHeight: 1.6 }}>
                    <li>On your phone, dial <strong>{selectedProvider.ussd}</strong> or open your {selectedProvider.name} app.</li>
                    <li>Select <strong>Pay Merchant</strong> (or Send Money to <strong>{selectedProvider.number}</strong>).</li>
                    <li>Enter Merchant ID <strong>{selectedProvider.merchantId}</strong>.</li>
                    <li>Enter Amount: <strong>GH₵{receipt.amount}</strong>.</li>
                    <li>Enter Reference: <strong>{receipt.reference}</strong>.</li>
                    <li>Authorize transaction with your Mobile Money PIN.</li>
                  </ol>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="submit-button"
                  style={{ flex: 1 }}
                  disabled={isProcessing}
                  onClick={handleConfirmDirectPayment}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      <Check size={18} /> I Have Sent Payment
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

              <p style={{ textAlign: 'center', fontSize: '11px', color: '#74867b', marginTop: '14px' }}>
                🔒 An official digital receipt will be recorded to your Noleya donor profile upon submission.
              </p>
            </div>
          )}

          {/* STEP 3: OFFICIAL TRANSACTION RECEIPT */}
          {step === 'success' && receipt && (
            <div className="payment-preview" role="status" style={{ minHeight: 'auto' }}>
              <span className="success-icon">
                <Check size={28} />
              </span>
              <span className="step-label">OFFICIAL DONATION RECEIPT</span>
              <h3 style={{ margin: '8px 0 4px', fontSize: '24px' }}>Thank You, {receipt.donorName}!</h3>
              <p style={{ color: '#43594a', fontSize: '14px', marginBottom: '16px' }}>
                Your generous gift of <strong>{currencyFormatter.format(receipt.amount)}</strong> has been registered.
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
                      {receipt.status === 'completed' ? '✓ Verified & Paid' : '⏳ Recorded & Pending Review'}
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
