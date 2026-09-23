import { NextResponse, type NextRequest } from "next/server";
import { checkBasicAuth, isPublicPath } from "@/lib/basic-auth";

// When APP_PASSWORD is set (hosted deployments), every page except read-only
// share links asks for it. Locally, with no APP_PASSWORD, nothing changes.
export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password || isPublicPath(request.nextUrl.pathname)) return NextResponse.next();
  if (checkBasicAuth(request.headers.get("authorization"), password)) return NextResponse.next();
  return new NextResponse("Password required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Impact Tracker", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
