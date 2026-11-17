// Prepara una pieza nueva a partir de lo que entregó la herramienta de imágenes
// (kit/estilo/README.md, secciones 7 y 14). Usa la visión de macOS para quitar el fondo
// blanco: no hay que instalar nada ni descargar modelos.
//
//   preparar_pieza <original.png> <pieza.png>              un objeto centrado
//   preparar_pieza <original.png> <pieza.png> --apoyado    un objeto con su punto más bajo en y = 244
//   preparar_pieza <original.png> <fondo.png> --fondo      un fondo de 1672 × 941, sin transparencia
//   preparar_pieza <original.png> <figura.png> --figura    una figura entera de 768 × 768 con transparencia
//   preparar_pieza <original.png> <recorte.png> --recorte  la figura recortada a su tamaño, sin cambiarle la escala
//                                                           (un cuadro de una criatura animada: preparar_criatura.mjs)
//
// No se usa directo: lo compila y lo llama kit/herramientas/preparar_pieza.mjs.

import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

func fallar(_ texto: String) -> Never {
  FileHandle.standardError.write((texto + "\n").data(using: .utf8)!)
  exit(1)
}

let argumentos = CommandLine.arguments
guard argumentos.count >= 3 else { fallar("Uso: preparar_pieza <original.png> <pieza.png> [--apoyado | --fondo | --figura]") }
let esFondo = argumentos.contains("--fondo")
let apoyado = argumentos.contains("--apoyado")
let esFigura = argumentos.contains("--figura")
let esRecorte = argumentos.contains("--recorte")
// Un objeto mide 256 × 256 (lado mayor 200); una figura entera, 768 × 768 (lado mayor 704).
let lado = esFigura ? 768.0 : 256.0
let ladoMayor = esFigura ? 704.0 : 200.0
guard let fuente = CGImageSourceCreateWithURL(URL(fileURLWithPath: argumentos[1]) as CFURL, nil),
      let original = CGImageSourceCreateImageAtIndex(fuente, 0, nil) else { fallar("No se pudo leer el original.") }
let colores = CGColorSpace(name: CGColorSpace.sRGB)!

func guardar(_ imagen: CGImage) {
  guard let destino = CGImageDestinationCreateWithURL(URL(fileURLWithPath: argumentos[2]) as CFURL,
    UTType.png.identifier as CFString, 1, nil) else { fallar("No se pudo crear el PNG.") }
  CGImageDestinationAddImage(destino, imagen, nil)
  guard CGImageDestinationFinalize(destino) else { fallar("No se pudo guardar el PNG.") }
}

if esFondo {
  // Un fondo cubre toda la pantalla: se agranda hasta cubrir 1672 × 941 y se recorta al
  // centro, sin deformarlo y sin transparencia.
  let ancho = 1672.0, alto = 941.0
  let escala = max(ancho / Double(original.width), alto / Double(original.height))
  let dibujo = CGRect(x: (ancho - Double(original.width) * escala) / 2, y: (alto - Double(original.height) * escala) / 2,
    width: Double(original.width) * escala, height: Double(original.height) * escala)
  guard let lienzo = CGContext(data: nil, width: Int(ancho), height: Int(alto), bitsPerComponent: 8, bytesPerRow: 0,
    space: colores, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { fallar("Sin lienzo.") }
  lienzo.interpolationQuality = .high
  lienzo.draw(original, in: dibujo)
  guard let fondo = lienzo.makeImage() else { fallar("No se pudo preparar el fondo.") }
  guardar(fondo)
  print("{\"tipo\":\"fondo\",\"ancho\":1672,\"alto\":941}")
  exit(0)
}

// 1. La figura: la máscara de primer plano de la visión de macOS, recortada a su tamaño.
// Quita el blanco de afuera y el que se ve por los huecos (por ejemplo, entre un asa y la olla).
let pedido = VNGenerateForegroundInstanceMaskRequest()
let manejador = VNImageRequestHandler(cgImage: original)
do { try manejador.perform([pedido]) } catch { fallar("La visión de macOS no pudo leer la imagen: \(error)") }
guard let resultado = pedido.results?.first, !resultado.allInstances.isEmpty else { fallar("No se encontró ninguna figura en la imagen.") }
guard let recorte = try? resultado.generateMaskedImage(ofInstances: resultado.allInstances, from: manejador, croppedToInstancesExtent: true)
  else { fallar("No se pudo recortar la figura.") }
let ciRecorte = CIImage(cvPixelBuffer: recorte)
guard let figura = CIContext().createCGImage(ciRecorte, from: ciRecorte.extent) else { fallar("No se pudo convertir la figura.") }
if esRecorte {
  guardar(figura)
  print("{\"tipo\":\"recorte\",\"ancho\":\(figura.width),\"alto\":\(figura.height),\"instancias\":\(resultado.allInstances.count)}")
  exit(0)
}

// 2. Se reduce sin deformarla: el lado mayor mide 200 px (la guía pide de 180 a 215) y
// va centrada a lo ancho. En CoreGraphics el origen está abajo: «apoyado» deja su punto
// más bajo en la fila 244, como los pies de los personajes.
let escala = ladoMayor / Double(max(figura.width, figura.height))
let ancho = Double(figura.width) * escala, alto = Double(figura.height) * escala
let y = apoyado && !esFigura ? 256.0 - 245.0 : (lado - alto) / 2.0
guard let lienzo = CGContext(data: nil, width: Int(lado), height: Int(lado), bitsPerComponent: 8, bytesPerRow: 0,
  space: colores, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { fallar("Sin lienzo.") }
lienzo.interpolationQuality = .high
lienzo.draw(figura, in: CGRect(x: (lado - ancho) / 2.0, y: y, width: ancho, height: alto))
guard let pieza = lienzo.makeImage() else { fallar("No se pudo preparar la pieza.") }
guardar(pieza)
print("{\"tipo\":\"\(esFigura ? "figura" : "objeto")\",\"lado_mayor\":\(Int(max(ancho, alto).rounded())),\"instancias\":\(resultado.allInstances.count)}")
