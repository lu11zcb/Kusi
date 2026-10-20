
package pe.kusi.edu.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import pe.kusi.edu.model.EtapaGeneracion;
import pe.kusi.edu.model.Generacion;
import pe.kusi.edu.model.Propuesta;
import pe.kusi.edu.repository.EtapaGeneracionRepository;
import pe.kusi.edu.repository.GeneracionRepository;
import pe.kusi.edu.repository.PropuestaRepository;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class GeneracionesServiceTest {

    private PropuestasService propuestasService;
    private PropuestaRepository propuestaRepository;
    private GeneracionRepository generacionRepository;
    private EtapaGeneracionRepository etapaRepository;
    private GeneracionesService service;

    private UUID docenteId;
    private UUID solicitudId;

    @BeforeEach
    void setUp() {
        propuestasService = mock(PropuestasService.class);
        propuestaRepository = mock(PropuestaRepository.class);
        generacionRepository = mock(GeneracionRepository.class);
        etapaRepository = mock(EtapaGeneracionRepository.class);

        service = new GeneracionesService(
            propuestasService,
            propuestaRepository,
            generacionRepository,
            etapaRepository
        );

        docenteId = UUID.randomUUID();
        solicitudId = UUID.randomUUID();
    }

    private Propuesta crearPropuesta(int version, String estado) {
        Propuesta propuesta = new Propuesta(
            solicitudId,
            version,
            "docente",
            null,
            null,
            "Aprender el tema",
            "docente",
            "Historia de prueba",
            "[]",
            "[]",
            "[]",
            "[]",
            null,
            null,
            null
        );

        propuesta.revisar(estado, docenteId);
        ReflectionTestUtils.setField(
            propuesta, "id", UUID.randomUUID()
        );

        return propuesta;
    }

    @Test
    void debeIniciarGeneracionConPropuestaAprobada() {
        Propuesta propuesta = crearPropuesta(2, "aprobada");

        when(propuestaRepository
            .findFirstBySolicitudIdOrderByVersionDesc(solicitudId))
            .thenReturn(Optional.of(propuesta));

        when(generacionRepository.save(any(Generacion.class)))
            .thenAnswer(invocacion -> {
                Generacion generacion = invocacion.getArgument(0);
                ReflectionTestUtils.setField(
                    generacion, "id", UUID.randomUUID()
                );
                return generacion;
            });

        when(etapaRepository.save(any(EtapaGeneracion.class)))
            .thenAnswer(invocacion -> invocacion.getArgument(0));

        Generacion resultado = service.iniciar(
            docenteId, solicitudId, 2
        );

        assertEquals("pendiente", resultado.getEstado());
        assertEquals(2, resultado.getVersionPropuesta());

        verify(propuestasService).consultar(docenteId, solicitudId);
        verify(generacionRepository).save(any(Generacion.class));
        verify(etapaRepository).save(any(EtapaGeneracion.class));
    }

    @Test
    void noDebeGenerarSiLaPropuestaNoEstaAprobada() {
        Propuesta propuesta = crearPropuesta(2, "pendiente");

        when(propuestaRepository
            .findFirstBySolicitudIdOrderByVersionDesc(solicitudId))
            .thenReturn(Optional.of(propuesta));

        ResponseStatusException error = assertThrows(
            ResponseStatusException.class,
            () -> service.iniciar(docenteId, solicitudId, 2)
        );

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        verify(generacionRepository, never()).save(any());
    }

    @Test
    void noDebeGenerarConUnaVersionAntigua() {
        Propuesta propuesta = crearPropuesta(3, "aprobada");

        when(propuestaRepository
            .findFirstBySolicitudIdOrderByVersionDesc(solicitudId))
            .thenReturn(Optional.of(propuesta));

        ResponseStatusException error = assertThrows(
            ResponseStatusException.class,
            () -> service.iniciar(docenteId, solicitudId, 2)
        );

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        verify(generacionRepository, never()).save(any());
    }

    @Test
    void noDebeAceptarUnaVersionMenorQueUno() {
        ResponseStatusException error = assertThrows(
            ResponseStatusException.class,
            () -> service.iniciar(docenteId, solicitudId, 0)
        );

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(propuestaRepository, never())
            .findFirstBySolicitudIdOrderByVersionDesc(any());
        verify(generacionRepository, never()).save(any());
    }
}
