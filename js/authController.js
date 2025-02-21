// Controlador de autenticação
class AuthController {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.onAuthStateChange = null;
    }

    // Inicializa o controlador
    initialize() {
        const session = localStorage.getItem('auth_session');
        if (session) {
            try {
                const { user, token } = JSON.parse(session);
                this.currentUser = user;
                this.token = token;
                this._notifyStateChange();
            } catch (error) {
                console.error('Erro ao restaurar sessão:', error);
                this.logout();
            }
        }
        
        // Verifica se precisa redirecionar
        this._handleAuthRedirect();
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

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Credenciais inválidas');
            }
            
            this.currentUser = {
                id: data.user.id,
                username: data.user.username,
                role: data.user.role,
                assistantId: data.user.assistantId
            };
            this.token = data.token;

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
        window.location.href = '/login.html';
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

    // Obtém o token atual
    getToken() {
        return this.token;
    }

    // Obtém o usuário atual
    getCurrentUser() {
        return this.currentUser;
    }

    // Registra callback para mudança de estado
    onAuthStateChanged(callback) {
        this.onAuthStateChange = callback;
    }

    // Notifica mudança de estado
    _notifyStateChange() {
        if (this.onAuthStateChange) {
            this.onAuthStateChange(this.isAuthenticated());
        }
    }

    // Lida com redirecionamentos de autenticação
    _handleAuthRedirect() {
        const isLoginPage = window.location.pathname.includes('login.html');
        
        if (this.isAuthenticated()) {
            if (isLoginPage) {
                window.location.href = '/';
            }
        } else {
            if (!isLoginPage) {
                window.location.href = '/login.html';
            }
        }
    }
}

// Exporta o controlador
window.AuthController = AuthController;
