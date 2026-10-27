/**
 * Integration Test for Express Server Routes & Security Middleware
 * Uses supertest to verify CSRF tokens, 401 unauthenticated API blocks, and static serving.
 */
const request = require('supertest');
const app = require('../server');

describe('Express Server API Integration Tests', () => {

  test('GET /api/csrf-token returns valid CSRF token', async () => {
    const res = await request(app).get('/api/csrf-token');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.csrfToken).toBe('string');
    expect(res.body.csrfToken.length).toBeGreaterThan(16);
  });

  test('GET / redirects unauthenticated visitor to /login.html', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login.html');
  });

  test('GET /api/employees returns 401 when accessed without active session', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Accept', 'application/json');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Authentication required');
  });

  test('GET /api/payroll/runs returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .get('/api/payroll/runs')
      .set('Accept', 'application/json');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /non-existent-route returns 404', async () => {
    const res = await request(app)
      .get('/api/non-existent-route')
      .set('Accept', 'application/json');

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
