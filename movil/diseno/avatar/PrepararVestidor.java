import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.GradientPaint;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.Shape;
import java.awt.geom.Path2D;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;
import javax.imageio.ImageIO;

// Preparamos aquí los dibujos finales. Android solo carga el cuadro completo elegido.
class PrepararVestidor {
    private static final int FUENTE = 384;
    private static final int CUADRO = 224;
    private static final Color TINTA = new Color(0x61341E);
    private static final String[] CABEZA = {"0", "SOMBRERO", "GORRO", "FLOR", "BOINA", "LAZO", "GORRA_CELESTE"};
    private static final String[] LENTES = {"0", "LENTES_AZULES", "LENTES_SOL", "LENTES_MENTA",
        "LENTES_CORAZON", "LENTES_CUADRADOS"};
    private static final String[] ROPA = {"0", "BUFANDA", "POLO", "PETO_LILA", "POLERON_MENTA"};
    private static final String[] MOCHILA = {"0", "MOCHILA", "MOCHILA_FRESA", "MOCHILA_ESPACIO"};
    private static final Map<String, BufferedImage> PIEZAS = new HashMap<>();
    private static final Color[] PELAJES = {
        null, new Color(0xE2B783), new Color(0xA1999A), new Color(0xEF963F),
    };

    public static void main(String[] args) throws IOException {
        if (args.length < 3) {
            throw new IllegalArgumentException("Indica las carpetas de accesorios, cuyes vestidos y salida.");
        }
        Path recursos = Path.of(args[0]);
        Path ropaDibujada = Path.of(args[1]);
        Path destino = Files.createDirectories(Path.of(args[2]));
        BufferedImage pelajes = cargar(recursos, "pelajes");
        PIEZAS.put("GORRO", cargar(recursos, "gorro_rosa"));
        PIEZAS.put("FLOR", cargar(recursos, "flor"));
        PIEZAS.put("BOINA", cargar(recursos, "boina_lila"));
        PIEZAS.put("LENTES_AZULES", cargar(recursos, "lentes_azules"));
        PIEZAS.put("LENTES_SOL", cargar(recursos, "lentes_sol"));
        PIEZAS.put("LENTES_MENTA", cargar(recursos, "lentes_menta"));
        PIEZAS.put("LAZO", cargar(recursos, "lazo"));
        PIEZAS.put("GORRA_CELESTE", cargar(recursos, "gorra_celeste"));
        PIEZAS.put("LENTES_CORAZON", cargar(recursos, "lentes_corazon"));
        PIEZAS.put("LENTES_CUADRADOS", cargar(recursos, "lentes_cuadrados"));
        var muestra = Arrays.asList(args).subList(3, args.length);
        var cuyes = cargarCuyesVestidos(pelajes, ropaDibujada);

        for (String cabeza : CABEZA) {
            for (String lentes : LENTES) {
                for (String ropa : ROPA) {
                    for (String mochila : MOCHILA) {
                        String nombre = String.join("-", cabeza, lentes, ropa, mochila);
                        if (!muestra.isEmpty() && !muestra.contains(nombre)) continue;
                        escribirHoja(destino, nombre, cuyes.get(ropa + "-" + mochila), cabeza, lentes);
                    }
                }
            }
        }
        if (muestra.isEmpty() || muestra.contains("cuy_chaleco_puesto")) {
            escribirHoja(destino, "cuy_chaleco_puesto", cuyes.get("CHALECO-0"), "0", "0");
        }
    }

