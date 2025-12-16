package com.hospitalfinder.backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class SchemaFixer {

    @Bean
    public CommandLineRunner fixSchema(JdbcTemplate jdbcTemplate) {
        return args -> {
            System.out.println("Checking and fixing database schema...");

            // Create medical_records table manually because ddl-auto=update failed with
            // BLOB type
            String sql = """
                        CREATE TABLE IF NOT EXISTS medical_records (
                            id BIGSERIAL PRIMARY KEY,
                            name VARCHAR(255) NOT NULL,
                            type VARCHAR(255),
                            size BIGINT,
                            category VARCHAR(255) NOT NULL,
                            data BYTEA,
                            upload_date TIMESTAMP,
                            user_id BIGINT,
                            CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
                        );
                    """;

            try {
                jdbcTemplate.execute(sql);
                System.out.println("Schema check: medical_records table validated/created.");
            } catch (Exception e) {
                System.err.println("Schema fix failed: " + e.getMessage());
            }
        };
    }
}
