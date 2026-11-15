package pe.kusi.edu;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

// El reloj revisa cada 10 segundos las propuestas que el taller no tomó o no entregó.
@SpringBootApplication
@EnableScheduling
public class EduApiApplication {
    public static void main(String[] args) { SpringApplication.run(EduApiApplication.class, args); }
}
