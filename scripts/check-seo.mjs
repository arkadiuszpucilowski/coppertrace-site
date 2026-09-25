// Run after `astro build`. No dependencies beyond Node.js are required.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../dist/',import.meta.url));
const origin='https://coppertrace.co.uk';
const read=(file)=>readFile(join(root,file),'utf8');
const attrs=(tag)=>Object.fromEntries(
  [...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(m=>[m[1],m[3]])
);
const tags=(html,name)=>(html.match(new RegExp(`<${name}\\b[^>]*>`,'gi')) ?? []).map(attrs);
async function walk(dir){
  const files=[];
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const path=join(dir,entry.name);
    if(entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}
function pageUrl(url){
  const parsed=new URL(url);
  assert.equal(parsed.origin,origin,`Wrong origin: ${url}`);
  assert.equal(parsed.search,'',`Query string in SEO URL: ${url}`);
  assert.equal(parsed.hash,'',`Fragment in SEO URL: ${url}`);
  assert(parsed.pathname.endsWith('/'),`Missing trailing slash: ${url}`);
  return parsed.href;
}

const files=(await walk(root)).filter(file=>file.endsWith('.html') && !/[/\\](404|500)\.html$/.test(file));
assert(files.length>0,'No HTML pages: run astro build first.');
const pages=new Map();
for(const file of files){
  const path=relative(root,file).split(sep).join('/');
  assert(path==='index.html' || path.endsWith('/index.html'),`Unexpected build path: ${path}`);
  const expected=origin+'/'+path.replace(/index\.html$/,'');
  const html=await readFile(file,'utf8');
  const links=tags(html,'link');
  const canonical=links.filter(link=>link.rel==='canonical');
  assert.equal(canonical.length,1,`Expected one canonical: ${path}`);
  assert.equal(pageUrl(canonical[0].href),expected,`Wrong canonical: ${path}`);
  const alternates=links.filter(link=>link.rel==='alternate' && link.hreflang);
  assert.equal(alternates.length,3,`Expected en, pl and x-default: ${path}`);
  const byLanguage=Object.fromEntries(alternates.map(link=>[link.hreflang,pageUrl(link.href)]));
  assert.deepEqual(Object.keys(byLanguage).sort(),['en','pl','x-default']);
  assert.equal(byLanguage['x-default'],byLanguage.en,`Wrong default: ${path}`);
  const lang=tags(html,'html')[0]?.lang;
  assert(['en','pl'].includes(lang),`Unexpected page language: ${path}`);
  assert.equal(byLanguage[lang],expected,`Missing self-language link: ${path}`);
  assert.equal(links.filter(link=>link.rel==='sitemap' && link.href===origin+'/sitemap-index.xml').length,1);
  const titles=[...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
  assert.equal(titles.length,1,`Expected one title: ${path}`);
  assert(titles[0][1].trim(),`Empty title: ${path}`);
  const descriptions=tags(html,'meta').filter(meta=>meta.name==='description');
  assert.equal(descriptions.length,1,`Expected one description: ${path}`);
  assert(descriptions[0].content?.trim(),`Empty description: ${path}`);
  pages.set(expected,{lang,alternates:byLanguage});
}
for(const [url,page] of pages){
  for(const lang of ['en','pl']){
    const target=pages.get(page.alternates[lang]);
    assert(target,`Language link points to an unbuilt page: ${page.alternates[lang]}`);
    assert.equal(target.lang,lang,`Wrong target language from ${url}`);
    assert.equal(target.alternates[page.lang],url,`Missing reciprocal language link from ${url}`);
  }
}
const locs=(xml)=>[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const index=await read('sitemap-index.xml');
assert(index.includes('<sitemapindex'),'Missing sitemap index element.');
const sitemapFiles=locs(index);
assert(sitemapFiles.length>0,'Sitemap index is empty.');
const listed=[];
for(const url of sitemapFiles){
  const parsed=new URL(url);
  assert.equal(parsed.origin,origin,`Wrong sitemap origin: ${url}`);
  const xml=await read(decodeURIComponent(parsed.pathname).replace(/^\//,''));
  assert(xml.includes('<urlset'),`Missing urlset: ${url}`);
  listed.push(...locs(xml).map(pageUrl));
}
assert.equal(new Set(listed).size,listed.length,'Duplicate URLs in sitemap.');
assert.deepEqual([...listed].sort(),[...pages.keys()].sort(),'Sitemap and built HTML routes differ.');
const robots=await read('robots.txt');
assert(/^Sitemap: https:\/\/coppertrace\.co\.uk\/sitemap-index\.xml\s*$/m.test(robots),'robots.txt must advertise the sitemap.');
assert(!/^Disallow:\s*\/\s*$/m.test(robots),'robots.txt blocks the whole site.');
console.log(`SEO checks passed: ${pages.size} pages, reciprocal EN/PL links, canonicals, titles, descriptions, sitemap and robots.txt.`);
