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
                this._setupAuthRedirects();
            } catch (error) {
                console.error('Erro ao recuperar sessão:', error);
                this.logout();
            }
        }
    }

    // Configura redirecionamentos baseados em autenticação
    _setupAuthRedirects() {
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath === '/' || currentPath === '/login' || currentPath === '/login.html';
        
        console.log('[Auth] Setting up redirects:', {
            path: currentPath,
            isLoginPage,
            isAuthenticated: this.isAuthenticated()
        });

        if (this.isAuthenticated()) {
            if (isLoginPage) {
                console.log('[Auth] Redirecting authenticated user to chat');
                this._redirect('/chat');
            }
        } else {
            if (!isLoginPage) {
                console.log('[Auth] Redirecting unauthenticated user to login');
                this._redirect('/');
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
            this._redirect('/chat');
            return true;
        } catch (error) {
            console.error('Erro no login:', error);
            throw error;
        }
    }

    // Logout do usuário
    logout() {
        console.log('[Auth] Logging out...');
        try {
            this._clearSession();
            console.log('[Auth] Session cleared, redirecting to login');
            this._redirect('/');
        } catch (error) {
            console.error('[Auth] Error during logout:', error);
            // Força o redirecionamento mesmo com erro
            window.location.href = '/';
        }
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
            this.onAuthStateChange(this.isAuthenticated());
        }
    }

    // Redireciona para uma URL
    _redirect(url) {
        window.location.href = url;
    }

    // Limpa a sessão
    _clearSession() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('auth_session');
    }
}

// Exporta o controlador
window.AuthController = AuthController;
