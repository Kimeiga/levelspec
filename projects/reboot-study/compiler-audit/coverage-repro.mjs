/** Reproduces validation-boundary observations without changing compiler or map sources. */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { compile, parseAml, validateForRuntime } from 'levelspec';
import { produceDocument } from 'levelspec/producers';

const output = resolve(process.argv[2] ?? 'generated/reboot-compiler-audit/connection-coverage');
await mkdir(output, { recursive: true });

/** Two adjacent square floors have one continuous shared mouth, independently of XML declaration count. */
function source(connections, minimumRoutes) {
  return `<architecture version="1" id="audit-connection" validation="playable">
  <profile id="pa" points="0 0; 4 0; 4 4; 0 4"/>
  <profile id="pb" points="4 0; 8 0; 8 4; 4 4"/>
  <slab id="a" profile="pa"/>
  <slab id="b" profile="pb"/>
  <path id="mouth" points="4 0 0; 4 4 0"/>
  <marker id="start" kind="spawn" element="a" position="2 2 0"/>
  <marker id="end" kind="objective" element="b" position="6 2 0"/>
  ${connections}
  <route id="route" from="start" to="end" min-routes="${minimumRoutes}"/>
</architecture>\n`;
}

const cases = [
  {
    name: 'one-mouth',
    connections: '<connection id="one" from="a" to="b" path="mouth"/>',
    minimumRoutes: 1,
    independentExpectation: 'One valid authored mouth. Both entry points should accept one required route.',
  },
  {
    name: 'duplicate-mouth',
    connections: '<connection id="one" from="a" to="b" path="mouth"/>\n  <connection id="two" from="a" to="b" path="mouth"/>',
    minimumRoutes: 2,
    independentExpectation: 'One physical mouth declared twice cannot supply two independent physical entrance resources.',
  },
  {
    name: 'missing-path',
    connections: '<connection id="one" from="a" to="b" path="absent"/>',
    minimumRoutes: 1,
    independentExpectation: 'The explicit connection path reference is invalid, even though the two floors are physically adjacent.',
  },
];

const results = [];
for (const entry of cases) {
  const xml = source(entry.connections, entry.minimumRoutes);
  const document = parseAml(xml);
  const level = await compile(document);
  const report = await validateForRuntime(level);
  let producer;
  try {
    const made = await produceDocument(document);
    producer = { passed: true, routes: made.physical.routes };
  } catch (error) {
    producer = { passed: false, message: error.message, diagnostics: error.diagnostics };
  }
  await writeFile(resolve(output, `${entry.name}.aml`), xml);
  results.push({
    name: entry.name,
    independentExpectation: entry.independentExpectation,
    sourceSha256: createHash('sha256').update(xml).digest('hex'),
    compiler: { diagnostics: level.diagnostics, routes: level.navigation?.routes },
    runtimeValidation: { passed: report.passed, diagnostics: report.diagnostics },
    producer,
  });
}
const evidence = {
  purpose: 'Read-only compiler audit observations; this script records current behavior and does not assert that the observed defects are desired contracts.',
  units: 'meters, right-handed Z-up',
  baseline: 'Two adjacent 4-by-4 floor patches with one shared 4m mouth and a straight 4m endpoint path.',
  results,
};
await writeFile(resolve(output, 'observations.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ output, results }, null, 2));
