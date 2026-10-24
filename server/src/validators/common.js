const { z } = require('zod');

// Postgres INT max; larger values would surface as a database error.
const MAX_INT = 2147483647;
const id = z.coerce.number().int().positive().max(MAX_INT);

// Treat blank query values (?search=) as "not provided".
const blankToUndefined = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

// "a,b,c" (or repeated ?x=a&x=b) -> validated array of items.
const csv = (item) =>
  z.preprocess(
    (v) => blankToUndefined(Array.isArray(v) ? v.join(',') : v),
    z
      .string()
      .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean))
      .pipe(z.array(item).min(1).max(20))
      .optional()
  );

const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ].*)?$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Accepts YYYY-MM-DD or a full ISO timestamp. A date-only `to` covers the whole day (UTC).
const dateInput = (endOfDay) =>
  z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .refine((s) => ISO_DATE.test(s) && !Number.isNaN(Date.parse(s)), 'Use a valid date (YYYY-MM-DD or ISO 8601)')
      .transform((s) => {
        const d = new Date(s);
        if (endOfDay && DATE_ONLY.test(s)) d.setUTCHours(23, 59, 59, 999);
        return d;
      })
      .optional()
  );

const dateRangeFields = { from: dateInput(false), to: dateInput(true) };

const fromBeforeTo = (v) => !v.from || !v.to || v.from <= v.to;

module.exports = { MAX_INT, id, blankToUndefined, csv, dateRangeFields, fromBeforeTo };
