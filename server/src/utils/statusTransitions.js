const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// Single source of truth for the status workflow. A CLOSED ticket can only be reopened (to OPEN).
const TRANSITIONS = {
  OPEN: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['OPEN', 'RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: ['OPEN'],
};

const allowedNext = (from) => TRANSITIONS[from] || [];

const canTransition = (from, to) => allowedNext(from).includes(to);

module.exports = { STATUSES, PRIORITIES, TRANSITIONS, allowedNext, canTransition };
