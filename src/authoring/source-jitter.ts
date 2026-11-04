/** Historical FNV-1a source profile jitter, over UTF-16 code units. */
export function sourceJitter(text:string):number {
  const hash=text.split('').reduce((value,char)=>Math.imul(value^char.charCodeAt(0),16777619),2166136261);
  return (hash>>>0)/2**32;
}
