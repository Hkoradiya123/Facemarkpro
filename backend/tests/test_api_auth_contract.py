import unittest
from unittest.mock import patch
import os
import sys

import bcrypt
from flask import Flask

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.routes.api_routes import bp as api_bp


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = docs or []

    def find_one(self, query):
        for doc in self.docs:
            matched = True
            for key, value in query.items():
                if doc.get(key) != value:
                    matched = False
                    break
            if matched:
                return doc
        return None


class ApiAuthContractTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config['SECRET_KEY'] = 'test-secret'
        self.app.config['TESTING'] = True
        self.app.register_blueprint(api_bp)
        self.client = self.app.test_client()

    @patch('app.routes.api_routes.get_collections')
    def test_faculty_login_contract(self, mock_get_collections):
        password = b'secret123'
        hashed = bcrypt.hashpw(password, bcrypt.gensalt())
        mock_get_collections.return_value = {
            'faculty': FakeCollection([
                {
                    'email': 'teacher@example.com',
                    'name': 'Teacher One',
                    'role': 'teacher',
                    'password': hashed,
                }
            ])
        }

        response = self.client.post(
            '/api/auth/login/faculty',
            json={'email': 'teacher@example.com', 'password': 'secret123'},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload['success'])
        self.assertIn('user', payload)
        self.assertIn('role', payload)
        self.assertIn('redirectPath', payload)
        self.assertIn('errors', payload)

    def test_whoami_anonymous(self):
        response = self.client.get('/api/auth/whoami')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload['success'])
        self.assertFalse(payload['authenticated'])
        self.assertIsNone(payload['role'])

    @patch('app.routes.api_routes.get_collections')
    def test_student_login_invalid_credentials(self, mock_get_collections):
        mock_get_collections.return_value = {
            'students': FakeCollection([])
        }
        response = self.client.post(
            '/api/auth/login/student',
            json={'roll_no': '22CS101', 'password': 'bad'},
        )
        self.assertEqual(response.status_code, 401)
        payload = response.get_json()
        self.assertFalse(payload['success'])
        self.assertIn('errors', payload)


if __name__ == '__main__':
    unittest.main()
