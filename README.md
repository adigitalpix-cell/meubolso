# Minhas Finanças

Aplicativo financeiro PWA para controle de usuários, receitas, despesas, cartões, compras parceladas, parcelas e suporte.

## Publicação na Vercel

Este projeto é estático. Para publicar:

1. Envie os arquivos do projeto para um repositório GitHub.
2. Na Vercel, importe o repositório.
3. Framework Preset: `Other`.
4. Build Command: deixe vazio.
5. Output Directory: deixe vazio ou use a raiz.
6. Deploy.

## Supabase

Antes de usar o app, execute o SQL em:

```txt
supabase/schema.sql
```

O arquivo de conexão usado pelo app é:

```txt
supabase-config.js
```

Ele precisa ficar na raiz do projeto, no mesmo nível do `index.html`.

## Arquivos principais

```txt
index.html
app.js
styles.css
supabase-config.js
manifest.webmanifest
sw.js
vercel.json
icons/
supabase/
```

## Observação

O app usa Supabase via REST API e sincroniza os dados por `usuario_id`.
