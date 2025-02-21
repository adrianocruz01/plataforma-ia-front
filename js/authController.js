// Controlador de autenticação
class AuthController {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.onAuthStateChange = null;
        console.log('[Auth] Controller initialized');
    }

    // Inicializa o controlador
    initialize() {
        console.log('[Auth] Initializing...');
        this._restoreSession();
        this._setupAuthRedirects();
    }

    // Restaura a sessão do localStorage
    _restoreSession() {
        const savedSession = localStorage.getItem('auth_session');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                this.currentUser = session.user;
                this.token = session.token;
                console.log('[Auth] Session restored:', { username: this.currentUser?.username });
                this._notifyStateChange();
            } catch (error) {
                console.error('[Auth] Error restoring session:', error);
                this._clearSession();
            }
        } else {
            console.log('[Auth] No saved session found');
        }
    }

    // Configura redirecionamentos baseados em autenticação
    _setupAuthRedirects() {
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath.endsWith('login.html') || currentPath.endsWith('login');
        
        console.log('[Auth] Setting up redirects:', {
            path: currentPath,
            isLoginPage,
            isAuthenticated: this.isAuthenticated()
        });

        if (this.isAuthenticated()) {
            if (isLoginPage) {
                console.log('[Auth] Redirecting authenticated user to home');
                this._redirect('/');
            }
        } else {
            if (!isLoginPage) {
                console.log('[Auth] Redirecting unauthenticated user to login');
                this._redirect('/login.html');
            }
        }
    }

    // Função segura para redirecionamento
    _redirect(path) {
        try {
            console.log('[Auth] Redirecting to:', path);
            window.location.replace(path);
        } catch (error) {
            console.error('[Auth] Error during redirect:', error);
            window.location.href = path;
        }
    }

    // Limpa a sessão
    _clearSession() {
        console.log('[Auth] Clearing session');
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('auth_session');
        this._notifyStateChange();
    }

    // Login do usuário
    async login(username, password) {
        console.log('[Auth] Attempting login for:', username);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            console.log('[Auth] Login response:', data);

            if (!response.ok) {
                console.error('[Auth] Login failed:', data.message);
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

            console.log('[Auth] Login successful:', { username: this.currentUser.username });
            this._notifyStateChange();
            this._redirect('/');
            return true;
        } catch (error) {
            console.error('[Auth] Login error:', error);
            throw error;
        }
    }

    // Logout do usuário
    logout() {
        console.log('[Auth] Logging out...');
        try {
            this._clearSession();
            console.log('[Auth] Session cleared, redirecting to login');
            this._redirect('/login.html');
        } catch (error) {
            console.error('[Auth] Error during logout:', error);
            // Força o redirecionamento mesmo com erro
            window.location.href = '/login.html';
        }
    }

    // Verifica se o usuário está autenticado
    isAuthenticated() {
        const isAuth = !!this.currentUser && !!this.token;
        console.log('[Auth] Authentication check:', { 
            isAuthenticated: isAuth,
            hasUser: !!this.currentUser,
            hasToken: !!this.token 
        });
        return isAuth;
    }

    // Verifica se o usuário é admin
    isAdmin() {
        return this.currentUser?.role === 'admin';
    }

    // Obtém o assistantId do usuário
    getAssistantId() {
        return this.currentUser?.assistantId;
    }

    // Registra callback para mudanças de estado
    onStateChange(callback) {
        this.onAuthStateChange = callback;
        console.log('[Auth] State change callback registered');
    }

    // Notifica mudanças de estado
    _notifyStateChange() {
        if (this.onAuthStateChange) {
            const isAuth = this.isAuthenticated();
            console.log('[Auth] Notifying state change:', { isAuthenticated: isAuth });
            this.onAuthStateChange(isAuth);
        }
    }
}

// Exporta o controlador
window.AuthController = AuthController;
