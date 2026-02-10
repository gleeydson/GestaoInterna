# 🛡️ Sistema de Controle de EPIs

Sistema completo para gestão de Equipamentos de Proteção Individual (EPIs), com controle de colaboradores, entregas, treinamentos e exames periódicos.

## 📋 Índice

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Instalação](#instalação)
- [Uso](#uso)
- [API REST](#api-rest)
- [Banco de Dados](#banco-de-dados)
- [Contribuindo](#contribuindo)

## ✨ Funcionalidades

### 📊 Dashboard
- Visão geral com estatísticas em tempo real
- Alertas de EPIs próximos do vencimento
- Treinamentos e exames pendentes
- Cards com métricas importantes

### 👥 Gestão de Colaboradores
- Cadastro completo de colaboradores
- Histórico de EPIs entregues
- Controle de treinamentos
- Controle de exames periódicos
- Busca e filtros

### 🎒 Gestão de EPIs
- Cadastro de equipamentos com CA
- Controle de estoque
- Validade dos CAs
- Tipos e categorias
- Alertas de estoque mínimo

### 📦 Registro de Entregas
- Entrega de EPIs aos colaboradores
- Assinatura digital
- Histórico completo
- Controle de validade
- Filtros por período

### 🎓 Treinamentos e Exames
- Controle de treinamentos de segurança
- Periodicidade configurável
- Exames periódicos
- Alertas de vencimento
- Histórico completo

### 📈 Relatórios
- Colaboradores e EPIs
- Vencimentos
- Histórico de entregas
- Análise por setor
- Custos
- Conformidade NR-6

## 🚀 Tecnologias

### Frontend
- **HTML5** - Estrutura
- **CSS3** - Estilização
- **Bootstrap 5.3.2** - Framework CSS
- **Bootstrap Icons** - Ícones
- **JavaScript (Vanilla)** - Lógica do cliente

### Backend
- **Node.js** - Ambiente de execução
- **Express.js** - Framework web
- **SQLite3** - Banco de dados
- **CORS** - Controle de acesso
- **Body-parser** - Parse de requisições

## 📁 Estrutura do Projeto

```
GestaoInterna/
├── index.html                  # Página principal
├── sistema-epi-bootstrap.html  # Arquivo original (backup)
├── README.md                   # Este arquivo
├── assets/
│   ├── css/
│   │   └── style.css          # Estilos customizados
│   ├── js/
│   │   ├── config.js          # Configurações e utilitários
│   │   ├── navigation.js      # Navegação e modais
│   │   ├── dashboard.js       # Dashboard e estatísticas
│   │   ├── colaboradores.js   # Gestão de colaboradores
│   │   ├── epis.js            # Gestão de EPIs
│   │   ├── entregas.js        # Registro de entregas
│   │   ├── treinamentos.js    # Treinamentos e exames
│   │   └── app.js             # Inicialização da aplicação
│   └── img/                   # Imagens (se necessário)
└── backend/
    ├── package.json           # Dependências do Node.js
    ├── server.js              # Servidor Express
    ├── database.js            # Configuração do SQLite
    └── epi_control.db         # Banco de dados (criado automaticamente)
```

## 🔧 Instalação

### Pré-requisitos

- **Node.js** (versão 14 ou superior)
- **npm** (geralmente vem com o Node.js)
- Navegador web moderno

### Passo a Passo

#### 1. Clone o repositório (ou baixe o projeto)
```bash
cd c:\Users\Júpiter\Documents\PROJETOS\GestaoInterna
```

#### 2. Instale as dependências do backend
```bash
cd backend
npm install
```

#### 3. Inicie o servidor backend
```bash
npm start
```

Ou para desenvolvimento com auto-reload:
```bash
npm run dev
```

O servidor estará rodando em: `http://localhost:3000`

#### 4. Abra o frontend
Simplesmente abra o arquivo `index.html` no navegador ou use um servidor local:

```bash
# Com Python
python -m http.server 8000

# Com Node.js (http-server)
npx http-server -p 8000
```

Acesse: `http://localhost:8000`

## 💻 Uso

### Modo Offline (LocalStorage)

Por padrão, o sistema funciona em **modo offline**, salvando os dados no **LocalStorage** do navegador.

```javascript
// Em assets/js/config.js
MODE: 'offline'  // Modo padrão
```

Perfeito para:
- ✅ Testes e desenvolvimento
- ✅ Uso em um único computador
- ✅ Demonstrações

### Modo Online (API + Banco de Dados)

Para usar com banco de dados e múltiplos usuários:

1. **Inicie o backend:**
```bash
cd backend
npm start
```

2. **Ative o modo online no frontend:**
```javascript
// Em assets/js/config.js
MODE: 'online'  // Mude para 'online'
```

3. **Recarregue a página**

Agora os dados serão salvos no banco de dados SQLite!

### Funcionalidades Principais

#### Cadastrar Colaborador
1. Clique em "Dashboard" > "Novo Colaborador"
2. Preencha os dados obrigatórios (*)
3. Opcionalmente, adicione informações de treinamentos e exames
4. Clique em "Salvar Colaborador"

#### Cadastrar EPI
1. Vá em "EPIs" > "Cadastrar EPI"
2. Informe nome, CA, tipo e validade do CA
3. Configure estoque e estoque mínimo
4. Salve o EPI

#### Registrar Entrega
1. Acesse "Entregas" > "Nova Entrega"
2. Selecione o colaborador
3. Selecione o EPI
4. Informe datas e quantidade
5. **Importante:** Marque o checkbox de confirmação
6. Registre a entrega

#### Atualizar Treinamentos/Exames
1. Vá em "Treinamentos/Exames"
2. Escolha a aba desejada
3. Clique em "Atualizar" no colaborador
4. Informe as novas datas
5. Salve

## 🌐 API REST

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### Colaboradores
```
GET    /api/colaboradores        # Listar todos
GET    /api/colaboradores/:id    # Buscar por ID
POST   /api/colaboradores        # Criar novo
PUT    /api/colaboradores/:id    # Atualizar
DELETE /api/colaboradores/:id    # Deletar (soft delete)
```

#### EPIs
```
GET    /api/epis                 # Listar todos
GET    /api/epis/:id             # Buscar por ID
POST   /api/epis                 # Criar novo
PUT    /api/epis/:id             # Atualizar
DELETE /api/epis/:id             # Deletar (soft delete)
```

#### Entregas
```
GET    /api/entregas             # Listar todas
GET    /api/entregas/:id         # Buscar por ID
POST   /api/entregas             # Registrar nova
DELETE /api/entregas/:id         # Deletar
```

#### Dashboard
```
GET    /api/dashboard/stats      # Estatísticas gerais
```

### Exemplo de Requisição

```javascript
// Criar um colaborador
fetch('http://localhost:3000/api/colaboradores', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        id: 'col123',
        nome: 'João Silva',
        cpf: '123.456.789-00',
        funcao: 'Operador',
        setor: 'Operacional',
        dataCadastro: new Date().toISOString()
    })
})
.then(response => response.json())
.then(data => console.log(data));
```

## 🗄️ Banco de Dados

### SQLite

O sistema usa **SQLite** como banco de dados, que é criado automaticamente ao iniciar o servidor.

#### Tabelas

##### colaboradores
- `id` - ID único
- `nome` - Nome completo
- `cpf` - CPF (único)
- `rg` - RG
- `dataNascimento` - Data de nascimento
- `funcao` - Função do colaborador
- `setor` - Setor de trabalho
- `telefone` - Telefone
- `email` - Email
- Campos de treinamento e exame
- `dataCadastro` - Data de cadastro
- `dataAtualizacao` - Última atualização
- `ativo` - Se está ativo (soft delete)

##### epis
- `id` - ID único
- `nome` - Nome do EPI
- `ca` - Certificado de Aprovação
- `tipo` - Tipo do EPI
- `validadeCA` - Validade do CA
- `estoque` - Quantidade em estoque
- `estoqueMinimo` - Estoque mínimo
- `descricao` - Descrição
- `dataCadastro` - Data de cadastro
- `dataAtualizacao` - Última atualização
- `ativo` - Se está ativo

##### entregas
- `id` - ID único
- `colaboradorId` - ID do colaborador (FK)
- `epiId` - ID do EPI (FK)
- Informações da entrega
- `dataCadastro` - Data do registro

##### treinamentos
- `id` - ID único
- `colaboradorId` - ID do colaborador (FK)
- Informações do treinamento
- `dataCadastro` - Data do registro

##### exames
- `id` - ID único
- `colaboradorId` - ID do colaborador (FK)
- Informações do exame
- `dataCadastro` - Data do registro

### Backup e Restauração

#### Exportar Dados (Modo Offline)
```javascript
// No console do navegador
exportarDados();
```

Isso vai baixar um arquivo JSON com todos os dados.

#### Importar Dados (Modo Offline)
```javascript
// No console do navegador
importarDados();
```

Selecione o arquivo JSON de backup.

#### Backup do Banco SQLite
```bash
# Copie o arquivo do banco
cp backend/epi_control.db backend/backup_epi_control_$(date +%Y%m%d).db
```

## 🛠️ Desenvolvimento

### Adicionar Novos Recursos

1. **Frontend:** Edite os arquivos em `assets/js/`
2. **Backend:** Edite `backend/server.js`
3. **Estilos:** Edite `assets/css/style.css`

### Resetar o Sistema (Modo Offline)
```javascript
// No console do navegador
resetarSistema();
```

⚠️ **ATENÇÃO:** Isso apaga todos os dados do LocalStorage!

### Migrar para MySQL/PostgreSQL

Para migrar do SQLite para outro banco:

1. Instale o driver adequado:
```bash
npm install mysql2    # Para MySQL
npm install pg        # Para PostgreSQL
```

2. Atualize `backend/database.js` com as credenciais e queries do novo banco

3. Migre os dados usando ferramentas como:
   - `sqlite3 .dump` para exportar
   - Importar no novo banco

## 📝 Licença

Este projeto é de uso livre para fins educacionais e comerciais.

## 👨‍💻 Autor

Desenvolvido com ❤️ para facilitar a gestão de segurança do trabalho.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## 📞 Suporte

Para dúvidas ou suporte:
- Email: suporte@epicontrol.com
- GitHub Issues: [Abra uma issue](https://github.com/seu-usuario/epi-control/issues)

---

**Desenvolvido com Bootstrap 5 + Node.js + SQLite** 🚀
