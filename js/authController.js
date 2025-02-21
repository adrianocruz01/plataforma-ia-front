// Controlador de autenticação
class AuthController {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.onAuthStateChange = null;
    }

    // Inicializa o controlador
    initialize() {
        // Tenta recuperar a sessão salva
        const savedSession = localStorage.getItem('auth_session');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                this.currentUser = session.user;
                this.token = session.token;
                this._notifyStateChange();
            } catch (error) {
                console.error('Erro ao recuperar sessão:', error);
                this.logout();
            }
        }
    }

    // Login do usuário
    async login(username, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                throw new Error('Credenciais inválidas');
            }

            const data = await response.json();
            
            // Salva os dados do usuário e token
            this.currentUser = {
                id: data.user.id,
                username: data.user.username,
                role: data.user.role, // 'admin' ou 'attendant'
                assistantId: data.user.assistantId // ID do assistente associado (para atendentes)
            };
            this.token = data.token;

            // Salva a sessão localmente
            localStorage.setItem('auth_session', JSON.stringify({
                user: this.currentUser,
                token: this.token
            }));

            this._notifyStateChange();
            return true;
        } catch (error) {
            console.error('Erro no login:', error);
            throw error;
        }
    }

    // Logout do usuário
    logout() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('auth_session');
        this._notifyStateChange();
    }

    // Verifica se o usuário está autenticado
    isAuthenticated() {
        return !!this.currentUser && !!this.token;
    }

    // Verifica se o usuário é admin
    isAdmin() {
        return this.currentUser?.role === 'admin';
    }

    // Verifica se o usuário é atendente
    isAttendant() {
        return this.currentUser?.role === 'attendant';
    }

    // Retorna o ID do assistente associado ao atendente
    getAssistantId() {
        return this.currentUser?.assistantId;
    }

    // Registra callback para mudanças de estado
    onStateChange(callback) {
        this.onAuthStateChange = callback;
    }

    // Notifica mudanças de estado
    _notifyStateChange() {
        if (this.onAuthStateChange) {
            this.onAuthStateChange({
                isAuthenticated: this.isAuthenticated(),
                user: this.currentUser
            });
        }
    }
}

// Exporta o controlador
window.AuthController = AuthController;
