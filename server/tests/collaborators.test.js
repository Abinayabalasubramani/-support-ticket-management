const request = require('supertest');
const app = require('../src/app');
const events = require('../src/events/ticketEvents');
const { prisma, resetDb, seedRefs, makeTicket } = require('./helpers/db');
const { api, tokenFor } = require('./helpers/auth');

let refs;
let carol;
let dave;
let erin;

const asAdmin = () => api(tokenFor('ADMIN'));
const asAgent = () => api(tokenFor('AGENT', 2));
const newTicket = (extra = {}) => makeTicket({ categoryId: refs.categories.billing.id, ...extra });
const setCollaborators = (id, userIds, client = asAgent()) => client.put(`/api/tickets/${id}/collaborators`).send({ userIds });
const names = (ticket) => ticket.collaborators.map((u) => u.name).sort();
const rows = (ticketId) => prisma.ticketCollaborator.findMany({ where: { ticketId } });
const activityRows = (ticketId) => prisma.ticketActivity.findMany({ where: { ticketId }, orderBy: { id: 'asc' } });

beforeAll(async () => {
  await resetDb();
  refs = await seedRefs();
  [carol, dave, erin] = await Promise.all(
    ['Carol Test', 'Dave Test', 'Erin Test'].map((name) =>
      prisma.user.create({ data: { name, email: `${name.split(' ')[0].toLowerCase()}@test.example` } })
    )
  );
});

afterAll(() => prisma.$disconnect());

describe('adding and removing collaborators', () => {
  test('a ticket starts with none', async () => {
    const t = await newTicket();
    const res = await asAgent().get(`/api/tickets/${t.id}`);
    expect(res.body.collaborators).toEqual([]);
  });

  test('several people can be put on one ticket, next to the main assignee', async () => {
    const t = await newTicket({ assigneeId: refs.users.alice.id });
    const res = await setCollaborators(t.id, [carol.id, dave.id]);

    expect(res.status).toBe(200);
    expect(names(res.body)).toEqual(['Carol Test', 'Dave Test']);
    expect(res.body.assignee.name).toBe('Alice Test'); // the owner is unchanged
    expect(res.body.collaborators[0]).toEqual(expect.objectContaining({ id: expect.any(Number), email: expect.any(String) }));
    expect(JSON.stringify(res.body.collaborators)).not.toMatch(/passwordHash/);
  });

  test('the collaborators come back when the ticket is read and in the ticket list', async () => {
    const t = await newTicket();
    await setCollaborators(t.id, [carol.id]);

    const one = await asAgent().get(`/api/tickets/${t.id}`);
    expect(names(one.body)).toEqual(['Carol Test']);

    const list = await asAgent().get('/api/tickets?limit=100');
    const row = list.body.data.find((x) => x.id === t.id);
    expect(names(row)).toEqual(['Carol Test']);
    expect(list.body.data.find((x) => x.id !== t.id).collaborators).toEqual(expect.any(Array));
  });

  test('the list you send replaces the old one (add some, drop others)', async () => {
    const t = await newTicket();
    await setCollaborators(t.id, [carol.id, dave.id]);
    const res = await setCollaborators(t.id, [dave.id, erin.id]);
    expect(names(res.body)).toEqual(['Dave Test', 'Erin Test']);
    expect(await rows(t.id)).toHaveLength(2);
  });

  test('an empty list removes everyone', async () => {
    const t = await newTicket();
    await setCollaborators(t.id, [carol.id, dave.id]);
    const res = await setCollaborators(t.id, []);
    expect(res.status).toBe(200);
    expect(res.body.collaborators).toEqual([]);
    expect(await rows(t.id)).toHaveLength(0);
  });

  test('the same person listed twice counts once', async () => {
    const t = await newTicket();
    const res = await setCollaborators(t.id, [carol.id, carol.id, carol.id]);
    expect(names(res.body)).toEqual(['Carol Test']);
    expect(await rows(t.id)).toHaveLength(1);
  });

  test('the main assignee is never listed as a collaborator too', async () => {
    const t = await newTicket({ assigneeId: carol.id });
    const res = await setCollaborators(t.id, [carol.id, dave.id]);
    expect(names(res.body)).toEqual(['Dave Test']);
  });

  test('an agent may do it (not only admins)', async () => {
    const t = await newTicket();
    expect((await setCollaborators(t.id, [carol.id], asAgent())).status).toBe(200);
  });

  test('unknown user -> 404, and nothing changes', async () => {
    const t = await newTicket();
    await setCollaborators(t.id, [carol.id]);

    const res = await setCollaborators(t.id, [dave.id, 999999]);
    expect(res.status).toBe(404);
    expect(names((await asAgent().get(`/api/tickets/${t.id}`)).body)).toEqual(['Carol Test']);
  });

  test('unknown ticket -> 404', async () => {
    expect((await setCollaborators(999999, [carol.id])).status).toBe(404);
  });
});

