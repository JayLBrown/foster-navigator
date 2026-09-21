import { Form, Link, type RouterContextProvider } from "react-router";
import { cloudflareContext } from "~/lib/context";
import { listAssignedEscalations, type Db } from "~/lib/db.server";
import { requireSpecialist } from "~/lib/session.server";
import { Shell, btnGhost } from "~/lib/ui";

type Row = {
  id: string; reference_code: string; status: string; reason: string;
  created_at: string; shared_payload: string; parent_name: string;
};

export async function loader({
  request, context,
}: { request: Request; context: RouterContextProvider }) {
  const { env } = context.get(cloudflareContext);
  const db = env.DB as unknown as Db;
  const me = await requireSpecialist(db, request);
  const showAll = new URL(request.url).searchParams.get("show") === "all";
  const rows = (await listAssignedEscalations(db, me, showAll ? "all" : "open")) as Row[];
  return { me: { fullName: me.fullName, agencyName: me.agencyName }, rows, showAll };
}

const age = (iso: string) => {
  const h = Math.floor((Date.now() - new Date(iso + "Z").getTime()) / 3.6e6);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function Portal({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  const { me, rows, showAll } = loaderData;

  return (
    <Shell user={me} wide>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold leading-tight text-ink">Review queue</h1>
          <p className="mt-1 text-[15px] text-muted">
            {me.fullName} · {me.agencyName}
          </p>
        </div>
        <Form method="post" action="/signout">
          <button className="rounded-xl px-3 py-2 text-[13px] font-semibold text-muted hover:bg-field">
            Sign out
          </button>
        </Form>
      </div>

      <div className="mt-5 flex gap-2">
        <Link
          to="/portal"
          className={`rounded-full px-3 py-1.5 text-[12px] font-bold tracking-wide ${!showAll ? "bg-ink text-white" : "bg-field text-muted"}`}
        >
          OPEN
        </Link>
        <Link
          to="/portal?show=all"
          className={`rounded-full px-3 py-1.5 text-[12px] font-bold tracking-wide ${showAll ? "bg-ink text-white" : "bg-field text-muted"}`}
        >
          ALL
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-field p-6 text-center">
          <p className="text-[15px] font-semibold text-ink">
            {showAll ? "Nothing here yet." : "No open requests."}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            Only questions a foster parent explicitly sends for review appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                to={`/portal/${r.id}`}
                className="block rounded-2xl bg-field p-4 ring-1 ring-transparent transition hover:ring-brand"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold tracking-wide text-ink">{r.reference_code}</span>
                  {r.status !== "open" && (
                    <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold tracking-wider text-mint-ink">
                      {r.status === "answered" ? "ANSWERED" : "CLOSED OFFLINE"}
                    </span>
                  )}
                  <span className="ml-auto text-[12px] text-muted">{age(r.created_at)}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-[15px] text-ink">{r.shared_payload}</p>
                <p className="mt-2 text-[12px] text-muted">{r.parent_name}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 rounded-xl bg-field px-4 py-3 text-[12px] leading-snug text-muted">
        You see only the questions sent to you for review. A family's other questions
        are not visible here.
      </p>
    </Shell>
  );
}
