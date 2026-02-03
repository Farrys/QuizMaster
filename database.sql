-- ============================================
-- БАЗА ДАННЫХ QuizMaster
-- PostgreSQL Schema
-- ============================================

-- Создание базы данных
CREATE DATABASE quizmaster;

-- Подключение к базе данных
\c quizmaster;

-- ============================================
-- ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ
-- ============================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false
);

-- Индексы для оптимизации
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================
-- ТАБЛИЦА КВИЗОВ
-- ============================================

CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    time_limit INTEGER DEFAULT 0, -- в минутах, 0 = без ограничения
    shuffle_questions BOOLEAN DEFAULT false,
    show_results BOOLEAN DEFAULT true,
    allow_retake BOOLEAN DEFAULT true,
    passing_score INTEGER DEFAULT 0, -- минимальный процент для прохождения
    thumbnail_url VARCHAR(500),
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP
);

-- Индексы для оптимизации
CREATE INDEX idx_quizzes_author_id ON quizzes(author_id);
CREATE INDEX idx_quizzes_category ON quizzes(category);
CREATE INDEX idx_quizzes_status ON quizzes(status);
CREATE INDEX idx_quizzes_created_at ON quizzes(created_at);

-- ============================================
-- ТАБЛИЦА ВОПРОСОВ
-- ============================================

CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('single', 'multiple', 'text', 'drag')),
    text TEXT NOT NULL,
    explanation TEXT, -- объяснение правильного ответа
    points INTEGER DEFAULT 1, -- баллы за правильный ответ
    correct_answer TEXT, -- для текстовых вопросов
    position INTEGER NOT NULL, -- порядок вопроса
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации
CREATE INDEX idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX idx_questions_position ON questions(quiz_id, position);

-- ============================================
-- ТАБЛИЦА ВАРИАНТОВ ОТВЕТОВ
-- ============================================

CREATE TABLE options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    position INTEGER NOT NULL,
    image_url VARCHAR(500)
);

-- Индексы для оптимизации
CREATE INDEX idx_options_question_id ON options(question_id);

-- ============================================
-- ТАБЛИЦА РЕЗУЛЬТАТОВ
-- ============================================

CREATE TABLE results (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- может быть NULL для анонимных
    score INTEGER NOT NULL, -- процент правильных ответов
    correct_answers INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    time_spent INTEGER, -- время в секундах
    answers JSONB NOT NULL, -- детальные ответы пользователя
    ip_address INET,
    user_agent TEXT,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации
CREATE INDEX idx_results_quiz_id ON results(quiz_id);
CREATE INDEX idx_results_user_id ON results(user_id);
CREATE INDEX idx_results_completed_at ON results(completed_at);
CREATE INDEX idx_results_score ON results(quiz_id, score);

-- ============================================
-- ТАБЛИЦА КАТЕГОРИЙ
-- ============================================

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- HEX код цвета
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вставка базовых категорий
INSERT INTO categories (name, slug, description, icon, color) VALUES
('Образование', 'education', 'Образовательные квизы и тесты', '📚', '#3498db'),
('Развлечения', 'entertainment', 'Развлекательные квизы', '🎮', '#9b59b6'),
('Бизнес', 'business', 'Бизнес и менеджмент', '💼', '#2ecc71'),
('Здоровье', 'health', 'Здоровье и медицина', '🏥', '#e74c3c'),
('Технологии', 'technology', 'IT и технологии', '💻', '#1abc9c');

-- ============================================
-- ТАБЛИЦА ТЕГОВ
-- ============================================

CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- СВЯЗЬ КВИЗОВ И ТЕГОВ (многие-ко-многим)
-- ============================================

CREATE TABLE quiz_tags (
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (quiz_id, tag_id)
);

-- Индексы
CREATE INDEX idx_quiz_tags_quiz_id ON quiz_tags(quiz_id);
CREATE INDEX idx_quiz_tags_tag_id ON quiz_tags(tag_id);

-- ============================================
-- ТАБЛИЦА ИЗБРАННОГО
-- ============================================

CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, quiz_id)
);

-- Индексы
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_quiz_id ON favorites(quiz_id);

