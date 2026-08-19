export function sessionUserId(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  return cookie.match(/(?:^|;\s*)futonic_user_id=([^;]+)/)?.[1] || null;
}

export function hasAdminSession(request: Request) {
  return request.headers.get("cookie")?.includes("futonic_session=admin") ?? false;
}
