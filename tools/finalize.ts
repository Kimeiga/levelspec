/** Native publication is the default; the historical profile implementation remains available. */
if(process.argv.slice(2).includes('--legacy'))await import('./finalize-legacy.ts');
else await import('./finalize-native.ts');
export {};
