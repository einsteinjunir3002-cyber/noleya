export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { reference } = req.query || {};

  if (!reference) {
    return res.status(400).json({ error: 'Missing transaction reference' });
  }

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!paystackSecretKey) {
    return res.status(200).json({
      status: 'pending',
      simulated: true,
      message: 'Waiting for handset PIN entry.'
    });
  }

  try {
    const response = await fetch(`https://api.paystack.co/charge/${encodeURIComponent(reference)}`, {
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('MoMo status check error:', err);
    return res.status(500).json({ error: err.message || 'Status check failed' });
  }
}
