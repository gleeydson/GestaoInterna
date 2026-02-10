// Detecta ambiente automaticamente
const isLocalhost = window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1' ||
                    window.location.protocol === 'file:';

const CONFIG = {
    // API_URL muda conforme ambiente
    API_URL: isLocalhost
        ? 'http://localhost:3000/api'  // Desenvolvimento local
        : 'https://seu-backend-producao.com/api',  // Produção (alterar quando fizer deploy)

    STORAGE_KEYS: {
        authToken: 'epi_auth_token',
        authUser: 'epi_auth_user'
    },

    ONLINE_AUTH: {
        username: 'admin',
        password: 'admin123'
    },

    // Helper para debug
    IS_DEVELOPMENT: isLocalhost
};

const Utils = {
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    },
    formatCPF(cpf) {
        cpf = (cpf || '').replace(/\D/g, '');
        if (!cpf) return '';
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    },
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(`${dateString}T00:00:00`);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('pt-BR');
    },
    getDaysDifference(dateString) {
        if (!dateString) return null;
        const date = new Date(`${dateString}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = date - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },
    getStatusBadge(days) {
        if (days === null) return '<span class="badge bg-secondary">Sem Data</span>';
        if (days < 0) return '<span class="badge-danger-gradient">Vencido</span>';
        if (days <= 30) return '<span class="badge-warning-gradient">Próximo</span>';
        return '<span class="badge-success-gradient">Em dia</span>';
    },
    showNotification(message) {
        alert(message);
    }
};

const AuthManager = {
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.authToken);
    },
    getUser() {
        const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.authUser);
        return raw ? JSON.parse(raw) : null;
    },
    saveSession(token, user) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.authToken, token);
        localStorage.setItem(CONFIG.STORAGE_KEYS.authUser, JSON.stringify(user));
    },
    clearSession() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.authToken);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.authUser);
    },
    async ensureOnlineSession() {
        if (this.getToken()) return;
        const response = await ApiManager.post('/auth/login', CONFIG.ONLINE_AUTH, false);
        this.saveSession(response.token, response.user);
    }
};

const ApiManager = {
    async request(endpoint, options = {}, needsAuth = true) {
        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
        if (needsAuth) {
            const token = AuthManager.getToken();
            if (token) headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${CONFIG.API_URL}${endpoint}`, { ...options, headers });
        const payload = await response.json();
        if (!response.ok || payload.error) {
            const message = payload?.error?.message || `Erro HTTP ${response.status}`;
            throw new Error(message);
        }
        return payload.data;
    },
    async get(endpoint, needsAuth = true) {
        return this.request(endpoint, { method: 'GET' }, needsAuth);
    },
    async post(endpoint, data, needsAuth = true) {
        return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) }, needsAuth);
    },
    async put(endpoint, data, needsAuth = true) {
        return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) }, needsAuth);
    },
    async delete(endpoint, needsAuth = true) {
        return this.request(endpoint, { method: 'DELETE' }, needsAuth);
    }
};

const DataService = {
    async getColaboradores(search = '') {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        return ApiManager.get(`/colaboradores${query}`);
    },
    async saveColaborador(colaborador) {
        const exists = await ApiManager.get(`/colaboradores/${colaborador.id}`).then(() => true).catch(() => false);
        return exists ? ApiManager.put(`/colaboradores/${colaborador.id}`, colaborador) : ApiManager.post('/colaboradores', colaborador);
    },
    async deleteColaborador(id) {
        await ApiManager.delete(`/colaboradores/${id}`);
    },
    async getEPIs() {
        return ApiManager.get('/epis');
    },
    async saveEPI(epi) {
        const exists = await ApiManager.get(`/epis/${epi.id}`).then(() => true).catch(() => false);
        return exists ? ApiManager.put(`/epis/${epi.id}`, epi) : ApiManager.post('/epis', epi);
    },
    async deleteEPI(id) {
        await ApiManager.delete(`/epis/${id}`);
    },
    async getEntregas() {
        return ApiManager.get('/entregas');
    },
    async saveEntrega(entrega) {
        return ApiManager.post('/entregas', entrega);
    },
    async deleteEntrega(id) {
        await ApiManager.delete(`/entregas/${id}`);
    },
    async saveTreinamento(payload) {
        return ApiManager.post('/treinamentos', payload);
    },
    async saveExame(payload) {
        return ApiManager.post('/exames', payload);
    },
    async getDashboardStats() {
        return ApiManager.get('/dashboard/stats');
    },
    async getReport(tipo) {
        const map = {
            vencimentos: '/relatorios/vencimentos',
            'por-setor': '/relatorios/por-setor',
            conformidade: '/relatorios/conformidade'
        };
        const endpoint = map[tipo];
        if (!endpoint) throw new Error('Relatório não suportado no backend.');
        return ApiManager.get(endpoint);
    }
};
