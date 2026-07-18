// Passos de redimensionamento/qualidade, do melhor para o mais agressivo.
// Fotos muito detalhadas (alta entropia) continuam grandes mesmo em 1280px/0.87,
// entao tentamos varios niveis ate o resultado ficar bem pequeno.
const COMPRESSION_STEPS = [
  { maxSize: 1280, quality: 0.87 },
  { maxSize: 1024, quality: 0.8 },
  { maxSize: 900, quality: 0.7 },
  { maxSize: 700, quality: 0.6 },
  { maxSize: 500, quality: 0.5 },
  { maxSize: 360, quality: 0.4 },
];
const TARGET_MAX_CHARS = 900_000; // ~900KB como texto base64 — mantem boa qualidade em ilustracoes detalhadas

function isHeic(file) {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return type === "image/heic" || type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif");
}

/**
 * Fotos de iPhone costumam vir em HEIC/HEIF, formato que nenhum navegador
 * consegue decodificar sozinho (nem via <img>, nem via canvas) — por isso
 * "certas imagens" simplesmente nao funcionavam. Convertemos para JPEG antes
 * de seguir com o resto do pipeline. Import dinamico porque o conversor e
 * pesado (WASM) e so faz sentido carregar quando alguem realmente manda HEIC.
 */
async function converterSeNecessario(file) {
  if (!isHeic(file)) return file;

  try {
    const { default: heic2any } = await import("heic2any");
    const resultado = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    return Array.isArray(resultado) ? resultado[0] : resultado;
  } catch {
    return file;
  }
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function drawResized(img, maxSize, quality) {
  const largerSide = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = largerSide > maxSize ? maxSize / largerSide : 1;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

  const context = canvas.getContext("2d");
  context.drawImage(img, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Redimensiona e recomprime a imagem, aceitando qualquer tamanho/resolucao
 * ou formato de entrada (incluindo HEIC/HEIF). Retorna "" se a imagem nao
 * puder ser decodificada de jeito nenhum.
 */
export async function resizeImageForChat(file) {
  const arquivo = await converterSeNecessario(file);
  const rawDataUrl = await readFileAsDataUrl(arquivo);

  let img;
  try {
    img = await loadImageElement(rawDataUrl);
    if (!img.naturalWidth || !img.naturalHeight) throw new Error("dimensoes invalidas");
  } catch {
    return "";
  }

  let menorResultado = "";

  for (const { maxSize, quality } of COMPRESSION_STEPS) {
    const dataUrl = drawResized(img, maxSize, quality);
    if (!menorResultado || dataUrl.length < menorResultado.length) menorResultado = dataUrl;
    if (dataUrl.length <= TARGET_MAX_CHARS) return dataUrl;
  }

  return menorResultado;
}
