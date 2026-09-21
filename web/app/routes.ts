import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  /* public marketing site */
  index("routes/site.home.tsx"),
  route("navigator", "routes/site.navigator.tsx"),
  route("demo", "routes/demo.tsx"),

  /* auth — two doors, one backbone */
  route("signin", "routes/signin.tsx"),
  route("signout", "routes/signout.tsx"),
  route("portal/signin", "routes/portal.signin.tsx"),

  /* foster parent */
  route("ask", "routes/ask.tsx"),
  route("requests", "routes/requests.tsx"),

  /* licensing specialist */
  route("portal", "routes/portal.tsx"),
  route("portal/:id", "routes/portal.detail.tsx"),
] satisfies RouteConfig;
