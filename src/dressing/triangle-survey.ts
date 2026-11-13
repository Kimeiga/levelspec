/**
 * Owned world-space triangle corners for obstruction queries, separate from a
 * render mesh. Producers append complete triangles in order and retain their
 * own coordinate precision; no normals, UVs or surface assignments are stored.
 */
export class TriangleSurvey {
  readonly positions: number[] = [];

  /** Number of complete triangles appended by all producers sharing this survey. */
  get triangleCount(): number {
    return this.positions.length / 9;
  }

  /** Returns owned packed corners; later drawing and caller mutation remain independent. */
  snapshot(): Float64Array {
    return new Float64Array(this.positions);
  }
}
