package pe.kusi.edu.web;
import org.springframework.http.*; import org.springframework.web.bind.MethodArgumentNotValidException; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestControllerAdvice
public class ApiExceptionHandler {
 @ExceptionHandler(SecurityException.class) public ResponseEntity<Map<String,String>> seguridad(SecurityException ex){return ResponseEntity.status(403).body(Map.of("mensaje",ex.getMessage()));}
 @ExceptionHandler(IllegalArgumentException.class) public ResponseEntity<Map<String,String>> solicitud(IllegalArgumentException ex){return ResponseEntity.badRequest().body(Map.of("mensaje",ex.getMessage()));}
 @ExceptionHandler(IllegalStateException.class) public ResponseEntity<Map<String,String>> configuracion(IllegalStateException ex){return ResponseEntity.status(503).body(Map.of("mensaje",ex.getMessage()));}
 @ExceptionHandler(MethodArgumentNotValidException.class) public ResponseEntity<Map<String,String>> validacion(MethodArgumentNotValidException ex){return ResponseEntity.badRequest().body(Map.of("mensaje","Revisa los campos enviados e inténtalo de nuevo."));}
}
