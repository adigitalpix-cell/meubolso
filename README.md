# MEU BOLSO

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

O app usa o arquivo de conexão:

```txt
supabase-config.js
```

Ele precisa ficar na raiz do projeto, no mesmo nível do `index.html`.

O SQL do Supabase pode ser guardado separadamente como documentação. A pasta `supabase` não é necessária para o app funcionar na Vercel.

## Arquivos principais

```txt
index.html
app.js
styles.css
supabase-config.js
manifest.webmanifest
sw.js
vercel.json
icon-192.svg
icon-512.svg
README.md
.gitignore
```

## Observação

O app usa Supabase via REST API e sincroniza os dados por `usuario_id`.