describe('validation and access', () => {
  test.each([
    ['userIds missing', {}],
    ['userIds not an array', { userIds: 5 }],
    ['non-numeric ids', { userIds: ['abc'] }],
    ['negative id', { userIds: [-1] }],
    ['an unknown field', { userIds: [], role: 'ADMIN' }],
    ['more than 10 people', { userIds: Array.from({ length: 11 }, (_, i) => i + 1) }],
  ])('%s -> 400', async (name, body) => {
    const t = await newTicket();
    const res = await asAgent().put(`/api/tickets/${t.id}/collaborators`).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('a malformed ticket id -> 400', async () => {
    expect((await asAgent().put('/api/tickets/abc/collaborators').send({ userIds: [] })).status).toBe(400);
  });

  test('without a token -> 401', async () => {
    expect((await request(app).put('/api/tickets/1/collaborators').send({ userIds: [] })).status).toBe(401);
  });
});

describe('the owner and the collaborators stay consistent', () => {
  test('making a collaborator the main assignee removes them from the collaborators', async () => {
    const t = await newTicket();
    await setCollaborators(t.id, [carol.id, dave.id]);

    const res = await asAgent().patch(`/api/tickets/${t.id}/assignee`).send({ assigneeId: carol.id });

    expect(res.body.assignee.name).toBe('Carol Test');
    expect(names(res.body)).toEqual(['Dave Test']);
  });

  test('assigning someone else leaves the collaborators alone', async () => {
    const t = await newTicket();
    await setCollaborators(t.id, [carol.id]);
    const res = await asAgent().patch(`/api/tickets/${t.id}/assignee`).send({ assigneeId: refs.users.bob.id });
    expect(names(res.body)).toEqual(['Carol Test']);
  });

  test('bulk-assigning a collaborator as owner removes them from those tickets', async () => {
    const t = await newTicket();
    await setCollaborators(t.id, [erin.id]);

    await asAgent().patch('/api/tickets/bulk').send({ ids: [t.id], assigneeId: erin.id });

    expect((await asAgent().get(`/api/tickets/${t.id}`)).body.collaborators).toEqual([]);
  });

  test('deleting a ticket removes its collaborator rows', async () => {
    const t = await newTicket();
    await setCollaborators(t.id, [carol.id]);
    await asAdmin().delete(`/api/tickets/${t.id}`);
    expect(await rows(t.id)).toHaveLength(0);
  });

  test('deleting a user takes them off every ticket', async () => {
    const temp = await prisma.user.create({ data: { name: 'Temp Collab', email: 'tempcollab@test.example' } });
    const t = await newTicket();
    await setCollaborators(t.id, [temp.id, carol.id]);

    await prisma.user.delete({ where: { id: temp.id } });

    expect(names((await asAgent().get(`/api/tickets/${t.id}`)).body)).toEqual(['Carol Test']);
  });
});

describe('timeline and live updates', () => {
  test('adding and removing people is written to the timeline with their names', async () => {
    const t = await newTicket();
    await setCollaborators(t.id, [carol.id, dave.id]);
    await setCollaborators(t.id, [dave.id]);

    const feed = (await asAgent().get(`/api/tickets/${t.id}/activity`)).body.filter((e) => e.kind === 'edit');
    expect(feed).toHaveLength(2);
    const [removal, addition] = feed; // newest first
    expect(addition.changes[0]).toMatchObject({ field: 'collaborators', removed: [] });
    expect(addition.changes[0].added.map((p) => p.name).sort()).toEqual(['Carol Test', 'Dave Test']);
    expect(removal.changes[0]).toMatchObject({ field: 'collaborators', added: [] });
    expect(removal.changes[0].removed.map((p) => p.name)).toEqual(['Carol Test']);
  });

  test('saving the same list again logs nothing', async () => {
    const t = await newTicket();
    await setCollaborators(t.id, [carol.id]);
    await setCollaborators(t.id, [carol.id]);
    expect(await activityRows(t.id)).toHaveLength(1);
  });

  test('a failed request logs nothing', async () => {
    const t = await newTicket();
    await setCollaborators(t.id, [999999]);
    expect(await activityRows(t.id)).toHaveLength(0);
  });

  test('other sessions are told that the ticket changed', async () => {
    const received = [];
    const unsubscribe = events.subscribe((event) => received.push(event));
    try {
      const t = await newTicket();
      await asAgent().put(`/api/tickets/${t.id}/collaborators`).set('X-Client-Id', 'tab-9').send({ userIds: [carol.id] });
      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({ type: 'ticket.updated', ids: [t.id], origin: 'tab-9' });
    } finally {
      unsubscribe();
    }
  });
});
