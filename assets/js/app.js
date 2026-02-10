document.addEventListener('DOMContentLoaded', async () => {
    try {
        await AuthManager.ensureOnlineSession();
        await Dashboard.load();
        setDefaultDates();
        setupSearchListeners();
        await checkAlerts();
    } catch (error) {
        console.error(error);
        Utils.showNotification(`Falha ao iniciar: ${error.message}`);
    }
});

function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"][name="dataEntrega"]').forEach((input) => {
        input.value = today;
    });
}

function setupSearchListeners() {
    const searchColaborador = document.getElementById('searchColaborador');
    if (searchColaborador) searchColaborador.addEventListener('input', (e) => Colaboradores.search(e.target.value));

    const searchEPI = document.getElementById('searchEPI');
    if (searchEPI) searchEPI.addEventListener('input', (e) => EPIs.search(e.target.value));

    const searchEntrega = document.getElementById('searchEntrega');
    if (searchEntrega) searchEntrega.addEventListener('input', (e) => Entregas.search(e.target.value));

    const searchTreinamento = document.getElementById('searchTreinamento');
    if (searchTreinamento) {
        searchTreinamento.addEventListener('input', (e) => {
            const search = e.target.value.toLowerCase();
            document.querySelectorAll('#treinamentos-list-tbody tr').forEach((row) => {
                row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
            });
        });
    }

    const searchExame = document.getElementById('searchExame');
    if (searchExame) {
        searchExame.addEventListener('input', (e) => {
            const search = e.target.value.toLowerCase();
            document.querySelectorAll('#exames-list-tbody tr').forEach((row) => {
                row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
            });
        });
    }
}

async function checkAlerts() {
    const entregas = await DataService.getEntregas();
    const colaboradores = await DataService.getColaboradores();

    const episVencidos = entregas.filter((e) => {
        const days = Utils.getDaysDifference(e.dataValidade);
        return days !== null && days < 0;
    });
    const treinamentosVencidos = colaboradores.filter((c) => {
        const days = Utils.getDaysDifference(c.proximoTreinamento);
        return days !== null && days < 0;
    });
    const examesVencidos = colaboradores.filter((c) => {
        const days = Utils.getDaysDifference(c.proximoExame);
        return days !== null && days < 0;
    });

    if (episVencidos.length) console.warn(`${episVencidos.length} EPI(s) vencido(s).`);
    if (treinamentosVencidos.length) console.warn(`${treinamentosVencidos.length} treinamento(s) vencido(s).`);
    if (examesVencidos.length) console.warn(`${examesVencidos.length} exame(s) vencido(s).`);
}

window.exportarDados = async function() {
    const data = {
        colaboradores: await DataService.getColaboradores(),
        epis: await DataService.getEPIs(),
        entregas: await DataService.getEntregas(),
        dataExportacao: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup-epi-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
};

