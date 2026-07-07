/**
 * Default icon for scanner-produced concept types that have no AWS
 * equivalent — src/lib/aws-icons.ts's findAwsIcon only matches official AWS
 * service names, so every non-AWS type the scanners emit today (React
 * components, Next.js routes, Redux stores, etc.) currently renders with no
 * icon at all. Exact match only, unlike findAwsIcon's fuzzy matching: the
 * scanners only ever emit this small, known set of literal type strings, so
 * no normalization is needed. Reuses the same fe-*.svg/user.svg/
 * generic-application.svg files already in public/aws-icons/ (see
 * CLAUDE.md's "AWS visual style" section) — no new icon files.
 */
const FRONTEND_ICON_BY_TYPE: Record<string, string> = {
  "Next.js Page": "fe-screen.svg",
  "React Route": "fe-screen.svg",
  "Redux Slice": "fe-store.svg",
  Store: "fe-store.svg",
  "API Client": "fe-service.svg",
  Service: "fe-service.svg",
  "Design System Package": "fe-design-system.svg",
  "UI Capability": "fe-design-system.svg",
  "Custom Hook": "fe-hook.svg",
  "React Hook": "fe-hook.svg",
  "React Component": "fe-component.svg",
  Person: "user.svg",
  "External System": "generic-application.svg",
};

export function findFrontendIcon(type: string): string | undefined {
  return FRONTEND_ICON_BY_TYPE[type];
}
