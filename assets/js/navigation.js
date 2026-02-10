const Navigation = {
    async showSection(sectionName) {
        document.querySelectorAll('.section').forEach((section) => section.classList.add('d-none'));
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) targetSection.classList.remove('d-none');
        this.updateActiveNav(sectionName);
        await this.loadSectionData(sectionName);
    },

    updateActiveNav(sectionName) {
        document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
        const activeNav = document.getElementById(`nav-${sectionName}`);
        if (activeNav) activeNav.classList.add('active');
    },

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                await Dashboard.load();
                break;
            case 'colaboradores':
                await Colaboradores.load();
                break;
            case 'epis':
                await EPIs.load();
                break;
            case 'entregas':
                await Entregas.load();
                break;
            case 'treinamentos-exames':
                await TreinamentosExames.load();
                break;
            default:
                break;
        }
    }
};

const ModalManager = {
    async open(modalId) {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) return;

        const modal = new bootstrap.Modal(modalElement);
        modal.show();

        if (modalId === 'modalEntrega') {
            await Entregas.populateSelects();
        }
    },

    close(modalId) {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) return;
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
    },

    resetForm(formId) {
        const form = document.getElementById(formId);
        if (form) form.reset();
    }
};

window.showSection = (section) => Navigation.showSection(section).catch((error) => Utils.showNotification(error.message));
window.openModal = (modalId) => ModalManager.open(modalId).catch((error) => Utils.showNotification(error.message));
window.closeModal = (modalId) => ModalManager.close(modalId);
