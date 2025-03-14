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
        try {
            const response = await fetch(`${window.config.API_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const text = await response.text();

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('Erro ao fazer parse da resposta:', e);
                throw new Error('Resposta inválida do servidor');
            }

            if (!response.ok) {
                throw new Error(data.error || 'Erro na requisição');
            }

            return data;
        } catch (error) {
            console.error('Erro na requisição:', error);
            throw error;
        }
    }

    async uploadAudio(audioBlob) {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.wav');
        
        const response = await fetch(`${window.config.API_BASE_URL}/upload-audio`, {
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
        const formData = new FormData();
        formData.append('file', imageFile, imageFile.name);
        
        const response = await fetch(`${window.config.API_BASE_URL}/upload-image`, {
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
        try {
            const response = await this.request('/chats');
            return response;
        } catch (error) {
            console.error('Erro ao buscar chats:', error);
            throw error;
        }
    }

    async getChatMessages(chatId) {
        return this.request(`/chats/${chatId}/messages?pageSize=2000`);
    }

    async sendMessage(chatId, message) {
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

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
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

// Classe para gerenciar gravação de áudio
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
            
            this.mediaRecorder.ondataavailable = this.ondataavailable.bind(this);
            this.mediaRecorder.onstop = this.onstop.bind(this);
            
            this.audioChunks = [];
            this.mediaRecorder.start();
            this.isRecording = true;
            
            return true;
        } catch (error) {
            console.error('Erro ao iniciar gravação:', error);
            return false;
        }
    }

    ondataavailable(event) {
        this.audioChunks.push(event.data);
    }

    stopRecording() {
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                this.isRecording = false;
                
                // Libera a stream
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                }
                
                resolve(audioBlob);
            };
            
            this.mediaRecorder.stop();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa autenticação
    const auth = new AuthController();
    auth.initialize();

    // Inicializa os controllers
    const api = new GPTMakerAPI();
    const notifications = new NotificationManager();
    const audioRecorder = new AudioRecorder();
    const aiController = new window.AIController(api);

    // Registra callback para mudanças de estado da IA
    aiController.onAIStateChange(({ isHumanMode, isLoading }) => {
        const toggleButton = document.querySelector('.toggle-ai-button');
        if (toggleButton) {
            toggleButton.className = `toggle-ai-button ${isHumanMode ? 'paused' : ''} ${isLoading ? 'loading' : ''}`;
            toggleButton.querySelector('.button-text').textContent = 
                isHumanMode ? 'Ativar IA' : 'Pausar IA';
        }
    });

    // Elementos do DOM
    const chatList = document.querySelector('.chat-list');
    const messageArea = document.querySelector('.chat-messages');
    const messageInput = document.querySelector('.message-input');
    const inputArea = document.querySelector('.input-area');
    const currentChatName = document.querySelector('.chat-name');
    const recordButton = document.querySelector('.record-button');
    const attachButton = document.querySelector('.attach-button');
    const imageInput = document.querySelector('#imageInput');

    // Estado da aplicação
    const state = {
        currentChatId: null,
        chatPollingInterval: null,
        isPolling: false,
        recording: false,
        mediaRecorder: null,
        audioChunks: [],
        theme: localStorage.getItem('theme') || 'dark',
        selectedAgent: 'all'
    };

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
            messageElement.dataset.id = message.id;
            messageElement.dataset.time = message.time;
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
        stopMessagePolling();

        // Inicia novo polling apenas se houver um chat selecionado
        if (state.currentChatId) {
            let currentPollingChatId = state.currentChatId; // Armazena o ID do chat atual

            state.messagePollingInterval = setInterval(async () => {
                try {
                    // Verifica se o chat mudou desde o último polling
                    if (currentPollingChatId !== state.currentChatId) {
                        stopMessagePolling();
                        return;
                    }

                    const messages = await api.getChatMessages(state.currentChatId);
                    
                    // Verifica novamente se o chat não mudou durante a requisição
                    if (currentPollingChatId !== state.currentChatId) {
                        return;
                    }

                    if (!messages || messages.length === 0) return;

                    // Obtém a última mensagem do chat atual
                    const currentMessages = document.querySelectorAll('.chat-messages .message');
                    const lastDisplayedMessage = currentMessages[currentMessages.length - 1];
                    const lastDisplayedId = lastDisplayedMessage ? lastDisplayedMessage.dataset.id : null;
                    
                    // Obtém a última mensagem da API
                    const latestMessage = messages[messages.length - 1];

                    // Se não há mensagem exibida ou se a última mensagem é diferente, atualiza o chat
                    if (!lastDisplayedId || lastDisplayedId !== latestMessage.id) {
                        displayMessages(messages);
                        
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
            }, 2000); // Aumentado para 2 segundos para reduzir a carga
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
        try {
            // Para qualquer polling anterior antes de tudo
            stopMessagePolling();
            
            // Remove a classe active de todos os chats
            document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
            
            // Adiciona a classe active ao chat selecionado
            const selectedChat = document.querySelector(`.chat-item[data-id="${chat.id}"]`);
            if (selectedChat) {
                selectedChat.classList.add('active');
            }

            notifications.info(`Carregando chat do ${chat.name}`);
            // Limpa as mensagens existentes antes de carregar as novas
            messageArea.innerHTML = '';

            // Atualiza o cabeçalho do chat com o avatar
            const avatarUrl = chat.picture || chat.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random`;
            document.querySelector('.chat-header .chat-avatar img').src = avatarUrl;
            document.querySelector('.chat-header .chat-header-name').textContent = chat.name;

            // Adiciona o número de telefone formatado
            const phoneElement = document.querySelector('.chat-header-status .phone-number');
            if (phoneElement) {
                // Verifica se o chat tem um número de telefone válido
                console.log(chat.whatsappPhone);
                if (chat.whatsappPhone && typeof chat.whatsappPhone === 'string' && chat.whatsappPhone.trim() !== '') {
                    const formattedPhone = formatPhoneNumber(chat.whatsappPhone.trim());
                    if (formattedPhone) {
                        phoneElement.textContent = formattedPhone;
                        phoneElement.style.display = 'inline-block';
                    } else {
                        phoneElement.style.display = 'none';
                    }
                } else {
                    phoneElement.style.display = 'none';
                }
            }

            // Configura o botão de toggle da IA
            const toggleButton = document.querySelector('.toggle-ai-button');
            toggleButton.style.display = 'flex';
            
            // Inicializa o controlador da IA com o estado atual do chat
            aiController.initialize(chat.id, chat.humanTalk);
            
            // Adiciona o event listener para o botão
            toggleButton.onclick = async () => {
                const buttonContent = toggleButton.querySelector('.button-content');
                const originalHtml = buttonContent.innerHTML;
                
                try {
                    // Desabilita o botão e mostra loading
                    toggleButton.disabled = true;
                    buttonContent.innerHTML = `
                        <i class="material-icons">cached</i>
                        <span class="button-text">Aguarde...</span>
                    `;
                    buttonContent.querySelector('i').classList.add('rotating');
                    
                    await aiController.toggleAIMode();
                } catch (error) {
                    console.error('Erro ao alternar modo IA:', error);
                    notifications.error('Erro ao alternar modo IA. Tente novamente.');
                } finally {
                    // Restaura o estado original do botão
                    toggleButton.disabled = false;
                    buttonContent.innerHTML = originalHtml;
                }
            };
            
            // Atualiza o ID do chat atual e reseta o timestamp
            state.currentChatId = chat.id;
            state.lastMessageTimestamp = null;
            
            // Carrega as mensagens do chat
            await loadMessages(chat.id);

            // Inicia o polling de mensagens para este chat
            startMessagePolling();
            
            notifications.success('Chat carregado com sucesso!');
            // Remove o badge de não lido
            const unreadBadge = selectedChat.querySelector('.unread-badge');
            if (unreadBadge) {
                unreadBadge.style.display = 'none';
            }
        } catch (error) {
            console.error('Erro ao selecionar chat:', error);
            notifications.error('Erro ao carregar o chat. Tente novamente.');
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
                
                // Se a resposta tem a propriedade 'chats', usa ela
                const chats = response.chats || response;
                
                if (!Array.isArray(chats)) {
                    console.error('Resposta não é um array:', chats);
                    return;
                }

                // Mapeia os chats para incluir as últimas mensagens
                const updatedChats = await Promise.all(chats.map(async (newChat) => {
                    try {
                        // Busca as últimas mensagens de cada chat
                        const messages = await api.getChatMessages(newChat.id);
                        if (messages && messages.length > 0) {
                            const lastMessage = messages[messages.length - 1];
                            newChat.conversation = lastMessage.text;
                            newChat.time = lastMessage.time || lastMessage.created_at;
                            newChat.conversationType = lastMessage.type || 'TEXT';
                            
                            // Se este é o chat atual, atualiza a interface de mensagens
                            if (newChat.id === state.currentChatId) {
                                const currentMessages = document.querySelectorAll('.chat-messages .message');
                                const lastDisplayedMessage = currentMessages[currentMessages.length - 1];
                                const lastDisplayedId = lastDisplayedMessage ? lastDisplayedMessage.dataset.id : null;
                                
                                if (!lastDisplayedId || lastDisplayedId !== lastMessage.id) {
                                    displayMessages(messages);
                                }
                            }
                        }
                        return newChat;
                    } catch (error) {
                        console.error(`Erro ao buscar mensagens do chat ${newChat.id}:`, error);
                        return newChat;
                    }
                }));

                // Ordena os chats pela última mensagem
                const sortedChats = sortChatsByLastMessage(updatedChats);
                
                // Atualiza o estado e a interface
                state.allChats = sortedChats;
                
                // Se houver uma busca ativa, filtra os chats
                if (state.currentSearchQuery) {
                    filterChats(state.currentSearchQuery);
                } else {
                    renderChatList(state.allChats);
                }
            } catch (error) {
                console.error('Erro ao atualizar chats:', error);
            }
        }, 1000); // Polling a cada 1 segundo
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

    // Função para filtrar chats por agente
    function filterChatsByAgent(chats, selectedAgent) {
        if (selectedAgent === 'all') {
            return chats;
        }
        return chats.filter(chat => chat.agentName === selectedAgent);
    }

    async function renderChatList(chats) {
        const chatList = document.querySelector('.chat-list');
        chatList.innerHTML = '';

        // Filtra os chats pelo agente selecionado
        const filteredChats = filterChatsByAgent(chats, state.selectedAgent);

        filteredChats.forEach(chat => {
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
                        <div class="chat-assistant-name">${chat.agentName}:</div>
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

    // Função para formatar número de telefone
    function formatPhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') return '';
        
        // Remove todos os caracteres não numéricos
        const numbers = phone.replace(/\D/g, '');
        
        // Se o número já tiver o código do país (+55), remove-o
        let cleanedPhone = numbers.startsWith('55') ? numbers.slice(2) : numbers;
        
        // Se não tiver números suficientes após a remoção, retorna vazio
        if (cleanedPhone.length < 10) return '';
        
        // Adiciona o código do Brasil (+55) no início
        const countryCode = '+55 ';
        
        // Verifica o tamanho para determinar se é celular ou fixo
        if (cleanedPhone.length === 11) {
            // Celular: +55 (XX) XXXXX-XXXX
            return `${countryCode}(${cleanedPhone.slice(0,2)}) ${cleanedPhone.slice(2,7)}-${cleanedPhone.slice(7)}`;
        } else if (cleanedPhone.length === 10) {
            // Fixo: +55 (XX) XXXX-XXXX
            return `${countryCode}(${cleanedPhone.slice(0,2)}) ${cleanedPhone.slice(2,6)}-${cleanedPhone.slice(6)}`;
        }
        
        return ''; // Retorna vazio se não conseguir formatar
    }

    async function loadChats() {
        try {
            notifications.info('Carregando chats...');
            // console.log('Iniciando carregamento de chats...');
            
            const response = await api.getChats();
            // console.log('Resposta completa:', response);
            
            // Tenta extrair os chats da resposta
            let chats = response;
            if (response && typeof response === 'object') {
                // Se a resposta tem a propriedade 'chats' ou 'data', usa ela
                chats = response.chats || response.data || response;
            }
            
            // Verifica se chats é um array
            if (!Array.isArray(chats)) {
                console.error('Resposta não é um array:', chats);
                notifications.error('Formato de resposta inválido');
                return;
            }

            // console.log('Chats antes de ordenar:', chats);
            state.allChats = sortChatsByLastMessage(chats);
            // console.log('Chats depois de ordenar:', state.allChats);
            
            // Popula o select de agentes
            populateAgentSelect(state.allChats);
            
            // Renderiza a lista de chats
            renderChatList(state.allChats);
            
            startChatPolling();
            notifications.success('Chats carregados com sucesso!');
        } catch (error) {
            console.error('Erro ao carregar chats:', error);
            notifications.error('Erro ao carregar chats: ' + error.message);
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

    // Função para popular o select de agentes
    function populateAgentSelect(chats) {
        const agentFilter = document.getElementById('agent-filter');
        const agents = new Set();
        
        // Coleta todos os agentes únicos
        chats.forEach(chat => {
            if (chat.agentName) {
                agents.add(chat.agentName);
            }
        });

        // Limpa opções antigas, mantendo a opção "Todos agentes"
        agentFilter.innerHTML = '<option value="all">Todos agentes</option>';

        // Adiciona uma opção para cada agente
        agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent;
            option.textContent = agent;
            agentFilter.appendChild(option);
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
                    
                    // Primeiro faz upload para o Cloudinary
                    const audioUrl = await api.uploadAudio(audioBlob);
                    
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

    // Logout
    const logoutButton = document.querySelector('.logout-button');
    logoutButton.addEventListener('click', () => {
        auth.logout();
        window.location.href = '/login.html';
    });

    // Função para alternar o tema
    function toggleTheme() {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', state.theme);
        localStorage.setItem('theme', state.theme);
        
        // Atualiza o ícone
        const themeIcon = document.querySelector('.theme-toggle-button .material-icons');
        themeIcon.textContent = state.theme === 'dark' ? 'light_mode' : 'dark_mode';
    }

    // Inicialização
    document.documentElement.setAttribute('data-theme', state.theme);
    const themeIcon = document.querySelector('.theme-toggle-button .material-icons');
    themeIcon.textContent = state.theme === 'dark' ? 'light_mode' : 'dark_mode';

    document.querySelector('.theme-toggle-button').addEventListener('click', toggleTheme);

    // Adiciona listener para o select de agentes
    const agentFilter = document.getElementById('agent-filter');
    agentFilter.addEventListener('change', (e) => {
        state.selectedAgent = e.target.value;
        renderChatList(state.allChats);
    });

    loadChats();
    initializeSearch();
});
