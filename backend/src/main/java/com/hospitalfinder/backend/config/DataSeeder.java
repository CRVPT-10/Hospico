package com.hospitalfinder.backend.config;

import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.hospitalfinder.backend.entity.Clinic;
import com.hospitalfinder.backend.entity.Doctor;
import com.hospitalfinder.backend.entity.Specialization;
import com.hospitalfinder.backend.repository.ClinicRepository;
import com.hospitalfinder.backend.repository.DoctorRepository;
import com.hospitalfinder.backend.repository.SpecializationRepository;

@Configuration
public class DataSeeder {

    @Bean
    public CommandLineRunner seedSpecializations(SpecializationRepository specializationRepository) {
        return args -> {
            List<String> defaultSpecs = List.of(
                    "Anesthesiology", "Cardiology", "Cardiothoracic Surgery", "ENT",
                    "Emergency Medicine", "General Medicine", "General Surgery", "Nephrology",
                    "Neurosurgery", "Nuclear Medicine", "OBG", "Orthopedics",
                    "Pathology", "Pediatrics", "Plastic Surgery", "Pulmonology",
                    "Radiology", "Surgical Gastroenterology", "Surgical Oncology", "Urology",
                    "Physiotherapy Unit", "Dialysis Unit"
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
            // Check if specific clinics already exist by name to avoid duplicates
            if (!clinicRepository.existsByName("City General Hospital") && 
                !clinicRepository.existsByName("Apollo Specialty Clinic")) {
                // Get all specializations first
                List<Specialization> specs = specializationRepository.findAll();
                
                // Create sample clinics
                Clinic clinic1 = new Clinic();
                clinic1.setName("City General Hospital");
                clinic1.setAddress("123 Main Street");
                clinic1.setCity("Bangalore");
                clinic1.setLatitude(12.9716);
                clinic1.setLongitude(77.5946);
                clinic1.setPhone("+91-80-12345678");
                clinic1.setImageUrl("/src/assets/images/default-hospital.jpeg");
                
                if (!specs.isEmpty()) {
                    // Create new specialization instances to avoid detached entity issues
                    clinic1.setSpecializations(List.of(
                        specs.get(0),
                        specs.size() > 1 ? specs.get(1) : specs.get(0),
                        specs.size() > 2 ? specs.get(2) : specs.get(0)
                    ));
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
                    // Create new specialization instances to avoid detached entity issues
                    clinic2.setSpecializations(List.of(
                        specs.get(0),
                        specs.size() > 1 ? specs.get(1) : specs.get(0)
                    ));
                }
                
                clinicRepository.save(clinic2);
            }
        };
    }

    @Bean
    public CommandLineRunner seedDoctors(ClinicRepository clinicRepository,
                                         DoctorRepository doctorRepository) {
        return args -> {
            var clinics = clinicRepository.findAllWithSpecializations();
            if (clinics.isEmpty()) return;

            // Sample doctor names per specialization
            java.util.Map<String, String> sampleNames = java.util.Map.ofEntries(
                    java.util.Map.entry("Cardiology", "Dr. Sarah Johnson"),
                    java.util.Map.entry("Cardiothoracic Surgery", "Dr. Arjun Mehta"),
                    java.util.Map.entry("General Medicine", "Dr. Michael Chen"),
                    java.util.Map.entry("General Surgery", "Dr. Meera Kapoor"),
                    java.util.Map.entry("Dermatology", "Dr. Aarav Nair"),
                    java.util.Map.entry("ENT", "Dr. Kavya Iyer"),
                    java.util.Map.entry("Orthopedics", "Dr. Rohan Sethi"),
                    java.util.Map.entry("Pediatrics", "Dr. Ananya Rao"),
                    java.util.Map.entry("Gynecology", "Dr. Priya Menon"),
                    java.util.Map.entry("Neurology", "Dr. Neel Gupta"),
                    java.util.Map.entry("Pulmonology", "Dr. Saira Khan"),
                    java.util.Map.entry("Urology", "Dr. Vikram Das"),
                    java.util.Map.entry("Emergency Medicine", "Dr. Karan Desai")
            );

            for (Clinic clinic : clinics) {
                var specs = clinic.getSpecializations();
                if (specs == null || specs.isEmpty()) continue;

                for (Specialization spec : specs) {
                    String specName = spec.getSpecialization();
                    if (specName == null || specName.isBlank()) continue;

                    var existing = doctorRepository.findByClinicIdAndSpecializationIgnoreCase(clinic.getId(), specName);
                    if (existing != null && !existing.isEmpty()) continue; // already has a doctor for this specialization

                    Doctor doc = new Doctor();
                    doc.setClinic(clinic);
                    doc.setSpecialization(specName);
                    doc.setName(sampleNames.getOrDefault(specName, specName + " Specialist"));
                    doc.setQualifications("MBBS, MD");
                    doc.setExperience("15 years");
                    doc.setBiography("Experienced " + specName.toLowerCase() + " specialist providing comprehensive care.");
                    doctorRepository.save(doc);
                }
            }
        };
    }
}