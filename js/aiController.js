// Controlador do estado da IA
class AIController {
    constructor(api) {
        this.api = api;
        this.currentChatId = null;
        this.isHumanMode = false;
        this.onStateChange = null;
    }

    // Inicializa o controlador para um chat específico
    initialize(chatId, initialState = false) {
        this.currentChatId = chatId;
        this.isHumanMode = initialState;
        this._notifyStateChange();
    }

    // Registra callback para mudanças de estado
    onAIStateChange(callback) {
        this.onStateChange = callback;
    }

    // Notifica mudanças de estado
    _notifyStateChange() {
        if (this.onStateChange) {
            this.onStateChange({
                isHumanMode: this.isHumanMode,
                chatId: this.currentChatId
            });
        }
    }

    // Toggle do modo IA
    async toggleAIMode() {
        if (!this.currentChatId) {
            throw new Error('Nenhum chat selecionado');
        }

        try {
            if (this.isHumanMode) {
                await this.api.stopHumanTalk(this.currentChatId);
            } else {
                await this.api.startHumanTalk(this.currentChatId);
            }
            
            this.isHumanMode = !this.isHumanMode;
            this._notifyStateChange();
            
            return {
                success: true,
                isHumanMode: this.isHumanMode
            };
        } catch (error) {
            console.error('Erro ao alternar modo IA:', error);
            throw new Error('Falha ao alternar modo IA');
        }
    }

    // Retorna o estado atual
    getState() {
        return {
            isHumanMode: this.isHumanMode,
            chatId: this.currentChatId
        };
    }
}

// Exporta o controlador
window.AIController = AIController;
