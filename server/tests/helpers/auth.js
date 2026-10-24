const request = require('supertest');
const app = require('../../src/app');
const { signToken } = require('../../src/services/auth.service');

// A valid login token for a user with the given role. The server trusts a genuine,
// unexpired token, so tests can mint one without creating a user.
const tokenFor = (role = 'ADMIN', id = 1) => signToken({ id, role });

// supertest, signed in. Use `api()` instead of `request(app)`:
//   api().get('/api/tickets')            as an admin (can do everything)
//   api(tokenFor('AGENT')).delete(...)   as an agent
function api(token = tokenFor('ADMIN')) {
  const auth = (test) => test.set('Authorization', `Bearer ${token}`);
  return {
    get: (url) => auth(request(app).get(url)),
    post: (url) => auth(request(app).post(url)),
    put: (url) => auth(request(app).put(url)),
    patch: (url) => auth(request(app).patch(url)),
    delete: (url) => auth(request(app).delete(url)),
  };
}

module.exports = { api, tokenFor };
