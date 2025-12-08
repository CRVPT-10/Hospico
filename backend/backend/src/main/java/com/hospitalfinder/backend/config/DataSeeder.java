package com.hospitalfinder.backend.config;

import com.hospitalfinder.backend.entity.Specialization;
import com.hospitalfinder.backend.repository.SpecializationRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class DataSeeder {

    @Bean
    public CommandLineRunner seedSpecializations(SpecializationRepository specializationRepository) {
        return args -> {
            List<String> defaultSpecs = List.of(
                    "Dermatologist", "Dentist", "Cardiologist", "ENT Specialist",
                    "General Physician", "Pediatrician", "Gynecologist", "Neurologist"
            );

            for (String spec : defaultSpecs) {
                if (!specializationRepository.existsBySpecializationIgnoreCase(spec)) {
                    Specialization s = new Specialization();
                    s.setSpecialization(spec);
                    specializationRepository.save(s);
                }
            }
        };
    }
}
