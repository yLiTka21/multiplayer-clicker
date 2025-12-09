// ============================================
// МУЛЬТИПЛЕЕРНЫЙ КЛИКЕР - Firebase версия
// Работает на двух разных компьютерах через интернет
// ============================================

class FirebaseMultiplayerGame {
    constructor() {
        // Конфигурация Firebase (ВАША - скопируйте из Firebase Console)
        this.firebaseConfig = {
            apiKey: "AIzaSyCJ5CJpVrupoQ41j7h2cjKv0NxkyhC4M20",
            authDomain: "multiplayer-clicker-18481.firebaseapp.com",
            databaseURL: "https://multiplayer-clicker-18481-default-rtdb.europe-west1.firebasedatabase.app",
            projectId: "multiplayer-clicker-18481",
            storageBucket: "multiplayer-clicker-18481.firebasestorage.app",
            messagingSenderId: "1010329103930",
            appId: "1:1010329103930:web:9d3523231e484beb6f8f03",
            measurementId: "G-0G4VHXSZ4C"
        };
        
        // Инициализируем Firebase
        if (typeof firebase === 'undefined') {
            console.error('Firebase не загружен! Проверьте подключение скриптов в index.html');
            return;
        }
        
        firebase.initializeApp(this.firebaseConfig);
        this.database = firebase.database();
        
        // Игровые переменные
        this.roomId = null;
        this.playerId = null;
        this.playerName = `Игрок_${Math.floor(Math.random() * 1000)}`;
        this.gameActive = false;
        this.gameTime = 60;
        this.timerInterval = null;
        
        // Запускаем игру
        this.init();
    }
    
    init() {
        this.initElements();
        this.bindEvents();
        this.generatePlayerName();
        
        console.log('Игра инициализирована. Firebase готов.');
    }
    
    initElements() {
        this.elements = {
            // Комната
            roomSection: document.getElementById('roomSection'),
            roomInfo: document.getElementById('roomInfo'),
            createRoomBtn: document.getElementById('createRoomBtn'),
            joinRoomBtn: document.getElementById('joinRoomBtn'),
            joinRoomCode: document.getElementById('joinRoomCode'),
            roomCode: document.getElementById('roomCode'),
            startGameBtn: document.getElementById('startGameBtn'),
            waitingStatus: document.getElementById('waitingStatus'),
            
            // Игра
            gameSection: document.getElementById('gameSection'),
            player1Card: document.getElementById('player1Card'),
            player2Card: document.getElementById('player2Card'),
            score1: document.getElementById('score1'),
            score2: document.getElementById('score2'),
            player1Name: document.getElementById('player1Name'),
            player2Name: document.getElementById('player2Name'),
            player1Status: document.getElementById('player1Status'),
            player2Status: document.getElementById('player2Status'),
            conn1: document.getElementById('conn1'),
            conn2: document.getElementById('conn2'),
            clickButton: document.getElementById('clickButton'),
            gameStatus: document.getElementById('gameStatus'),
            gameTimer: document.getElementById('gameTimer'),
            gameMessage: document.getElementById('gameMessage'),
            leaveRoomBtn: document.getElementById('leaveRoomBtn'),
            rematchBtn: document.getElementById('rematchBtn')
        };
    }
    
    bindEvents() {
        this.elements.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.elements.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        this.elements.startGameBtn.addEventListener('click', () => this.startGame());
        this.elements.clickButton.addEventListener('click', () => this.handleClick());
        this.elements.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        this.elements.rematchBtn.addEventListener('click', () => this.requestRematch());
    }
    
