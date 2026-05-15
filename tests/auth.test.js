const TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'test_password_placeholder';
const TEST_API_KEY = process.env.TEST_API_KEY || 'test_api_key_placeholder';
const TEST_JWT_SECRET = process.env.TEST_JWT_SECRET || 'test_jwt_secret_placeholder';

describe('Auth Routes', () => {
  test('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: TEST_DB_PASSWORD
      });

    expect(response.status).toBe(200);
  });

  test('should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'wrong-password'
      });

    expect(response.status).toBe(401);
  });

  test('should verify valid JWT token', async () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: 1 }, TEST_JWT_SECRET);

    const response = await request(app)
      .post('/api/auth/verify-token')
      .send({ token });

    expect(response.status).toBeDefined();
  });

  test('should generate reset token', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'test@example.com' });

    expect(response.body.token).toBeDefined();
  });
});
