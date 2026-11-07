const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { once } = require("node:events");
const { test, before, after } = require("node:test");
const { Pool } = require("pg");
const argon2 = require("argon2");
require("dotenv").config({ quiet: true });

const schema = `booking_patch_test_${process.pid}_${Date.now()}`;
const admin = new Pool({ connectionTimeoutMillis: 5000 });
let pool;
let server;
let base;
let schemaCreated = false;
const previousOptions = process.env.PGOPTIONS;

const teacherA = { email: "teacher-a@example.test", password: "teacher-a-password" };
const teacherB = { email: "teacher-b@example.test", password: "teacher-b-password" };
const student = { email: "student@example.test", password: "student-password" };
const teacherAClient = { cookie: "" };
const teacherBClient = { cookie: "" };
const studentClient = { cookie: "" };

async function request(path, { method = "GET", body, client } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (client?.cookie) headers.Cookie = client.cookie;

  const response = await fetch(base + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  const setCookie = response.headers.get("set-cookie");
  if (client && setCookie) client.cookie = setCookie.split(";")[0];

  const text = await response.text();
  return {
    status: response.status,
    data: text ? JSON.parse(text) : undefined,
    text,
  };
}

async function login(credentials, client) {
  const response = await request("/users/login", {
    method: "POST",
    body: credentials,
    client,
  });
  assert.equal(response.status, 200);
}

async function insertUser(name, credentials, role) {
  const passwordHash = await argon2.hash(credentials.password);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [name, credentials.email, passwordHash, role],
  );
  return result.rows[0].id;
}

function futureTime(hoursFromNow) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

before(async () => {
  await admin.query(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  process.env.PGOPTIONS = `-c search_path=${schema}`;
  process.env.SESSION_SECRET = "isolated-time-slot-test-secret";

  pool = require("../src/database.ts").pool;
  const client = await pool.connect();
  try {
    await client.query(readFileSync(join(__dirname, "../database/schema.sql"), "utf8"));
  } finally {
    client.release();
  }

  await insertUser("Teacher A", teacherA, "teacher");
  await insertUser("Teacher B", teacherB, "teacher");
  await insertUser("Student", student, "student");

  const { app } = require("../src/app.ts");
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  try {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
    if (pool) await pool.end();
  } finally {
    if (schemaCreated) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
    if (previousOptions === undefined) delete process.env.PGOPTIONS;
    else process.env.PGOPTIONS = previousOptions;
  }
});

test("PATCH time slot rejects anonymous and non-teacher users", async () => {
  assert.equal(
    (await request("/time-slots/1", { method: "PATCH", body: {} })).status,
    401,
  );

  await login(student, studentClient);
  assert.equal(
    (await request("/time-slots/1", { method: "PATCH", body: {}, client: studentClient })).status,
    403,
  );
});

test("PATCH time slot validates id, required fields and date values", async () => {
  await login(teacherA, teacherAClient);

  const invalidRequests = [
    ["/time-slots/banana", { start: futureTime(24), end: futureTime(25) }],
    ["/time-slots/0", { start: futureTime(24), end: futureTime(25) }],
    ["/time-slots/1", {}],
    ["/time-slots/1", { start: 7, end: futureTime(25) }],
    ["/time-slots/1", { start: "banana", end: futureTime(25) }],
    ["/time-slots/1", { start: futureTime(25), end: futureTime(24) }],
  ];

  for (const [path, body] of invalidRequests) {
    const response = await request(path, { method: "PATCH", body, client: teacherAClient });
    assert.equal(response.status, 400, `${path} should return 400`);
  }
});

test("PATCH time slot only changes a slot owned by the teacher", async () => {
  await login(teacherA, teacherAClient);
  const created = await request("/time-slots", {
    method: "POST",
    body: { start: futureTime(30), end: futureTime(31) },
    client: teacherAClient,
  });
  assert.equal(created.status, 201);

  const slotId = created.data.id;
  const updated = await request(`/time-slots/${slotId}`, {
    method: "PATCH",
    body: { start: futureTime(32), end: futureTime(33) },
    client: teacherAClient,
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.id, slotId);

  await login(teacherB, teacherBClient);
  const forbiddenOwnership = await request(`/time-slots/${slotId}`, {
    method: "PATCH",
    body: { start: futureTime(34), end: futureTime(35) },
    client: teacherBClient,
  });
  assert.equal(forbiddenOwnership.status, 404);
});

test("PATCH time slot rejects an overlap in the same teacher agenda", async () => {
  await login(teacherA, teacherAClient);
  const first = await request("/time-slots", {
    method: "POST",
    body: { start: futureTime(40), end: futureTime(41) },
    client: teacherAClient,
  });
  const second = await request("/time-slots", {
    method: "POST",
    body: { start: futureTime(43), end: futureTime(44) },
    client: teacherAClient,
  });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);

  const conflict = await request(`/time-slots/${second.data.id}`, {
    method: "PATCH",
    body: { start: futureTime(40.5), end: futureTime(41.5) },
    client: teacherAClient,
  });
  assert.equal(conflict.status, 409);
});
