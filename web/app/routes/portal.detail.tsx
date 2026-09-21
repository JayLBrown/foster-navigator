import { Form, Link, redirect, useNavigation, type RouterContextProvider } from "react-router";
import { cloudflareContext } from "~/lib/context";
import {
  getAssignedEscalation, respondToEscalation, closeOffline, AccessDenied, type Db,
} from "~/lib/db.server";
import { requireSpecialist } from "~/lib/session.server";
import { RULES } from "~/lib/corpus";
import { Shell, btnPrimary, btnGhost, field } from "~/lib/ui";

type Detail = {
  id: string; reference_code: string; status: string; reason: string; created_at: string;
  shared_payload: string; response_body: string | null; responded_at: string | null;
  verdict: string | null; match_tier: string | null; citations: string | null;
  parent_name: string;
};

export async function loader({
  request, context, params,
}: { request: Request; context: RouterContextProvider; params: { id: string } }) {
  const { env } = context.get(cloudflareContext);
  const db = env.DB as unknown as Db;
  const me = await requireSpecialist(db, request);
  try {
    const row = (await getAssignedEscalation(db, me, params.id)) as Detail;
    return { me: { fullName: me.fullName }, row };
  } catch (e) {
    if (e instanceof AccessDenied) throw redirect("/portal");
    throw e;
  }
}

export async function action({
  request, context, params,
}: { request: Request; context: RouterContextProvider; params: { id: string } }) {
  const { env } = context.get(cloudflareContext);
  const db = env.DB as unknown as Db;
  const me = await requireSpecialist(db, request);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  try {
    if (intent === "respond") {
      const body = String(form.get("response") ?? "").trim();
      if (!body) return { error: "Write a response first." };
      await respondToEscalation(db, me, params.id, body);
    } else if (intent === "offline") {
      await closeOffline(db, me, params.id);
    }
  } catch (e) {
    if (e instanceof AccessDenied) throw redirect("/portal");
    throw e;
  }
  throw redirect("/portal");
}

export default function PortalDetail({
  loaderData, actionData,
}: { loaderData: Awaited<ReturnType<typeof loader>>; actionData?: { error?: string } }) {
  const { me, row } = loaderData;
  const nav = useNavigation();
  const busy = nav.state === "submitting";
  const citations: { rule_number: string; verbatim_quote: string }[] = row.citations
    ? JSON.parse(row.citations)
    : [];

  return (
    <Shell user={me} wide>
      <Link to="/portal" className="text-[13px] font-semibold text-brand hover:underline">
        ← Queue
      </Link>

      <div className="mt-3 flex items-center gap-2">
        <h1 className="text-2xl font-extrabold text-ink">{row.reference_code}</h1>
        {row.status !== "open" && (
          <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold tracking-wider text-mint-ink">
            {row.status === "answered" ? "ANSWERED" : "CLOSED OFFLINE"}
          </span>
        )}
      </div>
      <p className="mt-1 text-[13px] text-muted">From {row.parent_name}</p>

      <div className="mt-5 rounded-2xl bg-field p-4">
        <div className="text-[11px] font-bold tracking-wider text-ink">THE QUESTION</div>
        <p className="mt-2 text-[16px] leading-relaxed text-ink">{row.shared_payload}</p>
      </div>

      <div className="mt-3 rounded-2xl bg-flag-soft p-4">
        <div className="text-[11px] font-bold tracking-wider text-ink">WHY IT CAME TO YOU</div>
        <p className="mt-1 text-[14px] text-ink">{row.reason}</p>
      </div>

      {citations.length > 0 && (
        <div className="mt-3 rounded-2xl bg-field p-4">
          <div className="text-[11px] font-bold tracking-wider text-ink">CLOSEST RULE THE SYSTEM FOUND</div>
          {citations.map((c) => {
            const rule = RULES.find((r) => r.rule_number === c.rule_number);
            return (
              <div key={c.rule_number} className="mt-3">
                <div className="text-[14px] font-bold text-ink">{c.rule_number}</div>
                <blockquote className="mt-1 text-[14px] leading-relaxed text-ink">
                  &ldquo;{c.verbatim_quote}&rdquo;
                </blockquote>
                {rule && <div className="mt-1 text-[12px] text-muted">{rule.heading}</div>}
              </div>
            );
          })}
        </div>
      )}

      {row.status === "open" ? (
        <Form method="post" className="mt-6">
          <label className="block text-[11px] font-bold tracking-wider text-ink">YOUR RESPONSE</label>
          <textarea
            name="response"
            rows={6}
            autoFocus
            placeholder="Answer in plain language. The foster parent sees this exactly as written."
            className={`${field} mt-2 resize-none`}
          />
          {actionData?.error && (
            <p className="mt-2 text-[13px] text-flag">{actionData.error}</p>
          )}
          <button name="intent" value="respond" disabled={busy} className={`${btnPrimary} mt-4 disabled:opacity-60`}>
            {busy ? "Sending…" : "Send response"}
          </button>
          <button name="intent" value="offline" className={`${btnGhost} mt-3`}>
            I handled this by phone
          </button>
          <p className="mt-3 text-center text-[12px] text-muted">
            Closing it offline is a normal outcome, not a workaround.
          </p>
        </Form>
      ) : (
        <div className="mt-6 rounded-2xl bg-field p-4">
          <div className="text-[11px] font-bold tracking-wider text-ink">
            {row.status === "answered" ? "YOUR RESPONSE" : "CLOSED OFFLINE"}
          </div>
          {row.response_body ? (
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{row.response_body}</p>
          ) : (
            <p className="mt-2 text-[14px] text-muted">Handled outside the app.</p>
          )}
        </div>
      )}
    </Shell>
  );
}
