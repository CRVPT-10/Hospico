package com.hospitalfinder.backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataSeeder {

    @Bean
    public CommandLineRunner seedAllData() {
        return args -> {
            System.out.println("Data Seeding is disabled to preserve manual entries.");
        };
    }
}