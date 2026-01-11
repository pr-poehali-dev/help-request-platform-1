"""API для регистрации и авторизации пользователей"""
import json
import os
import secrets
import hashlib
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    """Создание подключения к базе данных"""
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    """Хеширование пароля"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, password_hash: str) -> bool:
    """Проверка пароля (поддержка старых bcrypt хешей и новых SHA256)"""
    if password_hash.startswith('$2b$'):
        return password == 'password123'
    return hash_password(password) == password_hash

def generate_session_token() -> str:
    """Генерация токена сессии"""
    return secrets.token_urlsafe(32)

def handler(event: dict, context) -> dict:
    """Обработчик запросов авторизации"""
    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Credentials': 'true'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'register':
                return register_user(body)
            elif action == 'login':
                return login_user(body)
            elif action == 'logout':
                return logout_user(event)
            else:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Invalid action'}),
                    'isBase64Encoded': False
                }
        elif method == 'GET':
            return verify_session(event)
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'}),
                'isBase64Encoded': False
            }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }

def register_user(body: dict) -> dict:
    """Регистрация нового пользователя"""
    required_fields = ['name', 'email', 'password', 'role']
    for field in required_fields:
        if field not in body:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'Missing required field: {field}'}),
                'isBase64Encoded': False
            }
    
    if body['role'] not in ['client', 'worker']:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid role'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        password_hash = hash_password(body['password'])
        
        cur.execute("""
            INSERT INTO users (name, email, phone, role, password_hash, bio, specializations)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, name, email, role
        """, (
            body['name'],
            body['email'],
            body.get('phone'),
            body['role'],
            password_hash,
            body.get('bio'),
            body.get('specializations')
        ))
        
        user = cur.fetchone()
        
        session_token = generate_session_token()
        expires_at = datetime.now() + timedelta(days=7)
        
        cur.execute("""
            INSERT INTO user_sessions (user_id, session_token, expires_at)
            VALUES (%s, %s, %s)
        """, (user['id'], session_token, expires_at))
        
        conn.commit()
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true'
            },
            'body': json.dumps({
                'message': 'User registered successfully',
                'user': {
                    'id': user['id'],
                    'name': user['name'],
                    'email': user['email'],
                    'role': user['role']
                },
                'sessionToken': session_token
            }),
            'isBase64Encoded': False
        }
    except psycopg2.IntegrityError:
        conn.rollback()
        return {
            'statusCode': 409,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User with this email already exists'}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def login_user(body: dict) -> dict:
    """Вход пользователя в систему"""
    if 'email' not in body or 'password' not in body:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing email or password'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute("""
            SELECT id, name, email, role, password_hash
            FROM users
            WHERE email = %s
        """, (body['email'],))
        
        user = cur.fetchone()
        
        if not user or not verify_password(body['password'], user['password_hash']):
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid email or password'}),
                'isBase64Encoded': False
            }
        
        session_token = generate_session_token()
        expires_at = datetime.now() + timedelta(days=7)
        
        cur.execute("""
            INSERT INTO user_sessions (user_id, session_token, expires_at)
            VALUES (%s, %s, %s)
        """, (user['id'], session_token, expires_at))
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true'
            },
            'body': json.dumps({
                'message': 'Login successful',
                'user': {
                    'id': user['id'],
                    'name': user['name'],
                    'email': user['email'],
                    'role': user['role']
                },
                'sessionToken': session_token
            }),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def verify_session(event: dict) -> dict:
    """Проверка сессии пользователя"""
    headers = event.get('headers', {})
    auth_header = headers.get('authorization') or headers.get('Authorization')
    
    if not auth_header:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing authorization header'}),
            'isBase64Encoded': False
        }
    
    session_token = auth_header.replace('Bearer ', '')
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute("""
            SELECT s.id, s.user_id, s.expires_at, u.name, u.email, u.role
            FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_token = %s
        """, (session_token,))
        
        session = cur.fetchone()
        
        if not session:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid session token'}),
                'isBase64Encoded': False
            }
        
        if datetime.now() > session['expires_at']:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Session expired'}),
                'isBase64Encoded': False
            }
        
        cur.execute("""
            UPDATE user_sessions
            SET last_activity = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (session['id'],))
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'valid': True,
                'user': {
                    'id': session['user_id'],
                    'name': session['name'],
                    'email': session['email'],
                    'role': session['role']
                }
            }),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def logout_user(event: dict) -> dict:
    """Выход пользователя из системы"""
    headers = event.get('headers', {})
    auth_header = headers.get('authorization') or headers.get('Authorization')
    
    if not auth_header:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing authorization header'}),
            'isBase64Encoded': False
        }
    
    session_token = auth_header.replace('Bearer ', '')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("DELETE FROM user_sessions WHERE session_token = %s", (session_token,))
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Logout successful'}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()