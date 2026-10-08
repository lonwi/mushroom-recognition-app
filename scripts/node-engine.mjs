// dependency-cruiser 18.5 declares Node ^22 || ^24 and exits on 20.19.
// `engines.node` in package.json is the same range. `^22` means 22.x, not 23.

export function satisfiesNode(version, range) {
  const [major, minor = 0, patch = 0] = String(version)
    .split('.')
    .map((part) => Number(part));
  if ([major, minor, patch].some((part) => Number.isNaN(part))) return false;

  return range.split('||').some((clause) => {
    const match = clause.trim().match(/^\^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
    if (!match) return false;
    const wantMajor = Number(match[1]);
    const wantMinor = Number(match[2] ?? 0);
    const wantPatch = Number(match[3] ?? 0);
    if (major !== wantMajor) return false;
    if (minor !== wantMinor) return minor > wantMinor;
    return patch >= wantPatch;
  });
}
