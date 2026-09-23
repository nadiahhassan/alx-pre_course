import { NextResponse, type NextRequest } from "next/server";

// Sends signed-out visitors to the sign-in page. This only checks that a
// session cookie exists; pages and server actions validate it properly.
// Read-only share links stay open to anyone with the link.
const PUBLIC = ["/login", "/share/"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();
  if (request.cookies.has("it_session")) return NextResponse.next();
  const url = new URL("/login", request.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
