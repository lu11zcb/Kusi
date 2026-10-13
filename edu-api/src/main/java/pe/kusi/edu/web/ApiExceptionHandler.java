package pe.kusi.edu.web;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.*; import org.springframework.web.bind.MethodArgumentNotValidException; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestControllerAdvice
public class ApiExceptionHandler {
 @ExceptionHandler(ResponseStatusException.class) public ResponseEntity<Map<String,String>> estado(ResponseStatusException ex){return ResponseEntity.status(ex.getStatusCode()).body(Map.of("mensaje",ex.getReason()==null?"La solicitud no está autorizada.":ex.getReason()));}
 @ExceptionHandler(SecurityException.class) public ResponseEntity<Map<String,String>> seguridad(SecurityException ex){return ResponseEntity.status(403).body(Map.of("mensaje",ex.getMessage()));}
 @ExceptionHandler(IllegalArgumentException.class) public ResponseEntity<Map<String,String>> solicitud(IllegalArgumentException ex){return ResponseEntity.badRequest().body(Map.of("mensaje",ex.getMessage()));}
 @ExceptionHandler(IllegalStateException.class) public ResponseEntity<Map<String,String>> configuracion(IllegalStateException ex){return ResponseEntity.status(503).body(Map.of("mensaje",ex.getMessage()));}
 @ExceptionHandler(MethodArgumentNotValidException.class) public ResponseEntity<Map<String,String>> validacion(MethodArgumentNotValidException ex){return ResponseEntity.badRequest().body(Map.of("mensaje","Revisa los campos enviados e inténtalo de nuevo."));}
 @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class) public ResponseEntity<Map<String,String>> ilegible(Exception ex){return ResponseEntity.badRequest().body(Map.of("mensaje","Revisa los campos enviados e inténtalo de nuevo."));}
 @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class) public ResponseEntity<Map<String,String>> ruta(Exception ex){return ResponseEntity.status(404).body(Map.of("mensaje","No se encontró el recurso solicitado."));}
 // Se resuelve después de que el interceptor transaccional haya revertido la escritura.
 @ExceptionHandler(DataIntegrityViolationException.class)
 public ResponseEntity<Map<String,String>> duplicado(DataIntegrityViolationException ex) {
  for (Throwable causa=ex; causa!=null; causa=causa.getCause()) {
   if (causa instanceof org.hibernate.exception.ConstraintViolationException restriccion && restriccion.getConstraintName()!=null) {
    String nombre=restriccion.getConstraintName().toLowerCase(Locale.ROOT);
    String mensaje=null;
    if (nombre.contains("uk_seccion_nombre_anio")) mensaje="Ya existe una sección con ese nombre en el mismo año escolar.";
    else if (nombre.contains("uk_estudiante_seccion_anio")) mensaje="El estudiante ya está vinculado a esa sección en ese año escolar.";
    else if (nombre.contains("uk_docente_curso_seccion_anio")) mensaje="Esta asignación docente ya existe.";
    if (mensaje!=null) return ResponseEntity.status(409).body(Map.of("mensaje",mensaje));
   }
  }
  // Una FK o un error de esquema no se presenta como si fuera un duplicado.
  throw ex;
 }
}
