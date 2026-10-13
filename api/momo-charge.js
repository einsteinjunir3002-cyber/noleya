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

    // Standardize Ghana phone number (e.g. 024XXXXXXX)
    let cleanPhone = String(phone).replace(/[^\d]/g, '');
    if (cleanPhone.startsWith('233')) {
      cleanPhone = '0' + cleanPhone.slice(3);
    }

    // Map network provider to Paystack Ghana mobile money provider codes
    // 'mtn' (MTN MoMo), 'vod' (Telecel/Vodafone Cash), 'atl' (AT/AirtelTigo Money)
    let paystackProvider = 'mtn';
    const lowerProv = String(provider || '').toLowerCase();
    if (lowerProv.includes('telecel') || lowerProv.includes('vod')) {
      paystackProvider = 'vod';
    } else if (lowerProv.includes('at') || lowerProv.includes('airtel') || lowerProv.includes('tigo')) {
      paystackProvider = 'atl';
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const ref = `NLY-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    // If Paystack Secret Key is configured, dispatch the real STK push to carrier
    if (paystackSecretKey) {
      const response = await fetch('https://api.paystack.co/charge', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          amount: Math.round(Number(amount) * 100), // In Ghana Pesewas
          currency: 'GHS',
          reference: ref,
          metadata: {
            custom_fields: [
              { display_name: 'Donor Name', variable_name: 'donor_name', value: donorName || 'Supporter' },
              { display_name: 'Phone', variable_name: 'donor_phone', value: cleanPhone },
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
          hasGateway: true,
          error: data.message || 'Payment provider could not initiate push prompt.',
          data
        });
      }

      return res.status(200).json({
        success: true,
        hasGateway: true,
        reference: ref,
        paystackReference: data.data?.reference || ref,
        status: data.data?.status || 'pending',
        displayText: data.data?.display_text || `Prompt sent to ${cleanPhone}. Please input your PIN on your phone to complete authorization.`,
        data: data.data
      });
    }

    // When PAYSTACK_SECRET_KEY is not yet added in Vercel environment variables:
    // Inform the client clearly that the automated telecom push requires gateway credentials
    return res.status(200).json({
      success: true,
      hasGateway: false,
      reference: ref,
      phone: cleanPhone,
      provider: paystackProvider,
      message: 'Gateway key not yet connected. Automatic push prompt requires PAYSTACK_SECRET_KEY in Vercel.',
      directPayment: {
        number: '054 392 1084',
        merchantId: '184920',
        accountName: 'Noleya Foundation',
        instructions: 'Please dial your carrier code on your phone to send the contribution directly to Noleya Foundation.'
      }
    });
  } catch (err) {
    console.error('MoMo charge serverless error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
