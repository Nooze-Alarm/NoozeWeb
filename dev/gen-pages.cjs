// Generate src/pages/*.astro from the original HTML (dev/legacy backups).
// Extracts per-page SEO, JSON-LD and the <main> block; chrome comes from BaseLayout.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'dev', 'legacy');
const outDir = path.join(root, 'src', 'pages');
fs.mkdirSync(outDir, { recursive: true });

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&ndash;': '–', '&mdash;': '—', '&euro;': '€', '&copy;': '©', '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”', '&hellip;': '…', '&nbsp;': ' ' };
const decode = (s) => s == null ? s : s.replace(/&[a-z]+;|&#\d+;/gi, (m) => ENT[m] ?? m);

const ACTIVE = { 'index': 'home', 'features': 'features', 'about': 'about', 'faq': 'faq', 'contact': 'contact', 'support': 'support' };

// Per-page Astro component injections. The legacy HTML stays component-free;
// this re-applies hand-placed components on every regeneration.
//   imports: [ [name, importPath], ... ]
//   inject:  { anchor: <string found in <main>>, html: <markup inserted before it> }
const INJECT = {
    index: {
        imports: [['Screenshots', '../components/Screenshots.astro']],
        inject: {
            anchor: '<!-- How It Works -->',
            html: '<!-- App Screenshots -->\n        <Screenshots />\n\n        <div class="section-divider"></div>\n\n        ',
        },
    },
};

const grab = (re, s) => { const m = s.match(re); return m ? m[1] : null; };

for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith('.html'))) {
    const base = file.replace('.html', '');
    const s = fs.readFileSync(path.join(srcDir, file), 'utf8');

    const title = decode(grab(/<title>([\s\S]*?)<\/title>/, s));
    const description = decode(grab(/<meta name="description" content="([^"]*)"/, s));
    const keywords = decode(grab(/<meta name="keywords" content="([^"]*)"/, s));
    const canonicalFull = grab(/<link rel="canonical" href="([^"]*)"/, s) || '';
    const canonical = canonicalFull.replace(/^https:\/\/noozealarm\.com\/?/, '');
    const ogTitle = decode(grab(/<meta property="og:title" content="([^"]*)"/, s)) || title;
    const ogDescription = decode(grab(/<meta property="og:description" content="([^"]*)"/, s)) || description;
    const ogType = grab(/<meta property="og:type" content="([^"]*)"/, s) || 'website';
    const noindex = /name="robots" content="noindex/.test(s);

    const jsonld = [...s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
        .map((m) => { try { return JSON.parse(m[1]); } catch (e) { console.error('Bad JSON-LD in ' + file); return null; } })
        .filter(Boolean);

    let main = grab(/(<main[\s\S]*?<\/main>)/, s);
    if (!main) { console.error('No <main> in ' + file); continue; }

    const cfg = INJECT[base];
    if (cfg?.inject) {
        if (!main.includes(cfg.inject.anchor)) console.error(`Anchor not found in ${file}: ${cfg.inject.anchor}`);
        main = main.replace(cfg.inject.anchor, cfg.inject.html + cfg.inject.anchor);
    }
    const imports = ["import BaseLayout from '../layouts/BaseLayout.astro';"]
        .concat((cfg?.imports || []).map(([n, p]) => `import ${n} from '${p}';`))
        .join('\n');

    const active = ACTIVE[base];
    const props = [
        `    title={${JSON.stringify(title)}}`,
        `    description={${JSON.stringify(description)}}`,
        keywords ? `    keywords={${JSON.stringify(keywords)}}` : null,
        canonical !== undefined ? `    canonical={${JSON.stringify(canonical)}}` : null,
        ogTitle !== title ? `    ogTitle={${JSON.stringify(ogTitle)}}` : null,
        ogDescription !== description ? `    ogDescription={${JSON.stringify(ogDescription)}}` : null,
        ogType !== 'website' ? `    ogType={${JSON.stringify(ogType)}}` : null,
        active ? `    active={${JSON.stringify(active)}}` : null,
        noindex ? `    noindex={true}` : null,
        base === '404' ? `    footer={"minimal"}` : null,
    ].filter(Boolean).join('\n');

    const headSlot = jsonld.length
        ? `\n  <Fragment slot="head">\n${jsonld.map((b) => `    <script type="application/ld+json" set:html={${JSON.stringify(JSON.stringify(b))}} />`).join('\n')}\n  </Fragment>\n`
        : '';

    const out = `---\n${imports}\n---\n<BaseLayout\n${props}\n>\n${headSlot}\n${main}\n</BaseLayout>\n`;

    fs.writeFileSync(path.join(outDir, base + '.astro'), out);
    console.log(`${base}.astro  (jsonld:${jsonld.length}, active:${active || '-'}, noindex:${noindex})`);
}
