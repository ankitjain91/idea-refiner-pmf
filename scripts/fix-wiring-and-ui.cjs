const fs = require('fs');
const path = require('path');

function read(p){ return fs.existsSync(p) ? fs.readFileSync(p,'utf8') : null; }
function write(p, txt){ fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, txt); }
function ensureLine(txt, needle){ return txt.includes(needle); }

let touched = [];

/* --- tsconfig.json: add baseUrl + paths --- */
try {
  const tsPath = 'tsconfig.json';
  const ts = JSON.parse(read(tsPath));
  ts.compilerOptions = ts.compilerOptions || {};
  ts.compilerOptions.baseUrl = 'src';
  ts.compilerOptions.paths = ts.compilerOptions.paths || {};
  ts.compilerOptions.paths['@/*'] = ts.compilerOptions.paths['@/*'] || ['*'];
  write(tsPath, JSON.stringify(ts, null, 2) + '\n');
  touched.push(tsPath);
} catch (e) { console.error('WARN: tsconfig.json not updated:', e.message); }

/* --- vite.config.(ts|js): add vite-tsconfig-paths plugin --- */
{
  const vPaths = ['vite.config.ts','vite.config.js'];
  for (const v of vPaths) {
    let vtxt = read(v);
    if (!vtxt) continue;

    if (!/vite-tsconfig-paths/.test(vtxt)) {
      // import line
      if (!/import\s+tsconfigPaths\s+from\s+['"]vite-tsconfig-paths['"]/.test(vtxt)) {
        vtxt = vtxt.replace(/(^\s*import .*?\n)(?!.*tsconfigPaths)/s,
          (m)=> m + `import tsconfigPaths from 'vite-tsconfig-paths'\n`);
        if (!/tsconfigPaths/.test(vtxt)) {
          vtxt = `import tsconfigPaths from 'vite-tsconfig-paths'\n` + vtxt;
        }
      }
      // add to plugins array
      if (/plugins:\s*\[([^\]]*)\]/s.test(vtxt)) {
        vtxt = vtxt.replace(/plugins:\s*\[([^\]]*)\]/s, (m, inner)=> {
          return `plugins: [${inner}${inner.trim().length ? ', ' : ''}tsconfigPaths()]`;
        });
      } else {
        // very rare: no plugins array yet
        vtxt = vtxt.replace(/defineConfig\(\{\s*/s, (m)=> `${m}plugins: [tsconfigPaths()], `);
      }

      write(v, vtxt);
      touched.push(v);
      break;
    }
  }
}

/* --- package.json: ensure devDependency vite-tsconfig-paths --- */
{
  const pjPath = 'package.json';
  const pjTxt = read(pjPath);
  if (pjTxt) {
    const pj = JSON.parse(pjTxt);
    pj.devDependencies = pj.devDependencies || {};
    pj.devDependencies['vite-tsconfig-paths'] = pj.devDependencies['vite-tsconfig-paths'] || '^4.3.2';
    write(pjPath, JSON.stringify(pj, null, 2) + '\n');
    touched.push(pjPath);
  }
}

/* --- src/pages/LoggedOut.tsx: create if missing --- */
{
  const p = 'src/pages/LoggedOut.tsx';
  if (!fs.existsSync(p)) {
    write(p, `
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function LoggedOut() {
  return (
    <div className="min-h-screen grid place-items-center bg-[radial-gradient(1200px_400px_at_0%_0%,rgba(0,0,0,0.03),transparent)]">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Signed out</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm opacity-80">You're now logged out. See you soon!</p>
          <div className="flex gap-2">
            <Link to="/"><Button variant="ghost">Back to site</Button></Link>
            <Link to="/login"><Button>Sign in again</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`);
    touched.push(p);
  }
}

/* --- src/App.tsx: import LoggedOut + add route if missing --- */
{
  const appPath = 'src/App.tsx';
  let app = read(appPath);
  if (app && /Routes/.test(app)) {
    if (!/from\s+["']@\/pages\/LoggedOut["']/.test(app))
      app = `import LoggedOut from "@/pages/LoggedOut";\n` + app;

    if (!/path=["']\/logged-out["']/.test(app)) {
      app = app.replace(/<Routes>\s*/s, (m)=> m + `\n        <Route path="/logged-out" element={<LoggedOut />} />\n`);
    }
    write(appPath, app);
    touched.push(appPath);
  }
}

/* --- src/components/hub/ProfessionalWorldMap.tsx: swap to satellite basemap --- */
{
  const p = 'src/components/hub/ProfessionalWorldMap.tsx';
  let t = read(p);
  if (t) {
    if (!/world\.topo\.bathy/i.test(t)) {
      // ensure hooks import has useRef/useEffect
      if (/import\s*\{\s*useState\s*\}\s*from\s*["']react["']/.test(t)) {
        t = t.replace(/import\s*\{\s*useState\s*\}\s*from\s*["']react["'];?/, 'import { useState, useRef, useEffect } from "react";');
      } else if (!/useRef|useEffect/.test(t)) {
        t = `import { useRef, useEffect } from "react";\n` + t;
      }

      // inject helpers after imports (idempotent)
      if (!/const\s+satUrl\s*=/.test(t)) {
        const idx = t.lastIndexOf('import ');
        const afterImports = idx >= 0 ? t.indexOf('\n', idx) + 1 : 0;
        const inject = `
// Satellite background + equirectangular projection for markers
const satUrl = "https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg"; // contains "world.topo.bathy"
const containerRef = useRef<HTMLDivElement | null>(null);
const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

useEffect(() => {
  const el = containerRef.current;
  if (!el) return;
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const cr = entry.contentRect;
      setContainerSize({ w: cr.width, h: Math.max(360, cr.width * 0.5) });
    }
  });
  ro.observe(el);
  return () => ro.disconnect();
}, []);

const markers = (regions || []).map((r: any) => ({
  lng: r?.coordinates?.[0] ?? 0,
  lat: r?.coordinates?.[1] ?? 0,
  name: r?.name || r?.region || "",
}));

const project = (lat: number, lng: number) => {
  const w = containerSize.w || 800;
  const h = containerSize.h || 400;
  const x = ((lng + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return { x, y };
};
`;
        t = t.slice(0, afterImports) + inject + t.slice(afterImports);
      }

      // Replace any <svg>…</svg> block with satellite container
      const replaced = t.replace(/<svg[\s\S]*?<\/svg>/, `
<div ref={containerRef} className="relative w-full rounded-2xl border overflow-hidden" style={{ height: containerSize.h }}>
  <img src={satUrl} alt="World Satellite" className="absolute inset-0 w-full h-full object-cover" />
  {markers.map((m, i) => {
    const p = project(m.lat, m.lng);
    return (
      <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: p.x, top: p.y }}>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(255,255,255,0.9)]" />
          {m.name ? <span className="text-[10px] px-1 py-0.5 rounded bg-black/60 text-white">{m.name}</span> : null}
        </div>
      </div>
    );
  })}
</div>
`);
      if (replaced !== t) { t = replaced; touched.push(p); }
      else if (!/World Satellite/.test(t)) {
        // If no SVG to replace, append a minimal container sample (component-specific manual review may be needed)
        t += `

{/* Satellite world map fallback container */}
<div ref={containerRef} className="relative w-full rounded-2xl border overflow-hidden" style={{ height: containerSize.h }}>
  <img src={satUrl} alt="World Satellite" className="absolute inset-0 w-full h-full object-cover" />
</div>
`;
        touched.push(p);
      }
      write(p, t);
    }
  }
}

console.log(JSON.stringify({ touched }, null, 2));
