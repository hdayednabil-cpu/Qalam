export function routeMatches(path: string, href: string) {
  return path === href || (href.split("/").length > 2 && path.startsWith(href + "/"));
}

export function mobileNavigation<T extends { mobile?: boolean }>(items: T[]) {
  if (items.length <= 5) return { primary: items, overflow: [] as T[] };
  const preferred = items.filter((item) => item.mobile);
  const primary = [...preferred, ...items.filter((item) => !item.mobile)].slice(0, 4);
  return { primary, overflow: items.filter((item) => !primary.includes(item)) };
}

export function workspaceLabel(path: string, items: { href: string; label: string }[]) {
  if (path === "/account") return "Account settings";
  const current = [...items].sort((a, b) => b.href.length - a.href.length).find((item) => routeMatches(path, item.href));
  if (current) return current.label;
  const section = path.split("/")[2];
  return ({ sessions: "Session details", homework: "Homework", tests: "Tests" } as Record<string, string>)[section] ?? "Workspace";
}
