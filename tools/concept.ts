/** Publishes native concept candidates. */
import {conceptOptions} from './producers/concept-options.ts';
import {nativeConceptCommand} from './producers/concept-native.ts';
await nativeConceptCommand(conceptOptions(process.argv.slice(2)));
