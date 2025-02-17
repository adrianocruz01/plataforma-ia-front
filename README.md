# GPT Maker Frontend

Interface web para o chat GPT Maker.

## Como rodar em desenvolvimento

1. Instale as dependências:
```bash
npm install
```

2. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O frontend estará disponível em `http://localhost:5500`

## Variáveis de ambiente

O frontend está configurado para se conectar automaticamente ao backend baseado no ambiente:
- Desenvolvimento: `http://localhost:3000/api`
- Produção: `https://plataforma-ia-back-50127e4cb1f5.herokuapp.com/api`