    generatePlayerName() {
        const adjectives = ['Быстрый', 'Хитрый', 'Смелый', 'Ловкий', 'Могучий', 'Неуловимый'];
        const nouns = ['Герой', 'Воин', 'Маг', 'Стрелок', 'Ниндзя', 'Титан'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        this.playerName = `${adj}_${noun}`;
        console.log(`Ваше имя: ${this.playerName}`);
    }
    
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    
    createRoom() {
        this.roomId = this.generateRoomCode();
        this.playerId = 'player1';
        
        console.log(`Создаём комнату: ${this.roomId}`);
        
        // Создаем комнату в Firebase
        const roomRef = this.database.ref(`rooms/${this.roomId}`);
        
        const roomData = {
            player1: {
                id: this.playerId,
                name: this.playerName,
                score: 0,
                connected: true,
                ready: false
            },
            player2: {
                id: null,
                name: '',
                score: 0,
                connected: false,
                ready: false
            },
            gameActive: false,
            gameTime: 60,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        roomRef.set(roomData)
            .then(() => {
                console.log(`✅ Комната ${this.roomId} создана`);
                this.showRoomInfo();
                this.listenToRoomChanges();
            })
            .catch(error => {
                console.error('❌ Ошибка создания комнаты:', error);
                alert('Не удалось создать комнату. Проверьте подключение к интернету и правила Firebase.');
            });
    }
    
    joinRoom() {
        const code = this.elements.joinRoomCode.value.trim().toUpperCase();
        
        if (!code || code.length !== 6) {
            alert('Введите корректный 6-значный код комнаты');
            return;
        }
        
        this.roomId = code;
        this.playerId = 'player2';
        
        console.log(`Пытаемся присоединиться к комнате: ${this.roomId}`);
        
        const roomRef = this.database.ref(`rooms/${this.roomId}`);
        
        // Проверяем существование комнаты
        roomRef.once('value')
            .then(snapshot => {
                if (!snapshot.exists()) {
                    alert('Комната не найдена. Проверьте код.');
                    return;
                }
                
                const roomData = snapshot.val();
                
                if (roomData.player2.connected) {
                    alert('В комнате уже два игрока');
                    return;
                }
                
                // Присоединяемся как игрок 2
                const updates = {
                    'player2/id': this.playerId,
                    'player2/name': this.playerName,
                    'player2/connected': true,
                    'player2/ready': false,
                    'player2/score': 0
                };
                
                return roomRef.update(updates);
            })
            .then(() => {
                console.log(`✅ Присоединились к комнате ${this.roomId}`);
                this.showRoomInfo();
                this.listenToRoomChanges();
            })
            .catch(error => {
                console.error('❌ Ошибка присоединения:', error);
                alert('Не удалось присоединиться к комнате.');
            });
    }
    
    showRoomInfo() {
        this.elements.roomSection.style.display = 'block';
        this.elements.roomCode.textContent = this.roomId;
        this.elements.roomInfo.style.display = 'block';
        
        if (this.playerId === 'player1') {
            this.elements.gameStatus.textContent = 'Вы создали комнату!';
        } else {
            this.elements.gameStatus.textContent = 'Вы присоединились к комнате!';
        }
        
        console.log(`Показана информация о комнате: ${this.roomId}, вы: ${this.playerId}`);
    }
    
    listenToRoomChanges() {
    const roomRef = this.database.ref(`rooms/${this.roomId}`);
    
    roomRef.on('value', snapshot => {
        const roomData = snapshot.val();
        
        if (!roomData) {
            // Комната удалена
            console.log('Комната удалена');
            this.handleRoomClosed();
            return;
        }
        
        this.updateUI(roomData);
        
        // Проверяем, можно ли начать игру
        if (this.playerId === 'player1') {
            const bothConnected = roomData.player1.connected && roomData.player2.connected;
            this.elements.startGameBtn.disabled = !bothConnected;
            this.elements.waitingStatus.textContent = bothConnected ? '✅' : '⌛';
        }
        
        // ДОБАВЬТЕ ЭТОТ КОД: Автоматически делаем второго игрока готовым
        if (this.playerId === 'player2' && !roomData.player2.ready) {
            console.log('Автоматически подтверждаем готовность второго игрока');
            roomRef.update({
                'player2/ready': true
            });
        }
        
        // Автоматически начинаем игру, если оба готовы
        if (roomData.player1.ready && roomData.player2.ready && !roomData.gameActive) {
            console.log('Оба игрока готовы, начинаем игру!');
            this.startGameCountdown();
        }
        
        // Показываем игровую секцию, когда игра активна
        if (roomData.gameActive && !this.gameActive) {
            console.log('Игра началась!');
            this.showGameSection();
        }
    });
}
    
    updateUI(roomData) {
        // Обновляем имена игроков
        this.elements.player1Name.textContent = roomData.player1.name || 'Игрок 1';
        this.elements.player2Name.textContent = roomData.player2.name || 'Ожидание...';
        
        // Обновляем статусы подключения
        this.elements.player1Status.textContent = roomData.player1.connected ? '✅' : '❌';
        this.elements.player2Status.textContent = roomData.player2.connected ? '✅' : '❌';
        this.elements.conn1.textContent = roomData.player1.connected ? 'В сети' : 'Отключён';
        this.elements.conn2.textContent = roomData.player2.connected ? 'В сети' : 'Ожидание игрока';
        
        // Обновляем счёт
        this.elements.score1.textContent = roomData.player1.score;
        this.elements.score2.textContent = roomData.player2.score;
        
        // Подсвечиваем текущего игрока
        if (this.playerId === 'player1') {
            this.elements.player1Card.classList.add('player-connected');
            this.elements.player2Card.classList.remove('player-connected');
        } else if (this.playerId === 'player2') {
            this.elements.player2Card.classList.add('player-connected');
            this.elements.player1Card.classList.remove('player-connected');
        }
        
        // Обновляем таймер игры
        if (roomData.gameActive) {
            const timeLeft = roomData.gameTime || 60;
            this.elements.gameTimer.textContent = `Время: ${timeLeft} сек`;
            
            if (timeLeft <= 10) {
                this.elements.gameTimer.style.color = '#ff4136';
                this.elements.gameTimer.style.animation = 'pulse 0.5s infinite';
            }
        }
    }
    
    showGameSection() {
        this.elements.roomSection.style.display = 'none';
        this.elements.gameSection.style.display = 'block';
        this.gameActive = true;
        
        // Активируем кнопку для текущего игрока
        this.elements.clickButton.disabled = false;
        this.elements.gameStatus.textContent = '⚡ ИГРА НАЧАЛАСЬ! Кликайте быстрее! ⚡';
        
        console.log('Игровая секция показана');
    }
    
    startGame() {
        if (this.playerId === 'player1') {
            const roomRef = this.database.ref(`rooms/${this.roomId}`);
            roomRef.update({
                'player1/ready': true
            });
            
            this.elements.startGameBtn.disabled = true;
            this.elements.gameMessage.textContent = 'Ожидаем подтверждения второго игрока...';
            
            console.log('Запрос на начало игры отправлен');
        }
    }
    
    startGameCountdown() {
        console.log('Запускаем обратный отсчёт игры');
        
        const roomRef = this.database.ref(`rooms/${this.roomId}`);
        
        // Устанавливаем флаг активной игры
        roomRef.update({
            gameActive: true,
            gameTime: 60
        });
        
        // Запускаем таймер
        this.timerInterval = setInterval(() => {
            roomRef.once('value').then(snapshot => {
                const roomData = snapshot.val();
                let timeLeft = roomData.gameTime - 1;
                
                if (timeLeft > 0) {
                    roomRef.update({ gameTime: timeLeft });
                } else {
                    // Время вышло
                    console.log('Время вышло! Завершаем игру');
                    this.endGame();
                }
            });
        }, 1000);
    }
    
    handleClick() {
        if (!this.gameActive || !this.roomId || !this.playerId) return;
        
        const roomRef = this.database.ref(`rooms/${this.roomId}`);
        
        roomRef.once('value').then(snapshot => {
            const roomData = snapshot.val();
            const currentScore = roomData[this.playerId].score;
            
            // Увеличиваем счёт на 1
            roomRef.update({
                [`${this.playerId}/score`]: currentScore + 1
            });
            
            // Визуальная обратная связь
            this.elements.clickButton.style.transform = 'scale(0.9)';
            setTimeout(() => {
                this.elements.clickButton.style.transform = 'scale(1)';
            }, 100);
        });
    }
    
    endGame() {
        clearInterval(this.timerInterval);
        this.gameActive = false;
        
        const roomRef = this.database.ref(`rooms/${this.roomId}`);
        
        roomRef.once('value').then(snapshot => {
            const roomData = snapshot.val();
            const score1 = roomData.player1.score;
            const score2 = roomData.player2.score;
            
            let winnerMessage = '';
            if (score1 > score2) {
                winnerMessage = `🎉 ${roomData.player1.name} побеждает!`;
            } else if (score2 > score1) {
                winnerMessage = `🎉 ${roomData.player2.name} побеждает!`;
            } else {
                winnerMessage = '🤝 Ничья!';
            }
            
            this.elements.gameStatus.textContent = `ИГРА ОКОНЧЕНА! ${winnerMessage}`;
            this.elements.clickButton.disabled = true;
            this.elements.gameMessage.textContent = `Счёт: ${score1} - ${score2}`;
            this.elements.rematchBtn.disabled = false;
            
            console.log(`Игра завершена! Счёт: ${score1} - ${score2}`);
        });
    }
    
    requestRematch() {
        const roomRef = this.database.ref(`rooms/${this.roomId}`);
        
        // Сбрасываем игру
        const updates = {
            'player1/score': 0,
            'player1/ready': false,
            'player2/score': 0,
            'player2/ready': false,
            gameActive: false,
            gameTime: 60
        };
        
        roomRef.update(updates);
        
        this.elements.rematchBtn.disabled = true;
        this.elements.gameStatus.textContent = 'Запрос на реванш отправлен...';
        this.elements.gameSection.style.display = 'none';
        this.elements.roomSection.style.display = 'block';
        
        console.log('Запрос на реванш отправлен');
    }
    
    leaveRoom() {
        if (this.roomId && this.playerId) {
            const roomRef = this.database.ref(`rooms/${this.roomId}`);
            
            // Удаляем игрока из комнаты
            roomRef.update({
                [`${this.playerId}/connected`]: false,
                [`${this.playerId}/ready`]: false
            }).then(() => {
                // Если комната пуста, удаляем её
                roomRef.once('value').then(snapshot => {
                    const roomData = snapshot.val();
                    if (!roomData.player1.connected && !roomData.player2.connected) {
                        roomRef.remove();
                    }
                });
            });
        }
        
        // Сбрасываем состояние
        this.resetGame();
        alert('Вы покинули комнату. Обновите страницу для новой игры.');
    }
    
    handleRoomClosed() {
        alert('Комната была закрыта создателем.');
        this.resetGame();
    }
    
    resetGame() {
        this.roomId = null;
        this.playerId = null;
        this.gameActive = false;
        
        clearInterval(this.timerInterval);
        
        this.elements.roomSection.style.display = 'block';
        this.elements.gameSection.style.display = 'none';
        this.elements.roomInfo.style.display = 'none';
        this.elements.joinRoomCode.value = '';
    }
}

// Вспомогательная функция для копирования кода комнаты
function copyRoomCode() {
    const roomCode = document.getElementById('roomCode').textContent;
    navigator.clipboard.writeText(roomCode)
        .then(() => alert('Код комнаты скопирован! Отправьте его другу.'))
        .catch(err => console.error('Ошибка копирования:', err));
}

// Запуск игры при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    // Проверяем, загружен ли Firebase
    if (typeof firebase === 'undefined') {
        console.error('Ошибка: Firebase не загружен!');
        document.body.innerHTML = `
            <div style="color: white; text-align: center; padding: 50px;">
                <h1>Ошибка загрузки Firebase</h1>
                <p>Проверьте подключение к интернету и обновите страницу.</p>
                <p>Если ошибка повторяется, убедитесь что в index.html подключены скрипты Firebase.</p>
            </div>
        `;
        return;
    }
    
    console.log('Запускаем игру...');
    window.game = new FirebaseMultiplayerGame();
});