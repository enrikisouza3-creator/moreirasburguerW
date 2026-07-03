/* =========================================================
   js/data.js -- Config e dados do Moreira's Burguer
   Mesmo padrao usado no site da Bylax: as chaves do Supabase
   ficam aqui, como constantes, para trocar depois pelo par
   real do projeto do Moreira's.
   ========================================================= */

const SUPA_URL  = 'https://pgeqwitgpakgnkyqarts.supabase.co';
const SUPA_ANON = 'sb_publishable_VL8sKeovsq4zX59bx_wJIw_ZMX5htNk';

/* ---------------------------------------------------------
   Cardapio -- espelha os itens que ja estao no index (nome,
   preco e categoria). Usado pelo carrinho para calcular
   totais e montar o resumo do pedido.
   --------------------------------------------------------- */
window.MENU_MOREIRAS = {
  "M. Burguer":        { price: 23.99, cat: "classicos" },
  "M. Chef":           { price: 29.99, cat: "classicos" },
  "M. Egg":            { price: 31.99, cat: "classicos" },
  "M. Salada":         { price: 26.99, cat: "classicos" },
  "Cupim Cremoso":     { price: 36.99, cat: "casa" },
  "Cupim no Ponto":    { price: 39.99, cat: "casa" },
  "M. Bacon":          { price: 29.99, cat: "casa" },
  "M. Melt":           { price: 28.99, cat: "casa" },
  "M. Veggie":         { price: 24.99, cat: "casa" },
  "Fritas 150g":       { price: 11.99, cat: "fritas" },
  "Dobro de Fritas":   { price: 24.99, cat: "fritas" },
  "Refrigerante Lata": { price: 7.00,  cat: "bebidas" },
  "Suco Natural":      { price: 5.00,  cat: "bebidas" },
  "Agua com gas":      { price: 4.00,  cat: "bebidas" },
  "Agua natural":      { price: 3.00,  cat: "bebidas" },
  "H2O":               { price: 7.00,  cat: "bebidas" },
  "Budweiser":         { price: 10.00, cat: "cervejas" },
  "Heineken":          { price: 12.00, cat: "cervejas" },
  "Heineken Zero":     { price: 12.00, cat: "cervejas" },
  "Spaten":            { price: 11.00, cat: "cervejas" },
  "Stella Artois":     { price: 11.00, cat: "cervejas" },
  "Combo Casal":       { price: 74.90, cat: "combos" }
};

/* Adicionais que o cliente pode incluir em qualquer lanche */
window.ADICIONAIS_MOREIRAS = [
  { name: "Alface Americana",   price: 3.00 },
  { name: "Bacon",              price: 5.00 },
  { name: "Cebola Roxa",        price: 2.00 },
  { name: "Cheddar Cremoso",    price: 4.00 },
  { name: "Hamburguer Extra",   price: 10.00 },
  { name: "Maionese Especial",  price: 3.00 },
  { name: "Molho BBQ",          price: 3.00 },
  { name: "Ovo",                price: 3.00 },
  { name: "Picles",             price: 3.00 },
  { name: "Queijo Cheddar",     price: 4.00 },
  { name: "Queijo Prato",       price: 4.00 },
  { name: "Requeijao Cremoso",  price: 4.00 },
  { name: "Tomate",             price: 3.00 }
];

/* Pontos da carne -- so se aplica a lanches de carne bovina/cupim */
window.PONTOS_CARNE = ["Ao ponto", "Bem passado", "Mal passado"];

/* =========================================================
   ENTREGA -- cache local usado enquanto o Supabase nao
   responde, e como fallback se a tabela ainda nao existir.
   O painel admin edita a tabela bairros_entrega; o site
   sempre tenta ler de la primeiro.
   ========================================================= */
window.BAIRROS_CACHE = {
  "Centro":               { taxa: 5.00,  tempo: 25 },
  "Jardim dos Estados":   { taxa: 6.00,  tempo: 30 },
  "Jardim Country Club":  { taxa: 8.00,  tempo: 35 },
  "Vila Rosa":            { taxa: 8.00,  tempo: 35 },
  "Jardim Bandeirantes":  { taxa: 7.00,  tempo: 30 },
  "Jardim Cascatinha":    { taxa: 8.00,  tempo: 35 },
  "Jardim Amaryllis":     { taxa: 8.00,  tempo: 35 },
  "Estancia Sao Jose":    { taxa: 9.00,  tempo: 40 },
  "Elvira Dias":          { taxa: 9.00,  tempo: 40 },
  "Jardim Bela Vista":    { taxa: 9.00,  tempo: 40 }
};

window.CUPONS_CACHE = {
  "MOREIRA01": { tipo: "percentual", valor: 20, ativo: true }
};

window.DISPONIBILIDADE_CACHE = {};

async function carregarBairrosDoSupabase() {
  if (!SUPA_URL.startsWith('http')) return;
  try {
    const resp = await fetch(`${SUPA_URL}/rest/v1/bairros_entrega?select=bairro,taxa,tempo_min&ativo=eq.true`, {
      headers: { apikey: SUPA_ANON, Authorization: `Bearer ${SUPA_ANON}` }
    });
    if (!resp.ok) return;
    const rows = await resp.json();
    if (!rows.length) return;
    const novo = {};
    rows.forEach(r => { novo[r.bairro] = { taxa: Number(r.taxa) || 0, tempo: r.tempo_min || 35 }; });
    window.BAIRROS_CACHE = novo;
    window.dispatchEvent(new Event('bairros:carregados'));
  } catch (e) {
    console.warn('Bairros Supabase indisponivel, usando cache local', e);
  }
}

async function carregarCuponsDoSupabase() {
  if (!SUPA_URL.startsWith('http')) return;
  try {
    const resp = await fetch(`${SUPA_URL}/rest/v1/cupons?select=codigo,tipo,valor,ativo&ativo=eq.true`, {
      headers: { apikey: SUPA_ANON, Authorization: `Bearer ${SUPA_ANON}` }
    });
    if (!resp.ok) return;
    const rows = await resp.json();
    if (!rows.length) return;
    const novo = {};
    rows.forEach(r => { novo[r.codigo] = { tipo: r.tipo, valor: Number(r.valor) || 0, ativo: r.ativo }; });
    window.CUPONS_CACHE = novo;
  } catch (e) {
    console.warn('Cupons Supabase indisponivel, usando cache local', e);
  }
}

async function carregarDisponibilidadeDoSupabase() {
  if (!SUPA_URL.startsWith('http')) return;
  try {
    const resp = await fetch(`${SUPA_URL}/rest/v1/cardapio_disponibilidade?select=item,disponivel`, {
      headers: { apikey: SUPA_ANON, Authorization: `Bearer ${SUPA_ANON}` }
    });
    if (!resp.ok) return;
    const rows = await resp.json();
    const novo = {};
    rows.forEach(r => { novo[r.item] = r.disponivel; });
    window.DISPONIBILIDADE_CACHE = novo;
    window.dispatchEvent(new Event('disponibilidade:carregada'));
  } catch (e) {
    console.warn('Disponibilidade Supabase indisponivel', e);
  }
}

function itemDisponivel(nome) {
  return window.DISPONIBILIDADE_CACHE[nome] !== false;
}

carregarBairrosDoSupabase();
carregarCuponsDoSupabase();
carregarDisponibilidadeDoSupabase();
