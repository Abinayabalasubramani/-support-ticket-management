// Manual smoke test for the Phase 2 endpoints. Run with the API already running:
//   node scripts/smoke-phase2.js [baseUrl]
// Creates one temporary ticket and deletes it at the end. Replaced by Jest tests in Phase 4.
const base = process.argv[2] || 'http://localhost:4000';
let passed = 0;
let failed = 0;

async function call(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

function check(name, condition, extra = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

async function main() {
  console.log(`Smoke testing ${base}\n`);

  const meta = await call('GET', '/api/meta');
  check('GET /api/meta returns 200 with categories and users', meta.status === 200 && meta.data.categories.length > 0 && meta.data.users.length > 0);
  const categoryId = meta.data.categories[0].id;
  const userId = meta.data.users[0].id;

  console.log('\nCreate');
  const created = await call('POST', '/api/tickets', {
    title: 'Smoke test ticket',
    description: 'Temporary ticket created by the smoke test',
    priority: 'HIGH',
    categoryId,
  });
  check('POST valid ticket -> 201', created.status === 201, JSON.stringify(created.data));
  check('new ticket starts OPEN', created.data?.status === 'OPEN');
  check('new ticket is unassigned', created.data?.assigneeId === null);
  const id = created.data?.id;

  const noTitle = await call('POST', '/api/tickets', { description: 'x', categoryId });
  check('POST missing title -> 400 VALIDATION_ERROR', noTitle.status === 400 && noTitle.data.error.code === 'VALIDATION_ERROR');
  const badPriority = await call('POST', '/api/tickets', { title: 't', description: 'd', priority: 'URGENT', categoryId });
  check('POST invalid priority -> 400', badPriority.status === 400);
  const longTitle = await call('POST', '/api/tickets', { title: 'x'.repeat(201), description: 'd', categoryId });
  check('POST title over 200 chars -> 400', longTitle.status === 400);
  const unknownField = await call('POST', '/api/tickets', { title: 't', description: 'd', categoryId, status: 'CLOSED' });
  check('POST with status field -> 400 (unknown field rejected)', unknownField.status === 400);
  const badCategory = await call('POST', '/api/tickets', { title: 't', description: 'd', categoryId: 999999 });
  check('POST unknown category -> 404', badCategory.status === 404);

  console.log('\nRead');
  const one = await call('GET', `/api/tickets/${id}`);
  check('GET ticket -> 200 with category', one.status === 200 && one.data.category?.id === categoryId);
  check('OPEN ticket allows IN_PROGRESS and RESOLVED', JSON.stringify(one.data?.allowedTransitions) === JSON.stringify(['IN_PROGRESS', 'RESOLVED']));
  const missing = await call('GET', '/api/tickets/999999');
  check('GET missing ticket -> 404', missing.status === 404 && missing.data.error.code === 'NOT_FOUND');
  const badId = await call('GET', '/api/tickets/abc');
  check('GET non-numeric id -> 400', badId.status === 400);

  console.log('\nEdit');
  const edited = await call('PUT', `/api/tickets/${id}`, { title: 'Smoke test ticket (edited)', priority: 'CRITICAL' });
  check('PUT edit -> 200 with new values', edited.status === 200 && edited.data.priority === 'CRITICAL' && edited.data.title.endsWith('(edited)'));
  const emptyEdit = await call('PUT', `/api/tickets/${id}`, {});
  check('PUT empty body -> 400', emptyEdit.status === 400);
  const editStatus = await call('PUT', `/api/tickets/${id}`, { status: 'CLOSED' });
  check('PUT cannot change status -> 400', editStatus.status === 400);

  console.log('\nAssign');
  const assigned = await call('PATCH', `/api/tickets/${id}/assignee`, { assigneeId: userId });
  check('PATCH assignee -> 200', assigned.status === 200 && assigned.data.assignee?.id === userId);
  const badUser = await call('PATCH', `/api/tickets/${id}/assignee`, { assigneeId: 999999 });
  check('PATCH unknown user -> 404', badUser.status === 404);
  const unassigned = await call('PATCH', `/api/tickets/${id}/assignee`, { assigneeId: null });
  check('PATCH assigneeId null unassigns -> 200', unassigned.status === 200 && unassigned.data.assigneeId === null);

  console.log('\nStatus transitions');
  const toProgress = await call('PATCH', `/api/tickets/${id}/status`, { status: 'IN_PROGRESS' });
  check('OPEN -> IN_PROGRESS -> 200', toProgress.status === 200 && toProgress.data.status === 'IN_PROGRESS');
  const toClosed = await call('PATCH', `/api/tickets/${id}/status`, { status: 'CLOSED' });
  check('IN_PROGRESS -> CLOSED -> 409 INVALID_STATUS_TRANSITION', toClosed.status === 409 && toClosed.data.error.code === 'INVALID_STATUS_TRANSITION');
  const sameStatus = await call('PATCH', `/api/tickets/${id}/status`, { status: 'IN_PROGRESS' });
  check('IN_PROGRESS -> IN_PROGRESS -> 409', sameStatus.status === 409);
  const badStatus = await call('PATCH', `/api/tickets/${id}/status`, { status: 'DONE' });
  check('unknown status value -> 400', badStatus.status === 400);
  const toResolved = await call('PATCH', `/api/tickets/${id}/status`, { status: 'RESOLVED' });
  check('IN_PROGRESS -> RESOLVED -> 200', toResolved.status === 200);
  const toFinal = await call('PATCH', `/api/tickets/${id}/status`, { status: 'CLOSED' });
  check('RESOLVED -> CLOSED -> 200', toFinal.status === 200 && toFinal.data.allowedTransitions.length === 0);
  const reopen = await call('PATCH', `/api/tickets/${id}/status`, { status: 'OPEN' });
  check('CLOSED -> OPEN -> 409 (final status)', reopen.status === 409);
  const statusMissing = await call('PATCH', '/api/tickets/999999/status', { status: 'OPEN' });
  check('status change on missing ticket -> 404', statusMissing.status === 404);

  console.log('\nHistory');
  const history = await call('GET', `/api/tickets/${id}/history`);
  const path = history.data?.map((h) => h.toStatus).reverse().join('>');
  check('history has exactly the 4 successful steps, newest first', history.status === 200 && history.data.length === 4 && path === 'OPEN>IN_PROGRESS>RESOLVED>CLOSED', path);
  check('first history row has null fromStatus', history.data?.[3]?.fromStatus === null);

  console.log('\nDelete');
  const del = await call('DELETE', `/api/tickets/${id}`);
  check('DELETE -> 204', del.status === 204);
  const delAgain = await call('DELETE', `/api/tickets/${id}`);
  check('DELETE again -> 404', delAgain.status === 404);
  const afterDel = await call('GET', `/api/tickets/${id}/history`);
  check('history of deleted ticket -> 404', afterDel.status === 404);

  console.log('\nGeneral errors');
  const route = await call('GET', '/api/nope');
  check('unknown route -> 404 JSON', route.status === 404 && route.data.error.code === 'NOT_FOUND');
  const badJson = await fetch(`${base}/api/tickets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  check('malformed JSON -> 400', badJson.status === 400);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}

main().catch((e) => {
  console.error('Smoke test crashed:', e.message);
  process.exitCode = 1;
});
