const Dashboard = {
    async load() {
        await this.loadStats();
        await this.loadEPIsVencimento();
        await this.loadTreinamentosPendentes();
        await this.loadExamesPendentes();
    },

    async loadStats() {
        const colaboradores = await DataService.getColaboradores();
        const epis = await DataService.getEPIs();
        const entregas = await DataService.getEntregas();

        document.getElementById('total-colaboradores').textContent = colaboradores.length;
        document.getElementById('total-epis').textContent = epis.length;

        const episVencendo = entregas.filter((e) => {
            const days = Utils.getDaysDifference(e.dataValidade);
            return days !== null && days >= 0 && days <= 30;
        });
        document.getElementById('epis-vencer').textContent = episVencendo.length;

        const hoje = new Date();
        const entregasMes = entregas.filter((e) => {
            const dataEntrega = new Date(`${e.dataEntrega}T00:00:00`);
            return dataEntrega.getMonth() === hoje.getMonth() && dataEntrega.getFullYear() === hoje.getFullYear();
        });
        document.getElementById('entregas-mes').textContent = entregasMes.length;

        const treinamentosPendentes = colaboradores.filter((c) => {
            const days = Utils.getDaysDifference(c.proximoTreinamento);
            return days !== null && days <= 30;
        });
        document.getElementById('treinamentos-vencer').textContent = treinamentosPendentes.length;

        const examesPendentes = colaboradores.filter((c) => {
            const days = Utils.getDaysDifference(c.proximoExame);
            return days !== null && days <= 30;
        });
        document.getElementById('exames-vencer').textContent = examesPendentes.length;
    },

    async loadEPIsVencimento() {
        const entregas = await DataService.getEntregas();
        const tbody = document.getElementById('epis-vencimento-body');
        if (!tbody) return;

        const episVencendo = entregas
            .filter((e) => {
                const days = Utils.getDaysDifference(e.dataValidade);
                return days !== null && days >= 0 && days <= 60;
            })
            .sort((a, b) => new Date(a.dataValidade) - new Date(b.dataValidade));

        if (!episVencendo.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5">Nenhum EPI próximo do vencimento</td></tr>';
            return;
        }

        tbody.innerHTML = episVencendo.map((e) => `
            <tr>
                <td>${e.colaboradorNome}</td>
                <td>${e.epiNome}</td>
                <td>${e.epiCA}</td>
                <td>${Utils.formatDate(e.dataValidade)}</td>
                <td>${Utils.getStatusBadge(Utils.getDaysDifference(e.dataValidade))}</td>
            </tr>
        `).join('');
    },

    async loadTreinamentosPendentes() {
        const colaboradores = await DataService.getColaboradores();
        const tbody = document.getElementById('treinamentos-body');
        if (!tbody) return;

        const pendentes = colaboradores
            .filter((c) => {
                const days = Utils.getDaysDifference(c.proximoTreinamento);
                return days !== null && days <= 30;
            })
            .sort((a, b) => new Date(a.proximoTreinamento) - new Date(b.proximoTreinamento));

        if (!pendentes.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5">Nenhum treinamento pendente</td></tr>';
            return;
        }

        tbody.innerHTML = pendentes.map((c) => `
            <tr>
                <td>${c.nome}</td>
                <td>${c.funcao}</td>
                <td><span class="badge bg-primary">${c.cidade || '-'}</span></td>
                <td>${Utils.formatDate(c.proximoTreinamento)}</td>
                <td>${Utils.getStatusBadge(Utils.getDaysDifference(c.proximoTreinamento))}</td>
            </tr>
        `).join('');
    },

    async loadExamesPendentes() {
        const colaboradores = await DataService.getColaboradores();
        const tbody = document.getElementById('exames-body');
        if (!tbody) return;

        const pendentes = colaboradores
            .filter((c) => {
                const days = Utils.getDaysDifference(c.proximoExame);
                return days !== null && days <= 30;
            })
            .sort((a, b) => new Date(a.proximoExame) - new Date(b.proximoExame));

        if (!pendentes.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5">Nenhum exame pendente</td></tr>';
            return;
        }

        tbody.innerHTML = pendentes.map((c) => `
            <tr>
                <td>${c.nome}</td>
                <td>${c.funcao}</td>
                <td><span class="badge bg-primary">${c.cidade || '-'}</span></td>
                <td>${Utils.formatDate(c.proximoExame)}</td>
                <td>${Utils.getStatusBadge(Utils.getDaysDifference(c.proximoExame))}</td>
            </tr>
        `).join('');
    }
};

window.gerarRelatorio = async (tipo) => {
    try {
        const data = await DataService.getReport(tipo);
        alert(`Relatório ${tipo} gerado com ${Array.isArray(data) ? data.length : 1} registro(s).`);
    } catch (error) {
        Utils.showNotification(error.message);
    }
};
