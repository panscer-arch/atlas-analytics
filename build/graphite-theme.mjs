import postcss from 'postcss';

// Compile the legacy boards' paint declarations into the approved shared palette.
// No runtime DOM scanning, layout rewriting, image filters, or data mutations.
const scope = ':where(.sus-workspace[data-workspace-theme="graphite"]) .sus-content-theme:not(:has(.sus-marketing-home))';
const colors = /#[\da-f]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/gi;
const token = (name) => `var(--g-${name})`;

function rgb(value) {
  const v = value.toLowerCase();
  if (v === 'white') return [255,255,255,1];
  if (v === 'black') return [0,0,0,1];
  if (v[0] === '#') {
    const h = v.slice(1);
    const full = h.length < 5 ? h.split('').map(c => c+c).join('') : h;
    return [0,2,4].map(i => parseInt(full.slice(i,i+2),16)).concat(full.length === 8 ? parseInt(full.slice(6),16)/255 : 1);
  }
  const parts = v.match(/[\d.]+%?/g) || [];
  return [0,1,2].map(i => parts[i]?.includes('%') ? parseFloat(parts[i])*2.55 : Number(parts[i])).concat(parts[3] === undefined ? 1 : Number(parts[3]));
}

function semantic(selector) {
  if (/(?:danger|error|negative|overdue|destructive|is-red|tone-red|status-failed)/i.test(selector)) return 'danger';
  if (/(?:success|positive|is-green|tone-green|status-done|status-ready)/i.test(selector)) return 'success';
  if (/(?:warning|caution|attention|is-amber|is-orange|tone-warning)/i.test(selector)) return 'warning';
  return null;
}

function foreground(value, selector) {
  const signal = semantic(selector);
  if (signal) return token(signal);
  if (/placeholder|muted|subtitle|caption|description|\bsmall\b|\blabel\b|hint/i.test(selector)) return token('muted');
  const [r,g,b,a] = rgb(value);
  const spread = Math.max(r,g,b)-Math.min(r,g,b);
  if (spread > 60 && Math.max(r,g,b) > 90) return token('accent');
  if (a < .85 || (Math.max(r,g,b) > 75 && Math.max(r,g,b) < 185)) return token('muted');
  return token('text');
}

function surface(selector) {
  if (/::-webkit-progress-bar/.test(selector)) return token('raised');
  if (/::-webkit-progress-value|::-moz-progress-bar/.test(selector)) return token('accent');
  if (/overlay|backdrop|modal-mask/.test(selector) && !/panel|card|content|head|body|button/.test(selector)) return token('backdrop');
  const signal = semantic(selector);
  if (signal) return token(`${signal}-soft`);
  if (/progress.*(?:fill|bar|>\s*span)|meter.*fill/.test(selector)) return token('accent');
  if (/active|selected|primary|:checked/.test(selector)) return token('active');
  if (/input|textarea|select\b|editor|code\b|pre\b/.test(selector)) return token('input');
  if (/hover|thead|\bth\b|toolbar|badge|chip|pill|tag\b|tabs|footer/.test(selector)) return token('raised');
  return token('panel');
}

function customProperty(prop, value, selector) {
  if (!value.match(colors) || /color-mix|url\(/.test(value)) return null;
  if (/line|border/.test(prop)) return token('line');
  if (/muted|subtle|secondary-text/.test(prop)) return token('muted');
  if (/bg|canvas/.test(prop)) return token('bg');
  if (/paper|panel|card|surface/.test(prop)) return token(/raised|soft/.test(prop) ? 'raised' : 'panel');
  if (/ink|text|foreground/.test(prop)) return token('text');
  const signal = /green|success/.test(prop) ? 'success' : /red|danger/.test(prop) ? 'danger' : /amber|warn/.test(prop) ? 'warning' : 'accent';
  if (/soft/.test(prop)) return token(signal === 'accent' ? (/orange|blue|cyan|mint|accent|violet/.test(prop) ? 'active' : 'raised') : `${signal}-soft`);
  return /orange|blue|cyan|mint|accent|violet|green|red|amber/.test(prop) ? token(signal) : null;
}

function paint(decl, selector) {
  const { prop, value } = decl;
  if (prop.startsWith('--')) return customProperty(prop, value, selector);
  // Preserve images, SVG series, graph edges and measured progress geometry.
  if (/url\(|currentColor|inherit|^transparent$/.test(value)) return null;
  if (!/^(color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?|box-shadow|text-shadow)$/.test(prop)) return null;
  if (/shadow/.test(prop)) return value === 'none' ? null : 'none';
  if (prop === 'background-image' && /gradient/.test(value)) return 'none';
  if (/background/.test(prop)) {
    if (/^var\(--[\w-]*(?:blue|orange|cyan|mint|accent|violet)\)$/.test(value)) return token('active');
    if (/^var\(--[\w-]*(?:green|success)\)$/.test(value)) return token('success-soft');
    if (/^var\(--[\w-]*(?:red|danger)\)$/.test(value)) return token('danger-soft');
    if (/gradient/.test(value)) return surface(selector);
    if (!value.match(colors)) return null;
    return value.replace(colors, c => rgb(c)[3] === 0 ? c : surface(selector));
  }
  if (prop === 'color') return value.match(colors) ? value.replace(colors, c => foreground(c,selector)) : null;
  return value.match(colors) ? value.replace(colors, () => token(/focus/.test(selector) ? 'accent' : 'line')) : null;
}

export function graphiteCss(css, { shadow = false } = {}) {
  const original = postcss.parse(css);
  const output = postcss.root();
  const prefix = shadow ? ':host([data-workspace-theme="graphite"])' : scope;
  function walk(parent, destination) {
    for (const node of parent.nodes || []) {
      if (node.type === 'atrule' && /^(media|supports|container)$/.test(node.name)) {
        const copy = node.clone({ nodes: [] });
        walk(node, copy);
        if (copy.nodes.length) destination.append(copy);
      } else if (node.type === 'rule') {
        // Printed/exported slides and actual media previews retain their own art direction.
        if (/slide-canvas|slide-preview|content-slide-|creative-preview|landing-preview|reels-preview|legend-dot|legend-swatch|chart-series/.test(node.selector)) continue;
        const declarations = node.nodes.filter(n => n.type === 'decl').flatMap(decl => {
          const value = paint(decl, node.selector);
          return value && value !== decl.value ? [decl.clone({ value })] : [];
        });
        if (!declarations.length) continue;
        const selector = postcss.list.comma(node.selector).map(s => {
          if (s === ':root' || s === ':host') return prefix;
          return `${prefix} ${s.replace(/^:host\s+/, '')}`;
        }).join(',');
        destination.append(postcss.rule({ selector, nodes:declarations }));
      }
    }
  }
  walk(original, output);
  return output.toString();
}

export function graphiteTheme() {
  return {
    name: 'supersus-graphite-palette',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('/src/modules/analytics/') || !/\.css(?:\?inline)?$/.test(id) || /workspace-|graphite-theme/.test(id)) return null;
      const themed = graphiteCss(code, { shadow:id.includes('ListingsCrmBoard.css') });
      return themed ? `${code}\n/* Shared graphite theme */\n${themed}` : null;
    },
  };
}