    private static void escribirHoja(Path destino, String nombre, BufferedImage[][] cuyes, String cabeza, String lentes)
            throws IOException {
        BufferedImage hoja = new BufferedImage(4 * CUADRO, 2 * CUADRO, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = dibujo(hoja);
        for (int fila = 0; fila < 2; fila++) {
            for (int color = 0; color < 4; color++) {
                g.drawImage(cuy(cuyes[fila][color], cabeza, lentes, fila == 1),
                    color * CUADRO, fila * CUADRO, null);
            }
        }
        g.dispose();
        ImageIO.write(hoja, "png", destino.resolve(nombre + ".png").toFile());
    }

    private static Map<String, BufferedImage[][]> cargarCuyesVestidos(BufferedImage base, Path origen) throws IOException {
        Map<String, BufferedImage[][]> resultado = new HashMap<>();
        var prendas = Stream.concat(Arrays.stream(ROPA), Stream.of("CHALECO")).toList();
        for (String prenda : prendas) {
            BufferedImage hoja = ImageIO.read(origen.resolve(prenda + ".png").toFile());
            for (int columna = 0; columna < MOCHILA.length; columna++) {
                BufferedImage[][] poses = new BufferedImage[2][4];
                for (int fila = 0; fila < 2; fila++) {
                    if (prenda.equals("0") && columna == 0) {
                        for (int color = 0; color < 4; color++) {
                            poses[fila][color] = base.getSubimage(color * FUENTE, fila * FUENTE, FUENTE, FUENTE);
                        }
                        continue;
                    }
                    int x = columna * hoja.getWidth() / 4;
                    int y = fila * hoja.getHeight() / 2;
                    BufferedImage ilustracion = hoja.getSubimage(x, y, (columna + 1) * hoja.getWidth() / 4 - x,
                        (fila + 1) * hoja.getHeight() / 2 - y);
                    if (prenda.equals("CHALECO")) ilustracion = limpiarBorde(ilustracion);
                    poses[fila][0] = alinearIlustracion(ilustracion);
                    boolean costadosDePelaje = prenda.equals("0") || prenda.equals("BUFANDA");
                    for (int color = 1; color < 4; color++) {
                        poses[fila][color] = cambiarPelaje(poses[fila][0], PELAJES[color], costadosDePelaje);
                    }
                }
                resultado.put(prenda + "-" + MOCHILA[columna], poses);
            }
        }
        return resultado;
    }

    // La mochila cambia el ancho total. Se centra la cara usando la altura de las orejas.
    private static BufferedImage alinearIlustracion(BufferedImage imagen) {
        int superior = imagen.getHeight();
        int inferior = -1;
        for (int y = 0; y < imagen.getHeight(); y++) {
            for (int x = 0; x < imagen.getWidth(); x++) {
                if ((imagen.getRGB(x, y) >>> 24) >= 241) {
                    superior = Math.min(superior, y);
                    inferior = Math.max(inferior, y);
                }
            }
        }
        int altura = inferior - superior + 1;
        if (altura < 270 || altura >= imagen.getHeight()) {
            throw new IllegalArgumentException("La pose completa debe caber en una celda transparente.");
        }
        int izquierda = imagen.getWidth();
        int derecha = 0;
        for (int y = superior + altura / 7; y < superior + altura / 3; y++) {
            for (int x = 0; x < imagen.getWidth(); x++) {
                if ((imagen.getRGB(x, y) >>> 24) >= 241) {
                    izquierda = Math.min(izquierda, x);
                    derecha = Math.max(derecha, x);
                }
            }
        }
        double escala = 332.0 / altura;
        double centro = (izquierda + derecha) / 2.0;
        BufferedImage alineada = new BufferedImage(FUENTE, FUENTE, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = dibujo(alineada);
        AffineTransform ajuste = AffineTransform.getTranslateInstance(192 - centro * escala, 357 - inferior * escala);
        ajuste.scale(escala, escala);
        g.drawImage(imagen, ajuste, null);
        g.dispose();
        return alineada;
    }

    private static BufferedImage cambiarPelaje(BufferedImage base, Color color, boolean costados) {
        BufferedImage salida = new BufferedImage(FUENTE, FUENTE, BufferedImage.TYPE_INT_ARGB);
        float[] hsb = new float[3];
        for (int y = 0; y < FUENTE; y++) {
            for (int x = 0; x < FUENTE; x++) {
                int pixel = base.getRGB(x, y);
                boolean cara = y < 207;
                boolean flancos = costados && y >= 263 && y < 332 && (x < 135 || (x > 239 && x < 288));
                if ((pixel >>> 24) != 0 && (cara || flancos)) {
                    int r = pixel >> 16 & 255;
                    int g = pixel >> 8 & 255;
                    int b = pixel & 255;
                    Color.RGBtoHSB(r, g, b, hsb);
                    double peso = rampa(hsb[0], 0.043, 0.052) * (1 - rampa(hsb[0], 0.091, 0.113))
                        * rampa(hsb[1], 0.23, 0.37) * rampa(r, 101, 132) * (1 - rampa(r, 228, 250));
                    double relieve = (0.26 * r + 0.57 * g + 0.17 * b - 112) * 0.8;
                    pixel = (pixel & 0xFF000000) | interpolar(r, color.getRed() + relieve, peso) << 16
                        | interpolar(g, color.getGreen() + relieve, peso) << 8
                        | interpolar(b, color.getBlue() + relieve, peso);
                }
                salida.setRGB(x, y, pixel);
            }
        }
        return salida;
    }

    private static double rampa(double value, double inicio, double fin) {
        return Math.clamp((value - inicio) / (fin - inicio), 0, 1);
    }

    private static int interpolar(int original, double destino, double peso) {
        return (int) Math.round(Math.clamp(original + (destino - original) * peso, 0, 255));
    }

    // Elimina el velo claro que toca el borde del dibujo del chaleco. El contorno separa el pelaje claro.
    private static BufferedImage limpiarBorde(BufferedImage imagen) {
        int ancho = imagen.getWidth();
        int alto = imagen.getHeight();
        int[] pixeles = imagen.getRGB(0, 0, ancho, alto, null, 0, ancho);
        boolean[] visitados = new boolean[pixeles.length];
        int[] cola = new int[pixeles.length];
        for (int i = 0; i < ancho; i++) {
            cola[i] = i;
            visitados[i] = true;
        }
        int fin = ancho;
        for (int i = 0; i < fin; i++) {
            int p = cola[i];
            int color = pixeles[p];
            int r = color >> 16 & 255;
            int g = color >> 8 & 255;
            int b = color & 255;
            if ((color >>> 24) >= 200 && !(r > 224 && g > 216 && b > 204)) continue;
            pixeles[p] = 0;
            if (p % ancho > 0 && !visitados[p - 1]) { visitados[p - 1] = true; cola[fin++] = p - 1; }
            if (p % ancho < ancho - 1 && !visitados[p + 1]) { visitados[p + 1] = true; cola[fin++] = p + 1; }
            if (p >= ancho && !visitados[p - ancho]) { visitados[p - ancho] = true; cola[fin++] = p - ancho; }
            if (p < pixeles.length - ancho && !visitados[p + ancho]) {
                visitados[p + ancho] = true;
                cola[fin++] = p + ancho;
            }
        }
        BufferedImage limpia = new BufferedImage(ancho, alto, BufferedImage.TYPE_INT_ARGB);
        limpia.setRGB(0, 0, ancho, alto, pixeles, 0, ancho);
        return limpia;
    }

    private static BufferedImage cargar(Path recursos, String nombre) throws IOException {
        return ImageIO.read(recursos.resolve("cuy_" + nombre + ".png").toFile());
    }

    private static Graphics2D dibujo(BufferedImage imagen) {
        Graphics2D g = imagen.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        return g;
    }

    private static BufferedImage cuy(BufferedImage base, String cabeza, String lentes, boolean saludo) {
        // El margen adicional deja sitio para el pompón. Todas las poses conservan la misma línea de apoyo.
        BufferedImage cuadro = new BufferedImage(CUADRO, CUADRO, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = dibujo(cuadro);
        g.scale(CUADRO / 384.0, CUADRO / 384.0);
        g.translate(192, 360);
        g.scale(0.9, 0.9);
        g.translate(-192, -360);

        if (cabeza.equals("SOMBRERO")) dibujarAlaTrasera(g, saludo);
        g.drawImage(base, 0, 0, null);

        switch (cabeza) {
            case "SOMBRERO" -> sombrero(g, base, saludo);
            case "GORRO" -> estampa(g, cabeza, 111, -34, 163, 119, 0.025);
            case "FLOR" -> estampa(g, cabeza, 229, 47, 70, 40, -0.43);
            case "BOINA" -> estampa(g, cabeza, 108, -5, 175, 79, -0.04);
            case "LAZO" -> estampa(g, cabeza, 221, saludo ? 31 : 34, 82, 52, -0.34);
            case "GORRA_CELESTE" -> estampa(g, cabeza, 104, saludo ? -20 : -17, 198, 104, -0.06);
        }
        switch (lentes) {
            case "LENTES_AZULES" -> estampa(g, lentes, 98, saludo ? 87 : 91, 185, 75, 0.02);
            case "LENTES_SOL" -> estampa(g, lentes, 90, saludo ? 90 : 94, 200, 71, 0.015);
            case "LENTES_MENTA" -> estampa(g, lentes, 96, saludo ? 88 : 92, 189, 72, 0.02);
            case "LENTES_CORAZON" -> estampa(g, lentes, 95, saludo ? 90 : 94, 189, 69, 0.015);
            case "LENTES_CUADRADOS" -> estampa(g, lentes, 92, saludo ? 89 : 93, 198, 71, 0.02);
        }
        g.dispose();
        return cuadro;
    }

    private static void estampa(Graphics2D g, String pieza, int x, int y, int w, int h, double rotacion) {
        Graphics2D local = (Graphics2D) g.create();
        local.rotate(rotacion, x + w / 2.0, y + h / 2.0);
        local.drawImage(PIEZAS.get(pieza), x, y, w, h, null);
        local.dispose();
    }

    private static void dibujarAlaTrasera(Graphics2D g, boolean saludo) {
        Graphics2D ala = (Graphics2D) g.create();
        if (saludo) ala.translate(-3, -4);
        Shape forma = trazo("M 75 92 Q 81 71 113 65 Q 185 44 256 60 Q 293 65 310 85"
            + " Q 315 94 304 101 Q 287 111 254 104 L 118 107 Q 81 112 75 92 Z");
        volverARellenar(ala, forma, new Color(0x547238), TINTA, 4.5f);
        ala.dispose();
    }

    private static void sombrero(Graphics2D g, BufferedImage base, boolean saludo) {
        Graphics2D copa = (Graphics2D) g.create();
        if (saludo) copa.translate(-3, -4);
        Shape corona = trazo("M 113 67 Q 116 40 137 23 Q 157 8 197 10 Q 234 10 253 27"
            + " Q 266 41 271 66 L 267 75 Q 192 86 113 76 Z");
        colorTela(copa, corona, 0xABC966, 0x71964B, 10, 74);
        Shape banda = trazo("M 115 53 Q 189 35 267 52 L 271 66 Q 180 61 112 77 Z");
        volverARellenar(copa, banda, new Color(0x59813F), TINTA, 3);
        Shape ala = trazo("M 105 69 Q 158 55 209 59 Q 251 58 275 65 Q 289 70 296 83"
            + " Q 299 88 291 92 Q 282 94 266 84 Q 234 71 195 73 Q 151 72 111 89"
            + " Q 91 98 87 89 Q 85 83 105 69 Z");
        colorTela(copa, ala, 0x9CC253, 0x7EA74A, 61, 96);
        linea(copa, trazo("M 108 76 Q 144 66 170 65"), new Color(0xCDF181), 2.5f);
        Shape hoja = trazo("M 193 50 Q 191 35 206 32 Q 208 46 193 50 Z");
        volverARellenar(copa, hoja, new Color(0xD8ED99), new Color(0x4B6631), 2);
        copa.dispose();
        // Las orejas pasan por debajo de la copa y delante del ala de atrás.
        if (saludo) {
            recuperar(g, base, trazo("M 68 96 Q 89 72 106 73 L 116 85 Q 111 99 101 120 L 67 122 Z"),
                trazo("M 269 81 Q 290 86 311 105 L 316 125 L 286 132 Q 278 123 270 106 Z"));
        } else {
            recuperar(g, base, trazo("M 68 99 Q 88 78 111 77 L 120 88 Q 113 105 103 124 L 67 127 Z"),
                trazo("M 269 82 Q 291 87 309 106 L 315 125 L 288 133 Q 276 123 269 107 Z"));
        }
    }

    private static void recuperar(Graphics2D g, BufferedImage base, Shape... formas) {
        Graphics2D local = (Graphics2D) g.create();
        for (Shape forma : formas) {
            local.setClip(forma);
            local.drawImage(base, 0, 0, null);
        }
        local.dispose();
    }

    private static void colorTela(Graphics2D g, Shape forma, int claro, int oscuro, int arriba, int abajo) {
        g.setPaint(new GradientPaint(0, arriba, new Color(claro), 0, abajo, new Color(oscuro)));
        g.fill(forma);
        linea(g, forma, TINTA, 4.5f);
    }

    private static void volverARellenar(Graphics2D g, Shape forma, Color fondo, Color borde, float ancho) {
        g.setColor(fondo);
        g.fill(forma);
        linea(g, forma, borde, ancho);
    }

    private static void linea(Graphics2D g, Shape forma, Color color, float ancho) {
        g.setColor(color);
        g.setStroke(new BasicStroke(ancho, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        g.draw(forma);
    }

    private static Path2D trazo(String descripcion) {
        String[] puntos = descripcion.split(" ");
        Path2D camino = new Path2D.Double();
        for (int i = 0; i < puntos.length;) {
            switch (puntos[i++]) {
                case "M" -> { camino.moveTo(n(puntos[i]), n(puntos[i + 1])); i += 2; }
                case "L" -> { camino.lineTo(n(puntos[i]), n(puntos[i + 1])); i += 2; }
                case "Q" -> { camino.quadTo(n(puntos[i]), n(puntos[i + 1]), n(puntos[i + 2]), n(puntos[i + 3])); i += 4; }
                case "C" -> { camino.curveTo(n(puntos[i]), n(puntos[i + 1]), n(puntos[i + 2]), n(puntos[i + 3]), n(puntos[i + 4]), n(puntos[i + 5])); i += 6; }
                case "Z" -> camino.closePath();
                default -> throw new IllegalArgumentException(descripcion);
            }
        }
        return camino;
    }

    private static double n(String coordenada) {
        return Double.parseDouble(coordenada);
    }
}
