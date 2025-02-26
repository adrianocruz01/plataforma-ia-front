// Configuração do ambiente
const API_CONFIG = {
    // Em desenvolvimento
    development: {
        BASE_URL: 'http://localhost:3000/api',
        GPT_MAKER_URL: 'https://api.gptmaker.ai'
    },
    // Em produção
    production: {
        BASE_URL: 'https://api.trendgpt.com.br/api',
        GPT_MAKER_URL: 'https://api.gptmaker.ai'
    }
};

// Define o ambiente atual
const ENV = window.location.hostname === 'localhost' ? 'development' : 'production';

// Expõe as configurações globalmente
window.config = {
    API_BASE_URL: API_CONFIG[ENV].BASE_URL,
    GPT_MAKER_BASE_URL: API_CONFIG[ENV].GPT_MAKER_URL,
    AGENT_ID: '3DCD4320FB8F10F782669AF8BA766933',
    GPT_MAKER_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJncHRtYWtlciIsImlkIjoiM0Q5NUZDNzM1MkJGNTE3NTE1ODFFNjk0QjVDNkY4MDAiLCJ0ZW5hbnQiOiIzRDk1RkM3MzUyQkY1MTc1MTU4MUU2OTRCNUM2RjgwMCIsInV1aWQiOiJkZGY5NTJiZC00OGRiLTRhYzAtODM4Yy1iZmI3NjM2M2E5NGIifQ.91lFHmSycVZq9AF4JLXo2y3fRws4oDeTya0dd7UbCaE'
};
