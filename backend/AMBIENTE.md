# 🌍 Guia de Ambientes - Sistema EPI

Este sistema usa **variáveis de ambiente** para controlar configurações entre desenvolvimento e produção.

---

## 📁 Arquivos de Configuração

- **`.env`** - Configuração de desenvolvimento (seu computador local) - **NÃO commitado no Git**
- **`.env.production`** - Configuração de produção (servidor real) - **NÃO commitado no Git**
- **`.env.example`** - Template de exemplo (commitado no Git como referência)

---

## 🛠️ Como Usar em DESENVOLVIMENTO

1. O arquivo `.env` já está criado e configurado para desenvolvimento local
2. Inicie o backend normalmente:
   ```bash
   cd backend
   npm start
   # ou para auto-reload:
   npm run dev
   ```
3. O sistema usará automaticamente:
   - Banco de dados: `epi_control_dev.db` (local)
   - Porta: `3000`
   - CORS: `http://localhost:3000`

---

## 🚀 Como Usar em PRODUÇÃO

### 1. Configurar o arquivo .env de produção

Edite o arquivo `.env.production` e ajuste:

```bash
NODE_ENV=production
PORT=3000
DB_PATH=./epi_control_prod.db

# IMPORTANTE: Gere uma chave JWT segura:
# No terminal, execute: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=cole-aqui-a-chave-gerada

# Coloque o domínio real do seu servidor:
CORS_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com
```

### 2. Iniciar em modo produção

```bash
NODE_ENV=production node server.js
```

Ou usando o arquivo de produção diretamente:
```bash
node server.js --env-file=.env.production
```

---

## 🔑 Variáveis de Ambiente Disponíveis

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NODE_ENV` | Ambiente (development/production) | `development` |
| `PORT` | Porta do servidor | `3000` |
| `DB_PATH` | Caminho do banco SQLite | `./epi_control_dev.db` |
| `JWT_SECRET` | Chave secreta para tokens JWT | `sua-chave-super-secreta` |
| `CORS_ORIGINS` | Origens permitidas (separadas por vírgula) | `http://localhost:3000` |
| `RATE_LIMIT_WINDOW_MS` | Janela de rate limiting (ms) | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Máximo de requisições por janela | `100` |

---

## 🔒 Segurança

- **NUNCA** commitar arquivos `.env` ou `.env.production` no Git
- **SEMPRE** gerar uma nova `JWT_SECRET` forte para produção
- Em produção, use HTTPS (nunca HTTP)
- Mantenha backups regulares do banco `epi_control_prod.db`

---

## 🐛 Troubleshooting

**Erro: "Cannot find module 'dotenv'"**
→ Execute: `npm install` para instalar as dependências

**Banco de dados não encontrado**
→ Verifique se o `DB_PATH` no `.env` está correto

**CORS bloqueado no frontend**
→ Adicione a URL do frontend em `CORS_ORIGINS` no `.env`

---

## 📊 Diferenças entre Ambientes

| Aspecto | Desenvolvimento | Produção |
|---------|----------------|----------|
| Banco | `epi_control_dev.db` | `epi_control_prod.db` |
| JWT Secret | Padrão (inseguro) | Chave forte gerada |
| Rate Limiting | 100 req/15min | 50 req/15min |
| CORS | Localhost permitido | Somente domínio real |
| Logs | Detalhados | Essenciais |

---

## 👨‍💻 Comandos Úteis

```bash
# Gerar chave JWT segura
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Verificar qual ambiente está rodando
echo $NODE_ENV  # Linux/Mac
echo %NODE_ENV% # Windows

# Testar conexão com o banco
sqlite3 epi_control_dev.db "SELECT COUNT(*) FROM colaboradores;"

# Ver logs em tempo real (se configurado)
tail -f logs/app.log
```