-- ============================================
-- ТАБЛИЦА КОММЕНТАРИЕВ
-- ============================================

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX idx_comments_quiz_id ON comments(quiz_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- ============================================
-- ТАБЛИЦА ДОСТИЖЕНИЙ
-- ============================================

CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    condition_type VARCHAR(50), -- 'quizzes_created', 'quizzes_completed', 'perfect_scores'
    condition_value INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Базовые достижения
INSERT INTO achievements (name, description, icon, condition_type, condition_value) VALUES
('Первый квиз', 'Создайте свой первый квиз', '🎯', 'quizzes_created', 1),
('Эрудит', 'Пройдите 10 квизов', '🧠', 'quizzes_completed', 10),
('Мастер', 'Получите 5 идеальных результатов', '⭐', 'perfect_scores', 5),
('Создатель', 'Создайте 10 квизов', '🏆', 'quizzes_created', 10);

-- ============================================
-- СВЯЗЬ ПОЛЬЗОВАТЕЛЕЙ И ДОСТИЖЕНИЙ
-- ============================================

CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

-- Индексы
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);

-- ============================================
-- ТАБЛИЦА УВЕДОМЛЕНИЙ
-- ============================================

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'quiz_completed', 'new_comment', 'achievement_earned'
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);

-- ============================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- ============================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для подсчета статистики квиза
CREATE OR REPLACE FUNCTION get_quiz_stats(quiz_id_param INTEGER)
RETURNS TABLE (
    total_attempts BIGINT,
    avg_score NUMERIC,
    avg_time INTEGER,
    completion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_attempts,
        ROUND(AVG(score), 2) as avg_score,
        ROUND(AVG(time_spent))::INTEGER as avg_time,
        ROUND((COUNT(CASE WHEN score >= (SELECT passing_score FROM quizzes WHERE id = quiz_id_param) THEN 1 END)::NUMERIC / COUNT(*)) * 100, 2) as completion_rate
    FROM results
    WHERE quiz_id = quiz_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ПРЕДСТАВЛЕНИЯ (VIEWS)
-- ============================================

-- Представление популярных квизов
CREATE VIEW popular_quizzes AS
SELECT 
    q.*,
    u.name as author_name,
    COUNT(DISTINCT r.id) as attempts_count,
    ROUND(AVG(r.score), 2) as avg_score,
    COUNT(DISTINCT f.user_id) as favorites_count
FROM quizzes q
JOIN users u ON q.author_id = u.id
LEFT JOIN results r ON q.id = r.quiz_id
LEFT JOIN favorites f ON q.id = f.quiz_id
WHERE q.status = 'published'
GROUP BY q.id, u.name
ORDER BY attempts_count DESC, q.created_at DESC;

-- Представление топ-пользователей
CREATE VIEW top_users AS
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(DISTINCT q.id) as quizzes_created,
    COUNT(DISTINCT r.id) as quizzes_completed,
    ROUND(AVG(r.score), 2) as avg_score,
    COUNT(DISTINCT ua.achievement_id) as achievements_count
FROM users u
LEFT JOIN quizzes q ON u.id = q.author_id
LEFT JOIN results r ON u.id = r.user_id
LEFT JOIN user_achievements ua ON u.id = ua.user_id
GROUP BY u.id, u.name, u.email
ORDER BY quizzes_created DESC, quizzes_completed DESC;

-- ============================================
-- ПРИМЕРЫ ЗАПРОСОВ
-- ============================================

-- Получить все квизы пользователя с статистикой
/*
SELECT 
    q.*,
    COUNT(DISTINCT r.id) as attempts,
    ROUND(AVG(r.score), 2) as avg_score
FROM quizzes q
LEFT JOIN results r ON q.id = r.quiz_id
WHERE q.author_id = 1
GROUP BY q.id
ORDER BY q.created_at DESC;
*/

-- Получить топ-10 квизов по популярности
/*
SELECT * FROM popular_quizzes LIMIT 10;
*/

-- Получить результаты пользователя
/*
SELECT 
    r.*,
    q.title as quiz_title,
    q.category
FROM results r
JOIN quizzes q ON r.quiz_id = q.id
WHERE r.user_id = 1
ORDER BY r.completed_at DESC;
*/

-- Получить детальную статистику квиза
/*
SELECT * FROM get_quiz_stats(1);
*/

-- ============================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ (RLS - Row Level Security)
-- ============================================

-- Включение RLS для таблиц
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Политики для квизов (пример)
-- CREATE POLICY quiz_select_policy ON quizzes
--     FOR SELECT
--     USING (status = 'published' OR author_id = current_user_id());

-- CREATE POLICY quiz_update_policy ON quizzes
--     FOR UPDATE
--     USING (author_id = current_user_id());

-- ============================================
-- КОНЕЦ СКРИПТА
-- ============================================

-- Вывод информации о созданных таблицах
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

COMMENT ON DATABASE quizmaster IS 'База данных для приложения QuizMaster - сервис создания квизов и тестов';
