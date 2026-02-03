// ============================================
// УПРАВЛЕНИЕ СОСТОЯНИЕМ И ХРАНИЛИЩЕ
// ============================================

class QuizApp {
    constructor() {
        this.currentUser = null;
        this.currentQuiz = null;
        this.currentQuizTake = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        
        this.init();
    }

    init() {
        this.loadUser();
        this.initializeEventListeners();
        this.initializeSampleData();
        this.updateUI();
    }

    // ============================================
    // УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ
    // ============================================
    
    loadUser() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    }

    saveUser(user) {
        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Сохраняем в список всех пользователей
        let users = this.getUsers();
        const existingIndex = users.findIndex(u => u.email === user.email);
        if (existingIndex >= 0) {
            users[existingIndex] = user;
        } else {
            users.push(user);
        }
        localStorage.setItem('users', JSON.stringify(users));
    }

    getUsers() {
        const users = localStorage.getItem('users');
        return users ? JSON.parse(users) : [];
    }

    login(email, password) {
        const users = this.getUsers();
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            this.saveUser(user);
            return true;
        }
        return false;
    }

    register(name, email, password) {
        const users = this.getUsers();
        
        if (users.find(u => u.email === email)) {
            return { success: false, message: 'Пользователь с таким email уже существует' };
        }

        const newUser = {
            id: Date.now(),
            name,
            email,
            password,
            createdAt: new Date().toISOString()
        };

        this.saveUser(newUser);
        return { success: true };
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.navigateTo('home');
        this.updateUI();
    }

    // ============================================
    // УПРАВЛЕНИЕ КВИЗАМИ
    // ============================================
    
    getQuizzes() {
        const quizzes = localStorage.getItem('quizzes');
        return quizzes ? JSON.parse(quizzes) : [];
    }

    saveQuiz(quiz) {
        let quizzes = this.getQuizzes();
        
        if (quiz.id) {
            const index = quizzes.findIndex(q => q.id === quiz.id);
            if (index >= 0) {
                quizzes[index] = quiz;
            }
        } else {
            quiz.id = Date.now();
            quiz.createdAt = new Date().toISOString();
            quiz.authorId = this.currentUser.id;
            quiz.authorName = this.currentUser.name;
            quizzes.push(quiz);
        }
        
        localStorage.setItem('quizzes', JSON.stringify(quizzes));
        return quiz;
    }

    deleteQuiz(quizId) {
        let quizzes = this.getQuizzes();
        quizzes = quizzes.filter(q => q.id !== quizId);
        localStorage.setItem('quizzes', JSON.stringify(quizzes));
    }

    getQuizById(id) {
        const quizzes = this.getQuizzes();
        return quizzes.find(q => q.id === id);
    }

    getUserQuizzes() {
        if (!this.currentUser) return [];
        return this.getQuizzes().filter(q => q.authorId === this.currentUser.id);
    }

    getPublishedQuizzes() {
        return this.getQuizzes().filter(q => q.status === 'published');
    }

    // ============================================
    // УПРАВЛЕНИЕ РЕЗУЛЬТАТАМИ
    // ============================================
    
    saveQuizResult(quizId, result) {
        let results = this.getResults();
        result.id = Date.now();
        result.quizId = quizId;
        result.userId = this.currentUser ? this.currentUser.id : null;
        result.completedAt = new Date().toISOString();
        results.push(result);
        localStorage.setItem('quizResults', JSON.stringify(results));
    }

    getResults() {
        const results = localStorage.getItem('quizResults');
        return results ? JSON.parse(results) : [];
    }

    getQuizResults(quizId) {
        return this.getResults().filter(r => r.quizId === quizId);
    }

    // ============================================
    // ИНИЦИАЛИЗАЦИЯ ПРИМЕРОВ
    // ============================================
    
    initializeSampleData() {
        const quizzes = this.getQuizzes();
        
        if (quizzes.length === 0) {
            // Создаем демо-пользователя
            const demoUser = {
                id: 1,
                name: 'Демо Пользователь',
                email: 'demo@quizmaster.com',
                password: 'demo123'
            };
            
            let users = this.getUsers();
            if (!users.find(u => u.email === demoUser.email)) {
                users.push(demoUser);
                localStorage.setItem('users', JSON.stringify(users));
            }

            // Создаем примеры квизов
            const sampleQuizzes = [
                {
                    id: Date.now() + 1,
                    title: 'Основы JavaScript',
                    description: 'Тест на знание базовых концепций JavaScript для начинающих разработчиков',
                    category: 'technology',
                    authorId: 1,
                    authorName: 'Демо Пользователь',
                    status: 'published',
                    timeLimit: 15,
                    shuffleQuestions: true,
                    showResults: true,
                    allowRetake: true,
                    questions: [
                        {
                            id: 1,
                            type: 'single',
                            text: 'Что означает аббревиатура DOM?',
                            options: [
                                { id: 1, text: 'Document Object Model', isCorrect: true },
                                { id: 2, text: 'Data Object Management', isCorrect: false },
                                { id: 3, text: 'Digital Output Method', isCorrect: false },
                                { id: 4, text: 'Dynamic Object Modeling', isCorrect: false }
                            ]
                        },
                        {
                            id: 2,
                            type: 'multiple',
                            text: 'Какие из следующих типов данных существуют в JavaScript?',
                            options: [
                                { id: 1, text: 'String', isCorrect: true },
                                { id: 2, text: 'Integer', isCorrect: false },
                                { id: 3, text: 'Boolean', isCorrect: true },
                                { id: 4, text: 'Object', isCorrect: true }
                            ]
                        },
                        {
                            id: 3,
                            type: 'text',
                            text: 'Какой оператор используется для строгого сравнения в JavaScript?',
                            correctAnswer: '==='
                        },
                        {
                            id: 4,
                            type: 'single',
                            text: 'Что вернет typeof null?',
                            options: [
                                { id: 1, text: 'object', isCorrect: true },
                                { id: 2, text: 'null', isCorrect: false },
                                { id: 3, text: 'undefined', isCorrect: false },
                                { id: 4, text: 'number', isCorrect: false }
                            ]
                        }
                    ],
                    createdAt: new Date().toISOString()
                },
                {
                    id: Date.now() + 2,
                    title: 'История России',
                    description: 'Проверьте свои знания ключевых событий российской истории',
                    category: 'education',
                    authorId: 1,
                    authorName: 'Демо Пользователь',
                    status: 'published',
                    timeLimit: 20,
                    shuffleQuestions: false,
                    showResults: true,
                    allowRetake: true,
                    questions: [
                        {
                            id: 1,
                            type: 'single',
                            text: 'В каком году была основана Москва?',
                            options: [
                                { id: 1, text: '1147', isCorrect: true },
                                { id: 2, text: '1240', isCorrect: false },
                                { id: 3, text: '1380', isCorrect: false },
                                { id: 4, text: '1480', isCorrect: false }
                            ]
                        },
                        {
                            id: 2,
                            type: 'single',
                            text: 'Кто был первым царем всея Руси?',
                            options: [
                                { id: 1, text: 'Иван IV Грозный', isCorrect: true },
                                { id: 2, text: 'Петр I', isCorrect: false },
                                { id: 3, text: 'Иван III', isCorrect: false },
                                { id: 4, text: 'Борис Годунов', isCorrect: false }
                            ]
                        },
                        {
                            id: 3,
                            type: 'multiple',
                            text: 'Какие из этих городов были столицами России?',
                            options: [
                                { id: 1, text: 'Москва', isCorrect: true },
                                { id: 2, text: 'Санкт-Петербург', isCorrect: true },
                                { id: 3, text: 'Киев', isCorrect: false },
                                { id: 4, text: 'Новгород', isCorrect: false }
                            ]
                        }
                    ],
                    createdAt: new Date().toISOString()
                },
                {
                    id: Date.now() + 3,
                    title: 'Кто ты из персонажей Marvel?',
                    description: 'Узнай, какому супергерою Marvel ты соответствуешь по характеру',
                    category: 'entertainment',
                    authorId: 1,
                    authorName: 'Демо Пользователь',
                    status: 'published',
                    timeLimit: 0,
                    shuffleQuestions: false,
                    showResults: true,
                    allowRetake: true,
                    questions: [
                        {
                            id: 1,
                            type: 'single',
                            text: 'Как ты предпочитаешь решать проблемы?',
                            options: [
                                { id: 1, text: 'Силой и мощью', isCorrect: false },
                                { id: 2, text: 'Умом и стратегией', isCorrect: false },
                                { id: 3, text: 'Юмором и изобретательностью', isCorrect: false },
                                { id: 4, text: 'Командной работой', isCorrect: false }
                            ]
                        },
                        {
                            id: 2,
                            type: 'single',
                            text: 'Что для тебя важнее всего?',
                            options: [
                                { id: 1, text: 'Справедливость', isCorrect: false },
                                { id: 2, text: 'Свобода', isCorrect: false },
                                { id: 3, text: 'Семья', isCorrect: false },
                                { id: 4, text: 'Знания', isCorrect: false }
                            ]
                        }
                    ],
                    createdAt: new Date().toISOString()
                }
            ];

            localStorage.setItem('quizzes', JSON.stringify(sampleQuizzes));
        }
    }

    // ============================================
    // НАВИГАЦИЯ
    // ============================================
    
    navigateTo(page) {
        // Скрываем все страницы
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        // Показываем нужную страницу
        const targetPage = document.getElementById(page + 'Page');
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Обновляем активную ссылку в навигации
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });

        // Загружаем контент страницы
        switch(page) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'create':
                this.loadEditor();
                break;
            case 'explore':
                this.loadExplore();
                break;
        }

        // Прокручиваем наверх
        window.scrollTo(0, 0);
    }

    // ============================================
    // ОБНОВЛЕНИЕ UI
    // ============================================
    
    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');
        
        const authRequiredLinks = document.querySelectorAll('.auth-required');

        if (this.currentUser) {
            loginBtn.style.display = 'none';
            registerBtn.style.display = 'none';
            userMenu.style.display = 'flex';
            userName.textContent = this.currentUser.name;
            
            authRequiredLinks.forEach(link => {
                link.style.display = 'block';
            });
        } else {
            loginBtn.style.display = 'block';
            registerBtn.style.display = 'block';
            userMenu.style.display = 'none';
            
            authRequiredLinks.forEach(link => {
                link.style.display = 'none';
            });
        }
    }

    // ============================================
    // ДАШБОРД
    // ============================================
    
    loadDashboard() {
        if (!this.currentUser) {
            this.showToast('Необходимо войти в систему', 'error');
            this.navigateTo('home');
            return;
        }

        const quizGrid = document.getElementById('quizGrid');
        const quizzes = this.getUserQuizzes();

        if (quizzes.length === 0) {
            quizGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📝</div>
                    <h3 style="font-size: 24px; margin-bottom: 10px;">У вас еще нет квизов</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 30px;">
                        Создайте свой первый квиз и начните собирать ответы
                    </p>
                    <button class="btn btn-primary" onclick="app.navigateTo('create')">
                        Создать квиз
                    </button>
                </div>
            `;
            return;
        }

        quizGrid.innerHTML = quizzes.map(quiz => this.renderQuizCard(quiz, true)).join('');
    }

    renderQuizCard(quiz, isOwner = false) {
        const results = this.getQuizResults(quiz.id);
        const categoryNames = {
            'education': 'Образование',
            'entertainment': 'Развлечения',
            'business': 'Бизнес',
            'health': 'Здоровье',
            'technology': 'Технологии'
        };

        return `
            <div class="quiz-card" data-quiz-id="${quiz.id}">
                <div class="quiz-status ${quiz.status}">${quiz.status === 'published' ? 'Опубликовано' : 'Черновик'}</div>
                <div class="quiz-card-header">
                    <div>
                        <h3 class="quiz-title">${quiz.title}</h3>
                        <span class="quiz-category">${categoryNames[quiz.category] || quiz.category}</span>
                    </div>
                </div>
                <p class="quiz-description">${quiz.description}</p>
                <div class="quiz-stats">
                    <span>📊 ${results.length} прохождений</span>
                    <span>❓ ${quiz.questions.length} вопросов</span>
                    ${quiz.timeLimit ? `<span>⏱️ ${quiz.timeLimit} мин</span>` : ''}
                </div>
                <div class="quiz-actions">
                    ${isOwner ? `
                        <button class="btn btn-secondary btn-sm" onclick="app.editQuiz(${quiz.id})">
                            Редактировать
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="app.viewStats(${quiz.id})">
                            Статистика
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="app.takeQuiz(${quiz.id})">
                            Пройти
                        </button>
                    ` : `
                        <button class="btn btn-primary btn-sm" onclick="app.takeQuiz(${quiz.id})">
                            Пройти тест
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    // ============================================
    // РЕДАКТОР КВИЗОВ
    // ============================================
    
    loadEditor(quizId = null) {
        if (!this.currentUser) {
            this.showToast('Необходимо войти в систему', 'error');
            this.navigateTo('home');
            return;
        }

        if (quizId) {
            this.currentQuiz = this.getQuizById(quizId);
            document.getElementById('editorTitle').textContent = 'Редактировать квиз';
            this.populateEditor();
        } else {
            this.currentQuiz = {
                title: '',
                description: '',
                category: '',
                timeLimit: 0,
                shuffleQuestions: false,
                showResults: true,
                allowRetake: true,
                questions: [],
                status: 'draft'
            };
            document.getElementById('editorTitle').textContent = 'Создать новый квиз';
            this.clearEditor();
        }

        this.renderQuestions();
    }

    populateEditor() {
        document.getElementById('quizTitle').value = this.currentQuiz.title || '';
        document.getElementById('quizDescription').value = this.currentQuiz.description || '';
        document.getElementById('quizCategory').value = this.currentQuiz.category || '';
        document.getElementById('quizTime').value = this.currentQuiz.timeLimit || 0;
        document.getElementById('shuffleQuestions').checked = this.currentQuiz.shuffleQuestions || false;
        document.getElementById('showResults').checked = this.currentQuiz.showResults !== false;
        document.getElementById('allowRetake').checked = this.currentQuiz.allowRetake !== false;
    }

    clearEditor() {
        document.getElementById('quizTitle').value = '';
        document.getElementById('quizDescription').value = '';
        document.getElementById('quizCategory').value = '';
        document.getElementById('quizTime').value = 0;
        document.getElementById('shuffleQuestions').checked = false;
        document.getElementById('showResults').checked = true;
        document.getElementById('allowRetake').checked = true;
    }

    addQuestion(type) {
        const question = {
            id: Date.now(),
            type: type,
            text: '',
            options: type !== 'text' ? [
                { id: 1, text: '', isCorrect: false },
                { id: 2, text: '', isCorrect: false }
            ] : [],
            correctAnswer: type === 'text' ? '' : null
        };

        this.currentQuiz.questions.push(question);
        this.renderQuestions();
    }

    removeQuestion(questionId) {
        this.currentQuiz.questions = this.currentQuiz.questions.filter(q => q.id !== questionId);
        this.renderQuestions();
    }

    renderQuestions() {
        const questionsList = document.getElementById('questionsList');
        
        if (this.currentQuiz.questions.length === 0) {
            questionsList.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 20px;">❓</div>
                    <p>Добавьте вопросы, используя кнопки выше</p>
                </div>
            `;
            return;
        }

        questionsList.innerHTML = this.currentQuiz.questions.map((question, index) => {
            return this.renderQuestionEditor(question, index);
        }).join('');
    }

    renderQuestionEditor(question, index) {
        const typeNames = {
            'single': 'Одиночный выбор',
            'multiple': 'Множественный выбор',
            'text': 'Текстовый ответ',
            'drag': 'Перетаскивание'
        };

        let optionsHTML = '';
        
        if (question.type === 'single' || question.type === 'multiple') {
            const inputType = question.type === 'single' ? 'radio' : 'checkbox';
            optionsHTML = `
                <div class="options-list">
                    ${question.options.map(option => `
                        <div class="option-item">
                            <input type="${inputType}" 
                                   name="correct_${question.id}" 
                                   ${option.isCorrect ? 'checked' : ''}
                                   onchange="app.updateOptionCorrect(${question.id}, ${option.id}, this.checked)">
                            <input type="text" 
                                   value="${option.text}" 
                                   placeholder="Введите вариант ответа..."
                                   onchange="app.updateOptionText(${question.id}, ${option.id}, this.value)">
                            <button onclick="app.removeOption(${question.id}, ${option.id})">✕</button>
                        </div>
                    `).join('')}
                </div>
                <button class="add-option-btn" onclick="app.addOption(${question.id})">
                    + Добавить вариант
                </button>
            `;
        } else if (question.type === 'text') {
            optionsHTML = `
                <div class="form-group">
                    <label>Правильный ответ:</label>
                    <input type="text" 
                           class="form-control" 
                           value="${question.correctAnswer || ''}"
                           placeholder="Введите правильный ответ..."
                           onchange="app.updateTextAnswer(${question.id}, this.value)">
                </div>
            `;
        }

        return `
            <div class="question-item">
                <div class="question-header">
                    <span class="question-number">Вопрос ${index + 1} • ${typeNames[question.type]}</span>
                    <div class="question-controls">
                        <button onclick="app.moveQuestion(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
                        <button onclick="app.moveQuestion(${index}, 1)" ${index === this.currentQuiz.questions.length - 1 ? 'disabled' : ''}>↓</button>
                        <button onclick="app.removeQuestion(${question.id})" style="color: var(--error);">✕</button>
                    </div>
                </div>
                <input type="text" 
                       class="question-input" 
                       value="${question.text}"
                       placeholder="Введите текст вопроса..."
                       onchange="app.updateQuestionText(${question.id}, this.value)">
                ${optionsHTML}
            </div>
        `;
    }

    updateQuestionText(questionId, text) {
        const question = this.currentQuiz.questions.find(q => q.id === questionId);
        if (question) {
            question.text = text;
        }
    }

    updateOptionText(questionId, optionId, text) {
        const question = this.currentQuiz.questions.find(q => q.id === questionId);
        if (question) {
            const option = question.options.find(o => o.id === optionId);
            if (option) {
                option.text = text;
            }
        }
    }

    updateOptionCorrect(questionId, optionId, isCorrect) {
        const question = this.currentQuiz.questions.find(q => q.id === questionId);
        if (question) {
            if (question.type === 'single') {
                // Для одиночного выбора сбрасываем все остальные
                question.options.forEach(o => o.isCorrect = false);
            }
            const option = question.options.find(o => o.id === optionId);
            if (option) {
                option.isCorrect = isCorrect;
            }
        }
    }

    updateTextAnswer(questionId, answer) {
        const question = this.currentQuiz.questions.find(q => q.id === questionId);
        if (question) {
            question.correctAnswer = answer;
        }
    }

    addOption(questionId) {
        const question = this.currentQuiz.questions.find(q => q.id === questionId);
        if (question) {
            const newId = Math.max(...question.options.map(o => o.id), 0) + 1;
            question.options.push({
                id: newId,
                text: '',
                isCorrect: false
            });
            this.renderQuestions();
        }
    }

    removeOption(questionId, optionId) {
        const question = this.currentQuiz.questions.find(q => q.id === questionId);
        if (question) {
            question.options = question.options.filter(o => o.id !== optionId);
            this.renderQuestions();
        }
    }

    moveQuestion(index, direction) {
        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < this.currentQuiz.questions.length) {
            const temp = this.currentQuiz.questions[index];
            this.currentQuiz.questions[index] = this.currentQuiz.questions[newIndex];
            this.currentQuiz.questions[newIndex] = temp;
            this.renderQuestions();
        }
    }

    saveQuizData(status = 'draft') {
        this.currentQuiz.title = document.getElementById('quizTitle').value;
        this.currentQuiz.description = document.getElementById('quizDescription').value;
        this.currentQuiz.category = document.getElementById('quizCategory').value;
        this.currentQuiz.timeLimit = parseInt(document.getElementById('quizTime').value) || 0;
        this.currentQuiz.shuffleQuestions = document.getElementById('shuffleQuestions').checked;
        this.currentQuiz.showResults = document.getElementById('showResults').checked;
        this.currentQuiz.allowRetake = document.getElementById('allowRetake').checked;
        this.currentQuiz.status = status;

        // Валидация
        if (!this.currentQuiz.title.trim()) {
            this.showToast('Введите название квиза', 'error');
            return false;
        }

        if (!this.currentQuiz.category) {
            this.showToast('Выберите категорию', 'error');
            return false;
        }

        if (this.currentQuiz.questions.length === 0) {
            this.showToast('Добавьте хотя бы один вопрос', 'error');
            return false;
        }

        // Проверка вопросов
        for (let question of this.currentQuiz.questions) {
            if (!question.text.trim()) {
                this.showToast('Все вопросы должны содержать текст', 'error');
                return false;
            }

            if (question.type !== 'text') {
                if (question.options.length < 2) {
                    this.showToast('Каждый вопрос должен содержать минимум 2 варианта ответа', 'error');
                    return false;
                }

                const hasCorrect = question.options.some(o => o.isCorrect);
                if (!hasCorrect) {
                    this.showToast('Укажите правильный ответ для всех вопросов', 'error');
                    return false;
                }
            }
        }

        this.saveQuiz(this.currentQuiz);
        return true;
    }

    // ============================================
    // ПРОХОЖДЕНИЕ КВИЗА
    // ============================================
    
    takeQuiz(quizId) {
        const quiz = this.getQuizById(quizId);
        if (!quiz) {
            this.showToast('Квиз не найден', 'error');
            return;
        }

        this.currentQuizTake = JSON.parse(JSON.stringify(quiz)); // Глубокое копирование
        this.currentQuestionIndex = 0;
        this.userAnswers = [];

        if (quiz.shuffleQuestions) {
            this.currentQuizTake.questions = this.shuffleArray([...quiz.questions]);
        }

        document.getElementById('takeQuizTitle').textContent = quiz.title;
        document.getElementById('takeQuizDescription').textContent = quiz.description;
        document.getElementById('takeQuizQuestions').textContent = `${quiz.questions.length} вопросов`;
        document.getElementById('takeQuizTime').textContent = quiz.timeLimit ? `${quiz.timeLimit} минут` : 'Без ограничения времени';

        this.navigateTo('take');
        this.showQuestion();
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    showQuestion() {
        const question = this.currentQuizTake.questions[this.currentQuestionIndex];
        const container = document.getElementById('quizQuestionContainer');
        
        // Обновляем прогресс
        const progress = ((this.currentQuestionIndex + 1) / this.currentQuizTake.questions.length) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
        document.getElementById('progressText').textContent = 
            `Вопрос ${this.currentQuestionIndex + 1} из ${this.currentQuizTake.questions.length}`;

        // Показываем/скрываем кнопки навигации
        document.getElementById('prevQuestion').disabled = this.currentQuestionIndex === 0;
        
        const isLastQuestion = this.currentQuestionIndex === this.currentQuizTake.questions.length - 1;
        document.getElementById('nextQuestion').style.display = isLastQuestion ? 'none' : 'block';
        document.getElementById('finishQuiz').style.display = isLastQuestion ? 'block' : 'none';

        // Рендерим вопрос
        let questionHTML = `<h2 class="question-text">${question.text}</h2>`;

        if (question.type === 'single' || question.type === 'multiple') {
            const inputType = question.type === 'single' ? 'radio' : 'checkbox';
            questionHTML += '<div class="answer-options">';
            
            question.options.forEach((option, index) => {
                const isChecked = this.userAnswers[this.currentQuestionIndex]?.includes(option.id);
                questionHTML += `
                    <div class="answer-option ${isChecked ? 'selected' : ''}" onclick="app.selectAnswer(${option.id})">
                        <label>
                            <input type="${inputType}" 
                                   name="answer_${question.id}" 
                                   value="${option.id}"
                                   ${isChecked ? 'checked' : ''}>
                            ${option.text}
                        </label>
                    </div>
                `;
            });
            
            questionHTML += '</div>';
        } else if (question.type === 'text') {
            const savedAnswer = this.userAnswers[this.currentQuestionIndex] || '';
            questionHTML += `
                <div class="answer-options">
                    <input type="text" 
                           class="form-control" 
                           id="textAnswer"
                           value="${savedAnswer}"
                           placeholder="Введите ваш ответ..."
                           style="font-size: 18px; padding: 20px;">
                </div>
            `;
        }

        container.innerHTML = questionHTML;
    }

    selectAnswer(optionId) {
        const question = this.currentQuizTake.questions[this.currentQuestionIndex];
        
        if (question.type === 'single') {
            this.userAnswers[this.currentQuestionIndex] = [optionId];
        } else if (question.type === 'multiple') {
            if (!this.userAnswers[this.currentQuestionIndex]) {
                this.userAnswers[this.currentQuestionIndex] = [];
            }
            
            const index = this.userAnswers[this.currentQuestionIndex].indexOf(optionId);
            if (index > -1) {
                this.userAnswers[this.currentQuestionIndex].splice(index, 1);
            } else {
                this.userAnswers[this.currentQuestionIndex].push(optionId);
            }
        }

        this.showQuestion();
    }

    nextQuestion() {
        this.saveCurrentAnswer();
        
        if (this.currentQuestionIndex < this.currentQuizTake.questions.length - 1) {
            this.currentQuestionIndex++;
            this.showQuestion();
        }
    }

    prevQuestion() {
        this.saveCurrentAnswer();
        
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.showQuestion();
        }
    }

    saveCurrentAnswer() {
        const question = this.currentQuizTake.questions[this.currentQuestionIndex];
        
        if (question.type === 'text') {
            const textInput = document.getElementById('textAnswer');
            if (textInput) {
                this.userAnswers[this.currentQuestionIndex] = textInput.value;
            }
        }
    }

    finishQuiz() {
        this.saveCurrentAnswer();

        // Подсчет результатов
        let correctAnswers = 0;
        const results = [];

        this.currentQuizTake.questions.forEach((question, index) => {
            const userAnswer = this.userAnswers[index];
            let isCorrect = false;

            if (question.type === 'single') {
                const correctOption = question.options.find(o => o.isCorrect);
                isCorrect = userAnswer && userAnswer[0] === correctOption.id;
            } else if (question.type === 'multiple') {
                const correctIds = question.options.filter(o => o.isCorrect).map(o => o.id).sort();
                const userIds = (userAnswer || []).sort();
                isCorrect = JSON.stringify(correctIds) === JSON.stringify(userIds);
            } else if (question.type === 'text') {
                isCorrect = userAnswer && 
                           userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
            }

            if (isCorrect) correctAnswers++;

            results.push({
                question: question.text,
                userAnswer: userAnswer,
                isCorrect: isCorrect,
                correctAnswer: question.correctAnswer || question.options.filter(o => o.isCorrect).map(o => o.text)
            });
        });

        const score = Math.round((correctAnswers / this.currentQuizTake.questions.length) * 100);

        // Сохраняем результат
        this.saveQuizResult(this.currentQuizTake.id, {
            score: score,
            correctAnswers: correctAnswers,
            totalQuestions: this.currentQuizTake.questions.length,
            answers: results
        });

        // Показываем результаты
        this.showResults(score, correctAnswers, results);
    }

    showResults(score, correctAnswers, results) {
        this.navigateTo('results');

        // Анимация круга прогресса
        const circumference = 2 * Math.PI * 90;
        const offset = circumference - (score / 100) * circumference;
        
        document.getElementById('scoreCirclePath').style.strokeDashoffset = offset;
        document.getElementById('scoreText').textContent = score + '%';

        // Сообщение
        let message = '';
        if (score >= 90) message = 'Отличный результат! 🎉';
        else if (score >= 70) message = 'Хорошая работа! 👍';
        else if (score >= 50) message = 'Неплохо, но есть куда расти 📚';
        else message = 'Попробуйте еще раз 💪';

        document.getElementById('resultsMessage').textContent = message;

        // Детали результатов
        const detailsHTML = `
            <h3 style="margin-bottom: 20px;">Правильных ответов: ${correctAnswers} из ${results.length}</h3>
            ${results.map((result, index) => `
                <div class="result-item ${result.isCorrect ? 'correct' : 'incorrect'}">
                    <h4>Вопрос ${index + 1}: ${result.question}</h4>
                    <p><strong>Ваш ответ:</strong> ${this.formatAnswer(result.userAnswer)}</p>
                    ${!result.isCorrect ? `<p><strong>Правильный ответ:</strong> ${this.formatAnswer(result.correctAnswer)}</p>` : ''}
                </div>
            `).join('')}
        `;

        document.getElementById('resultsDetails').innerHTML = detailsHTML;
    }

    formatAnswer(answer) {
        if (Array.isArray(answer)) {
            return answer.join(', ') || 'Не указано';
        }
        return answer || 'Не указано';
    }

    // ============================================
    // ОБЗОР КВИЗОВ
    // ============================================
    
    loadExplore() {
        const exploreGrid = document.getElementById('exploreGrid');
        const quizzes = this.getPublishedQuizzes();

        if (quizzes.length === 0) {
            exploreGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">🔍</div>
                    <h3 style="font-size: 24px; margin-bottom: 10px;">Пока нет опубликованных квизов</h3>
                    <p style="color: var(--text-secondary);">
                        Создайте и опубликуйте свой квиз, чтобы другие пользователи могли его пройти
                    </p>
                </div>
            `;
            return;
        }

        exploreGrid.innerHTML = quizzes.map(quiz => this.renderQuizCard(quiz, false)).join('');
    }

    // ============================================
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // ============================================
    
    editQuiz(quizId) {
        this.loadEditor(quizId);
        this.navigateTo('create');
    }

    viewStats(quizId) {
        const quiz = this.getQuizById(quizId);
        const results = this.getQuizResults(quizId);

        if (results.length === 0) {
            this.showToast('Пока нет результатов для этого квиза', 'error');
            return;
        }

        const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
        
        alert(`Статистика квиза "${quiz.title}"\n\n` +
              `Прохождений: ${results.length}\n` +
              `Средний балл: ${avgScore.toFixed(1)}%\n` +
              `Лучший результат: ${Math.max(...results.map(r => r.score))}%`);
    }

    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? '✓' : '✕';
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.4s ease reverse';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // ============================================
    // ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ
    // ============================================
    
    initializeEventListeners() {
        // Навигация
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                
                if (link.classList.contains('auth-required') && !this.currentUser) {
                    this.showToast('Необходимо войти в систему', 'error');
                    document.getElementById('loginModal').classList.add('active');
                    return;
                }
                
                this.navigateTo(page);
            });
        });

        // Кнопки героя
        document.getElementById('heroCreateBtn').addEventListener('click', () => {
            if (!this.currentUser) {
                document.getElementById('registerModal').classList.add('active');
            } else {
                this.navigateTo('create');
            }
        });

        document.getElementById('heroDemoBtn').addEventListener('click', () => {
            const demoQuizzes = this.getPublishedQuizzes();
            if (demoQuizzes.length > 0) {
                this.takeQuiz(demoQuizzes[0].id);
            }
        });

        // Модальные окна
        document.getElementById('loginBtn').addEventListener('click', () => {
            document.getElementById('loginModal').classList.add('active');
        });

        document.getElementById('registerBtn').addEventListener('click', () => {
            document.getElementById('registerModal').classList.add('active');
        });

        document.getElementById('closeLoginModal').addEventListener('click', () => {
            document.getElementById('loginModal').classList.remove('active');
        });

        document.getElementById('closeRegisterModal').addEventListener('click', () => {
            document.getElementById('registerModal').classList.remove('active');
        });

        document.getElementById('switchToRegister').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginModal').classList.remove('active');
            document.getElementById('registerModal').classList.add('active');
        });

        document.getElementById('switchToLogin').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('registerModal').classList.remove('active');
            document.getElementById('loginModal').classList.add('active');
        });

        // Формы
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            if (this.login(email, password)) {
                this.showToast('Успешный вход!', 'success');
                document.getElementById('loginModal').classList.remove('active');
                this.updateUI();
                this.navigateTo('dashboard');
            } else {
                this.showToast('Неверный email или пароль', 'error');
            }
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;

            if (password !== confirmPassword) {
                this.showToast('Пароли не совпадают', 'error');
                return;
            }

            if (password.length < 6) {
                this.showToast('Пароль должен содержать минимум 6 символов', 'error');
                return;
            }

            const result = this.register(name, email, password);
            if (result.success) {
                this.showToast('Регистрация успешна!', 'success');
                document.getElementById('registerModal').classList.remove('active');
                this.updateUI();
                this.navigateTo('dashboard');
            } else {
                this.showToast(result.message, 'error');
            }
        });

        // Выход
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
            this.showToast('Вы вышли из системы', 'success');
        });

        // Дашборд
        document.getElementById('createNewQuiz').addEventListener('click', () => {
            this.navigateTo('create');
        });

        // Редактор
        document.querySelectorAll('.btn-add-question').forEach(btn => {
            btn.addEventListener('click', () => {
                this.addQuestion(btn.dataset.type);
            });
        });

        document.getElementById('saveQuizDraft').addEventListener('click', () => {
            if (this.saveQuizData('draft')) {
                this.showToast('Квиз сохранен как черновик', 'success');
                this.navigateTo('dashboard');
            }
        });

        document.getElementById('publishQuiz').addEventListener('click', () => {
            if (this.saveQuizData('published')) {
                this.showToast('Квиз опубликован!', 'success');
                this.navigateTo('dashboard');
            }
        });

        // Прохождение квиза
        document.getElementById('prevQuestion').addEventListener('click', () => {
            this.prevQuestion();
        });

        document.getElementById('nextQuestion').addEventListener('click', () => {
            this.nextQuestion();
        });

        document.getElementById('finishQuiz').addEventListener('click', () => {
            this.finishQuiz();
        });

        // Результаты
        document.getElementById('retakeQuiz').addEventListener('click', () => {
            if (this.currentQuizTake) {
                this.takeQuiz(this.currentQuizTake.id);
            }
        });

        document.getElementById('backToDashboard').addEventListener('click', () => {
            this.navigateTo('dashboard');
        });

        // Закрытие модальных окон по клику вне контента
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }
}

// Инициализация приложения
const app = new QuizApp();
