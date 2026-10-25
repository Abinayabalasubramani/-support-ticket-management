const { z } = require('zod');

// bcrypt only uses the first 72 BYTES of a password and silently ignores the rest,
// so a longer one is refused instead of being quietly shortened.
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password is too long (72 bytes at most)')
  .refine((value) => value.trim().length >= 8, 'Password must not be mostly spaces');

const createUserBody = z.strictObject({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  role: z.enum(['ADMIN', 'AGENT']).default('AGENT'),
  password,
});

module.exports = { createUserBody };
