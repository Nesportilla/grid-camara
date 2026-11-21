/*
 * © 2026, Rommina Dolorier. Todos los derechos reservados.
 * Creado para OFF, Chelas y código creativo.
 */

// Controles ajustables:
let espaciadoLetras = 0; // Espacio horizontal entre letras en píxeles. Usa 0 para que se toquen.
let intensidadEstirado = 0.65; // De 0 (sin efecto) a 1 (dramático); usa decimales para un efecto más sutil.

let tipografia;
let handPose;
let video;
let manos = [];
let anchosColumnas = [];
let altosFilas = [];
let manoX;
let manoY;
let objetivoX;
let objetivoY;

function preload() {
  tipografia = loadFont('assets/ABCCameraTrial-RegularItalic.otf');
  handPose = ml5.handPose({
    maxHands: 1,
    modelType: 'lite',
    runtime: 'mediapipe',
    flipped: true
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  manoX = objetivoX = width / 2;
  manoY = objetivoY = height / 2;

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.addClass('camera-preview');
  video.elt.setAttribute('playsinline', '');
  actualizarTamanoPreview();

  // detectStart administra el ciclo de inferencia sobre el video sin poner
  // fotogramas en una cola propia del sketch.
  handPose.detectStart(video, recibirManos);
}

function recibirManos(resultados) {
  manos = resultados;

  if (manos.length > 0 && manos[0].keypoints?.length) {
    const puntos = manos[0].keypoints;
    // Centro de la palma: muñeca y articulaciones MCP de los cuatro dedos.
    const indicesPalma = [0, 5, 9, 13, 17];
    const puntosPalma = indicesPalma.map(indice => puntos[indice]).filter(Boolean);

    if (puntosPalma.length > 0) {
      const centroX = puntosPalma.reduce((suma, punto) => suma + punto.x, 0) / puntosPalma.length;
      const centroY = puntosPalma.reduce((suma, punto) => suma + punto.y, 0) / puntosPalma.length;
      const anchoVideo = video.elt.videoWidth || 640;
      const altoVideo = video.elt.videoHeight || 480;

      objetivoX = constrain((centroX / anchoVideo) * width, 0, width);
      objetivoY = constrain((centroY / altoVideo) * height, 0, height);
      return;
    }
  }

  // Sin mano, la deformación vuelve gradualmente al centro del canvas.
  objetivoX = width / 2;
  objetivoY = height / 2;
}

function draw() {
  background('#000000');
  fill('#FFFFFF');
  noStroke();
  textFont(tipografia);
  textSize(150);
  textAlign(LEFT, BASELINE);

  const limitesLetra = tipografia.textBounds('a', 0, 0, 150);
  const anchoBaseLetra = max(1, limitesLetra.w);
  const altoBaseLetra = max(1, limitesLetra.h);

  // Suavizado temporal con una constante de 30 ms.
  const factorSuavizado = 1 - exp(-max(deltaTime, 1) / 30);
  manoX = lerp(manoX, objetivoX, factorSuavizado);
  manoY = lerp(manoY, objetivoY, factorSuavizado);

  // Conserva el módulo original de 180 px y distribuye las celdas por el canvas.
  const columnas = max(1, ceil(width / 180));
  const filas = max(1, ceil(height / 180));
  ajustarCantidad(anchosColumnas, columnas, width / columnas);
  ajustarCantidad(altosFilas, filas, height / filas);
  normalizarSuma(anchosColumnas, width);
  normalizarSuma(altosFilas, height);

  const intensidad = constrain(intensidadEstirado, 0, 1);
  const anchosObjetivo = medidasSegunPunto(columnas, manoX, width, intensidad);
  const altosObjetivo = medidasSegunPunto(filas, manoY, height, intensidad);
  anchosColumnas = anchosObjetivo;
  altosFilas = altosObjetivo;

  let y = 0;
  for (let fila = 0; fila < filas; fila++) {
    const alto = altosFilas[fila];
    let x = 0;

    for (let columna = 0; columna < columnas; columna++) {
      const ancho = anchosColumnas[columna];
      const anchoDisponible = max(1, ancho - max(0, espaciadoLetras));
      const escalaX = anchoDisponible / anchoBaseLetra;
      const escalaY = alto / altoBaseLetra;

      push();
      translate(
        x + ancho / 2 - (limitesLetra.x + limitesLetra.w / 2) * escalaX,
        y + alto / 2 - (limitesLetra.y + limitesLetra.h / 2) * escalaY
      );
      scale(escalaX, escalaY);
      text('a', 0, 0);
      pop();

      x += ancho;
    }
    y += alto;
  }
}

function ajustarCantidad(valores, cantidad, medidaInicial) {
  while (valores.length < cantidad) valores.push(medidaInicial);
  valores.length = cantidad;
}

function normalizarSuma(valores, total) {
  const suma = valores.reduce((acumulado, valor) => acumulado + valor, 0);
  if (suma > 0) {
    for (let i = 0; i < valores.length; i++) {
      valores[i] *= total / suma;
    }
  }
}

// Las celdas cercanas a la palma se expanden y las demás se comprimen.
function medidasSegunPunto(cantidad, posicion, dimension, intensidad) {
  const medidaBase = dimension / cantidad;
  const alcance = max(medidaBase * 1.5, dimension * 0.08);
  const posicionLimitada = constrain(posicion, 0, dimension);
  const pesos = [];
  let sumaPesos = 0;

  for (let i = 0; i < cantidad; i++) {
    const centroCelda = (i + 0.5) * medidaBase;
    const distancia = (centroCelda - posicionLimitada) / alcance;
    const peso = 1 + intensidad * 5 * exp(-0.5 * distancia * distancia);
    pesos.push(peso);
    sumaPesos += peso;
  }

  return pesos.map(peso => peso * dimension / sumaPesos);
}

function actualizarTamanoPreview() {
  if (!video) return;
  video.elt.style.width = 'auto';
  video.elt.style.height = `${windowHeight / 9}px`;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  actualizarTamanoPreview();
  objetivoX = width / 2;
  objetivoY = height / 2;
}
