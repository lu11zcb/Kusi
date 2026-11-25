import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Path;
import javax.imageio.ImageIO;

// Cada punto cae dentro de una zona de la mochila miel. Las líneas café separan las zonas
// y detienen el relleno antes de que llegue al pelaje, la estrella del polo o los botones del peto.
class PrepararMochilaMenta {
    private static final int CUERPO = 0xB7CB84;
    private static final int COSTADO = 0x789E8A;
    private static final int ASA = 0xA0B86C;
    private static final int BOLSILLO = 0xFDE8BD;
    private static final int BROCHE = 0x779D88;

    private record Zona(int color, int[] puntos) {}
    private record Prenda(String nombre, Zona[] reposo, Zona[] saludo) {}

    private static final Prenda[] PRENDAS = {
        new Prenda("0", new Zona[] {
            zona(CUERPO, 316, 266, 271, 268, 168, 270), zona(ASA, 318, 244),
            zona(BOLSILLO, 365, 295, 363, 324, 332, 297, 335, 319), zona(BROCHE, 356, 297, 2),
        }, new Zona[] {
            zona(CUERPO, 329, 284, 271, 270, 159, 292),
            zona(BOLSILLO, 350, 304, 356, 326, 336, 325), zona(BROCHE, 356, 307, 2),
        }),
        new Prenda("BUFANDA", new Zona[] {
            zona(CUERPO, 338, 279, 278, 272, 141, 281, 332, 353),
            zona(ASA, 320, 252), zona(COSTADO, 316, 311), zona(BOLSILLO, 334, 301, 346, 329),
            zona(BROCHE, 346, 312, 3),
        }, new Zona[] {
            zona(CUERPO, 327, 282, 284, 275, 142, 294, 324, 355),
            zona(ASA, 314, 254), zona(COSTADO, 316, 309), zona(BOLSILLO, 333, 300, 340, 334),
            zona(BROCHE, 346, 311, 3),
        }),
        new Prenda("POLO", new Zona[] {
            zona(CUERPO, 339, 279, 274, 271, 171, 265),
            zona(BOLSILLO, 360, 299, 364, 325, 336, 320), zona(BROCHE, 355, 297, 2),
        }, new Zona[] {
            zona(CUERPO, 324, 268, 268, 267, 154, 288),
            zona(BOLSILLO, 345, 299, 354, 324, 336, 327), zona(BROCHE, 356, 306, 2),
        }),
        new Prenda("PETO_LILA", new Zona[] {
            zona(CUERPO, 142, 262, 232, 268, 321, 282), zona(ASA, 286, 252, 295, 267),
            zona(BOLSILLO, 311, 314, 311, 336), zona(BROCHE, 318, 320, 4),
        }, new Zona[] {
            zona(CUERPO, 231, 269, 315, 288, 296, 358), zona(ASA, 281, 259, 287, 272),
            zona(BOLSILLO, 311, 317, 309, 342), zona(BROCHE, 318, 323, 4),
        }),
        new Prenda("POLERON_MENTA", new Zona[] {
            zona(CUERPO, 171, 278, 258, 272, 315, 295, 145, 339, 295, 343),
            zona(COSTADO, 315, 328), zona(BOLSILLO, 326, 306, 346, 350), zona(BROCHE, 340, 319, 4),
        }, new Zona[] {
            zona(CUERPO, 164, 303, 256, 270, 322, 287, 304, 339),
            zona(COSTADO, 316, 327), zona(BOLSILLO, 346, 322, 329, 332), zona(BROCHE, 341, 317, 4),
        }),
        new Prenda("CHALECO", new Zona[] {
            zona(CUERPO, 159, 263, 279, 265, 351, 299), zona(ASA, 321, 257),
            zona(BOLSILLO, 346, 317), zona(BROCHE, 352, 323, 3),
        }, new Zona[] {
            zona(CUERPO, 272, 261, 163, 291, 346, 302), zona(ASA, 316, 257),
            zona(BOLSILLO, 339, 318), zona(BROCHE, 351, 325, 3),
        }),
    };

    public static void main(String[] args) throws IOException {
        if (args.length != 1) throw new IllegalArgumentException("Indica la carpeta cuy-vestido.");
        Path carpeta = Path.of(args[0]);
        for (Prenda prenda : PRENDAS) {
            var original = ImageIO.read(carpeta.resolve(prenda.nombre() + ".png").toFile());
            int izquierda = original.getWidth() / 4;
            int ancho = original.getWidth() / 2 - izquierda;
            int alto = original.getHeight();
            var menta = new BufferedImage(ancho, alto, BufferedImage.TYPE_INT_ARGB);
            recolorear(original.getSubimage(izquierda, 0, ancho, alto / 2), menta, 0, prenda.reposo());
            recolorear(original.getSubimage(izquierda, alto / 2, ancho, alto - alto / 2),
                menta, alto / 2, prenda.saludo());
            ImageIO.write(menta, "png", carpeta.resolve(prenda.nombre() + "-MOCHILA_MENTA.png").toFile());
        }
    }

