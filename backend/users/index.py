"""API для работы с профилями пользователей"""
import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    """Создание подключения к базе данных"""
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: dict, context) -> dict:
    """Обработчик запросов для пользователей"""
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        if method == 'GET':
            return get_user(event)
        elif method == 'POST':
            return create_user(event)
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

def get_user(event: dict) -> dict:
    """Получение профиля пользователя"""
    params = event.get('queryStringParameters') or {}
    user_id = params.get('id')
    
    if not user_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing user id'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("""
        SELECT 
            u.id, u.name, u.email, u.phone, u.role, u.rating, 
            u.avatar_url, u.bio, u.specializations, u.created_at,
            (SELECT COUNT(*) FROM tasks WHERE author_id = u.id AND status = 'completed') as completed_tasks,
            (SELECT COUNT(*) FROM tasks WHERE worker_id = u.id AND status = 'completed') as completed_works,
            (SELECT SUM(price) FROM tasks WHERE worker_id = u.id AND status = 'completed') as total_earned
        FROM users u
        WHERE u.id = %s
    """, (user_id,))
    
    user = cur.fetchone()
    
    if not user:
        cur.close()
        conn.close()
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User not found'}),
            'isBase64Encoded': False
        }
    
    cur.execute("""
        SELECT t.title, t.price, t.execution_date, r.rating, r.comment
        FROM tasks t
        LEFT JOIN reviews r ON t.id = r.task_id AND r.reviewee_id = %s
        WHERE t.worker_id = %s AND t.status = 'completed'
        ORDER BY t.execution_date DESC
        LIMIT 10
    """, (user_id, user_id))
    
    work_history = cur.fetchall()
    
    result = {
        'id': user['id'],
        'name': user['name'],
        'email': user['email'],
        'phone': user['phone'],
        'role': user['role'],
        'rating': float(user['rating']) if user['rating'] else 0,
        'avatar': user['avatar_url'],
        'bio': user['bio'],
        'specializations': user['specializations'] or [],
        'memberSince': user['created_at'].strftime('%Y-%m-%d') if user['created_at'] else '',
        'stats': {
            'completedTasks': user['completed_tasks'] or 0,
            'completedWorks': user['completed_works'] or 0,
            'totalEarned': user['total_earned'] or 0
        },
        'workHistory': [
            {
                'task': h['title'],
                'price': h['price'],
                'date': h['execution_date'].strftime('%d.%m.%Y') if h['execution_date'] else '',
                'rating': h['rating'] or 0,
                'comment': h['comment']
            } for h in work_history
        ]
    }
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(result),
        'isBase64Encoded': False
    }

def create_user(event: dict) -> dict:
    """Создание нового пользователя"""
    body = json.loads(event.get('body', '{}'))
    
    required_fields = ['name', 'email', 'role']
    for field in required_fields:
        if field not in body:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'Missing required field: {field}'}),
                'isBase64Encoded': False
            }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute("""
            INSERT INTO users (name, email, phone, role, bio, specializations)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            body['name'],
            body['email'],
            body.get('phone'),
            body['role'],
            body.get('bio'),
            body.get('specializations')
        ))
        
        user_id = cur.fetchone()['id']
        conn.commit()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'id': user_id, 'message': 'User created successfully'}),
            'isBase64Encoded': False
        }
    except psycopg2.IntegrityError:
        return {
            'statusCode': 409,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User with this email already exists'}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()
