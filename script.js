// Configuração do ambiente
const API_CONFIG = {
    // Em desenvolvimento
    development: {
        BASE_URL: 'http://localhost:3000/api',
        GPT_MAKER_URL: 'http://localhost:3000/api'
    },
    // Em produção
    production: {
        BASE_URL: 'api.trendgpt.com.br/api', // Você ajustará isso
        GPT_MAKER_URL: 'api.trendgpt.com.br/api'
    }
};

// Define o ambiente atual
const ENV = window.location.hostname === 'localhost' ? 'development' : 'production';
const API_BASE_URL = API_CONFIG[ENV].BASE_URL;
const GPT_MAKER_BASE_URL = API_CONFIG[ENV].GPT_MAKER_URL;

document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM
    const chatList = document.querySelector('.chat-list');
    const messageArea = document.querySelector('.chat-messages');
    const messageInput = document.querySelector('.message-input');
    const inputArea = document.querySelector('.input-area');
    const currentChatName = document.querySelector('.chat-name');
    const recordButton = document.querySelector('.record-button');
    const attachButton = document.querySelector('.attach-button');
    const imageInput = document.querySelector('#imageInput');

    // Classe para gerenciar o estado da aplicação
    class ChatState {
        constructor() {
            this.currentChatId = null;
            this.lastMessageTimestamp = null;
            this.pollingInterval = null;
            this.chatPollingInterval = null;
            this.allChats = [];
            this.currentSearchQuery = '';
        }
    }

    // Classe para gerenciar a API do GPT Maker
    class GPTMakerAPI {
        constructor() {
            this.token = this.getToken();
        }

        getToken() {
            return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJncHRtYWtlciIsImlkIjoiM0Q5NUZDNzM1MkJGNTE3NTE1ODFFNjk0QjVDNkY4MDAiLCJ0ZW5hbnQiOiIzRDk1RkM3MzUyQkY1MTc1MTU4MUU2OTRCNUM2RjgwMCIsInV1aWQiOiJkZGY5NTJiZC00OGRiLTRhYzAtODM4Yy1iZmI3NjM2M2E5NGIifQ.91lFHmSycVZq9AF4JLXo2y3fRws4oDeTya0dd7UbCaE';
        }

        async request(endpoint, options = {}) {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro na requisição');
            }

            return response.json();
        }

        async uploadAudio(audioBlob) {
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.wav');
            
            const response = await fetch(`${API_BASE_URL}/upload-audio`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao fazer upload do áudio');
            }

            const data = await response.json();
            return data.url;
        }

        async uploadImage(imageFile) {
            // console.log('Arquivo a ser enviado:', imageFile);
            
            const formData = new FormData();
            formData.append('file', imageFile, imageFile.name);
            
            // console.log('FormData criado:', formData);
            
            const response = await fetch(`${API_BASE_URL}/upload-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                console.error('Erro detalhado:', error);
                throw new Error(error.error || 'Erro ao fazer upload da imagem');
            }
            
            const data = await response.json();
            return data.url;
        }

        async getChats() {
            return this.request('/chats');
        }

        async getChatMessages(chatId) {
            return this.request(`/chats/${chatId}/messages?pageSize=2000`);
        }

        async sendMessage(chatId, message) {
            // console.log('Enviando mensagem para chat:', chatId);
            // console.log('Conteúdo da mensagem:', message);
            
            // Se for string (texto), envia como { message }
            // Se for objeto (áudio/imagem), envia direto
            const body = typeof message === 'string' 
                ? { message } 
                : message;

            const response = await this.request(`/chats/${chatId}/send-message`, {
                method: 'POST',
                body: JSON.stringify(body)
            });

            return response;
        }

        async startHumanTalk(chatId) {
            return this.request(`/chat/${chatId}/start-human-talk`, {
                method: 'PUT'
            });
        }

        async stopHumanTalk(chatId) {
            return this.request(`/chat/${chatId}/stop-human-talk`, {
                method: 'PUT'
            });
        }
    }

    // Classe para gerenciar notificações
    class NotificationManager {
        constructor() {
            this.container = this.createContainer();
        }

        createContainer() {
            const container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
            return container;
        }

        show(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;

            this.container.appendChild(notification);

            // Remove após 5 segundos
            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    this.container.removeChild(notification);
                }, 300);
            }, 5000);
        }

        error(message) {
            this.show(message, 'error');
        }

        success(message) {
            this.show(message, 'success');
        }

        info(message) {
            this.show(message, 'info');
        }
    }

    class AudioRecorder {
        constructor() {
            this.mediaRecorder = null;
            this.audioChunks = [];
            this.isRecording = false;
            this.stream = null;
        }

        async startRecording() {
            try {
                this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.mediaRecorder = new MediaRecorder(this.stream);
                this.audioChunks = [];

                this.mediaRecorder.ondataavailable = (event) => {
                    this.audioChunks.push(event.data);
                };

                this.mediaRecorder.start();
                this.isRecording = true;
                return true;
            } catch (error) {
                console.error('Erro ao iniciar gravação:', error);
                notifications.error('Erro ao iniciar gravação. Verifique as permissões do microfone.');
                return false;
            }
        }

        stopRecording() {
            return new Promise((resolve) => {
                this.mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                    resolve(audioBlob);
                };

                this.mediaRecorder.stop();
                this.stream.getTracks().forEach(track => track.stop());
                this.isRecording = false;
            });
        }
    }

    class AIController {
        constructor(api) {
            this.api = api;
            this.chatId = null;
            this.isHumanMode = false;
            this.onAIStateChangeCallbacks = [];
        }

        initialize(chatId, humanTalk) {
            this.chatId = chatId;
            this.isHumanMode = humanTalk;
            this.notifyAIStateChange();
        }

        async toggleAIMode() {
            try {
                if (this.isHumanMode) {
                    await this.api.stopHumanTalk(this.chatId);
                } else {
                    await this.api.startHumanTalk(this.chatId);
                }
                this.isHumanMode = !this.isHumanMode;
                this.notifyAIStateChange();
            } catch (error) {
                console.error('Erro ao alternar modo IA:', error);
                throw error;
            }
        }

        onAIStateChange(callback) {
            this.onAIStateChangeCallbacks.push(callback);
        }

        notifyAIStateChange() {
            this.onAIStateChangeCallbacks.forEach(callback => callback({ isHumanMode: this.isHumanMode }));
        }
    }

    const state = {
        currentChatId: null,
        chatPollingInterval: null,
        isPolling: false,
        recording: false,
        mediaRecorder: null,
        audioChunks: [],
        aiController: null,
        theme: localStorage.getItem('theme') || 'dark'
    };

    const api = new GPTMakerAPI();
    const notifications = new NotificationManager();
    const audioRecorder = new AudioRecorder();

    // Inicializa o controlador da IA
    state.aiController = new AIController(api);

    // Registra callback para mudanças de estado da IA
    state.aiController.onAIStateChange(({ isHumanMode }) => {
        const toggleButton = document.querySelector('.toggle-ai-button');
        if (toggleButton) {
            toggleButton.className = `toggle-ai-button ${isHumanMode ? 'paused' : ''}`;
            toggleButton.querySelector('.button-text').textContent = 
                isHumanMode ? 'Ativar IA' : 'Pausar IA';
        }
    });

    // Event listener para o botão de anexar
    attachButton.addEventListener('click', () => {
        imageInput.click();
    });

    // Event listener para quando uma imagem é selecionada
    imageInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            notifications.info('Enviando imagem...');
            
            // Upload da imagem para o Cloudinary
            const imageUrl = await api.uploadImage(file);
            // console.log('URL da imagem após upload:', imageUrl);
            
            // Envia a URL da imagem
            const messageData = {
                image: imageUrl
            };
            
            await api.sendMessage(state.currentChatId, messageData);
            notifications.success('Imagem enviada com sucesso!');
            
            // Limpa o input
            imageInput.value = '';
        } catch (error) {
            console.error('Erro ao enviar imagem:', error);
            notifications.error('Erro ao enviar imagem');
        }
    });

    // Funções de UI
    function createMessageElement(message) {
        const messageDiv = document.createElement('div');
        
        // Uma mensagem é do usuário se NÃO tiver agentId e NÃO for do assistente
        const isUser = !message.agentId && message.role !== 'assistant';
        messageDiv.className = `message ${isUser ? 'received' : 'sent'}`;
        
        let content = '';
        if (message.type === 'AUDIO' && message.audioUrl) {
            content = `
                <div class="audio-message">
                    <audio controls>
                        <source src="${message.audioUrl}" type="audio/mpeg">
                        Seu navegador não suporta o elemento de áudio.
                    </audio>
                    ${message.midiaContent ? `<div class="audio-transcription">${message.midiaContent}</div>` : ''}
                </div>
            `;
        } else if (message.imageUrl) {
            content = `<img src="${message.imageUrl}" alt="Imagem" class="message-image">`;
        } else if (message.documentUrl) {
            content = `📎 <a href="${message.documentUrl}" target="_blank">${message.fileName || 'Documento'}</a>`;
        } else {
            content = message.text;
        }
        
        const time = message.time ? new Date(message.time).toLocaleTimeString() : new Date().toLocaleTimeString();
        const avatar = isUser ? message.agentAvatar : null;

        messageDiv.innerHTML = `
            ${avatar ? `<img src="${avatar}" alt="Avatar" class="message-avatar">` : ''}
            <div class="message-content">
                <div class="message-text">${content}</div>
                <div class="message-time">${time}</div>
            </div>
        `;

        return messageDiv;
    }

    function displayMessages(messages) {
        messageArea.innerHTML = ''; // Limpa as mensagens existentes
        
        // Ordena as mensagens por data (mais antigas primeiro)
        const sortedMessages = messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        sortedMessages.forEach(message => {
            const messageElement = createMessageElement(message);
            messageArea.appendChild(messageElement);
        });
        
        // Rola para a última mensagem após um pequeno delay para garantir que todas foram carregadas
        setTimeout(() => {
            messageArea.scrollTop = messageArea.scrollHeight;
        }, 100);
    }

    // Função para iniciar o polling de mensagens
    function startMessagePolling() {
        // Limpa qualquer polling anterior
        if (state.messagePollingInterval) {
            clearInterval(state.messagePollingInterval);
        }

        // Inicia novo polling apenas se houver um chat selecionado
        if (state.currentChatId) {
            state.messagePollingInterval = setInterval(async () => {
                try {
                    const messages = await api.getChatMessages(state.currentChatId);
                    
                    // Verifica se há mensagens novas
                    const latestMessage = messages[messages.length - 1];
                    if (latestMessage && (!state.lastMessageTimestamp || latestMessage.time > state.lastMessageTimestamp)) {
                        displayMessages(messages);
                        state.lastMessageTimestamp = latestMessage.time;

                        // Atualiza a prévia no chat
                        const chat = state.allChats.find(c => c.id === state.currentChatId);
                        if (chat) {
                            chat.conversation = latestMessage.text;
                            chat.time = latestMessage.time;
                            chat.conversationType = latestMessage.type || 'TEXT';
                            state.allChats = sortChatsByLastMessage(state.allChats);
                            renderChatList(state.allChats);
                        }
                    }
                } catch (error) {
                    console.error('Erro ao atualizar mensagens:', error);
                }
            }, 1000);
        }
    }

    // Função para parar o polling
    function stopMessagePolling() {
        if (state.messagePollingInterval) {
            clearInterval(state.messagePollingInterval);
            state.messagePollingInterval = null;
        }
    }

    async function selectChat(chat) {
        // Remove a classe active de todos os chats
        document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
        
        // Adiciona a classe active ao chat selecionado
        const selectedChat = document.querySelector(`.chat-item[data-id="${chat.id}"]`);
        if (selectedChat) {
            selectedChat.classList.add('active');
        }

        // Atualiza o cabeçalho do chat com o avatar
        const avatarUrl = chat.picture || chat.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random`;
        document.querySelector('.chat-header .chat-avatar img').src = avatarUrl;
        document.querySelector('.chat-header .chat-header-name').textContent = chat.name;

        // Configura o botão de toggle da IA
        const toggleButton = document.querySelector('.toggle-ai-button');
        toggleButton.style.display = 'flex';
        
        // Inicializa o controlador da IA com o estado atual do chat
        state.aiController.initialize(chat.id, chat.humanTalk);
        
        // Adiciona o event listener para o botão
        toggleButton.onclick = async () => {
            try {
                await state.aiController.toggleAIMode();
            } catch (error) {
                console.error('Erro ao alternar modo IA:', error);
                notifications.error('Erro ao alternar modo IA. Tente novamente.');
            }
        };

        // Atualiza o ID do chat atual
        state.currentChatId = chat.id;
        
        // Carrega as mensagens do chat
        await loadMessages(chat.id);
        
        // Remove o badge de não lido
        const unreadBadge = selectedChat.querySelector('.unread-badge');
        if (unreadBadge) {
            unreadBadge.style.display = 'none';
        }
    }

    // Função para ordenar chats por última mensagem
    function sortChatsByLastMessage(chats) {
        if (!Array.isArray(chats)) {
            console.error('Chats não é um array:', chats);
            return [];
        }

        return chats.sort((a, b) => {
            const timeA = a.time || 0;
            const timeB = b.time || 0;
            return timeB - timeA;
        });
    }

    // Função para iniciar polling dos chats
    function startChatPolling() {
        // Limpa polling anterior se existir
        if (state.chatPollingInterval) {
            clearInterval(state.chatPollingInterval);
        }

        state.chatPollingInterval = setInterval(async () => {
            try {
                const response = await api.getChats();
                // console.log('Resposta dos chats:', response);
                
                // Se a resposta tem a propriedade 'chats', usa ela
                const chats = response.chats || response;
                
                if (!Array.isArray(chats)) {
                    console.error('Resposta não é um array:', chats);
                    return;
                }

                const updatedChats = await Promise.all(chats.map(async (newChat) => {
                    try {
                        // Busca as últimas mensagens de cada chat
                        const messages = await api.getChatMessages(newChat.id);
                        if (messages && messages.length > 0) {
                            const lastMessage = messages[messages.length - 1];
                            newChat.conversation = lastMessage.text;
                            newChat.time = lastMessage.time;
                            newChat.conversationType = lastMessage.type || 'TEXT';
                        }
                        return newChat;
                    } catch (error) {
                        console.error(`Erro ao buscar mensagens do chat ${newChat.id}:`, error);
                        return newChat;
                    }
                }));

                const sortedChats = sortChatsByLastMessage(updatedChats);
                
                // Verifica se há mudanças nos chats
                if (JSON.stringify(sortedChats) !== JSON.stringify(state.allChats)) {
                    // Mantém o estado de busca atual
                    const currentSearch = state.currentSearchQuery;
                    
                    // Atualiza os chats
                    state.allChats = sortedChats;
                    
                    // Se houver uma busca ativa, filtra os chats
                    if (currentSearch) {
                        filterChats(currentSearch);
                    } else {
                        renderChatList(state.allChats);
                    }
                }
            } catch (error) {
                console.error('Erro ao atualizar chats:', error);
            }
        }, 1000);
    }

    // Função para filtrar chats
    function filterChats(query) {
        state.currentSearchQuery = query;
        const normalizedQuery = query.toLowerCase().trim();
        const filteredChats = state.allChats.filter(chat => 
            chat.name.toLowerCase().includes(normalizedQuery)
        );
        renderChatList(filteredChats);
    }

    async function renderChatList(chats) {
        const chatList = document.querySelector('.chat-list');
        chatList.innerHTML = '';

        chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            if (chat.id === state.currentChatId) {
                chatItem.classList.add('active');
            }
            chatItem.dataset.id = chat.id;

            // Usar a foto do chat se disponível, senão gerar avatar
            const avatarUrl = chat.picture || chat.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random`;
            
            // Formatar a hora da última mensagem
            const lastMessageTime = chat.time || chat.createdAt;
            const timeStr = formatMessageTime(lastMessageTime);

            // Preparar a prévia da última mensagem
            let lastMessage = chat.conversation || '';
            if (chat.conversationType === 'AUDIO') {
                lastMessage = '🎤 Mensagem de voz';
            } else if (chat.conversationType === 'IMAGE') {
                lastMessage = '📷 Foto';
            } else if (chat.conversationType === 'VIDEO') {
                lastMessage = '🎥 Vídeo';
            } else if (chat.conversationType === 'FILE') {
                lastMessage = '📎 Arquivo';
            }

            // Limitar o tamanho da prévia
            if (lastMessage.length > 40) {
                lastMessage = lastMessage.substring(0, 40) + '...';
            }

            chatItem.innerHTML = `
                <div class="chat-avatar">
                    <img src="${avatarUrl}" alt="${chat.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random'">
                </div>
                <div class="chat-item-info">
                    <div class="chat-item-header">
                        <div class="chat-item-name">${chat.name}</div>
                        <div class="chat-item-time">${timeStr}</div>
                    </div>
                    <div class="chat-item-last-message">
                        <span class="material-icons">${chat.read ? 'done_all' : 'done'}</span>
                        ${lastMessage}
                    </div>
                </div>
            `;

            chatItem.addEventListener('click', () => selectChat(chat));
            chatList.appendChild(chatItem);
        });
    }

    // Função para formatar o tempo da mensagem
    function formatMessageTime(timestamp) {
        if (!timestamp) return '';
        
        const messageDate = new Date(Number(timestamp));
        const now = new Date();
        const diffDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            // Hoje - mostra apenas hora
            return messageDate.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else if (diffDays === 1) {
            return 'Ontem';
        } else if (diffDays < 7) {
            // Essa semana - mostra o dia da semana
            return messageDate.toLocaleDateString('pt-BR', { weekday: 'short' });
        } else {
            // Mais de uma semana - mostra a data
            return messageDate.toLocaleDateString('pt-BR', { 
                day: '2-digit',
                month: '2-digit'
            });
        }
    }

    async function loadChats() {
        try {
            notifications.info('Carregando chats...');
            const response = await api.getChats();
            // console.log('Resposta dos chats:', response);
            
            // Se a resposta tem a propriedade 'chats', usa ela
            const chats = response.chats || response;
            
            if (!Array.isArray(chats)) {
                console.error('Resposta não é um array:', chats);
                return;
            }

            state.allChats = sortChatsByLastMessage(chats);
            renderChatList(state.allChats);
            startChatPolling(); // Inicia o polling dos chats
            notifications.success('Chats carregados com sucesso!');
        } catch (error) {
            console.error('Erro ao carregar chats:', error);
            notifications.error('Erro ao carregar chats. Por favor, tente novamente.');
        }
    }

    async function loadMessages(chatId) {
        try {
            const messages = await api.getChatMessages(chatId);
            displayMessages(messages);
            
            // Atualiza a prévia da última mensagem no chat
            if (messages && messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                const chat = state.allChats.find(c => c.id === chatId);
                if (chat) {
                    // Atualiza o texto da conversa com a última mensagem
                    chat.conversation = lastMessage.text;
                    // Usa o timestamp da mensagem
                    chat.time = lastMessage.time;
                    chat.conversationType = lastMessage.type || 'TEXT';
                    renderChatList(state.allChats);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
            notifications.error('Erro ao carregar mensagens. Por favor, tente novamente.');
        }
    }

    async function sendMessage(event) {
        if (event) event.preventDefault();
        
        if (!state.currentChatId) {
            notifications.error('Selecione um chat primeiro');
            return;
        }

        const message = messageInput.value.trim();
        if ((!message && !audioRecorder.isRecording) || !state.currentChatId) return;

        try {
            const now = new Date();
            
            // Adiciona a mensagem localmente primeiro
            const messageElement = createMessageElement({
                text: message,
                time: now.getTime(),
                role: 'user'
            });
            
            messageArea.appendChild(messageElement);
            messageArea.scrollTop = messageArea.scrollHeight;

            // Atualiza a prévia da última mensagem no chat
            const chat = state.allChats.find(c => c.id === state.currentChatId);
            if (chat) {
                chat.conversation = message;
                chat.time = now.getTime();
                chat.conversationType = 'TEXT';
                state.allChats = sortChatsByLastMessage(state.allChats);
                renderChatList(state.allChats);
            }

            // Envia a mensagem para a API
            await api.sendMessage(state.currentChatId, { message });
            
            // Limpa o input
            messageInput.value = '';
            messageInput.style.height = 'auto';
            
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            notifications.error('Erro ao enviar mensagem. Por favor, tente novamente.');
        }
    }

    // Inicializa a busca
    function initializeSearch() {
        const searchInput = document.querySelector('.search-container input');
        
        // Adiciona ícone para limpar a busca
        const searchContainer = document.querySelector('.search-container');
        const clearButton = document.createElement('span');
        clearButton.className = 'material-icons clear-search';
        clearButton.textContent = 'close';
        clearButton.style.display = 'none';
        clearButton.style.cursor = 'pointer';
        searchContainer.appendChild(clearButton);

        // Eventos do botão de limpar
        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            clearButton.style.display = 'none';
            state.currentSearchQuery = '';
            renderChatList(state.allChats);
        });

        searchInput.addEventListener('input', (e) => {
            clearButton.style.display = e.target.value ? 'block' : 'none';
            filterChats(e.target.value);
        });
    }

    // Event Listeners
    inputArea.addEventListener('submit', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    recordButton.addEventListener('click', async () => {
        if (!audioRecorder.isRecording) {
            const started = await audioRecorder.startRecording();
            if (started) {
                recordButton.classList.add('recording');
                notifications.info('Gravando áudio...');
            }
        } else {
            recordButton.classList.remove('recording');
            notifications.info('Processando áudio...');
            
            try {
                const audioBlob = await audioRecorder.stopRecording();
                
                // Pega o ID do chat selecionado
                const selectedChat = document.querySelector('.chat-item.active');
                if (selectedChat) {
                    const chatId = selectedChat.dataset.id;
                    // console.log('Enviando áudio para chat:', chatId);
                    
                    // Primeiro faz upload para o Cloudinary
                    const audioUrl = await api.uploadAudio(audioBlob);
                    // console.log('URL do áudio após upload:', audioUrl);
                    
                    // Envia apenas a URL do áudio
                    const messageData = {
                        audio: audioUrl
                    };
                    
                    await api.sendMessage(chatId, messageData);
                    notifications.success('Áudio enviado com sucesso!');
                } else {
                    notifications.error('Selecione um chat primeiro');
                }
            } catch (error) {
                console.error('Erro ao enviar áudio:', error);
                notifications.error('Erro ao enviar áudio');
            }
        }
    });

    // Função para alternar o tema
    function toggleTheme() {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', state.theme);
        localStorage.setItem('theme', state.theme);
        
        // Atualiza o ícone
        const themeIcon = document.querySelector('.theme-toggle-button .material-icons');
        themeIcon.textContent = state.theme === 'dark' ? 'dark_mode' : 'light_mode';
    }

    // Inicialização
    document.documentElement.setAttribute('data-theme', state.theme);
    const themeIcon = document.querySelector('.theme-toggle-button .material-icons');
    themeIcon.textContent = state.theme === 'dark' ? 'dark_mode' : 'light_mode';

    document.querySelector('.theme-toggle-button').addEventListener('click', toggleTheme);

    loadChats();
    initializeSearch();
});
