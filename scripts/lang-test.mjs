// Unit test for functions/_lang.js (Accept-Language / cookie / ?lang= normalisation). Run: node scripts/lang-test.mjs
import { normalizeLang as n, parseAcceptLanguage as p } from '../functions/_lang.js';
const cases = [['zh-TW', 'zh-hant'], ['zh-CN', 'zh-hans'], ['zh-SG', 'zh-hans'], ['zh-HK', 'zh-hant'], ['zh-MO', 'zh-hant'], ['zh-Hans-CN', 'zh-hans'], ['zh-Hant-TW', 'zh-hant'], ['zh', 'zh-hans'], ['zh-Hans', 'zh-hans'], ['zh-Hant', 'zh-hant'], ['pt-PT', 'pt-br'], ['pt', 'pt-br'], ['pt-BR', 'pt-br'], ['es-MX', 'es'], ['en-US', 'en'], ['DE', 'de'], ['ja-JP', 'ja'], ['ru_RU', 'ru'], ['fil', null], ['*', null], ['', null], ['x', null], [null, null], ['de-DE-u-co-phonebk', 'de'], ['zh-TW-x-private', 'zh-hant'], ['en-u-ca-gregory', 'en']];
let bad = 0;
for (const [i, o] of cases) if (n(i) !== o) { bad++; console.error('FAIL', i, n(i), 'want', o); }
const a = p('zh-TW,zh;q=0.9,en;q=0.8,*;q=0.1').join();
if (a !== 'zh-hant,zh-hans,en') { bad++; console.error('FAIL accept-language order', a); }
if (p('de;q=0, fr;q=0.5').join() !== 'fr') { bad++; console.error('FAIL q=0 handling'); }
if (p('de;q=abc, fr;q=0.5').join() !== 'fr') { bad++; console.error('FAIL malformed q', p('de;q=abc, fr;q=0.5').join()); }
if (p('de;q=1.5, fr').join() !== 'fr') { bad++; console.error('FAIL q>1'); }
console.log(`lang-test: ${cases.length + 4 - bad}/${cases.length + 4} passed`);
process.exit(bad ? 1 : 0);
