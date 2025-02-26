class TrainingController {
    constructor() {
        this.token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJncHRtYWtlciIsImlkIjoiM0Q5NUZDNzM1MkJGNTE3NTE1ODFFNjk0QjVDNkY4MDAiLCJ0ZW5hbnQiOiIzRDk1RkM3MzUyQkY1MTc1MTU4MUU2OTRCNUM2RjgwMCIsInV1aWQiOiJkZGY5NTJiZC00OGRiLTRhYzAtODM4Yy1iZmI3NjM2M2E5NGIifQ.91lFHmSycVZq9AF4JLXo2y3fRws4oDeTya0dd7UbCaE';
        this.agentId = '3DCD4320FB8F10F782669AF8BA766933';
        this.baseUrl = 'https://api.gptmaker.ai/v2';
        this.currentType = 'TEXT';
        this.isSubmitting = false;
        this.currentEditingId = null;
    }

    async initialize() {
        this.setupEventListeners();
        this.renderEmptyState();
        await this.loadTrainings();
    }

    setupEventListeners() {
        const tabs = document.querySelectorAll('.tab-button');
        tabs.forEach(tab => {
            if (!tab.classList.contains('disabled')) {
                tab.addEventListener('click', () => this.switchType(tab.dataset.type));
            }
        });

        const textarea = document.getElementById('trainingPrompt');
        textarea.addEventListener('input', () => this.updateCharCount(textarea));

        const addButton = document.querySelector('.add-training-button');
        addButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.addTraining();
        });

        textarea.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.addTraining();
            }
        });
    }

    updateCharCount(textarea) {
        if (!textarea) return;
        const charCount = textarea.nextElementSibling;
        if (charCount) {
            charCount.textContent = `${textarea.value.length}/1028`;
        }
    }

    async switchType(type) {
        if (!type) return;
        
        const tabs = document.querySelectorAll('.tab-button');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });
        this.currentType = type;
        await this.loadTrainings();
    }

    async loadTrainings() {
        try {
            const response = await fetch(`${this.baseUrl}/agent/${this.agentId}/trainings?type=${this.currentType}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar treinamentos');
            }

            const data = await response.json();
            const trainings = Array.isArray(data) ? data : data.data;

            if (!trainings || trainings.length === 0) {
                this.renderEmptyState();
                return;
            }

            this.renderTrainings(trainings);
        } catch (error) {
            console.error('Erro ao carregar treinamentos:', error);
            this.showError('Erro ao carregar treinamentos');
            this.renderEmptyState();
        }
    }

    async addTraining() {
        if (this.isSubmitting) return;

        const textarea = document.getElementById('trainingPrompt');
        const text = textarea.value.trim();

        if (!text) {
            this.showError('Digite um texto para o treinamento');
            return;
        }

        if (text.length > 1028) {
            this.showError('O texto não pode ter mais de 1028 caracteres');
            return;
        }

        const addButton = document.querySelector('.add-training-button');
        addButton.disabled = true;
        addButton.innerHTML = '<span>Adicionando...</span>';
        this.isSubmitting = true;

        try {
            const response = await fetch(`${this.baseUrl}/agent/${this.agentId}/trainings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: this.currentType,
                    text: text
                })
            });

            if (!response.ok) {
                throw new Error('Erro ao adicionar treinamento');
            }

            textarea.value = '';
            this.updateCharCount(textarea);
            this.showSuccess('Treinamento adicionado com sucesso');
            await this.loadTrainings();
        } catch (error) {
            console.error('Erro ao adicionar treinamento:', error);
            this.showError('Erro ao adicionar treinamento');
        } finally {
            addButton.disabled = false;
            addButton.innerHTML = '<span>Cadastrar</span>';
            this.isSubmitting = false;
        }
    }

    renderEmptyState() {
        const container = document.querySelector('.training-list');
        container.innerHTML = `
            <div class="training-item empty-state">
                <div class="content">
                    <p>Nenhum treinamento encontrado. Adicione seu primeiro treinamento usando o campo acima.</p>
                </div>
            </div>
        `;
    }

    renderTrainings(trainings) {
        const container = document.querySelector('.training-list');
        const items = trainings.map(training => {
            if (!training || !training.text) return '';
            
            return `
                <div class="training-item">
                    <div class="content">
                        <p>${this.escapeHtml(training.text)}</p>
                    </div>
                    <div class="actions">
                        <span class="status">Treinado</span>
                        <button class="edit-button" title="Editar treinamento" onclick="trainingController.openEditModal('${training.id}', '${this.escapeHtml(training.text)}')">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="delete-button" title="Excluir treinamento" onclick="trainingController.deleteTraining('${training.id}')">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </div>
            `;
        }).filter(Boolean);

        container.innerHTML = items.join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async deleteTraining(id) {
        if (!id || !confirm('Tem certeza que deseja excluir este treinamento?')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/training/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao excluir treinamento');
            }

            this.showSuccess('Treinamento excluído com sucesso');
            await this.loadTrainings();
        } catch (error) {
            console.error('Erro ao excluir treinamento:', error);
            this.showError('Erro ao excluir treinamento');
        }
    }

    openEditModal(id, text) {
        const modal = document.getElementById('editModal');
        const textarea = document.getElementById('editTrainingText');
        
        this.currentEditingId = id;
        textarea.value = text;
        this.updateCharCount(textarea);
        
        modal.classList.add('show');
    }

    closeEditModal() {
        const modal = document.getElementById('editModal');
        modal.classList.remove('show');
        this.currentEditingId = null;
    }

    async saveTrainingEdit() {
        if (!this.currentEditingId) return;

        const textarea = document.getElementById('editTrainingText');
        const text = textarea.value.trim();

        if (!text) {
            this.showError('Digite um texto para o treinamento');
            return;
        }

        if (text.length > 1028) {
            this.showError('O texto não pode ter mais de 1028 caracteres');
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/training/${this.currentEditingId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: this.currentType,
                    text: text
                })
            });

            if (!response.ok) {
                throw new Error('Erro ao atualizar treinamento');
            }

            this.showSuccess('Treinamento atualizado com sucesso');
            this.closeEditModal();
            await this.loadTrainings();
        } catch (error) {
            console.error('Erro ao atualizar treinamento:', error);
            this.showError('Erro ao atualizar treinamento');
        }
    }

    showError(message) {
        console.error(message);
        alert(message);
    }

    showSuccess(message) {
        console.log(message);
        alert(message);
    }
}

// Inicializa o controlador quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.trainingController = new TrainingController();
    window.trainingController.initialize();
});
