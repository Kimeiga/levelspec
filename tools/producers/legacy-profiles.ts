/** Rewrite the legend's z values for a given profile. */
export function withProfile(
  text: string,
  letters: string[],
  z: (i: number) => number,
  extra: Record<string, string>,
  ceiling?: (i: number) => number,
): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let inLegend = false;
  for (const line of lines) {
    if (/^legend\s*$/.test(line)) {
      inLegend = true;
      out.push(line);
      continue;
    }
    if (inLegend && /^end\s*$/.test(line)) {
      inLegend = false;
      out.push(line);
      continue;
    }
    const idx = inLegend ? letters.indexOf(line.replace(/^\s+/, '')[0]) : -1;
    if (idx >= 0) { out.push(profileLegendLine(line, z(idx), ceiling?.(idx))); continue; }
    out.push(profileHeader(line, extra));
  }
  return out.join('\n');
}
function profileHeader(line: string, extra: Record<string, string>): string {
  const kv = /^([a-z_]+):/.exec(line);
  if (!kv || extra[kv[1]] === undefined) return line;
  const result = `${kv[1]}: ${extra[kv[1]]}`;
  delete extra[kv[1]];
  return result;
}
function profileLegendLine(line: string, height: number, ceiling?: number): string {
  const body = line.split('//')[0].replace(/\s[+-][\d.]+(?=\s|$)/g, '').replace(/\sh=[\d.]+/g, '').trimEnd();
  const comment = line.includes('//') ? '  //' + line.split('//')[1] : '';
  const ceil = ceiling === undefined ? '' : `  h=${ceiling.toFixed(1)}`;
  return `${body}${profileHeight(height)}${ceil}${comment}`;
}
function profileHeight(height: number): string {
  return height ? `  ${height > 0 ? '+' : ''}${height.toFixed(2)}` : '';
}
