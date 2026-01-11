-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(20) NOT NULL CHECK (role IN ('client', 'worker')),
    rating DECIMAL(3,2) DEFAULT 0.00,
    avatar_url TEXT,
    bio TEXT,
    specializations TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы задач
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    price INTEGER NOT NULL,
    category VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    execution_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled')),
    author_id INTEGER NOT NULL REFERENCES users(id),
    worker_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы откликов
CREATE TABLE IF NOT EXISTS task_responses (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    worker_id INTEGER NOT NULL REFERENCES users(id),
    comment TEXT,
    proposed_price INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, worker_id)
);

-- Создание таблицы отзывов
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    reviewer_id INTEGER NOT NULL REFERENCES users(id),
    reviewee_id INTEGER NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, reviewer_id)
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_author_id ON tasks(author_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_responses_task_id ON task_responses(task_id);
CREATE INDEX IF NOT EXISTS idx_task_responses_worker_id ON task_responses(worker_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);

-- Вставка тестовых данных
INSERT INTO users (name, email, phone, role, rating, bio, specializations) VALUES
('Анна К.', 'anna.k@example.com', '+79001234567', 'client', 4.80, 'Ищу надежных мастеров для дома', NULL),
('Дмитрий С.', 'dmitry.s@example.com', '+79002345678', 'client', 5.00, 'Требовательный заказчик', NULL),
('Ольга П.', 'olga.p@example.com', '+79003456789', 'client', 4.50, NULL, NULL),
('Сергей М.', 'sergey.m@example.com', '+79004567890', 'client', 4.90, NULL, NULL),
('Иван Т.', 'ivan.t@example.com', '+79005678901', 'client', 4.70, NULL, NULL),
('Марина Л.', 'marina.l@example.com', '+79006789012', 'client', 5.00, 'Всегда вовремя оплачиваю', NULL),
('Иван Петров', 'ivan.petrov@example.com', '+79007890123', 'worker', 5.00, 'Опытный мастер с 8-летним стажем. Работаю быстро и качественно. Всегда на связи, гарантия на работы 6 месяцев.', ARRAY['Ремонт техники', 'Сантехника', 'Электрика', 'IT услуги'])
ON CONFLICT (email) DO NOTHING;

INSERT INTO tasks (title, description, price, category, location, execution_date, status, author_id) VALUES
('Установить кондиционер', 'Требуется установка кондиционера в квартире, 2 комнаты', 5000, 'Ремонт', 'Москва, СВАО', '2026-01-15', 'new', 1),
('Сборка мебели ИКЕА', 'Нужно собрать шкаф и комод, инструменты есть', 3000, 'Бытовые услуги', 'Санкт-Петербург', '2026-01-16', 'new', 2),
('Ремонт стиральной машины', 'Машинка не включается, нужна диагностика', 2500, 'Ремонт техники', 'Москва, ЦАО', '2026-01-14', 'in_progress', 3),
('Перевезти вещи на дачу', 'Нужен грузчик с газелью, 3 часа работы', 4000, 'Переезды', 'Московская область', '2026-01-17', 'new', 4),
('Настроить компьютер', 'Установить Windows, настроить программы', 2000, 'IT услуги', 'Москва, ЗАО', '2026-01-15', 'new', 5),
('Убрать квартиру после ремонта', 'Генеральная уборка 3х комнатной квартиры', 6000, 'Уборка', 'Москва, ЮЗАО', '2026-01-18', 'completed', 6);

INSERT INTO task_responses (task_id, worker_id, comment, proposed_price, status) VALUES
(1, 7, 'Готов выполнить качественно', 5000, 'pending'),
(2, 7, 'Большой опыт сборки мебели ИКЕА', 2800, 'pending'),
(5, 7, 'Установлю Windows 11 и все программы', 2000, 'accepted');
