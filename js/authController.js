// Controlador de autenticação
class AuthController {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.onAuthStateChange = null;
        console.log('AuthController initialized');
    }

    // Inicializa o controlador
    initialize() {
        console.log('Initializing auth controller...');
        // Tenta recuperar a sessão salva
        const savedSession = localStorage.getItem('auth_session');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                this.currentUser = session.user;
                this.token = session.token;
                console.log('Session restored successfully', { user: this.currentUser });
                this._notifyStateChange();
            } catch (error) {
                console.error('Erro ao recuperar sessão:', error);
                this.logout();
            }
        } else {
            console.log('No saved session found');
        }
    }

    // Login do usuário
    async login(username, password) {
        console.log('Attempting login...');
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include' // Importante para cookies
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Login failed:', errorData);
                throw new Error(errorData.message || 'Credenciais inválidas');
            }

            const data = await response.json();
            console.log('Login successful', { user: data.user });
            
            // Salva os dados do usuário e token
            this.currentUser = {
                id: data.user.id,
                username: data.user.username,
                role: data.user.role,
                assistantId: data.user.assistantId
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
        console.log('Logging out...');
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('auth_session');
        this._notifyStateChange();
    }

    // Verifica se o usuário está autenticado
    isAuthenticated() {
        const isAuth = !!this.currentUser && !!this.token;
        console.log('Checking authentication:', isAuth);
        return isAuth;
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
            this.onAuthStateChange(this.isAuthenticated());
        }
    }
}

// Exporta o controlador
window.AuthController = AuthController;
