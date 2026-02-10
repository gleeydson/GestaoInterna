const EPIs = {
    editingId: null,

    async load() {
        const epis = await DataService.getEPIs();
        const tbody = document.getElementById('epis-tbody');
        if (!tbody) return;

        if (!epis.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5">Nenhum EPI cadastrado</td></tr>';
            return;
        }

        tbody.innerHTML = epis.map((epi) => {
            const estoqueClass = Number(epi.estoque) <= Number(epi.estoqueMinimo) ? 'text-danger fw-bold' : '';
            return `
                <tr>
                    <td>${epi.nome}</td>
                    <td>${epi.ca}</td>
                    <td><span class="badge bg-info">${epi.tipo}</span></td>
                    <td>${Utils.formatDate(epi.validadeCA)}</td>
                    <td class="${estoqueClass}">${epi.estoque}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="EPIs.edit('${epi.id}')"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="EPIs.delete('${epi.id}')"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async save() {
        const form = document.getElementById('formEPI');
        if (!form.checkValidity()) return form.reportValidity();

        const formData = new FormData(form);
        const estoque = Number(formData.get('estoque') || 0);
        const estoqueMinimo = Number(formData.get('estoqueMinimo') || 0);
        if (estoque < 0 || estoqueMinimo < 0) return Utils.showNotification('Estoque inválido.');

        const epi = {
            id: this.editingId || Utils.generateId(),
            nome: formData.get('nome'),
            ca: formData.get('ca'),
            tipo: formData.get('tipo'),
            validadeCA: formData.get('validadeCA'),
            estoque,
            estoqueMinimo,
            descricao: formData.get('descricao'),
            dataCadastro: new Date().toISOString()
        };

        await DataService.saveEPI(epi);
        this.editingId = null;
        form.reset();
        document.querySelector('#modalEPI .modal-title').textContent = 'Cadastrar EPI';
        ModalManager.close('modalEPI');
        await this.load();
        await Dashboard.load();
        Utils.showNotification('EPI salvo com sucesso!');
    },

    async edit(id) {
        const epi = await DataService.getEPIs().then((items) => items.find((e) => e.id === id));
        if (!epi) return Utils.showNotification('EPI não encontrado!');

        this.editingId = id;
        const form = document.getElementById('formEPI');
        form.nome.value = epi.nome || '';
        form.ca.value = epi.ca || '';
        form.tipo.value = epi.tipo || '';
        form.validadeCA.value = epi.validadeCA || '';
        form.estoque.value = epi.estoque ?? 0;
        form.estoqueMinimo.value = epi.estoqueMinimo ?? 0;
        form.descricao.value = epi.descricao || '';

        document.querySelector('#modalEPI .modal-title').textContent = 'Editar EPI';
        ModalManager.open('modalEPI');
    },

    async delete(id) {
        if (!confirm('Deseja realmente excluir este EPI?')) return;
        await DataService.deleteEPI(id);
        await this.load();
        await Dashboard.load();
        Utils.showNotification('EPI excluído com sucesso!');
    },

    search(searchTerm) {
        const search = searchTerm.toLowerCase();
        const rows = document.querySelectorAll('#epis-tbody tr');
        rows.forEach((row) => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(search) ? '' : 'none';
        });
    }
};

window.salvarEPI = () => EPIs.save().catch((error) => Utils.showNotification(error.message));
