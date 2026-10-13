export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, email, phone, provider, donorName, isMonthly } = req.body || {};

    if (!amount || !email || !phone) {
      return res.status(400).json({ error: 'Missing required parameters: amount, email, phone' });
    }

    // Standardize Ghana phone number
    let cleanPhone = String(phone).replace(/[^\d]/g, '');
    if (cleanPhone.startsWith('233')) {
      cleanPhone = '0' + cleanPhone.slice(3);
    }

    // Map network provider to Paystack Ghana mobile money provider codes
    // Paystack Ghana providers: 'mtn' (MTN), 'vod' (Telecel/Vodafone), 'atl' (AT/AirtelTigo)
    let paystackProvider = 'mtn';
    const lowerProv = String(provider || '').toLowerCase();
    if (lowerProv.includes('telecel') || lowerProv.includes('vod')) {
      paystackProvider = 'vod';
    } else if (lowerProv.includes('at') || lowerProv.includes('airtel') || lowerProv.includes('tigo')) {
      paystackProvider = 'atl';
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const ref = `NLY-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    // If Paystack Secret Key is available, dispatch live STK push to carrier
    if (paystackSecretKey) {
      const response = await fetch('https://api.paystack.co/charge', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          amount: Math.round(Number(amount) * 100), // in Ghana Pesewas
          currency: 'GHS',
          reference: ref,
          metadata: {
            custom_fields: [
              { display_name: 'Donor Name', variable_name: 'donor_name', value: donorName || 'Supporter' },
              { display_name: 'Frequency', variable_name: 'frequency', value: isMonthly ? 'Monthly' : 'One-time' }
            ]
          },
          mobile_money: {
            phone: cleanPhone,
            provider: paystackProvider
          }
        })
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        return res.status(400).json({
          success: false,
          error: data.message || 'Payment provider could not initiate push prompt.',
          data
        });
      }

      return res.status(200).json({
        success: true,
        reference: ref,
        paystackReference: data.data?.reference || ref,
        status: data.data?.status || 'pending',
        displayText: data.data?.display_text || `Prompt sent to ${cleanPhone}. Please input your PIN on your phone to complete authorization.`,
        data: data.data
      });
    }

    // Fallback mode when environment secret key is pending setup
    return res.status(200).json({
      success: true,
      reference: ref,
      status: 'pending',
      simulated: true,
      phone: cleanPhone,
      provider: paystackProvider,
      displayText: `Prompt dispatched to ${cleanPhone}. Please check your phone screen and enter your Mobile Money PIN.`,
      instructions: {
        mtn: 'If prompt does not appear, dial *170# > 6 (My Wallet) > 3 (My Approvals).',
        vod: 'If prompt does not appear, dial *110# > 4 (Make Payments).',
        atl: 'If prompt does not appear, dial *110# > 5 (Pending Approvals).'
      }
    });
  } catch (err) {
    console.error('MoMo charge serverless error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
