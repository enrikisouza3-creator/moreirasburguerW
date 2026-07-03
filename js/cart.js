/* =========================================================
   js/cart.js -- Carrinho, checkout, entrega por bairro,
   cupom, Pix estatico e Mercado Pago do Moreira's Burguer.
   Portado e adaptado do motor usado no site da Bylax.
   ========================================================= */

const PIX_KEY          = 'COLOQUE_AQUI_A_CHAVE_PIX';
const PIX_MERCHANT     = 'MOREIRAS BURGUER';
const PIX_CITY         = 'POCOS DE CALDAS';
const MP_BACKEND_URL   = '/api/criar-pagamento';

let cart = [];

function el(id) { return document.getElementById(id); }
function fmtBR(n) { return 'R$ ' + (Number(n) || 0).toFixed(2).replace('.', ','); }
function parseBR(s) { return Number(String(s || '0').replace(/[^\d,-]/g, '').replace(',', '.')) || 0; }

/* ---------------------------------------------------------
   Adicionar item ao carrinho
   --------------------------------------------------------- */
function addItem(btn, name) {
  const menuItem = window.MENU_MOREIRAS[name];
  if (!menuItem) { console.warn('Item nao encontrado no cardapio:', name); return; }
  if (!itemDisponivel(name)) { showToast(name + ' esta indisponivel no momento'); return; }

  const existing = cart.find(c => c.name === name && !c.adicionais && !c.observacao);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ name, price: menuItem.price, qty: 1, adicionais: '', ponto: '', observacao: '' });
  }

  renderCart();
  el('cartBar')?.classList.add('show');

  if (btn) {
    const original = btn.innerText;
    btn.innerText = '\u2713';
    btn.classList.add('added');
    setTimeout(() => { btn.innerText = original === '\u2713' ? '+' : original; btn.classList.remove('added'); }, 900);
  }
  showToast(name + ' adicionado');
}

function changeQty(i, delta) {
  if (!cart[i]) return;
  cart[i].qty += delta;
  if (cart[i].qty <= 0) cart.splice(i, 1);
  renderCart();
}

function removeItem(i) {
  cart.splice(i, 1);
  renderCart();
}

function getSubtotal() {
  return cart.reduce((s, c) => s + itemLineTotal(c) * c.qty, 0);
}

function itemLineTotal(item) {
  const adicionaisPreco = (item.adicionaisLista || []).reduce((s, a) => s + a.price, 0);
  return item.price + adicionaisPreco;
}

/* ---------------------------------------------------------
   Render do carrinho (drawer)
   --------------------------------------------------------- */
function renderCart() {
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const sub = getSubtotal();

  const cartCount = el('cartCount');
  const cartTotal = el('cartTotal');
  if (cartCount) cartCount.innerText = count;
  if (cartTotal) cartTotal.innerText = fmtBR(sub);

  const list = el('cartList');
  if (!list) return;

  if (!cart.length) {
    list.innerHTML = '<p class="cart-empty">Sua sacola esta vazia.</p>';
  } else {
    list.innerHTML = cart.map((c, i) => {
      const adicionaisTxt = (c.adicionaisLista || []).map(a => a.name).join(', ');
      const detalhes = [c.ponto, adicionaisTxt, c.observacao].filter(Boolean).join(' \u00b7 ');
      return `
        <div class="cart-row">
          <div class="cart-row-info">
            <b>${c.name}</b>
            ${detalhes ? `<span class="cart-row-detalhe">${detalhes}</span>` : ''}
          </div>
          <div class="cart-row-actions">
            <button class="qty-btn" onclick="changeQty(${i},-1)">-</button>
            <span class="qty-val">${c.qty}</span>
            <button class="qty-btn" onclick="changeQty(${i},1)">+</button>
          </div>
          <div class="cart-row-price">${fmtBR(itemLineTotal(c) * c.qty)}</div>
          <button class="cart-row-edit" onclick="openItemOptions(${i})" title="Personalizar">editar</button>
        </div>`;
    }).join('');
  }

  const subLbl = el('cartSubLbl');
  if (subLbl) subLbl.innerText = fmtBR(sub);
  recalcTotal();
}

function toggleCart() {
  el('cartDrawer')?.classList.toggle('on');
  el('cartOverlay')?.classList.toggle('on');
}

function closeCart() {
  el('cartDrawer')?.classList.remove('on');
  el('cartOverlay')?.classList.remove('on');
}

/* ---------------------------------------------------------
   Personalizacao de item (adicionais, ponto, observacao)
   --------------------------------------------------------- */
let itemEmEdicao = null;

