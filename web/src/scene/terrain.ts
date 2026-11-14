import * as THREE from 'three'
import { tex } from './materials'
import { weatherUniforms } from './weather'

/**
 * Yer, dalalar va tog'lar: haqiqiy skan teksturalar dunyo koordinatasi bo'yicha (UV kerak emas, geometriya o'zgarmaydi).
 * Takrorlanish ko'rinmasligi uchun har tekstura ikki xil masshtabda shovqin orqali aralashadi,
 * ustidan katta "aerial" tekstura (rocky_terrain, dirt_aerial) rang dog'larini beradi.
 */
const NOISE = /* glsl */ `
  varying vec3 vWorld;
  float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1, 0)), u.x), mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int k = 0; k < 4; k++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
    return v;
  }
  // Ikki masshtab, burilgan: takrorlanish naqshi yo'qoladi
  vec3 mix2(sampler2D t, vec2 w, float size, float n) {
    vec3 a = texture2D(t, w / size).rgb;
    vec3 b = texture2D(t, vec2(w.y, -w.x) / (size * 2.37) + 0.37).rgb;
    return mix(a, b, smoothstep(0.38, 0.62, n));
  }
`

// Tangent fazodagi xaritani tekis yerga (three: X sharq, Z janub) o'tkazadi
const PERTURB = /* glsl */ `
  vec3 worldPerturb(sampler2D t, vec2 w, float size, float strength) {
    vec3 n = texture2D(t, w / size).xyz * 2.0 - 1.0;
    return normalize(vec3(n.x * strength, 1.0, -n.y * strength));
  }
`

type Uni = Record<string, { value: THREE.Texture }>

