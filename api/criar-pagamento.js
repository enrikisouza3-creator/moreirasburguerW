// api/criar-pagamento.js -- Backend Moreira's Burguer x Mercado Pago
// Mesmo padrao usado no site da Bylax: o token fica so em
// variavel de ambiente na Vercel, nunca no codigo.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Metodo nao permitido' });

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ erro: 'Token MP nao configurado' });

  try {
    const { produto, preco, frete, nome, email } = req.body;
    const total = Number(preco || 0) + Number(frete || 0);
    if (total <= 0) return res.status(400).json({ erro: 'Valor invalido' });

    // O email do pagador nao pode ser o mesmo da conta MP da loja.
    const payerEmail = (email && email !== process.env.MP_ACCOUNT_EMAIL)
      ? email
      : 'cliente@moreirasburguer.com.br';

    const body = {
      items: [{
        id: 'MOREIRAS-' + Date.now(),
        title: String(produto || "Moreira's Burguer").substring(0, 256),
        description: 'Pedido Moreiras Burguer',
        category_id: 'food',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: parseFloat(total.toFixed(2))
      }],
      payer: {
        name: String(nome || 'Cliente').split(' ')[0],
        surname: String(nome || 'Cliente').split(' ').slice(1).join(' ') || 'Moreiras',
        email: payerEmail
      },
      back_urls: {
        success: process.env.SITE_URL ? `${process.env.SITE_URL}/?pagamento=aprovado` : undefined,
        failure: process.env.SITE_URL ? `${process.env.SITE_URL}/?pagamento=falhou` : undefined,
        pending: process.env.SITE_URL ? `${process.env.SITE_URL}/?pagamento=pendente` : undefined
      },
      auto_return: 'approved',
      statement_descriptor: "MOREIRA'S BURGUER",
      external_reference: 'MOREIRAS-' + Date.now(),
      expires: false
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        signal: controller.signal,
        body: JSON.stringify(body)
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('MP erro:', JSON.stringify(data));
      return res.status(500).json({ erro: 'Erro ao criar preferencia', detalhe: data });
    }

    return res.status(200).json({ link: data.init_point, id: data.id });

  } catch (err) {
    console.error('Erro servidor:', err.message);
    return res.status(500).json({ erro: 'Erro interno', detalhe: err.message });
  }
};