    private static Zona zona(int color, int... puntos) {
        return new Zona(color, puntos);
    }

    private static void recolorear(BufferedImage miel, BufferedImage menta, int fila, Zona[] zonas) {
        int ancho = miel.getWidth();
        int alto = miel.getHeight();
        int[] pixeles = miel.getRGB(0, 0, ancho, alto, null, 0, ancho);
        int[] colores = new int[pixeles.length];
        int[] cola = new int[pixeles.length];
        for (Zona zona : zonas) {
            int[] puntos = zona.puntos();
            if (zona.color() == BROCHE) {
                marcarBroche(pixeles, colores, ancho, puntos[0], puntos[1], puntos[2]);
                continue;
            }
            for (int i = 0; i < puntos.length; i += 2) {
                int inicio = puntos[i + 1] * ancho + puntos[i];
                if (!esMiel(pixeles[inicio]) || colores[inicio] != 0) {
                    throw new IllegalArgumentException("Revisa la máscara en " + puntos[i] + ", " + puntos[i + 1]);
                }
                int fin = encolar(pixeles, colores, cola, 0, inicio, zona.color());
                for (int actual = 0; actual < fin; actual++) {
                    int p = cola[actual];
                    if (p % ancho > 0) fin = encolar(pixeles, colores, cola, fin, p - 1, zona.color());
                    if (p % ancho < ancho - 1) fin = encolar(pixeles, colores, cola, fin, p + 1, zona.color());
                    if (p >= ancho) fin = encolar(pixeles, colores, cola, fin, p - ancho, zona.color());
                    if (p < pixeles.length - ancho) {
                        fin = encolar(pixeles, colores, cola, fin, p + ancho, zona.color());
                    }
                }
            }
        }
        for (int p = 0; p < pixeles.length; p++) {
            if (colores[p] != 0) pixeles[p] = aplicarPaleta(pixeles[p], colores[p]);
        }
        menta.setRGB(0, fila, ancho, alto, pixeles, 0, ancho);
    }

    // El centro del broche es claro en algunos dibujos y mostaza en otros. Su máscara pequeña
    // permite usar la misma paleta en todos sin recolorear el bolsillo ni el anillo café.
    private static void marcarBroche(int[] pixeles, int[] colores, int ancho, int x, int y, int radio) {
        for (int dy = -radio; dy <= radio; dy++) {
            for (int dx = -radio; dx <= radio; dx++) {
                int p = (y + dy) * ancho + x + dx;
                if (dx * dx + dy * dy <= radio * radio && (pixeles[p] >>> 16 & 255) >= 165) {
                    colores[p] = BROCHE;
                }
            }
        }
    }

    private static int encolar(int[] pixeles, int[] colores, int[] cola, int fin, int p, int color) {
        if (colores[p] != 0 || !esMiel(pixeles[p])) return fin;
        colores[p] = color;
        cola[fin] = p;
        return fin + 1;
    }

    private static boolean esMiel(int pixel) {
        int rojo = pixel >>> 16 & 255;
        int verde = pixel >>> 8 & 255;
        int azul = pixel & 255;
        return (pixel >>> 24) > 195 && rojo >= 125 && verde >= 80
            && verde > rojo * 0.55 && verde < rojo * 0.93 && azul < verde * 0.81;
    }

    private static int aplicarPaleta(int original, int destino) {
        // El brillo de la mochila miel conserva sus luces y sombras bajo la paleta menta.
        int rojo = original >>> 16 & 255;
        int verde = original >>> 8 & 255;
        int azul = original & 255;
        int relieve = destino == BROCHE
            ? (int) Math.round((verde - 190) * 0.25)
            : (int) Math.round((0.26 * rojo + 0.57 * verde + 0.17 * azul - 150) * 0.50);
        return (original & 0xFF000000)
            | canal(destino >>> 16, relieve) << 16
            | canal(destino >>> 8, relieve) << 8
            | canal(destino, relieve);
    }

    private static int canal(int canal, int relieve) {
        return Math.clamp((canal & 255) + relieve, 0, 255);
    }
}
