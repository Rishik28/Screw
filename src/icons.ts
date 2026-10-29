/** Original, deliberately simple line icons; no font or remote assets. */
const paths:Record<string,string>={
 plus:'M12 5v14M5 12h14',
 bucket:'M4 7h16l-2 14H6L4 7Zm3-1a5 5 0 0 1 10 0',
 shelf:'M3 5v16M21 5v16M3 10h18M3 18h18M7 5v4m5-4v4m5-4v4',
 tools:'m14 4 6 6-3 3-6-6M12 10 4 18l2 2 8-8M15 3l6 6',
 magnet:'M5 4v10a7 7 0 0 0 14 0V4h-5v10a2 2 0 0 1-4 0V4H5Zm0 5h5m4 0h5',
 bolt:'m13 2-9 12h7l-1 8 10-13h-7l1-7Z',
 cell:'M3 7h16v12H3V7Zm17 4h2v4h-2M8 10v6m5-6v6',
 undo:'M9 4 3 10l6 6M3 10h10a7 7 0 0 1 0 14',
 eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
 clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 3v6l4 2',
 star:'m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z',
 scrap:'m12 3 8 5v9l-8 5-8-5V8l8-5Zm0 7 8-2m-8 2L4 8m8 2v12',
 home:'m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7',
 play:'m8 4 13 8-13 8V4Z',
 close:'m6 6 12 12M6 18 18 6',
 lock:'M5 10h14v11H5V10Zm3 0V6a4 4 0 0 1 8 0v4',
 check:'m4 12 5 5L20 6',
 reset:'M4 8a9 9 0 1 1-1 8M4 2v6h6',
 tree:'M12 3v6M4 13V9h16v4M4 17v4m8-8v8m8-4v4',
};
export function icon(name:string){return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.star}"/></svg>`;}
export const skillIcons:Record<string,string>={bucket2:'bucket',bucket3:'bucket',bucket4:'bucket',shelf4:'shelf',shelf5:'shelf',shelf6:'shelf',magnet:'magnet',charger:'bolt',reservoir:'cell',undo:'undo',survey:'eye',time1:'clock',time2:'clock',xp1:'star',scholar:'star',salvager:'scrap'};
