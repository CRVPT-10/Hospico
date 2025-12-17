package com.hospitalfinder.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI hospicoOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Hospico API")
                        .description("API documentation for Hospico Hospital Finder application")
                        .version("1.0"))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Local Development Server"),
                        new Server().url("https://hospital-finder-backend-ls4y.onrender.com")
                                .description("Production Server (Render)")));
    }
}
