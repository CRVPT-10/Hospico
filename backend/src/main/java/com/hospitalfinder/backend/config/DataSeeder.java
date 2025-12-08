package com.hospitalfinder.backend.config;

import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.hospitalfinder.backend.entity.Clinic;
import com.hospitalfinder.backend.entity.Specialization;
import com.hospitalfinder.backend.repository.ClinicRepository;
import com.hospitalfinder.backend.repository.SpecializationRepository;

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
    
    @Bean
    public CommandLineRunner seedClinics(ClinicRepository clinicRepository, SpecializationRepository specializationRepository) {
        return args -> {
            // Check if clinics already exist
            if (clinicRepository.count() == 0) {
                // Create sample clinics
                Clinic clinic1 = new Clinic();
                clinic1.setName("City General Hospital");
                clinic1.setAddress("123 Main Street");
                clinic1.setCity("Bangalore");
                clinic1.setLatitude(12.9716);
                clinic1.setLongitude(77.5946);
                clinic1.setPhone("+91-80-12345678");
                clinic1.setImageUrl("/src/assets/images/default-hospital.jpeg");
                
                // Get some specializations
                List<Specialization> specs = specializationRepository.findAll();
                if (!specs.isEmpty()) {
                    clinic1.setSpecializations(specs.subList(0, Math.min(3, specs.size())));
                }
                
                clinicRepository.save(clinic1);
                
                Clinic clinic2 = new Clinic();
                clinic2.setName("Apollo Specialty Clinic");
                clinic2.setAddress("456 Park Avenue");
                clinic2.setCity("Bangalore");
                clinic2.setLatitude(12.9235);
                clinic2.setLongitude(77.6123);
                clinic2.setPhone("+91-80-23456789");
                clinic2.setImageUrl("/src/assets/images/default-hospital.jpeg");
                
                if (!specs.isEmpty()) {
                    clinic2.setSpecializations(specs.subList(0, Math.min(2, specs.size())));
                }
                
                clinicRepository.save(clinic2);
            }
        };
    }
}