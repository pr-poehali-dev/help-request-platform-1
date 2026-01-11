"""API для работы с задачами и пользователями"""
import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

def get_db_connection():
    """Создание подключения к базе данных"""
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: dict, context) -> dict:
    """Обработчик запросов для задач"""
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        if method == 'GET':
            return get_tasks(event)
        elif method == 'POST':
            return create_task(event)
        elif method == 'PUT':
            return update_task(event)
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

def get_tasks(event: dict) -> dict:
    """Получение списка задач с фильтрацией"""
    params = event.get('queryStringParameters') or {}
    category = params.get('category')
    status = params.get('status')
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    query = """
        SELECT 
            t.id, t.title, t.description, t.price, t.category, 
            t.location, t.execution_date as date, t.status,
            u.name as author_name, u.rating as author_rating, u.avatar_url as author_avatar,
            (SELECT COUNT(*) FROM task_responses WHERE task_id = t.id) as responses
        FROM tasks t
        JOIN users u ON t.author_id = u.id
        WHERE 1=1
    """
    query_params = []
    
    if category and category != 'Все категории':
        query += " AND t.category = %s"
        query_params.append(category)
    
    if status:
        query += " AND t.status = %s"
        query_params.append(status)
    
    query += " ORDER BY t.created_at DESC"
    
    cur.execute(query, query_params)
    tasks = cur.fetchall()
    
    result = []
    for task in tasks:
        result.append({
            'id': task['id'],
            'title': task['title'],
            'description': task['description'],
            'price': task['price'],
            'category': task['category'],
            'location': task['location'],
            'date': task['date'].strftime('%d.%m.%Y') if task['date'] else '',
            'status': task['status'],
            'author': {
                'name': task['author_name'],
                'rating': float(task['author_rating']) if task['author_rating'] else 0,
                'avatar': task['author_avatar']
            },
            'responses': task['responses']
        })
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(result),
        'isBase64Encoded': False
    }

def create_task(event: dict) -> dict:
    """Создание новой задачи"""
    body = json.loads(event.get('body', '{}'))
    
    required_fields = ['title', 'description', 'price', 'category', 'location', 'execution_date', 'author_id']
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
    
    cur.execute("""
        INSERT INTO tasks (title, description, price, category, location, execution_date, author_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        body['title'],
        body['description'],
        body['price'],
        body['category'],
        body['location'],
        body['execution_date'],
        body['author_id']
    ))
    
    task_id = cur.fetchone()['id']
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 201,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'id': task_id, 'message': 'Task created successfully'}),
        'isBase64Encoded': False
    }

def update_task(event: dict) -> dict:
    """Обновление статуса задачи"""
    body = json.loads(event.get('body', '{}'))
    
    if 'id' not in body or 'status' not in body:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing id or status'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        UPDATE tasks 
        SET status = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
    """, (body['status'], body['id']))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'message': 'Task updated successfully'}),
        'isBase64Encoded': False
    }