function openItemOptions(i) {
  itemEmEdicao = i;
  const item = cart[i];
  if (!item) return;

  const box = el('itemOptionsBody');
  const adicionaisHtml = window.ADICIONAIS_MOREIRAS.map(a => {
    const checked = (item.adicionaisLista || []).some(x => x.name === a.name) ? 'checked' : '';
    return `<label class="opt-row"><input type="checkbox" value="${a.name}" data-price="${a.price}" ${checked}> ${a.name} <span>+${fmtBR(a.price)}</span></label>`;
  }).join('');

  const pontoHtml = window.PONTOS_CARNE.map(p => {
    const sel = item.ponto === p ? 'selected' : '';
    return `<option value="${p}" ${sel}>${p}</option>`;
  }).join('');

  box.innerHTML = `
    <h4>${item.name}</h4>
    <label class="opt-label">Ponto da carne</label>
    <select id="optPonto"><option value="">Sem preferencia</option>${pontoHtml}</select>
    <label class="opt-label">Adicionais</label>
    <div id="optAdicionais">${adicionaisHtml}</div>
    <label class="opt-label">Observacao</label>
    <textarea id="optObs" placeholder="Ex.: sem cebola, ponto da carne, etc.">${item.observacao || ''}</textarea>
  `;
  el('itemOptionsModal')?.classList.add('on');
}

function closeItemOptions() {
  el('itemOptionsModal')?.classList.remove('on');
  itemEmEdicao = null;
}

function saveItemOptions() {
  if (itemEmEdicao === null) return;
  const item = cart[itemEmEdicao];
  if (!item) return;

  const checks = document.querySelectorAll('#optAdicionais input[type="checkbox"]:checked');
  item.adicionaisLista = Array.from(checks).map(c => ({ name: c.value, price: Number(c.dataset.price) }));
  item.ponto = el('optPonto')?.value || '';
  item.observacao = (el('optObs')?.value || '').trim();

  closeItemOptions();
  renderCart();
}

/* ---------------------------------------------------------
   Entrega por bairro
   --------------------------------------------------------- */
function popularSelectBairros() {
  const select = el('ckBairro');
  if (!select) return;
  const bairros = Object.keys(window.BAIRROS_CACHE).sort();
  select.innerHTML = '<option value="">Selecione seu bairro</option>' +
    bairros.map(b => `<option value="${b}">${b}</option>`).join('');
}

function calcEntrega() {
  const bairro = el('ckBairro')?.value;
  const resultBox = el('ckEntregaResult');
  if (!bairro || !window.BAIRROS_CACHE[bairro]) {
    if (resultBox) resultBox.style.display = 'none';
    recalcTotal();
    return;
  }
  const info = window.BAIRROS_CACHE[bairro];
  if (resultBox) {
    resultBox.style.display = 'block';
    resultBox.innerHTML = `Taxa de entrega: <b>${fmtBR(info.taxa)}</b> \u00b7 tempo estimado: <b>${info.tempo} min</b>`;
  }
  recalcTotal();
}

function getTaxaEntrega() {
  const bairro = el('ckBairro')?.value;
  if (!bairro || !window.BAIRROS_CACHE[bairro]) return 0;
  return window.BAIRROS_CACHE[bairro].taxa;
}

/* ---------------------------------------------------------
   Cupom
   --------------------------------------------------------- */
let cupomAtivo = null;

function aplicarCupom() {
  const codigo = (el('ckCupom')?.value || '').trim().toUpperCase();
  const info = window.CUPONS_CACHE[codigo];
  const msg = el('ckCupomMsg');
  if (!codigo) return;
  if (!info || !info.ativo) {
    cupomAtivo = null;
    if (msg) { msg.textContent = 'Cupom invalido ou expirado'; msg.className = 'ck-cupom-msg erro'; }
    recalcTotal();
    return;
  }
  cupomAtivo = { codigo, ...info };
  if (msg) {
    msg.textContent = info.tipo === 'percentual'
      ? `Cupom ${codigo} aplicado: ${info.valor}% de desconto`
      : `Cupom ${codigo} aplicado: ${fmtBR(info.valor)} de desconto`;
    msg.className = 'ck-cupom-msg ok';
  }
  recalcTotal();
}

function getDesconto(sub) {
  if (!cupomAtivo) return 0;
  if (cupomAtivo.tipo === 'percentual') return sub * (cupomAtivo.valor / 100);
  return Math.min(sub, cupomAtivo.valor);
}

/* ---------------------------------------------------------
   Totais do checkout
   --------------------------------------------------------- */
