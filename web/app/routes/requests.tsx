import { Form, Link, type RouterContextProvider } from "react-router";
import { cloudflareContext } from "~/lib/context";
import { listMyEscalations, type Db } from "~/lib/db.server";
import { requireParent } from "~/lib/session.server";
import { Shell, btnPrimary } from "~/lib/ui";

type Row = {
  id: string; reference_code: string; status: string; reason: string;
  response_body: string | null; responded_at: string | null;
  created_at: string; specialist_name: string;
};

export async function loader({
  request, context,
}: { request: Request; context: RouterContextProvider }) {
  const { env } = context.get(cloudflareContext);
  const db = env.DB as unknown as Db;
  const me = await requireParent(db, request);
  const rows = (await listMyEscalations(db, me)) as Row[];
  return { me: { fullName: me.fullName }, rows };
}

const when = (iso: string) =>
  new Date(iso + "Z").toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function Requests({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  const { me, rows } = loaderData;

  return (
    <Shell user={me}>
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl font-extrabold leading-tight text-ink">Your requests</h1>
        <Form method="post" action="/signout">
          <button className="rounded-xl px-3 py-2 text-[13px] font-semibold text-muted hover:bg-field">
            Sign out
          </button>
        </Form>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-field p-6 text-center">
          <p className="text-[15px] font-semibold text-ink">Nothing sent for review yet.</p>
          <p className="mt-1 text-[13px] text-muted">
            When the rules don&rsquo;t settle a question, you can send it to your specialist.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl bg-field p-4">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold tracking-wide text-ink">{r.reference_code}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${
                    r.status === "open" ? "bg-flag-soft text-flag" : "bg-mint text-mint-ink"
                  }`}
                >
                  {r.status === "open" ? "WAITING" : r.status === "answered" ? "ANSWERED" : "HANDLED BY PHONE"}
                </span>
                <span className="ml-auto text-[12px] text-muted">{when(r.created_at)}</span>
              </div>

              {r.status === "answered" && r.response_body ? (
                <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-line">
                  <div className="text-[11px] font-bold tracking-wider text-ink">
                    {r.specialist_name.toUpperCase()} REPLIED
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                    {r.response_body}
                  </p>
                </div>
              ) : r.status === "closed_offline" ? (
                <p className="mt-2 text-[14px] text-muted">
                  {r.specialist_name} handled this by phone.
                </p>
              ) : (
                <p className="mt-2 text-[14px] text-muted">
                  With {r.specialist_name}. Typical response is two business days.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Link to="/ask" className={`${btnPrimary} mt-6 block`}>
        Ask a question
      </Link>
    </Shell>
  );
}
