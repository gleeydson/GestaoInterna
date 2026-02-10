const Colaboradores = {
    editingId: null,

    async load() {
        const colaboradores = await DataService.getColaboradores();
        const tbody = document.getElementById('colaboradores-tbody');
        if (!tbody) return;

        if (!colaboradores.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5">Nenhum colaborador cadastrado</td></tr>';
            return;
        }

        const entregas = await DataService.getEntregas();

        tbody.innerHTML = colaboradores.map((col) => {
            const episAtivos = entregas.filter((e) => e.colaboradorId === col.id && Utils.getDaysDifference(e.dataValidade) >= 0).length;
            return `
                <tr>
                    <td>${col.nome}</td>
                    <td>${col.funcao}</td>
                    <td><span class="badge bg-primary">${col.cidade || '-'}</span></td>
                    <td><span class="badge bg-success">${episAtivos}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="Colaboradores.view('${col.id}')"><i class="bi bi-eye"></i></button>
                        <button class="btn btn-sm btn-outline-warning me-1" onclick="Colaboradores.edit('${col.id}')"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="Colaboradores.delete('${col.id}')"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async save() {
        const form = document.getElementById('formColaborador');
        if (!form.checkValidity()) return form.reportValidity();

        const formData = new FormData(form);
        const id = this.editingId || Utils.generateId();
        const colaborador = {
            id,
            nome: formData.get('nome'),
            funcao: formData.get('funcao'),
            cidade: formData.get('cidade'),
            setor: formData.get('cidade'),
            cpf: formData.get('cpf') || null,
            dataUltimoTreinamento: formData.get('dataUltimoTreinamento') || null,
            proximoTreinamento: formData.get('proximoTreinamento') || null,
            periodicidadeTreinamento: formData.get('periodicidadeTreinamento') || null,
            dataUltimoExame: formData.get('dataUltimoExame') || null,
            proximoExame: formData.get('proximoExame') || null,
            periodicidadeExame: formData.get('periodicidadeExame') || null,
            dataCadastro: new Date().toISOString()
        };

        await DataService.saveColaborador(colaborador);
        this.editingId = null;
        form.reset();
        document.querySelector('#modalColaborador .modal-title').textContent = 'Novo Colaborador';
        ModalManager.close('modalColaborador');
        await this.load();
        await Dashboard.load();
        Utils.showNotification('Colaborador salvo com sucesso!');
    },

    async view(id) {
        const col = await DataService.getColaboradores().then((items) => items.find((c) => c.id === id));
        if (!col) return Utils.showNotification('Colaborador não encontrado!');
        const info = [
            `Nome: ${col.nome}`,
            `Função: ${col.funcao}`,
            `Cidade: ${col.cidade || '-'}`,
            `Últ. Treinamento: ${Utils.formatDate(col.dataUltimoTreinamento)}`,
            `Próx. Treinamento: ${Utils.formatDate(col.proximoTreinamento)}`,
            `Últ. Exame: ${Utils.formatDate(col.dataUltimoExame)}`,
            `Próx. Exame: ${Utils.formatDate(col.proximoExame)}`
        ].join('\n');
        alert(info);
    },

    async edit(id) {
        const col = await DataService.getColaboradores().then((items) => items.find((c) => c.id === id));
        if (!col) return Utils.showNotification('Colaborador não encontrado!');

        this.editingId = id;
        const form = document.getElementById('formColaborador');
        form.nome.value = col.nome || '';
        form.funcao.value = col.funcao || '';
        form.cidade.value = col.cidade || '';
        form.dataUltimoTreinamento.value = col.dataUltimoTreinamento || '';
        form.proximoTreinamento.value = col.proximoTreinamento || '';
        form.periodicidadeTreinamento.value = col.periodicidadeTreinamento || '';
        form.dataUltimoExame.value = col.dataUltimoExame || '';
        form.proximoExame.value = col.proximoExame || '';
        form.periodicidadeExame.value = col.periodicidadeExame || '';

        document.querySelector('#modalColaborador .modal-title').textContent = 'Editar Colaborador';
        ModalManager.open('modalColaborador');
    },

    async delete(id) {
        if (!confirm('Deseja realmente excluir este colaborador?')) return;
        await DataService.deleteColaborador(id);
        await this.load();
        await Dashboard.load();
        Utils.showNotification('Colaborador excluído com sucesso!');
    },

    search(searchTerm) {
        const search = searchTerm.toLowerCase();
        const rows = document.querySelectorAll('#colaboradores-tbody tr');
        rows.forEach((row) => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(search) ? '' : 'none';
        });
    }
};

window.salvarColaborador = () => Colaboradores.save().catch((error) => Utils.showNotification(error.message));
