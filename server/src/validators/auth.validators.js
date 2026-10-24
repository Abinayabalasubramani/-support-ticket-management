const { z } = require('zod');

const loginBody = z.strictObject({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  password: z.string().min(1, 'Password is required').max(200),
});

module.exports = { loginBody };
