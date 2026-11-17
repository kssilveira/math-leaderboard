// Country context SVG map renderer (topology loaded from data/geo-map-data.js)
const GEO_MAP_PREFIX = 'map:';
let decodedGeoPolys = null;
const geoSvgCache = new Map();

function isGeoMapToken(val) {
  return typeof val === 'string' && val.startsWith(GEO_MAP_PREFIX);
}

function getGeoMapCountryName(val) {
  if (typeof val !== 'string') return '';
  return val.startsWith(GEO_MAP_PREFIX) ? val.slice(GEO_MAP_PREFIX.length) : val;
}

function ensureGeoPolysDecoded() {
  if (decodedGeoPolys) return decodedGeoPolys;
  const arcs = GEO_MAP_DATA.a;
  const decodedArcs = arcs.map((flat) => {
    const pts = [];
    let x = flat[0];
    let y = flat[1];
    pts.push([x * 0.02 - 180, y * 0.02 - 90]);
    for (let i = 2; i < flat.length; i += 2) {
      x += flat[i];
      y += flat[i + 1];
      pts.push([x * 0.02 - 180, y * 0.02 - 90]);
    }
    return pts;
  });

  decodedGeoPolys = GEO_MAP_DATA.g.map((polys) =>
    polys.map((rings) => {
      let minLat = 90;
      let maxLat = -90;
      const decodedRings = rings.map((arcIdxs) => {
        const ring = [];
        for (let k = 0; k < arcIdxs.length; k++) {
          const idx = arcIdxs[k];
          const rev = idx < 0;
          const raw = decodedArcs[rev ? ~idx : idx];
          if (rev) {
            for (let p = raw.length - 1; p >= (ring.length ? 0 : 0); p--) {
              if (ring.length && p === raw.length - 1) continue;
              const pt = raw[p];
              if (pt[1] < minLat) minLat = pt[1];
              if (pt[1] > maxLat) maxLat = pt[1];
              ring.push(pt);
            }
          } else {
            for (let p = ring.length ? 1 : 0; p < raw.length; p++) {
              const pt = raw[p];
              if (pt[1] < minLat) minLat = pt[1];
              if (pt[1] > maxLat) maxLat = pt[1];
              ring.push(pt);
            }
          }
        }
        return ring;
      });
      return { minLat, maxLat, rings: decodedRings };
    })
  );
  return decodedGeoPolys;
}

function clipRingToBox(pts, minX, minY, maxX, maxY) {
  const clipEdge = (input, insideFn, intersectFn) => {
    if (input.length === 0) return [];
    const out = [];
    let prev = input[input.length - 1];
    let prevIn = insideFn(prev);
    for (let i = 0; i < input.length; i++) {
      const curr = input[i];
      const currIn = insideFn(curr);
      if (currIn) {
        if (!prevIn) out.push(intersectFn(prev, curr));
        out.push(curr);
      } else if (prevIn) {
        out.push(intersectFn(prev, curr));
      }
      prev = curr;
      prevIn = currIn;
    }
    return out;
  };
  let res = pts;
  res = clipEdge(res, p => p[0] >= minX, (a, b) => [minX, a[1] + ((minX - a[0]) * (b[1] - a[1])) / (b[0] - a[0])]);
  res = clipEdge(res, p => p[0] <= maxX, (a, b) => [maxX, a[1] + ((maxX - a[0]) * (b[1] - a[1])) / (b[0] - a[0])]);
  res = clipEdge(res, p => p[1] >= minY, (a, b) => [a[0] + ((minY - a[1]) * (b[0] - a[0])) / (b[1] - a[1]), minY]);
  res = clipEdge(res, p => p[1] <= maxY, (a, b) => [a[0] + ((maxY - a[1]) * (b[0] - a[0])) / (b[1] - a[1]), maxY]);
  return res;
}

