/** Default concept production uses native semantic geometry; legacy is an explicit lazy boundary. */
import {conceptOptions} from './producers/concept-options.ts';
const options=conceptOptions(process.argv.slice(2));
if(options.flags.has('--legacy'))await import('./concept-legacy.ts');
else {const {nativeConceptCommand}=await import('./producers/concept-native.ts');await nativeConceptCommand(options);}
