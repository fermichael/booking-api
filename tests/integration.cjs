const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { once } = require("node:events");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { test, before, after } = require("node:test");
const { Pool } = require("pg");
const argon2 = require("argon2");
require("dotenv").config({ quiet: true });

// All writes are restricted to a generated schema, never public.
const schema = `booking_test_${process.pid}_${Date.now()}`;
assert.match(schema, /^booking_test_\d+_\d+$/);
const admin = new Pool({ connectionTimeoutMillis: 5000 });
let schemaCreated = false;
let pool;
let server;
let base;
const previousOptions = process.env.PGOPTIONS;
const startMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
const hour = 60 * 60 * 1000;
const iso = (offset = 0) => new Date(startMs + offset * hour).toISOString();
let mainSlot;
let aliceId;
let bobId;
let bookingId;
const alice = { cookie: "" };
const bob = { cookie: "" };
const aliceCredentials = { name: "Alice", email: "alice@example.test", password: "  test-password  " };
const bobCredentials = { name: "Bob", email: "bob@example.test", password: "another-test-password" };

async function request(path, { method = "GET", body, raw, client } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (client?.cookie) headers.Cookie = client.cookie;
  const response = await fetch(base + path, {
    method,
    headers,
    body: raw !== undefined ? raw : body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const setCookie = response.headers.get("set-cookie");
  if (client && setCookie) client.cookie = setCookie.split(";")[0];
  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;
  return { status: response.status, data, headers: response.headers, text };
}

before(async () => {
  await admin.query(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  process.env.PGOPTIONS = `-c search_path=${schema}`;
  process.env.SESSION_SECRET = "isolated-integration-test-secret";

  pool = require("../src/database.ts").pool;
  const path = await pool.query("SELECT current_schema() AS schema");
  assert.equal(path.rows[0].schema, schema, "Tests must not use public");

  // The schema script contains BEGIN/COMMIT, so use one physical connection.
  const client = await pool.connect();
  try {
    await client.query(readFileSync(join(__dirname, "../database/schema.sql"), "utf8"));
  } finally {
    client.release();
  }

  const { app } = require("../src/app.ts");
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  try {
    if (server) {
      const closed = new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
      server.closeAllConnections();
      await closed;
    }
    if (pool) await pool.end();
  } finally {
    try {
      if (schemaCreated) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    } finally {
      await admin.end();
      if (previousOptions === undefined) delete process.env.PGOPTIONS;
      else process.env.PGOPTIONS = previousOptions;
    }
  }
});

test("health, unknown routes and malformed JSON return JSON responses", async () => {
  assert.equal((await request("/health")).status, 200);
  assert.equal((await request("/missing")).status, 404);
  const response = await request("/users", { method: "POST", raw: "{" });
  assert.equal(response.status, 400);
  assert.equal(typeof response.data.message, "string");
});

test("authenticated routes reject anonymous requests", async () => {
  for (const [path, method] of [
    ["/users/me", "GET"],
    ["/bookings", "GET"],
    ["/bookings", "POST"],
    ["/bookings/1", "PATCH"],
  ]) {
    assert.equal((await request(path, { method })).status, 401);
  }
});

test("registration validates fields, hashes passwords and does not accept a teacher role", async () => {
  for (const body of [{}, { name: 7 }, { ...aliceCredentials, name: " " }]) {
    assert.equal((await request("/users", { method: "POST", body })).status, 400);
  }
  const response = await request("/users", {
    method: "POST",
    body: { ...aliceCredentials, name: " Alice ", email: " alice@example.test ", role: "teacher" },
  });
  assert.equal(response.status, 201);
  assert.deepEqual(Object.keys(response.data).sort(), ["email", "id", "name"]);
  assert.equal(response.data.name, "Alice");
  aliceId = response.data.id;
  const stored = await pool.query("SELECT password_hash, role FROM users WHERE id = $1", [aliceId]);
  assert.equal(stored.rows[0].role, "student");
  assert.notEqual(stored.rows[0].password_hash, aliceCredentials.password);
  assert.equal(await argon2.verify(stored.rows[0].password_hash, aliceCredentials.password), true);
});

test("duplicate and concurrent registrations cannot create duplicate emails", async () => {
  assert.equal((await request("/users", { method: "POST", body: aliceCredentials })).status, 409);
  const body = { name: "Concurrent", email: "concurrent@example.test", password: "test-password" };
  const results = await Promise.all([
    request("/users", { method: "POST", body }),
    request("/users", { method: "POST", body }),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
  const bobResponse = await request("/users", { method: "POST", body: bobCredentials });
  assert.equal(bobResponse.status, 201);
  bobId = bobResponse.data.id;
});

test("login checks credentials, regenerates the session and exposes only the current ID", async () => {
  assert.equal((await request("/users/login", { method: "POST", body: {} })).status, 400);
  for (const body of [
    { email: "missing@example.test", password: "test" },
    { ...aliceCredentials, password: "wrong" },
  ]) {
    assert.equal((await request("/users/login", { method: "POST", body })).status, 401);
  }
  assert.equal((await request("/users/login", { method: "POST", body: aliceCredentials, client: alice })).status, 200);
  const previousCookie = alice.cookie;
  const login = await request("/users/login", { method: "POST", body: aliceCredentials, client: alice });
  assert.equal(login.status, 200);
  assert.notEqual(alice.cookie, previousCookie);
  assert.match(login.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(login.headers.get("set-cookie"), /SameSite=Lax/i);
  assert.equal((await request("/users/me", { client: alice })).data, aliceId);
  assert.equal((await request("/users/login", { method: "POST", body: bobCredentials, client: bob })).status, 200);
});

test("time slots reject invalid calendar dates, ambiguous dates and reversed intervals", async () => {
  for (const body of [
    {},
    { start: " ", end: iso(1) },
    { start: 2, end: iso(1) },
    { start: "banana", end: iso(1) },
    { start: "2050-02-30T14:00:00Z", end: "2050-03-01T15:00:00Z" },
    { start: "2050-01-01T14:00:00", end: "2050-01-01T15:00:00" },
    { start: "2050-01-01T14:00:00+15:00", end: "2050-01-01T15:00:00+15:00" },
    { start: iso(1), end: iso() },
    { start: iso(), end: iso() },
  ]) {
    assert.equal((await request("/time-slots", { method: "POST", body })).status, 400);
  }
});

test("public time-slot creation and reads work with timestamp values", async () => {
  const response = await request("/time-slots", { method: "POST", body: { start: iso(), end: iso(1) } });
  assert.equal(response.status, 201);
  mainSlot = response.data;
  assert.equal(mainSlot.start, iso());
  assert.equal(mainSlot.end, iso(1));
  assert.deepEqual((await request(`/time-slots/${mainSlot.id}`)).data, mainSlot);
  assert.equal((await request("/time-slots/2147483647")).status, 404);
  for (const id of ["banana", "0", "-1", "1.5", "2147483648", "1e100"]) {
    assert.equal((await request(`/time-slots/${id}`)).status, 400);
  }
  assert.equal(
    (await request("/time-slots")).data.some((slot) => slot.id === mainSlot.id),
    true,
  );
});

test("overlapping slots are rejected while adjacent slots are allowed", async () => {
  for (const body of [
    { start: iso(), end: iso(1) },
    { start: iso(0.5), end: iso(1.5) },
    { start: iso(-0.5), end: iso(1.5) },
  ]) {
    assert.equal((await request("/time-slots", { method: "POST", body })).status, 409);
  }
  assert.equal((await request("/time-slots", { method: "POST", body: { start: iso(1), end: iso(2) } })).status, 201);
});

test("simultaneous overlapping inserts are protected by the exclusion constraint", async () => {
  const bodies = [
    { start: iso(10), end: iso(11) },
    { start: iso(10.5), end: iso(11.5) },
  ];
  const results = await Promise.all(bodies.map((body) => request("/time-slots", { method: "POST", body })));
  assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
});

test("bookings validate IDs and reject missing slots", async () => {
  for (const timeSlotId of [undefined, "2", 0, -1, 1.5, 2147483648]) {
    assert.equal((await request("/bookings", { method: "POST", body: { timeSlotId }, client: alice })).status, 400);
  }
  assert.equal(
    (await request("/bookings", { method: "POST", body: { timeSlotId: 2147483647 }, client: alice })).status,
    404,
  );
});

test("booking uses the session owner, hides other users' records and updates availability", async () => {
  assert.equal(
    (await request("/time-slots/available")).data.some((slot) => slot.id === mainSlot.id),
    true,
  );
  const response = await request("/bookings", {
    method: "POST",
    body: { timeSlotId: mainSlot.id, studentId: bobId, userId: bobId },
    client: alice,
  });
  assert.equal(response.status, 201);
  assert.equal(response.data.studentId, aliceId);
  bookingId = response.data.bookingId;
  assert.equal(response.data.status, "confirmed");
  assert.equal(
    (await request("/bookings", { method: "POST", body: { timeSlotId: mainSlot.id }, client: bob })).status,
    409,
  );
  assert.deepEqual((await request("/bookings", { client: bob })).data, []);
  assert.equal((await request("/bookings", { client: alice })).data[0].bookingId, bookingId);
  assert.equal(
    (await request(`/bookings/${bookingId}`, { method: "PATCH", body: { status: "cancelled" }, client: bob })).status,
    404,
  );
  assert.equal(
    (await request("/time-slots/available")).data.some((slot) => slot.id === mainSlot.id),
    false,
  );
});

test("cancellation validates its input, preserves history and permits rebooking", async () => {
  assert.equal(
    (await request(`/bookings/${bookingId}`, { method: "PATCH", body: { status: "confirmed" }, client: alice })).status,
    400,
  );
  assert.equal(
    (await request("/bookings/banana", { method: "PATCH", body: { status: "cancelled" }, client: alice })).status,
    400,
  );
  assert.equal(
    (await request("/bookings/2147483647", { method: "PATCH", body: { status: "cancelled" }, client: alice })).status,
    404,
  );
  const cancelled = await request(`/bookings/${bookingId}`, {
    method: "PATCH",
    body: { status: "cancelled" },
    client: alice,
  });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.data.status, "cancelled");
  assert.equal(cancelled.data.bookingId, bookingId);
  const repeated = await request(`/bookings/${bookingId}`, {
    method: "PATCH",
    body: { status: "cancelled" },
    client: alice,
  });
  assert.equal(repeated.status, 200);
  assert.equal(repeated.data.message, "Booking is already cancelled");
  assert.equal(
    (await request("/time-slots/available")).data.some((slot) => slot.id === mainSlot.id),
    true,
  );
  const rebooked = await request("/bookings", { method: "POST", body: { timeSlotId: mainSlot.id }, client: bob });
  assert.equal(rebooked.status, 201);
  assert.notEqual(rebooked.data.bookingId, bookingId);
  const history = await pool.query("SELECT status FROM bookings WHERE time_slot_id = $1 ORDER BY id", [mainSlot.id]);
  assert.deepEqual(
    history.rows.map((row) => row.status),
    ["cancelled", "confirmed"],
  );
});

test("a started slot cannot be booked or cancelled", async () => {
  const past = await request("/time-slots", {
    method: "POST",
    body: { start: "2000-01-01T14:00:00Z", end: "2000-01-01T15:00:00Z" },
  });
  assert.equal(past.status, 201);
  assert.equal(
    (await request("/bookings", { method: "POST", body: { timeSlotId: past.data.id }, client: alice })).status,
    409,
  );
  const historic = await pool.query("INSERT INTO bookings(student_id, time_slot_id) VALUES ($1, $2) RETURNING id", [
    aliceId,
    past.data.id,
  ]);
  assert.equal(
    (
      await request(`/bookings/${historic.rows[0].id}`, {
        method: "PATCH",
        body: { status: "cancelled" },
        client: alice,
      })
    ).status,
    409,
  );
  assert.equal(
    (await request("/time-slots/available")).data.some((slot) => slot.id === past.data.id),
    false,
  );
});

test("simultaneous bookings produce one confirmed reservation and one conflict", async () => {
  const slot = await request("/time-slots", { method: "POST", body: { start: iso(20), end: iso(21) } });
  const results = await Promise.all(
    [alice, bob].map((client) =>
      request("/bookings", {
        method: "POST",
        body: { timeSlotId: slot.data.id },
        client,
      }),
    ),
  );
  assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
  const stored = await pool.query("SELECT id FROM bookings WHERE time_slot_id = $1 AND status = 'confirmed'", [
    slot.data.id,
  ]);
  assert.equal(stored.rows.length, 1);
});

test("database guarantees hold even when requests bypass the preliminary checks", async () => {
  await assert.rejects(
    pool.query("INSERT INTO time_slots(starts_at, ends_at) VALUES ($1, $2)", [iso(0.25), iso(0.75)]),
    { code: "23P01" },
  );
  await assert.rejects(
    pool.query("INSERT INTO bookings(student_id, time_slot_id) VALUES ($1, $2)", [aliceId, mainSlot.id]),
    { code: "23505" },
  );
});

test("separate PostgreSQL connections can read the persisted users, slots and bookings", async () => {
  const separatePool = new Pool({ connectionTimeoutMillis: 5000 });
  try {
    assert.equal((await separatePool.query("SELECT id FROM users WHERE id = $1", [aliceId])).rows[0].id, aliceId);
    assert.equal(
      (await separatePool.query("SELECT id FROM time_slots WHERE id = $1", [mainSlot.id])).rows[0].id,
      mainSlot.id,
    );
    assert.equal(
      (await separatePool.query("SELECT id FROM bookings WHERE id = $1", [bookingId])).rows[0].id,
      bookingId,
    );
  } finally {
    await separatePool.end();
  }
});

test("a fresh Node process can log in and read previously persisted records", async () => {
  const childScript = `
    const { app } = require('./src/app.ts');
    const { pool } = require('./src/database.ts');
    const assert = require('node:assert/strict');
    const server = app.listen(0, '127.0.0.1', async () => {
      try {
        const base = 'http://127.0.0.1:' + server.address().port;
        const login = await fetch(base + '/users/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'alice@example.test', password: '  test-password  ' })
        });
        assert.equal(login.status, 200);
        const cookie = login.headers.get('set-cookie').split(';')[0];
        const bookings = await fetch(base + '/bookings', { headers: { Cookie: cookie } });
        assert.equal(bookings.status, 200);
        assert.ok((await bookings.json()).length > 0);
        const slots = await fetch(base + '/time-slots');
        assert.ok((await slots.json()).length > 0);
        console.log('Fresh-process login and persistence verified');
      } catch (error) { console.error(error); process.exitCode = 1; }
      finally { server.close(); server.closeAllConnections(); await pool.end(); }
    });
  `;
  const child = await promisify(execFile)(process.execPath, ["--require", "tsx/cjs", "-e", childScript], {
    cwd: join(__dirname, ".."),
    env: process.env,
    timeout: 20000,
    windowsHide: true,
  });
  assert.match(child.stdout, /Fresh-process login and persistence verified/);
});

test("logout destroys the session, clears the cookie and can be repeated", async () => {
  const oldCookie = alice.cookie;
  const response = await request("/users/logout", { method: "POST", client: alice });
  assert.equal(response.status, 204);
  assert.equal(response.text, "");
  assert.match(response.headers.get("set-cookie"), /bookingapi=;/);
  assert.equal((await request("/users/me", { client: { cookie: oldCookie } })).status, 401);
  assert.equal((await request("/users/logout", { method: "POST", client: alice })).status, 204);
});