function patch(mat: THREE.MeshStandardMaterial, key: string, uniforms: Uni, colorCode: string, normalCode = '', roughCode = '') {
  const decl = Object.keys(uniforms).map((n) => `uniform sampler2D ${n};`).join('\n')
  mat.customProgramCacheKey = () => `terrain-${key}`
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, weatherUniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uWet, uSnowCover, uRainTime;\n${decl}\n${NOISE}\n${PERTURB}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${colorCode}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${roughCode}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${normalCode}`)
  }
  mat.needsUpdate = true
}

const t = (name: string, srgb = true) => ({ value: tex(`/textures/${name}.webp`, srgb) })

/** Majmua ichida qurilish tuprog'i, to'siqdan tashqarida quruq o't va tuproq dog'lari. */
export function patchGround(mat: THREE.MeshStandardMaterial) {
  patch(
    mat,
    'ground',
    {
      tSoil: t('soil_diff'),
      tSoilN: t('soil_nor', false),
      tGrass: t('grass_diff'),
      tGrassN: t('grass_nor', false),
      tMacroG: t('macro_grass_diff'),
      tMacroD: t('macro_dirt_diff'),
    },
    /* glsl */ `
    vec2 w = vWorld.xz;
    float tn = fbm(w * 0.09);
    vec3 macroD = texture2D(tMacroD, w / 24.0).rgb;
    vec3 macroG = texture2D(tMacroG, w / 140.0).rgb;
    vec3 macroF = texture2D(tMacroG, vec2(w.y, -w.x) / 610.0 + 0.2).rgb;
    float dist = length(vViewPosition);

    vec3 soil = mix2(tSoil, w, 3.0, tn);
    soil = mix(soil, soil * macroD * 3.6, 0.55) * 1.2;

    vec3 grass = mix2(tGrass, w, 2.0, tn);
    float big = fbm(w * 0.012);
    grass *= mix(vec3(1.95, 1.75, 0.95), vec3(1.2, 1.7, 0.72), smoothstep(0.3, 0.68, big));   // quruq ↔ yashil
    grass = mix(grass, grass * macroG * 4.0, 0.5);
    float bare = smoothstep(0.55, 0.72, fbm(w * 0.028 + 9.0));                                 // ochilib qolgan tuproq
    grass = mix(grass, soil * 1.05, bare * 0.65);
    grass = mix(grass, grass * macroF * 4.0, smoothstep(40.0, 240.0, dist) * 0.7);             // uzoqdan katta dog'lar
    grass *= mix(vec3(1.0), vec3(1.15, 1.32, 0.95), smoothstep(90.0, 320.0, dist));            // uzoqda ko'kat ko'proq sezilsin

    float edge = max(abs(w.x), abs(w.y)) + (fbm(w * 0.14) - 0.5) * 7.0;
    float groundMix = smoothstep(36.5, 44.0, edge);
    diffuseColor.rgb = mix(soil, grass, groundMix);

    // Yomg'ir: yer qorayadi, past joylarda ko'lmak yig'iladi. Qor: notekis qoplam, past joylardan boshlanadi.
    float puddle = uWet * smoothstep(0.54, 0.6, fbm(w * 0.13 + 3.7));
    diffuseColor.rgb *= mix(1.0, 0.6, uWet) * mix(1.0, 0.55, puddle);
    float snowLayer = smoothstep(0.0, 0.5, uSnowCover * 1.3 - (tn - 0.42) * 0.45);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.74, 0.76, 0.8) * (0.9 + 0.14 * vnoise(w * 3.0)) * (0.86 + 0.22 * fbm(w * 0.05)), snowLayer);
  `,
    /* glsl */ `
    {
      vec3 pn = mix(worldPerturb(tSoilN, vWorld.xz, 3.0, 1.1), worldPerturb(tGrassN, vWorld.xz, 2.0, 0.9), groundMix);
      pn = normalize(mix(pn, vec3(0.0, 1.0, 0.0), max(snowLayer * 0.75, puddle)));
      // Ko'lmakdagi yomg'ir halqalari
      if (puddle > 0.01) {
        vec2 rc = vWorld.xz * 0.9;
        vec2 ci = floor(rc);
        float ph = fract(uRainTime * 0.8 + hash21(ci));
        vec2 dv = fract(rc) - 0.5 - (vec2(hash21(ci + 3.1), hash21(ci + 7.7)) - 0.5) * 0.5;
        float rd = length(dv);
        float ring = sin((rd - ph * 0.5) * 42.0) * smoothstep(0.5, 0.0, abs(rd - ph * 0.5) * 7.0) * (1.0 - ph);
        pn = normalize(pn + vec3(dv.x, 0.0, dv.y) / max(rd, 0.01) * ring * 0.16 * puddle);
      }
      normal = normalize(normal + normalize((viewMatrix * vec4(pn, 0.0)).xyz) - normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz));
    }
  `,
    /* glsl */ `
    roughnessFactor = mix(roughnessFactor * mix(1.0, 0.7, uWet), 0.08, puddle);
  `,
  )
  mat.roughness = 1
  mat.metalness = 0
}

/** Issiqxona poli: mayda kulrang sheben. Takrorlanmasin deb ikki burilgan qatlam; qatorlar yonida tomchidan namlangan. */
export function patchGravel(mat: THREE.MeshStandardMaterial) {
  patch(
    mat,
    'gravel-floor',
    { tGravel: t('gravel_diff'), tGravelN: t('gravel_nor', false) },
    /* glsl */ `
    vec2 w = vWorld.xz;
    float gn = fbm(w * 0.55);
    vec3 ga = texture2D(tGravel, w / 1.5).rgb;
    vec3 gb = texture2D(tGravel, vec2(w.y, -w.x) / 1.93 + 0.37).rgb;
    vec3 g = mix(ga, gb, smoothstep(0.4, 0.6, gn));
    g *= 0.8 + 0.42 * fbm(w * 0.3);
    g *= mix(vec3(1.05, 1.0, 0.93), vec3(0.97, 1.0, 1.04), fbm(w * 0.12 + 5.0));
    float sx = mod(w.x + 20.0, 8.0);
    float dr = min(min(abs(sx - 1.4), abs(sx - 3.1)), min(abs(sx - 4.9), abs(sx - 6.6)));
    float moist = smoothstep(0.75, 0.15, dr) * (0.3 + 0.7 * fbm(w * 1.1));
    diffuseColor.rgb = g * 0.52 * (1.0 - 0.38 * moist);
  `,
    /* glsl */ `
    {
      vec3 pn = mix(worldPerturb(tGravelN, vWorld.xz, 1.5, 1.5), worldPerturb(tGravelN, vec2(vWorld.z, -vWorld.x) + 0.37 * 1.93, 1.93, 1.5), smoothstep(0.4, 0.6, gn));
      normal = normalize(normal + normalize((viewMatrix * vec4(pn, 0.0)).xyz) - normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz));
    }
  `,
    /* glsl */ `
    roughnessFactor = mix(0.95, 0.62, moist);
  `,
  )
  mat.roughness = 1
  mat.metalness = 0
}

/** Dalalar: ekin qatorlari yoki haqiqiy shudgor izlari. Asosiy rang nom bo'yicha. */
export function patchField(mat: THREE.MeshStandardMaterial, key: string) {
  const plowed = key === 'Field_Plowed'
  const weatherCode = /* glsl */ `
    diffuseColor.rgb *= mix(1.0, 0.65, uWet);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.72, 0.74, 0.78), smoothstep(0.0, 0.5, uSnowCover * 1.3 - (fbm(w * 0.09) - 0.42) * 0.5));
  `
  const color = plowed
    ? /* glsl */ `
    vec2 w = vWorld.xz;
    vec3 f = texture2D(tFurrow, w / 2.1).rgb;
    vec3 ff = texture2D(tFurrow, w / 5.3).rgb;
    diffuseColor.rgb = mix(f, ff, smoothstep(0.35, 0.65, fbm(w * 0.04))) * (0.72 + 0.5 * fbm(w * 0.02));
  `
    : /* glsl */ `
    vec2 w = vWorld.xz;
    vec3 g = mix2(tGrass, w, 2.0, fbm(w * 0.09));
    float gl = dot(g, vec3(0.3, 0.55, 0.15));
    float rows = 0.5 + 0.5 * sin(w.y * 3.1 + vnoise(w * 0.05) * 2.0);
    float patchy = fbm(w * 0.035);
    vec3 macro = texture2D(tMacroG, w / 170.0).rgb;
    diffuseColor.rgb *= (0.6 + gl * 2.2) * (0.68 + 0.32 * rows) * (0.72 + 0.56 * patchy) * mix(vec3(1.0), macro * 3.0, 0.45);
  `
  patch(mat, `field-${key}`, plowed ? { tFurrow: t('furrows_diff') } : { tGrass: t('grass_diff'), tMacroG: t('macro_grass_diff') }, color + weatherCode)
  mat.roughness = 1
  mat.metalness = 0
}

/** Tog'lar: pastda quruq adir, o'rtada qoya (aerial skan), cho'qqilarda qor. */
export function patchMountain(mat: THREE.MeshStandardMaterial) {
  patch(
    mat,
    'mountain',
    { tMacroG: t('macro_grass_diff') },
    /* glsl */ `
    float h = vWorld.y;
    vec2 w = vWorld.xz;
    float n = fbm(w * 0.008);
    vec3 a = texture2D(tMacroG, w / 420.0).rgb;
    vec3 b = texture2D(tMacroG, vec2(w.y, -w.x) / 1500.0 + 0.4).rgb;
    vec3 rock = (a * 0.6 + b * 0.4) * 2.6 * vec3(0.98, 0.95, 0.92);
    vec3 low = rock * vec3(0.78, 0.86, 0.5);
    vec3 snow = vec3(0.86, 0.88, 0.92) * (0.85 + 0.3 * a.g);
    vec3 c = mix(low, rock, smoothstep(25.0, 90.0, h + n * 40.0));
    c = mix(vec3(0.16, 0.14, 0.085) * (0.7 + a * 1.2), c, smoothstep(0.0, 42.0, h));                 // etagi yer bilan erib ketsin
    float cover = smoothstep(135.0, 180.0, h + n * 60.0 + (a.r - 0.3) * 120.0);
    c = mix(c, snow, max(cover, uSnowCover * smoothstep(-5.0, 45.0, h + n * 30.0)));
    diffuseColor.rgb = c * mix(1.0, 0.8, uWet);
  `,
    // Qoya bo'rtmalari: aerial skan balandlik sifatida — past poligonli tog' ham yorilgan qoyadek soya oladi
    /* glsl */ `
    {
      vec2 w = vWorld.xz;
      float e = 14.0;
      float h0 = texture2D(tMacroG, w / 420.0).g;
      vec3 g = vec3(h0 - texture2D(tMacroG, (w + vec2(e, 0.0)) / 420.0).g, 0.0, h0 - texture2D(tMacroG, (w + vec2(0.0, e)) / 420.0).g);
      normal = normalize(normal + (viewMatrix * vec4(g * 4.5, 0.0)).xyz);
    }
  `,
  )
}
