// Controlador de autenticação
class AuthController {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.onAuthStateChange = null;
        console.log('[Auth] Controller initialized');
        this.initialize();
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
        const isLoginPage = currentPath === '/' || 
                          currentPath === '/login' || 
                          currentPath === '/login.html';
        
        console.log('[Auth] Setting up redirects:', {
            path: currentPath,
            isLoginPage,
            isAuthenticated: this.isAuthenticated()
        });

        if (this.isAuthenticated()) {
            if (isLoginPage) {
                console.log('[Auth] Redirecting authenticated user to chat');
                window.location.replace('/chat');
            }
        } else {
            if (!isLoginPage) {
                console.log('[Auth] Redirecting unauthenticated user to login');
                window.location.replace('/');
            }
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
            window.location.replace('/chat');
            return true;
        } catch (error) {
            console.error('[Auth] Login error:', error);
            throw error;
        }
    }

    // Logout do usuário
    logout() {
        console.log('[Auth] Logging out...');
        this._clearSession();
        window.location.replace('/');
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
        console.log('[Auth] State change callback registered');
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
