// Controlador de autenticação
class AuthController {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.onAuthStateChange = null;
    }

    // Inicializa o controlador
    initialize() {
        const savedSession = localStorage.getItem('auth_session');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                this.currentUser = session.user;
                this.token = session.token;
                this._notifyStateChange();
            } catch (error) {
                console.error('Erro ao recuperar sessão:', error);
            }
        }
    }

    // Login do usuário
    async login(username, password) {
        try {
            const response = await fetch(`${window.config.API_BASE_URL}/auth/login`, {
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
            this.currentUser = data.user;
            this.token = data.token;

            // Salva a sessão
            localStorage.setItem('auth_session', JSON.stringify({
                user: this.currentUser,
                token: this.token
            }));

            this._notifyStateChange();
            return data;
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
        window.location.href = 'login.html';
    }

    // Verifica se o usuário está autenticado
    isAuthenticated() {
        return !!this.token;
    }

    // Define o callback para mudança de estado
    onAuthChange(callback) {
        this.onAuthStateChange = callback;
    }

    // Notifica mudança de estado
    _notifyStateChange() {
        if (this.onAuthStateChange) {
            this.onAuthStateChange(this.isAuthenticated());
        }
    }
}

// Exporta o controlador
window.AuthController = AuthController;
