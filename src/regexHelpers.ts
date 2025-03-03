export const traefikDockerLabelRe = /traefik\.http\.routers\.(.*)\.rule/;

export const traefikRouterRuleRe = /Host\(\s*`(.*?\.local)`\s*,*\s*\)/gi;

export const domainRe = /`(?<domain>[^`]*?\.local)`/g;

export function matchDomainCNames(domainString: string): string[] {
  const matches = [...domainString.matchAll(domainRe)];
  return matches.map((match) => match.groups?.domain || "").filter(Boolean);
}