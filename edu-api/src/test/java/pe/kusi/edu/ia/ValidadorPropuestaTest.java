package pe.kusi.edu.ia;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

// HU28: la propuesta puede traer la regla del juego. Es opcional, pero si viene tiene
// que ser una de las dos que Kusi sabe jugar.
class ValidadorPropuestaTest {
    private final ValidadorPropuesta validador = new ValidadorPropuesta();

    private static Map<String, Object> propuesta() {
        Map<String, Object> datos = new HashMap<>();
        datos.put("objetivo", "Los niños aprenderán a seguir un patrón.");
        datos.put("historia", "Kusi recorre el laberinto y junta frutas en orden.");
        datos.put("acciones", List.of("Mover al cuy"));
        datos.put("reglas", List.of("Se recoge en orden"));
        datos.put("retos", List.of("Completar el patrón"));
        datos.put("ayudas", List.of("Mira lo que se repite"));
        return datos;
    }

    @Test
    void laReglaDelJuegoPuedeSerOrdenOSoloClase() throws Exception {
        Map<String, Object> conOrden = propuesta();
        conOrden.put("regla_juego", "orden");
        Map<String, Object> conClase = propuesta();
        conClase.put("regla_juego", "solo_clase");

        assertEquals("orden", validador.validar(conOrden, null).reglaJuego());
        assertEquals("solo_clase", validador.validar(conClase, null).reglaJuego());
    }

    @Test
    void sinReglaOConLaReglaVaciaLaPropuestaNoEligioNinguna() throws Exception {
        assertNull(validador.validar(propuesta(), null).reglaJuego());

        Map<String, Object> vacia = propuesta();
        vacia.put("regla_juego", "   ");
        assertNull(validador.validar(vacia, null).reglaJuego());

        Map<String, Object> nula = propuesta();
        nula.put("regla_juego", null);
        assertNull(validador.validar(nula, null).reglaJuego());
    }

    @Test
    void losEspaciosAlrededorDeLaReglaSeQuitan() throws Exception {
        Map<String, Object> datos = propuesta();
        datos.put("regla_juego", "  solo_clase ");

        assertEquals("solo_clase", validador.validar(datos, null).reglaJuego());
    }

    @Test
    void unaReglaQueKusiNoSabeJugarHaceInvalidaLaPropuesta() {
        for (Object invalida : List.of("mercado", "ordenar", "Orden", "solo clase", 3, List.of("orden"), true)) {
            Map<String, Object> datos = propuesta();
            datos.put("regla_juego", invalida);

            FalloGeneracion fallo = assertThrows(FalloGeneracion.class, () -> validador.validar(datos, null), "Con " + invalida);
            assertTrue(fallo.getMessage().contains("incompleta o no válida"));
        }
    }

    @Test
    void elObjetivoDelDocenteSigueGanandoYLaReglaTambienSeConserva() throws Exception {
        Map<String, Object> datos = propuesta();
        datos.put("regla_juego", "orden");

        ValidadorPropuesta.Resultado resultado = validador.validar(datos, "Mi objetivo exacto");

        assertEquals("Mi objetivo exacto", resultado.objetivo());
        assertEquals("docente", resultado.origenObjetivo());
        assertEquals("orden", resultado.reglaJuego());
    }

    // La propuesta diseña el juego del tema; Kusi decide si puede construirlo hoy.
    @Test
    void unLaberintoDeFrutasYVerdurasSePuedeConstruir() throws Exception {
        Map<String, Object> datos = propuesta();
        datos.put("tipo_juego", "laberinto");
        datos.put("regla_juego", "solo_clase");
        datos.put("objetos", List.of("Fresas y plátanos", "las zanahorias", "PIÑA", "verduras"));

        ValidadorPropuesta.Resultado resultado = validador.validar(datos, null);
        assertEquals("laberinto", resultado.tipoJuego());
        assertEquals("solo_clase", resultado.reglaJuego());
    }

    @Test
    void otroJuegoSeGuardaSinReglaDeLaberinto() throws Exception {
        Map<String, Object> datos = propuesta();
        datos.put("tipo_juego", "otro");
        datos.put("regla_juego", "ninguna");
        datos.put("objetos", List.of());

        ValidadorPropuesta.Resultado resultado = validador.validar(datos, null);
        assertEquals("otro", resultado.tipoJuego());
        assertNull(resultado.reglaJuego());

        // Aunque la IA escriba una regla, otro juego no la lleva.
        datos.put("regla_juego", "orden");
        assertNull(validador.validar(datos, null).reglaJuego());
    }

    @Test
    void unLaberintoSinReglaOConDibujosQueNoExistenEsOtroJuego() throws Exception {
        Map<String, Object> sinRegla = propuesta();
        sinRegla.put("tipo_juego", "laberinto");
        sinRegla.put("regla_juego", "ninguna");
        assertEquals("otro", validador.validar(sinRegla, null).tipoJuego());

        Map<String, Object> conDibujosNuevos = propuesta();
        conDibujosNuevos.put("tipo_juego", "laberinto");
        conDibujosNuevos.put("regla_juego", "orden");
        conDibujosNuevos.put("objetos", List.of("la luz", "el sol y la luna"));
        assertEquals("otro", validador.validar(conDibujosNuevos, null).tipoJuego());
    }

    @Test
    void sinTipoDeJuegoSeHeredaYUnTipoDesconocidoEsInvalido() throws Exception {
        assertNull(validador.validar(propuesta(), null).tipoJuego());
        for (Object invalido : List.of("memoria", "Laberinto", 3, true)) {
            Map<String, Object> datos = propuesta();
            datos.put("tipo_juego", invalido);
            assertThrows(FalloGeneracion.class, () -> validador.validar(datos, null), "Con " + invalido);
        }
    }

    @Test
    void reconoceLosAlimentosConTildesMayusculasYPlural() {
        for (String objeto : List.of("plátanos", "Mandarinas", "choclos", "papas", "la piña", "frutas", "el zorro")) {
            assertTrue(ValidadorPropuesta.nombraAlgoDelCatalogo(objeto), objeto);
        }
        for (String objeto : List.of("el sol", "los días de la creación", "tomate", "manzana")) {
            assertFalse(ValidadorPropuesta.nombraAlgoDelCatalogo(objeto), objeto);
        }
    }
}
