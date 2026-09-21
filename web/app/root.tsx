import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { BackHome, HomeMark } from "~/site/chrome";
import { pageMeta, SITE_NAME } from "~/lib/meta";
import "./app.css";

/* Routes that export their own meta() replace this one entirely, so each of
   them builds its tags through pageMeta() too. This covers the signed-in
   routes, which set none. */
export const meta = () =>
  pageMeta({ title: SITE_NAME, path: "/", robots: "noindex" });

export const links = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Source+Sans+3:wght@400;600;700&family=Caveat:wght@600&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="font-sans antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

/* Every dead end is still a way back. A judge who mistypes a URL should land
   somewhere that explains itself, not on a stack trace. */
export function ErrorBoundary({ error }: { error: unknown }) {
  let message = "Something went wrong";
  let details = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      message = "Page not found";
      details = "That page does not exist. The links below all still work.";
    } else if (error.status === 403) {
      message = "Not available on this account";
      details =
        error.statusText ||
        "This page belongs to the other kind of account. Foster parents and licensing specialists each see only their own side.";
    } else {
      message = "Error";
      details = error.statusText || details;
    }
  } else if (error instanceof Error) {
    details = error.message;
  }

  return (
    <main className="min-h-dvh bg-page px-4 py-10">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-line sm:p-8">
        <HomeMark />
        <h1 className="mt-7 text-2xl font-extrabold text-ink">{message}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{details}</p>

        <div className="mt-7 border-t border-line pt-5">
          <BackHome />
          <p className="mt-3 text-[13px] text-muted">
            Or{" "}
            <a
              href="/demo"
              className="font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              try the demo
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
