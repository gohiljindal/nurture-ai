/** Routes where the MVP app chrome (top + mobile bottom nav) is shown. */
export function showMvpNav(pathname: string): boolean {
  if (pathname === "/" || pathname === "/login" || pathname === "/signup") {
    return false;
  }
  const exact = ["/dashboard", "/history", "/add-child", "/check-symptom", "/feedback"];
  if (exact.includes(pathname)) return true;
  const prefixes = [
    "/check/",
    "/child/",
    "/feeding/",
    "/growth/",
    "/sleep/",
    "/vaccines/",
    "/milestones/",
  ];
  return prefixes.some((p) => pathname.startsWith(p));
}