function recalcTotal() {
  const sub = getSubtotal();
  const desconto = getDesconto(sub);
  const taxa = getTaxaEntrega();
  const total = Math.max(0, sub - desconto + taxa);

  if (el('ckSubLbl')) el('ckSubLbl').textContent = fmtBR(sub);
  if (el('ckDescontoLbl')) el('ckDescontoLbl').textContent = desconto ? '-' + fmtBR(desconto) : fmtBR(0);
  if (el('ckTaxaLbl')) el('ckTaxaLbl').textContent = fmtBR(taxa);
  if (el('ckTotalLbl')) el('ckTotalLbl').textContent = fmtBR(total);
  return total;
}

/* ---------------------------------------------------------
   Abrir / fechar checkout
   --------------------------------------------------------- */
function openCheckout() {
  if (!cart.length) { showToast('Sua sacola esta vazia'); return; }
  closeCart();
  popularSelectBairros();
  el('ckOverlay')?.classList.add('on');
  renderCart();
}

function closeCheckout() {
  el('ckOverlay')?.classList.remove('on');
}

/* ---------------------------------------------------------
   Montar resumo de itens para salvar no Supabase / backend
   --------------------------------------------------------- */
function montarResumoItens() {
  return cart.map(c => {
    const adicionaisTxt = (c.adicionaisLista || []).map(a => a.name).join(', ');
    const detalhes = [c.ponto, adicionaisTxt].filter(Boolean).join(' / ');
    return `${c.name}${detalhes ? ' (' + detalhes + ')' : ''} x${c.qty}`;
  }).join(' | ');
}

async function enviarPedidoSupabase(dados) {
  if (!SUPA_URL.startsWith('http')) return null;
  try {
    const pedidoResp = await fetch(`${SUPA_URL}/rest/v1/pedidos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPA_ANON,
        Authorization: `Bearer ${SUPA_ANON}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(dados)
    });
    if (!pedidoResp.ok) { console.warn('Falha ao salvar pedido no Supabase'); return null; }
    const [pedido] = await pedidoResp.json();

    const itens = cart.map(c => ({
      pedido_id: pedido.id,
      item: c.name,
      observacao: c.observacao || null,
      adicionais: (c.adicionaisLista || []).map(a => a.name).join(', ') || null,
      quantidade: c.qty,
      preco_unit: itemLineTotal(c)
    }));

    await fetch(`${SUPA_URL}/rest/v1/itens_pedido`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPA_ANON,
        Authorization: `Bearer ${SUPA_ANON}`
      },
      body: JSON.stringify(itens)
    });

    return pedido.id;
  } catch (e) {
    console.warn('Erro ao enviar pedido para o Supabase', e);
    return null;
  }
}

/* ---------------------------------------------------------
   Confirmar pedido -- escolhe Mercado Pago ou Pix
   --------------------------------------------------------- */
function dadosClienteValidos() {
  const nome = (el('ckName')?.value || '').trim();
  const tel = (el('ckPhone')?.value || '').trim();
  const bairro = el('ckBairro')?.value || '';
  const rua = (el('ckAddr')?.value || '').trim();
  const num = (el('ckNumero')?.value || '').trim();

  if (!nome || !tel) { showToast('Preencha nome e WhatsApp'); return null; }
  if (!bairro) { showToast('Selecione o bairro de entrega'); return null; }
  if (!rua || !num) { showToast('Preencha rua e numero'); return null; }

  return {
    nome, tel, bairro, rua, num,
    complemento: (el('ckComplemento')?.value || '').trim(),
    referencia: (el('ckReferencia')?.value || '').trim(),
    email: (el('ckEmail')?.value || '').trim()
  };
}

async function confirmOrder() {
  const forma = document.querySelector('input[name="formaPagamento"]:checked')?.value || 'mercado_pago';
  if (forma === 'pix') return confirmOrderPix();
  return confirmOrderMercadoPago();
}

async function confirmOrderMercadoPago() {
  const cliente = dadosClienteValidos();
  if (!cliente) return;

  const sub = getSubtotal();
  const desconto = getDesconto(sub);
  const taxa = getTaxaEntrega();
  const total = Math.max(0, sub - desconto + taxa);
  const endereco = `${cliente.rua}, ${cliente.num}${cliente.complemento ? ' - ' + cliente.complemento : ''} - ${cliente.bairro}`;
  const produto = montarResumoItens();

  const btn = el('ckConfirmBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'processando pedido...'; }

  const pedidoId = await enviarPedidoSupabase({
    cliente_nome: cliente.nome,
    cliente_tel: cliente.tel,
    cliente_email: cliente.email || null,
    bairro: cliente.bairro,
    endereco,
    referencia: cliente.referencia || null,
    subtotal: sub,
    desconto,
    cupom: cupomAtivo?.codigo || null,
    taxa_entrega: taxa,
    total,
    forma_pagamento: 'mercado_pago',
    status: 'novo',
    itens_resumo: produto
  });

  try {
    if (btn) btn.textContent = 'gerando pagamento...';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const resp = await fetch(MP_BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        produto,
        preco: sub - desconto,
        frete: taxa,
        nome: cliente.nome,
        email: cliente.email || 'cliente@moreirasburguer.com.br'
      })
    });
    clearTimeout(timeoutId);
    const data = await resp.json();

    if (data.link) {
      closeCheckout();
      showToast('Redirecionando para o Mercado Pago');
      setTimeout(() => { window.location.href = data.link; }, 150);
    } else {
      showToast('Erro ao gerar pagamento, tente novamente');
      console.error('Backend erro:', data);
      if (btn) { btn.disabled = false; btn.textContent = 'confirmar pedido'; }
    }
  } catch (err) {
    showToast(err.name === 'AbortError' ? 'Pagamento demorou demais, tente novamente' : 'Erro de conexao');
    console.error(err);
    if (btn) { btn.disabled = false; btn.textContent = 'confirmar pedido'; }
  }
}

