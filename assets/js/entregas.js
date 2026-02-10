const Entregas = {
    async load() {
        const entregas = await DataService.getEntregas();
        const tbody = document.getElementById('entregas-tbody');
        if (!tbody) return;

        if (!entregas.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5">Nenhuma entrega registrada</td></tr>';
            return;
        }

        entregas.sort((a, b) => new Date(b.dataEntrega) - new Date(a.dataEntrega));
        tbody.innerHTML = entregas.map((ent) => `
            <tr>
                <td>${Utils.formatDate(ent.dataEntrega)}</td>
                <td>${ent.colaboradorNome}</td>
                <td>${ent.epiNome}</td>
                <td>${ent.epiCA}</td>
                <td>${Utils.formatDate(ent.dataValidade)}</td>
                <td>${ent.quantidade}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="Entregas.view('${ent.id}')"><i class="bi bi-eye"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="Entregas.delete('${ent.id}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    async populateSelects() {
        const colaboradores = await DataService.getColaboradores();
        const epis = await DataService.getEPIs();
        const selectCol = document.getElementById('selectColaboradorEntrega');
        const selectEPI = document.getElementById('selectEPIEntrega');

        if (selectCol) {
            selectCol.innerHTML = '<option value="">Selecione o colaborador...</option>' +
                colaboradores.map((col) => `<option value="${col.id}">${col.nome} - ${col.funcao}</option>`).join('');
        }
        if (selectEPI) {
            selectEPI.innerHTML = '<option value="">Selecione o EPI...</option>' +
                epis.map((epi) => `<option value="${epi.id}">${epi.nome} (CA: ${epi.ca}) - Estoque: ${epi.estoque}</option>`).join('');
        }
    },

    async save() {
        const form = document.getElementById('formEntrega');
        if (!form.checkValidity()) return form.reportValidity();

        const formData = new FormData(form);
        if (!formData.get('assinaturaDigital')) {
            return Utils.showNotification('É necessário confirmar o recebimento do EPI.');
        }

        const colaboradorId = formData.get('colaboradorId');
        const epiId = formData.get('epiId');
        const quantidade = Number(formData.get('quantidade'));
        const dataEntrega = formData.get('dataEntrega');
        const dataValidade = formData.get('dataValidade');

        if (dataValidade < dataEntrega) {
            return Utils.showNotification('A validade não pode ser anterior à data de entrega.');
        }

        const [colaborador, epi] = await Promise.all([
            DataService.getColaboradores().then((list) => list.find((c) => c.id === colaboradorId)),
            DataService.getEPIs().then((list) => list.find((e) => e.id === epiId))
        ]);

        if (!colaborador || !epi) return Utils.showNotification('Colaborador ou EPI não encontrado.');
        if (Number(epi.estoque) < quantidade) return Utils.showNotification('Estoque insuficiente para registrar entrega.');

        const entrega = {
            id: Utils.generateId(),
            colaboradorId,
            colaboradorNome: colaborador.nome,
            epiId,
            epiNome: epi.nome,
            epiCA: epi.ca,
            dataEntrega,
            dataValidade,
            quantidade,
            observacoes: formData.get('observacoes'),
            assinaturaDigital: true,
            dataCadastro: new Date().toISOString()
        };

        await DataService.saveEntrega(entrega);

        form.reset();
        ModalManager.close('modalEntrega');
        await this.load();
        await EPIs.load();
        await Dashboard.load();
        Utils.showNotification('Entrega registrada com sucesso!');
    },

    async view(id) {
        const entrega = await DataService.getEntregas().then((list) => list.find((e) => e.id === id));
        if (!entrega) return;

        alert(
            `Colaborador: ${entrega.colaboradorNome}\n` +
            `EPI: ${entrega.epiNome}\n` +
            `CA: ${entrega.epiCA}\n` +
            `Data: ${Utils.formatDate(entrega.dataEntrega)}\n` +
            `Validade: ${Utils.formatDate(entrega.dataValidade)}\n` +
            `Quantidade: ${entrega.quantidade}\n` +
            `Observações: ${entrega.observacoes || 'Nenhuma'}`
        );
    },

    async delete(id) {
        if (!confirm('Deseja realmente excluir esta entrega?')) return;
        await DataService.deleteEntrega(id);
        await this.load();
        await Dashboard.load();
        Utils.showNotification('Entrega excluída com sucesso!');
    },

    search(searchTerm) {
        const search = searchTerm.toLowerCase();
        const rows = document.querySelectorAll('#entregas-tbody tr');
        rows.forEach((row) => {
            row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
        });
    }
};

window.salvarEntrega = () => Entregas.save().catch((error) => Utils.showNotification(error.message));
