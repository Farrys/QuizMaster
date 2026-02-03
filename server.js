// ============================================
// СЕРВЕРНАЯ ЧАСТЬ (Node.js + Express)
// Пример реализации backend API
// ============================================

require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ============================================
// MIDDLEWARE
// ============================================

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Подключение к базе данных PostgreSQL
const isProduction = process.env.NODE_ENV === 'production';
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

const pool = new Pool(
    hasDatabaseUrl
        ? {
              connectionString: process.env.DATABASE_URL,
              ssl: isProduction ? { rejectUnauthorized: false } : false
          }
        : {
              user: process.env.DB_USER || 'postgres',
              host: process.env.DB_HOST || 'localhost',
              database: process.env.DB_NAME || 'quizmaster',
              password: process.env.DB_PASSWORD || 'password',
              port: process.env.DB_PORT || 5432
          }
);

pool.on('error', (error) => {
    console.error('Ошибка пула PostgreSQL:', error);
});

// Middleware для проверки аутентификации
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Требуется аутентификация' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Недействительный токен' });
    }
};

// ============================================
// АУТЕНТИФИКАЦИЯ
// ============================================

// Регистрация
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Валидация
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
        }

        // Проверка существования пользователя
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
        }

        // Хеширование пароля
        const passwordHash = await bcrypt.hash(password, 10);

        // Создание пользователя
        const result = await pool.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
            [name, email, passwordHash]
        );

        const user = result.rows[0];

        // Генерация токена
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.created_at
            },
            token
        });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Валидация
        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        // Поиск пользователя
        const result = await pool.query(
            'SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const user = result.rows[0];

        // Проверка пароля
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        // Генерация токена
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.created_at
            },
            token
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Получение текущего пользователя
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, created_at FROM users WHERE id = $1',
            [req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// ============================================
// КВИЗЫ
// ============================================

// Получение всех квизов
app.get('/api/quizzes', async (req, res) => {
    try {
        const { category, status, authorId } = req.query;
        
        let query = `
            SELECT q.*, u.name as author_name,
                   (SELECT COUNT(*) FROM results WHERE quiz_id = q.id) as attempts_count
            FROM quizzes q
            JOIN users u ON q.author_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (category) {
            query += ` AND q.category = $${paramIndex++}`;
            params.push(category);
        }

        if (status) {
            query += ` AND q.status = $${paramIndex++}`;
            params.push(status);
        }

        if (authorId) {
            query += ` AND q.author_id = $${paramIndex++}`;
            params.push(authorId);
        }

        query += ' ORDER BY q.created_at DESC';

        const result = await pool.query(query, params);

        // Получаем вопросы для каждого квиза
        const quizzes = await Promise.all(result.rows.map(async (quiz) => {
            const questionsResult = await pool.query(
                'SELECT * FROM questions WHERE quiz_id = $1 ORDER BY position',
                [quiz.id]
            );

            const questions = await Promise.all(questionsResult.rows.map(async (question) => {
                if (question.type !== 'text') {
                    const optionsResult = await pool.query(
                        'SELECT * FROM options WHERE question_id = $1 ORDER BY position',
                        [question.id]
                    );
                    question.options = optionsResult.rows;
                }
                return question;
            }));

            quiz.questions = questions;
            return quiz;
        }));

        res.json({ quizzes });
    } catch (error) {
        console.error('Ошибка получения квизов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Получение квиза по ID
app.get('/api/quizzes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const quizResult = await pool.query(
            `SELECT q.*, u.name as author_name
             FROM quizzes q
             JOIN users u ON q.author_id = u.id
             WHERE q.id = $1`,
            [id]
        );

        if (quizResult.rows.length === 0) {
            return res.status(404).json({ error: 'Квиз не найден' });
        }

        const quiz = quizResult.rows[0];

        // Получаем вопросы
        const questionsResult = await pool.query(
            'SELECT * FROM questions WHERE quiz_id = $1 ORDER BY position',
            [id]
        );

        const questions = await Promise.all(questionsResult.rows.map(async (question) => {
            if (question.type !== 'text') {
                const optionsResult = await pool.query(
                    'SELECT * FROM options WHERE question_id = $1 ORDER BY position',
                    [question.id]
                );
                question.options = optionsResult.rows;
            }
            return question;
        }));

        quiz.questions = questions;

        res.json({ quiz });
    } catch (error) {
        console.error('Ошибка получения квиза:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Создание квиза
app.post('/api/quizzes', authMiddleware, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const {
            title,
            description,
            category,
            timeLimit,
            shuffleQuestions,
            showResults,
            allowRetake,
            questions,
            status
        } = req.body;

        // Валидация
        if (!title || !category || !questions || questions.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Обязательные поля не заполнены' });
        }

        // Создание квиза
        const quizResult = await client.query(
            `INSERT INTO quizzes 
             (title, description, category, author_id, status, time_limit, 
              shuffle_questions, show_results, allow_retake)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [title, description, category, req.userId, status || 'draft',
             timeLimit, shuffleQuestions, showResults, allowRetake]
        );

        const quiz = quizResult.rows[0];

        // Создание вопросов
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            
            const questionResult = await client.query(
                `INSERT INTO questions (quiz_id, type, text, correct_answer, position)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [quiz.id, question.type, question.text, 
                 question.correctAnswer || null, i]
            );

            const questionId = questionResult.rows[0].id;

            // Создание вариантов ответа
            if (question.options && question.options.length > 0) {
                for (let j = 0; j < question.options.length; j++) {
                    const option = question.options[j];
                    
                    await client.query(
                        `INSERT INTO options (question_id, text, is_correct, position)
                         VALUES ($1, $2, $3, $4)`,
                        [questionId, option.text, option.isCorrect, j]
                    );
                }
            }
        }

        await client.query('COMMIT');

        res.status(201).json({ 
            quiz,
            message: 'Квиз успешно создан'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка создания квиза:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    } finally {
        client.release();
    }
});

// Обновление квиза
app.put('/api/quizzes/:id', authMiddleware, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id } = req.params;

        // Проверка прав
        const ownerCheck = await client.query(
            'SELECT author_id FROM quizzes WHERE id = $1',
            [id]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Квиз не найден' });
        }

        if (ownerCheck.rows[0].author_id !== req.userId) {
            return res.status(403).json({ error: 'Недостаточно прав' });
        }

        await client.query('BEGIN');

        const {
            title,
            description,
            category,
            timeLimit,
            shuffleQuestions,
            showResults,
            allowRetake,
            questions,
            status
        } = req.body;

        // Обновление квиза
        await client.query(
            `UPDATE quizzes SET
             title = $1, description = $2, category = $3, status = $4,
             time_limit = $5, shuffle_questions = $6, show_results = $7,
             allow_retake = $8
             WHERE id = $9`,
            [title, description, category, status, timeLimit,
             shuffleQuestions, showResults, allowRetake, id]
        );

        // Удаление старых вопросов и вариантов
        await client.query('DELETE FROM questions WHERE quiz_id = $1', [id]);

        // Создание новых вопросов
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            
            const questionResult = await client.query(
                `INSERT INTO questions (quiz_id, type, text, correct_answer, position)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [id, question.type, question.text, 
                 question.correctAnswer || null, i]
            );

            const questionId = questionResult.rows[0].id;

            if (question.options && question.options.length > 0) {
                for (let j = 0; j < question.options.length; j++) {
                    const option = question.options[j];
                    
                    await client.query(
                        `INSERT INTO options (question_id, text, is_correct, position)
                         VALUES ($1, $2, $3, $4)`,
                        [questionId, option.text, option.isCorrect, j]
                    );
                }
            }
        }

        await client.query('COMMIT');

        res.json({ message: 'Квиз успешно обновлен' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка обновления квиза:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    } finally {
        client.release();
    }
});

// Удаление квиза
app.delete('/api/quizzes/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Проверка прав
        const ownerCheck = await pool.query(
            'SELECT author_id FROM quizzes WHERE id = $1',
            [id]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Квиз не найден' });
        }

        if (ownerCheck.rows[0].author_id !== req.userId) {
            return res.status(403).json({ error: 'Недостаточно прав' });
        }

        await pool.query('DELETE FROM quizzes WHERE id = $1', [id]);

        res.json({ message: 'Квиз успешно удален' });
    } catch (error) {
        console.error('Ошибка удаления квиза:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// ============================================
// РЕЗУЛЬТАТЫ
// ============================================

// Отправка результата прохождения
app.post('/api/quizzes/:id/submit', async (req, res) => {
    try {
        const { id } = req.params;
        const { answers } = req.body;
        const userId = req.userId || null; // Может быть анонимным

        // Получаем квиз с правильными ответами
        const quizResult = await pool.query(
            'SELECT * FROM quizzes WHERE id = $1',
            [id]
        );

        if (quizResult.rows.length === 0) {
            return res.status(404).json({ error: 'Квиз не найден' });
        }

        // Получаем вопросы с правильными ответами
        const questionsResult = await pool.query(
            'SELECT * FROM questions WHERE quiz_id = $1',
            [id]
        );

        let correctAnswers = 0;
        const detailedResults = [];

        for (const question of questionsResult.rows) {
            const userAnswer = answers.find(a => a.questionId === question.id);
            
            let isCorrect = false;

            if (question.type === 'text') {
                isCorrect = userAnswer && 
                    userAnswer.answer.toLowerCase().trim() === 
                    question.correct_answer.toLowerCase().trim();
            } else {
                const optionsResult = await pool.query(
                    'SELECT * FROM options WHERE question_id = $1',
                    [question.id]
                );

                const correctOptionIds = optionsResult.rows
                    .filter(o => o.is_correct)
                    .map(o => o.id)
                    .sort();

                const userOptionIds = (userAnswer?.answer || []).sort();

                isCorrect = JSON.stringify(correctOptionIds) === 
                           JSON.stringify(userOptionIds);
            }

            if (isCorrect) correctAnswers++;

            detailedResults.push({
                questionId: question.id,
                isCorrect,
                userAnswer: userAnswer?.answer
            });
        }

        const totalQuestions = questionsResult.rows.length;
        const score = Math.round((correctAnswers / totalQuestions) * 100);

        // Сохраняем результат
        const resultInsert = await pool.query(
            `INSERT INTO results 
             (quiz_id, user_id, score, correct_answers, total_questions, answers)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [id, userId, score, correctAnswers, totalQuestions, 
             JSON.stringify(detailedResults)]
        );

        res.json({
            result: {
                id: resultInsert.rows[0].id,
                score,
                correctAnswers,
                totalQuestions,
                details: detailedResults
            }
        });
    } catch (error) {
        console.error('Ошибка отправки результата:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Получение результатов квиза
app.get('/api/quizzes/:id/results', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Проверка прав (только автор может видеть все результаты)
        const quizResult = await pool.query(
            'SELECT author_id FROM quizzes WHERE id = $1',
            [id]
        );

        if (quizResult.rows.length === 0) {
            return res.status(404).json({ error: 'Квиз не найден' });
        }

        if (quizResult.rows[0].author_id !== req.userId) {
            return res.status(403).json({ error: 'Недостаточно прав' });
        }

        const resultsData = await pool.query(
            `SELECT r.*, u.name as user_name, u.email as user_email
             FROM results r
             LEFT JOIN users u ON r.user_id = u.id
             WHERE r.quiz_id = $1
             ORDER BY r.completed_at DESC`,
            [id]
        );

        res.json({ results: resultsData.rows });
    } catch (error) {
        console.error('Ошибка получения результатов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Экспорт результатов в CSV
app.get('/api/quizzes/:id/export', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Проверка прав
        const quizResult = await pool.query(
            'SELECT author_id, title FROM quizzes WHERE id = $1',
            [id]
        );

        if (quizResult.rows.length === 0) {
            return res.status(404).json({ error: 'Квиз не найден' });
        }

        if (quizResult.rows[0].author_id !== req.userId) {
            return res.status(403).json({ error: 'Недостаточно прав' });
        }

        const resultsData = await pool.query(
            `SELECT r.*, u.name as user_name, u.email as user_email
             FROM results r
             LEFT JOIN users u ON r.user_id = u.id
             WHERE r.quiz_id = $1
             ORDER BY r.completed_at DESC`,
            [id]
        );

        // Формирование CSV
        let csv = 'Пользователь,Email,Балл,Правильных ответов,Всего вопросов,Дата прохождения\n';
        
        resultsData.rows.forEach(result => {
            csv += `${result.user_name || 'Аноним'},${result.user_email || '-'},${result.score},${result.correct_answers},${result.total_questions},${result.completed_at}\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="results_${id}.csv"`);
        res.send('\uFEFF' + csv); // BOM для корректной кодировки
    } catch (error) {
        console.error('Ошибка экспорта результатов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Сервер запущен на порту ${PORT}`);
        console.log(`http://localhost:${PORT}`);
    });
}

module.exports = app;

// Обработка ошибок
process.on('unhandledRejection', (error) => {
    console.error('Необработанная ошибка:', error);
});
