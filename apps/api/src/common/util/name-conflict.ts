/**
 * Given a desired name and the set of names already taken in the same
 * folder (lowercased), returns a name guaranteed not to collide by
 * appending " (1)", " (2)", ... before the extension.
 */
export function resolveNameConflict(desiredName: string, takenNamesLower: Set<string>): string {
  if (!takenNamesLower.has(desiredName.toLowerCase())) return desiredName;

  const lastDot = desiredName.lastIndexOf(".");
  const hasExt = lastDot > 0;
  const base = hasExt ? desiredName.slice(0, lastDot) : desiredName;
  const ext = hasExt ? desiredName.slice(lastDot) : "";

  let n = 1;
  let candidate = `${base} (${n})${ext}`;
  while (takenNamesLower.has(candidate.toLowerCase())) {
    n += 1;
    candidate = `${base} (${n})${ext}`;
  }
  return candidate;
}
