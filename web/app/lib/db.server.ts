/* The ONLY place that reads or writes foster-parent data.
 *
 * D1 has no row-level security. On Postgres the rule "a specialist may read
 * only the escalations assigned to them" would be enforced by the database.
 * Here it is enforced by this module, so:
 *
 *   - every function takes the caller's identity as a required argument
 *   - no route handler may run raw SQL
 *   - a specialist's access to question text goes THROUGH the escalation row,
 *     never through a direct select on `questions`
 *
 * That last rule is the whole confidentiality promise. The natural-seeming
 * policy — "specialists can read questions belonging to their assigned
 * parents" — would expose a family's entire question history. It does not
 * exist in this file, and access.test.mjs asserts it stays that way.
 */

export type Caller = { userId: string; role: "parent" | "specialist" };

/* Structural type satisfied by both D1Database and the node:sqlite shim
   used in tests. */
export type Db = {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
      first<T = Record<string, unknown>>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
  };
};

export class AccessDenied extends Error {
  constructor(what: string) {
    super(`Access denied: ${what}`);
  }
}

const mustBe = (caller: Caller, role: Caller["role"], what: string) => {
  if (caller.role !== role) throw new AccessDenied(what);
};

const id = () => crypto.randomUUID();
const referenceCode = () =>
  "FPN-" + Math.floor(1000 + Math.random() * 9000).toString();

/* ---------------- parent ---------------- */

export async function createQuestion(
  db: Db,
  caller: Caller,
  q: {
    body: string;
    verdict?: string | null;
    matchTier?: string | null;
    headline?: string | null;
    statement?: string | null;
    citations?: unknown;
    gateFailures?: unknown;
  }
) {
  mustBe(caller, "parent", "only a foster parent can ask a question");
  const questionId = id();
  await db
    .prepare(
      `INSERT INTO questions
         (id, user_id, body, verdict, match_tier, headline, statement, citations, gate_failures)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      questionId,
      caller.userId,
      q.body,
      q.verdict ?? null,
      q.matchTier ?? null,
      q.headline ?? null,
      q.statement ?? null,
      JSON.stringify(q.citations ?? []),
      JSON.stringify(q.gateFailures ?? [])
    )
    .run();
  return questionId;
}

export async function listMyQuestions(db: Db, caller: Caller, limit = 50) {
  mustBe(caller, "parent", "question history is the parent's own");
  const { results } = await db
    .prepare(
      `SELECT id, body, verdict, match_tier, headline, statement, created_at
         FROM questions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .bind(caller.userId, limit)
    .all();
  return results;
}

export async function createEscalation(
  db: Db,
  caller: Caller,
  e: { questionId: string; sharedPayload: string; reason: string }
) {
  mustBe(caller, "parent", "only a foster parent can escalate");

  /* the question must be the caller's own */
  const owned = await db
    .prepare(`SELECT id FROM questions WHERE id = ? AND user_id = ?`)
    .bind(e.questionId, caller.userId)
    .first();
  if (!owned) throw new AccessDenied("that question is not yours");

  /* resolve the assignment ONCE, here, and store it on the row */
  const assignment = await db
    .prepare(`SELECT specialist_user_id FROM parent_profiles WHERE user_id = ?`)
    .bind(caller.userId)
    .first<{ specialist_user_id: string }>();
  if (!assignment) throw new AccessDenied("no specialist is assigned to you");

  const escalationId = id();
  const code = referenceCode();
  await db
    .prepare(
      `INSERT INTO escalations
         (id, question_id, parent_user_id, specialist_user_id, shared_payload, reference_code, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      escalationId,
      e.questionId,
      caller.userId,
      assignment.specialist_user_id,
      e.sharedPayload,
      code,
      e.reason
    )
    .run();
  return { id: escalationId, referenceCode: code };
}

export async function listMyEscalations(db: Db, caller: Caller) {
  mustBe(caller, "parent", "escalations are the parent's own");
  const { results } = await db
    .prepare(
      `SELECT e.id, e.reference_code, e.status, e.reason, e.response_body,
              e.responded_at, e.created_at, p.full_name AS specialist_name
         FROM escalations e
         JOIN profiles p ON p.user_id = e.specialist_user_id
        WHERE e.parent_user_id = ?
        ORDER BY e.created_at DESC`
    )
    .bind(caller.userId)
    .all();
  return results;
}

/* ---------------- specialist ---------------- */

/* Queue. Scoped by specialist_user_id on the escalation row — the snapshot,
   not a live lookup through parent_profiles. */
export async function listAssignedEscalations(
  db: Db,
  caller: Caller,
  status: "open" | "all" = "open"
) {
  mustBe(caller, "specialist", "only a specialist has a queue");
  const sql =
    `SELECT e.id, e.reference_code, e.status, e.reason, e.created_at,
            e.shared_payload, p.full_name AS parent_name
       FROM escalations e
       JOIN profiles p ON p.user_id = e.parent_user_id
      WHERE e.specialist_user_id = ?` +
    (status === "open" ? ` AND e.status = 'open'` : ``) +
    ` ORDER BY e.created_at ASC`;
  const { results } = await db.prepare(sql).bind(caller.userId).all();
  return results;
}

/* Detail. The question is reached ONLY through the escalation join, and only
   when this specialist is the one it was sent to. There is deliberately no
   function here that reads `questions` by parent. */
export async function getAssignedEscalation(db: Db, caller: Caller, escalationId: string) {
  mustBe(caller, "specialist", "only a specialist may open an escalation");
  const row = await db
    .prepare(
      `SELECT e.id, e.reference_code, e.status, e.reason, e.created_at,
              e.shared_payload, e.response_body, e.responded_at,
              q.verdict, q.match_tier, q.citations,
              p.full_name AS parent_name
         FROM escalations e
         JOIN questions q ON q.id = e.question_id
         JOIN profiles  p ON p.user_id = e.parent_user_id
        WHERE e.id = ? AND e.specialist_user_id = ?`
    )
    .bind(escalationId, caller.userId)
    .first();
  if (!row) throw new AccessDenied("no such escalation is assigned to you");
  return row;
}

export async function respondToEscalation(
  db: Db,
  caller: Caller,
  escalationId: string,
  body: string
) {
  mustBe(caller, "specialist", "only a specialist may respond");
  await getAssignedEscalation(db, caller, escalationId); // authorization
  await db
    .prepare(
      `UPDATE escalations
          SET status = 'answered', response_body = ?, responded_at = datetime('now')
        WHERE id = ? AND specialist_user_id = ?`
    )
    .bind(body, escalationId, caller.userId)
    .run();
}

export async function closeOffline(db: Db, caller: Caller, escalationId: string) {
  mustBe(caller, "specialist", "only a specialist may close an escalation");
  await getAssignedEscalation(db, caller, escalationId);
  await db
    .prepare(
      `UPDATE escalations
          SET status = 'closed_offline', responded_at = datetime('now')
        WHERE id = ? AND specialist_user_id = ?`
    )
    .bind(escalationId, caller.userId)
    .run();
}
