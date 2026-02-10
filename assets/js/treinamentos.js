const TreinamentosExames = {
    async load() {
        await this.loadTreinamentos();
        await this.loadExames();
    },

    async loadTreinamentos() {
        const colaboradores = await DataService.getColaboradores();
        const tbody = document.getElementById('treinamentos-list-tbody');
        if (!tbody) return;
        if (!colaboradores.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5">Nenhum colaborador cadastrado</td></tr>';
            return;
        }

        let emDia = 0; let proximos = 0; let vencidos = 0; let semRegistro = 0;
        tbody.innerHTML = colaboradores.map((col) => {
            const days = Utils.getDaysDifference(col.proximoTreinamento);
            if (days === null) semRegistro += 1;
            else if (days < 0) vencidos += 1;
            else if (days <= 30) proximos += 1;
            else emDia += 1;

            return `
                <tr>
                    <td>${col.nome}</td>
                    <td>${col.funcao}</td>
                    <td><span class="badge bg-primary">${col.cidade || '-'}</span></td>
                    <td>${Utils.formatDate(col.dataUltimoTreinamento)}</td>
                    <td>${Utils.formatDate(col.proximoTreinamento)}</td>
                    <td>${col.periodicidadeTreinamento ? `${col.periodicidadeTreinamento} meses` : '-'}</td>
                    <td>${Utils.getStatusBadge(days)}</td>
                    <td><button class="btn btn-sm btn-gradient-danger" onclick="TreinamentosExames.openModalTreinamento('${col.id}')"><i class="bi bi-pencil"></i> Atualizar</button></td>
                </tr>
            `;
        }).join('');

        document.getElementById('treinamentos-em-dia').textContent = emDia;
        document.getElementById('treinamentos-proximos').textContent = proximos;
        document.getElementById('treinamentos-vencidos').textContent = vencidos;
        document.getElementById('treinamentos-sem-registro').textContent = semRegistro;
    },

    async loadExames() {
        const colaboradores = await DataService.getColaboradores();
        const tbody = document.getElementById('exames-list-tbody');
        if (!tbody) return;
        if (!colaboradores.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5">Nenhum colaborador cadastrado</td></tr>';
            return;
        }

        let emDia = 0; let proximos = 0; let vencidos = 0; let semRegistro = 0;
        tbody.innerHTML = colaboradores.map((col) => {
            const days = Utils.getDaysDifference(col.proximoExame);
            if (days === null) semRegistro += 1;
            else if (days < 0) vencidos += 1;
            else if (days <= 30) proximos += 1;
            else emDia += 1;

            return `
                <tr>
                    <td>${col.nome}</td>
                    <td>${col.funcao}</td>
                    <td><span class="badge bg-primary">${col.cidade || '-'}</span></td>
                    <td>${Utils.formatDate(col.dataUltimoExame)}</td>
                    <td>${Utils.formatDate(col.proximoExame)}</td>
                    <td>${col.periodicidadeExame ? `${col.periodicidadeExame} meses` : '-'}</td>
                    <td>${Utils.getStatusBadge(days)}</td>
                    <td><button class="btn btn-sm btn-gradient-danger" onclick="TreinamentosExames.openModalExame('${col.id}')"><i class="bi bi-pencil"></i> Atualizar</button></td>
                </tr>
            `;
        }).join('');

        document.getElementById('exames-em-dia').textContent = emDia;
        document.getElementById('exames-proximos').textContent = proximos;
        document.getElementById('exames-vencidos').textContent = vencidos;
        document.getElementById('exames-sem-registro').textContent = semRegistro;
    },

    openModalTreinamento(colaboradorId) {
        document.getElementById('treinamentoColaboradorId').value = colaboradorId;
        ModalManager.open('modalTreinamento');
    },

    async saveTreinamento() {
        const form = document.getElementById('formTreinamento');
        if (!form.checkValidity()) return form.reportValidity();

        const formData = new FormData(form);
        const colaboradorId = formData.get('colaboradorId');
        const colaboradores = await DataService.getColaboradores();
        const col = colaboradores.find((c) => c.id === colaboradorId);
        if (!col) return Utils.showNotification('Colaborador não encontrado.');

        col.dataUltimoTreinamento = formData.get('dataTreinamento');
        col.proximoTreinamento = formData.get('proximoTreinamento');
        await DataService.saveColaborador(col);

        await DataService.saveTreinamento({
            id: Utils.generateId(),
            colaboradorId,
            dataTreinamento: formData.get('dataTreinamento'),
            proximoTreinamento: formData.get('proximoTreinamento'),
            observacoes: formData.get('observacoes'),
            periodicidadeTreinamento: col.periodicidadeTreinamento || null,
            dataCadastro: new Date().toISOString()
        });

        form.reset();
        ModalManager.close('modalTreinamento');
        await this.loadTreinamentos();
        await Dashboard.load();
        Utils.showNotification('Treinamento atualizado com sucesso!');
    },

    openModalExame(colaboradorId) {
        document.getElementById('exameColaboradorId').value = colaboradorId;
        ModalManager.open('modalExame');
    },

    async saveExame() {
        const form = document.getElementById('formExame');
        if (!form.checkValidity()) return form.reportValidity();

        const formData = new FormData(form);
        const colaboradorId = formData.get('colaboradorId');
        const colaboradores = await DataService.getColaboradores();
        const col = colaboradores.find((c) => c.id === colaboradorId);
        if (!col) return Utils.showNotification('Colaborador não encontrado.');

        col.dataUltimoExame = formData.get('dataExame');
        col.proximoExame = formData.get('proximoExame');
        await DataService.saveColaborador(col);

        await DataService.saveExame({
            id: Utils.generateId(),
            colaboradorId,
            dataExame: formData.get('dataExame'),
            proximoExame: formData.get('proximoExame'),
            resultado: formData.get('resultado'),
            observacoes: formData.get('observacoes'),
            periodicidadeExame: col.periodicidadeExame || null,
            dataCadastro: new Date().toISOString()
        });

        form.reset();
        ModalManager.close('modalExame');
        await this.loadExames();
        await Dashboard.load();
        Utils.showNotification('Exame atualizado com sucesso!');
    }
};

window.salvarTreinamento = () => TreinamentosExames.saveTreinamento().catch((error) => Utils.showNotification(error.message));
window.salvarExame = () => TreinamentosExames.saveExame().catch((error) => Utils.showNotification(error.message));
