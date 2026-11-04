/** Compatibility code is loaded only at the explicitly requested boundary. */
if(process.argv.slice(2).includes('--legacy'))await import('./author-legacy.ts');
else await import('./author-native.ts');
export {};
