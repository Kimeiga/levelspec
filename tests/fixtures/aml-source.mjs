import { migrateSvgx } from '../../src/architecture/migration.ts';
import { serializeAml } from '../../src/architecture/format.ts';

/** Explicitly migrates retained behavioral fixtures before exercising AML-only browser inputs. */
export async function amlSource(svgx) {
  return serializeAml(await migrateSvgx(svgx));
}
