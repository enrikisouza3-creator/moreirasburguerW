# Moreira's Burguer -- Peça Online

Estrutura adaptada do site da Bylax para uma hamburgueria com entrega
local por bairro, painel admin, Mercado Pago e Pix.

## O que trocar antes de publicar

1. **Supabase** (`js/data.js` e `admin/index.html`)
   - `SUPA_URL` -> URL do projeto (Supabase > Settings > API)
   - `SUPA_ANON` / `SUPA_KEY` -> chave publicável do projeto
   - Rode o script `sql/supabase-setup.sql` no SQL Editor do Supabase
     antes de qualquer teste; ele cria as tabelas e já semeia alguns
     bairros e o cupom `MOREIRA01` (ajuste os bairros reais depois).

2. **Mercado Pago** (variável de ambiente na Vercel, nunca no código)
   - `MP_ACCESS_TOKEN` -> token de produção da conta do Moreira's
   - `MP_ACCOUNT_EMAIL` -> e-mail da conta MP da loja (evita usar o
     mesmo e-mail como pagador)
   - `SITE_URL` -> URL final do site (ex.: `https://moreiras.vercel.app`)

3. **Pix** (`js/cart.js`)
   - `PIX_KEY` -> chave Pix real da loja
   - `PIX_MERCHANT` / `PIX_CITY` já estão como "MOREIRAS BURGUER" e
     "POCOS DE CALDAS"; ajuste se o nome cadastrado no banco for
     diferente

4. **Admin** (`admin/index.html`)
   - `ADMIN_PWD` -> defina uma senha antes de publicar o painel

## Estrutura

```
index                       -- site (visual mantido como estava)
js/data.js                  -- cardápio, adicionais, cache de bairros/cupons
js/cart.js                  -- carrinho, checkout, entrega por bairro, Pix, Mercado Pago
api/criar-pagamento.js      -- function Vercel que gera o link do Mercado Pago
admin/index.html            -- painel: pedidos, bairros, cardápio, cupons
sql/supabase-setup.sql      -- tabelas do Supabase
vercel.json                 -- rewrites da API
```

## Observação sobre o visual do index

O layout, textos e ícones/emoji decorativos do `index` foram mantidos
exatamente como estavam. As regras de "sem emoji" foram aplicadas em
todo o código novo (`js/`, `api/`, `admin/`, `sql/`) -- se você também
quiser remover os emojis do próprio index (cardápio, tracker, seção
"como funciona"), é só pedir.
