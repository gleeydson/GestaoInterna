# 🧪 Como Testar a API

## 1. Verificar se o servidor está rodando

```bash
curl http://localhost:3000/api/health
```

**Resposta esperada:**
```json
{
  "data": {
    "status": "ok",
    "service": "epi-control-api"
  },
  "meta": {},
  "error": null
}
```

---

## 2. Fazer Login (obter token)

**Usuário padrão criado automaticamente:**
- Username: `admin`
- Senha: `admin123`

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```

**Resposta esperada:**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr-admin",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

**⚠️ Copie o token da resposta! Você vai precisar dele para as próximas requisições.**

---

## 3. Listar Colaboradores (com autenticação)

```bash
curl http://localhost:3000/api/colaboradores \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## 4. Listar EPIs

```bash
curl http://localhost:3000/api/epis \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## 5. Ver Estatísticas do Dashboard

```bash
curl http://localhost:3000/api/dashboard/stats \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## 6. Criar um Colaborador

```bash
curl -X POST http://localhost:3000/api/colaboradores \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d "{
    \"id\": \"col-001\",
    \"nome\": \"João Silva\",
    \"funcao\": \"Técnico de Segurança\",
    \"cpf\": \"12345678901\",
    \"setor\": \"Produção\",
    \"cidade\": \"São Paulo\",
    \"telefone\": \"11999999999\",
    \"email\": \"joao@empresa.com\",
    \"dataCadastro\": \"2026-02-10T12:00:00.000Z\"
  }"
```

---

## 7. Criar um EPI

```bash
curl -X POST http://localhost:3000/api/epis \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d "{
    \"id\": \"epi-001\",
    \"nome\": \"Capacete de Segurança\",
    \"ca\": \"12345\",
    \"tipo\": \"Proteção da Cabeça\",
    \"validadeCA\": \"2027-12-31\",
    \"estoque\": 50,
    \"estoqueMinimo\": 10,
    \"descricao\": \"Capacete classe A\",
    \"dataCadastro\": \"2026-02-10T12:00:00.000Z\"
  }"
```

---

## 8. Ver Logs de Auditoria (apenas admin)

```bash
curl http://localhost:3000/api/audit-logs?limit=10 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## 📋 Endpoints Disponíveis

| Método | Endpoint | Descrição | Requer Auth |
|--------|----------|-----------|-------------|
| GET | `/api/health` | Status da API | ❌ |
| POST | `/api/auth/login` | Login | ❌ |
| GET | `/api/auth/me` | Dados do usuário logado | ✅ |
| GET | `/api/colaboradores` | Listar colaboradores | ✅ |
| GET | `/api/colaboradores/:id` | Buscar colaborador | ✅ |
| POST | `/api/colaboradores` | Criar colaborador | ✅ Admin/Técnico |
| PUT | `/api/colaboradores/:id` | Atualizar colaborador | ✅ Admin/Técnico |
| DELETE | `/api/colaboradores/:id` | Remover colaborador | ✅ Admin |
| GET | `/api/epis` | Listar EPIs | ✅ |
| POST | `/api/epis` | Criar EPI | ✅ Admin/Técnico |
| PUT | `/api/epis/:id` | Atualizar EPI | ✅ Admin/Técnico |
| DELETE | `/api/epis/:id` | Remover EPI | ✅ Admin |
| GET | `/api/entregas` | Listar entregas | ✅ |
| POST | `/api/entregas` | Registrar entrega | ✅ Admin/Técnico |
| DELETE | `/api/entregas/:id` | Remover entrega | ✅ Admin |
| GET | `/api/treinamentos` | Listar treinamentos | ✅ |
| POST | `/api/treinamentos` | Registrar treinamento | ✅ Admin/Técnico |
| GET | `/api/exames` | Listar exames | ✅ |
| POST | `/api/exames` | Registrar exame | ✅ Admin/Técnico |
| GET | `/api/dashboard/stats` | Estatísticas | ✅ |
| GET | `/api/relatorios/vencimentos` | Relatório de vencimentos | ✅ |
| GET | `/api/relatorios/por-setor` | Relatório por setor | ✅ |
| GET | `/api/relatorios/conformidade` | Relatório de conformidade | ✅ |
| GET | `/api/audit-logs` | Logs de auditoria | ✅ Admin |

---

## 🔑 Níveis de Permissão

- **admin**: Acesso total (pode deletar, criar usuários, ver auditoria)
- **tecnico**: Pode criar/editar colaboradores, EPIs, entregas (não pode deletar)
- **leitura**: Apenas visualização

---

## ⚡ Dicas

1. **Use Thunder Client** (extensão VSCode) para testar - é mais fácil que cURL
2. **Salve o token** em uma variável de ambiente no Thunder Client
3. **Verifique o banco** com DB Browser for SQLite para ver os dados salvos
4. **Logs de auditoria** registram todas as ações importantes
