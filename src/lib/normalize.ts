const ALIAS_MAP: Record<string, string> = {
  k8s: "kubernetes",
  kube: "kubernetes",
  js: "javascript",
  ts: "typescript",
  py: "python",
  golang: "go",
  node: "nodejs",
  "c++": "cpp",
  postgres: "postgresql",
  pg: "postgresql",
  ml: "machinelearning",
  ai: "artificialintelligence",
  dl: "deeplearning",
};

export function normalizeToken(text: string): string {
  return text.toLowerCase().replace(/[^\w+#]/g, "");
}

export function expandAlias(token: string): string {
  const n = normalizeToken(token);
  return ALIAS_MAP[n] ?? n;
}

export function tokenizeForMatch(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,;/|]+/)
    .map((t) => normalizeToken(t))
    .filter(Boolean);
}

export function textContainsSkill(haystack: string, skill: string): boolean {
  const normalizedSkill = expandAlias(skill);
  const tokens = tokenizeForMatch(haystack);
  return tokens.some((t) => {
    const expanded = expandAlias(t);
    return (
      expanded === normalizedSkill ||
      expanded.includes(normalizedSkill) ||
      normalizedSkill.includes(expanded)
    );
  });
}

export function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
