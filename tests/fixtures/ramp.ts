export const twoRooms = (strip: string, extra = "") => `id: ramp_test
grid: 1.6
layer g z=0 height=4 roof=no
legend
  A  low   "Low"   room
  B  high  "High"  room  +0.6
  r  climb "Ramp"  ramp
end
plan
..........
.BBBBBBBB.
.BBBBBBBB.
.BBBBBBBB.
${strip}
${strip}
${strip}
${strip}
${strip}
.AAAAAAAA.
.AAAAAAAA.
..........
end
mark attacker_spawn low attack
mark defender_spawn high defend
${extra}`;

/** Rotate the authored cells, so both flight and surrounding wall junctions turn. */
export function turnPlan(text: string, turns: number): string {
  return text.replace(/\nplan\n([\s\S]*?)\nend/, (_, picture: string) => {
    let rows = picture.split("\n").map((row) => [...row]);
    for (let i = 0; i < turns; i++)
      rows = rows[0].map((_, x) => rows.map((row) => row[x]).reverse());
    return `\nplan\n${rows.map((row) => row.join("")).join("\n")}\nend`;
  });
}