function renderGeoMapSvg(countryOrToken, options = {}) {
  const country = getGeoMapCountryName(countryOrToken);
  const variant = options.variant || 'prompt';
  const cacheKey = `${country}__${variant}`;
  if (geoSvgCache.has(cacheKey)) {
    return geoSvgCache.get(cacheKey);
  }

  const view = GEO_MAP_DATA.v[country];
  if (!view) {
    return `<svg class="geo-map-svg geo-map-${variant}" viewBox="0 0 200 136" role="img" aria-label="Map"><rect width="200" height="136" class="geo-map-ocean"/></svg>`;
  }

  const W = variant === 'mini' ? 56 : variant === 'choice' ? 200 : 260;
  const H = variant === 'mini' ? 38 : variant === 'choice' ? 138 : 168;
  const [targetIdxs, lon0, lat0, spanY, pinLon, pinLat] = view;
  const targetSet = new Set(targetIdxs);
  const cos0 = Math.max(0.22, Math.cos((lat0 * Math.PI) / 180));
  const scaleY = H / spanY;
  const scaleX = scaleY * cos0;
  const halfLat = spanY * 0.5 + 3;
  const halfLon = (W * 0.5) / scaleX + 4;

  const allGeoms = ensureGeoPolysDecoded();
  const neighborPaths = [];
  const targetPaths = [];

  let txMin = Infinity;
  let txMax = -Infinity;
  let tyMin = Infinity;
  let tyMax = -Infinity;

  for (let gi = 0; gi < allGeoms.length; gi++) {
    const isTarget = targetSet.has(gi);
    const polys = allGeoms[gi];
    for (let pi = 0; pi < polys.length; pi++) {
      const poly = polys[pi];
      if (poly.maxLat < lat0 - halfLat || poly.minLat > lat0 + halfLat) continue;

      let polyPath = '';
      for (let ri = 0; ri < poly.rings.length; ri++) {
        const ring = poly.rings[ri];
        if (ring.length < 3) continue;

        let curDlon = ((ring[0][0] - lon0 + 540) % 360) - 180;
        let rMinDlon = curDlon;
        let rMaxDlon = curDlon;
        const dlons = [curDlon];
        for (let k = 1; k < ring.length; k++) {
          const step = ((ring[k][0] - ring[k - 1][0] + 540) % 360) - 180;
          curDlon += step;
          if (curDlon < rMinDlon) rMinDlon = curDlon;
          if (curDlon > rMaxDlon) rMaxDlon = curDlon;
          dlons.push(curDlon);
        }

        let shift = 0;
        if (rMaxDlon < -halfLon && rMinDlon + 360 <= halfLon) shift = 360;
        else if (rMinDlon > halfLon && rMaxDlon - 360 >= -halfLon) shift = -360;

        if (rMaxDlon + shift < -halfLon || rMinDlon + shift > halfLon) continue;

        const rawPts = [];
        for (let k = 0; k < ring.length; k++) {
          rawPts.push([W * 0.5 + (dlons[k] + shift) * scaleX, H * 0.5 - (ring[k][1] - lat0) * scaleY]);
        }
        const clipped = clipRingToBox(rawPts, -6, -6, W + 6, H + 6);
        if (clipped.length < 3) continue;
        const keptPts = [];
        let lastPx = -9999;
        let lastPy = -9999;
        for (let k = 0; k < clipped.length; k++) {
          const px = clipped[k][0];
          const py = clipped[k][1];
          if (isTarget && ri === 0) {
            if (px < txMin) txMin = px;
            if (px > txMax) txMax = px;
            if (py < tyMin) tyMin = py;
            if (py > tyMax) tyMax = py;
          }
          if (k === 0 || k === clipped.length - 1 || Math.abs(px - lastPx) + Math.abs(py - lastPy) >= 0.85) {
            keptPts.push([px, py]);
            lastPx = px;
            lastPy = py;
          }
        }
        if (keptPts.length < 3 && !isTarget) continue;
        let d = '';
        for (let k = 0; k < keptPts.length; k++) {
          d += (k === 0 ? 'M' : 'L') + keptPts[k][0].toFixed(1) + ' ' + keptPts[k][1].toFixed(1);
        }
        polyPath += d + 'Z';
      }

      if (polyPath) {
        if (isTarget) targetPaths.push(polyPath);
        else neighborPaths.push(polyPath);
      }
    }
  }

  const pinDlon = ((pinLon - lon0 + 540) % 360) - 180;
  const pinX = (W * 0.5 + pinDlon * scaleX).toFixed(1);
  const pinY = (H * 0.5 - (pinLat - lat0) * scaleY).toFixed(1);
  const targetSpanPx = txMax >= txMin ? Math.max(txMax - txMin, tyMax - tyMin) : 0;
  const minRingTrigger = variant === 'mini' ? 7 : variant === 'choice' ? 15 : 18;
  const minDotTrigger = variant === 'mini' ? 3 : 5;
  const ringR = variant === 'mini' ? 5 : variant === 'choice' ? 10 : 12;
  const dotR = variant === 'mini' ? 1.7 : 2.7;

  let pinMarkup = '';
  if (targetSpanPx < minRingTrigger) {
    pinMarkup += `<circle cx="${pinX}" cy="${pinY}" r="${ringR}" class="geo-map-pin-ring"/>`;
    if (targetSpanPx < minDotTrigger) {
      pinMarkup += `<circle cx="${pinX}" cy="${pinY}" r="${dotR}" class="geo-map-pin-dot"/>`;
    }
  }

  const svg =
    `<svg class="geo-map-svg geo-map-${variant}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Country map">` +
    `<rect width="${W}" height="${H}" class="geo-map-ocean"/>` +
    (neighborPaths.length ? `<path d="${neighborPaths.join('')}" fill-rule="evenodd" class="geo-map-neighbor"/>` : '') +
    (targetPaths.length ? `<path d="${targetPaths.join('')}" fill-rule="evenodd" class="geo-map-target"/>` : '') +
    pinMarkup +
    `</svg>`;

  geoSvgCache.set(cacheKey, svg);
  return svg;
}