async function confirmOrderPix() {
  const cliente = dadosClienteValidos();
  if (!cliente) return;

  const sub = getSubtotal();
  const desconto = getDesconto(sub);
  const taxa = getTaxaEntrega();
  const total = Math.max(0, sub - desconto + taxa);
  const endereco = `${cliente.rua}, ${cliente.num}${cliente.complemento ? ' - ' + cliente.complemento : ''} - ${cliente.bairro}`;

  await enviarPedidoSupabase({
    cliente_nome: cliente.nome,
    cliente_tel: cliente.tel,
    cliente_email: cliente.email || null,
    bairro: cliente.bairro,
    endereco,
    referencia: cliente.referencia || null,
    subtotal: sub,
    desconto,
    cupom: cupomAtivo?.codigo || null,
    taxa_entrega: taxa,
    total,
    forma_pagamento: 'pix',
    status: 'novo',
    itens_resumo: montarResumoItens()
  });

  closeCheckout();
  openPix(total);
}

/* =========================================================
   PIX -- BR Code (EMV) + QR Code, gerado no proprio
   navegador, sem depender de nenhuma API paga.
   ========================================================= */
function _f(id, val) { const v = String(val); return id + String(v.length).padStart(2, '0') + v; }

function _crc(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function _san(str, max) {
  return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').substring(0, max);
}

function buildPixPayload(amount) {
  const key = _f('01', PIX_KEY);
  const merchantAccount = _f('26', _f('00', 'br.gov.bcb.pix') + key);
  const mcc = _f('52', '0000');
  const currency = _f('53', '986');
  const value = _f('54', Number(amount).toFixed(2));
  const country = _f('58', 'BR');
  const name = _f('59', _san(PIX_MERCHANT, 25) || 'MOREIRAS BURGUER');
  const city = _f('60', _san(PIX_CITY, 15) || 'POCOS DE CALDAS');
  const txid = _f('05', 'MB' + Date.now().toString().slice(-10));
  const addData = _f('62', txid);

  let payload = _f('00', '01') + merchantAccount + mcc + currency + value + country + name + city + addData + '6304';
  return payload + _crc(payload);
}

let _pixTimer = null;

function openPix(amount) {
  const payload = buildPixPayload(amount);
  if (el('pixValorLbl')) el('pixValorLbl').textContent = fmtBR(amount);
  if (el('pixCode')) el('pixCode').value = payload;
  _renderQRSVG(payload);
  el('pixOverlay')?.classList.add('on');
  _startTimer();
}

function closePix() {
  el('pixOverlay')?.classList.remove('on');
  clearInterval(_pixTimer);
}

function copyPix() {
  const text = el('pixCode')?.value || '';
  navigator.clipboard?.writeText(text).then(_flashCopy).catch(() => _execCopy(text));
}

function _execCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); _flashCopy(); } catch (e) { /* silencioso */ }
  document.body.removeChild(ta);
}

function _flashCopy() {
  showToast('Codigo Pix copiado');
}

function _startTimer() {
  let seconds = 15 * 60;
  clearInterval(_pixTimer);
  _pixTimer = setInterval(() => {
    seconds--;
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    if (el('pixTimer')) el('pixTimer').textContent = `${m}:${s}`;
    if (seconds <= 0) clearInterval(_pixTimer);
  }, 1000);
}

function _renderQRSVG(text) {
  const wrap = el('pixQrWrap');
  if (!wrap) return;
  wrap.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(text)}" alt="QR Code Pix" width="260" height="260">`;
}

/* ---------------------------------------------------------
   Init
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  el('cartBar')?.setAttribute('onclick', 'toggleCart()');
  el('ckBairro')?.addEventListener('change', calcEntrega);
});

window.addEventListener('bairros:carregados', popularSelectBairros);
