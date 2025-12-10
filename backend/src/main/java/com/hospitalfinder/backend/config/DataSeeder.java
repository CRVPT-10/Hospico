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
            if (!clinicRepository.existsByName("Kamineni Hospital")) {
                // Get all specializations first
                List<Specialization> specs = specializationRepository.findAll();
                
                // Create Vijayawada hospitals
                Clinic clinic1 = new Clinic();
                clinic1.setName("Kamineni Hospital");
                clinic1.setAddress("Opp Sri Durga Temple, Eluru Road");
                clinic1.setCity("Vijayawada");
                clinic1.setLatitude(16.5204);
                clinic1.setLongitude(80.6355);
                clinic1.setPhone("+91-866-2345678");
                clinic1.setImageUrl("https://raw.githubusercontent.com/CRVPT-10/Hospico/main/hospico-frontend-main/src/assets/images/kamineni-hospital.jpg");
                
                if (!specs.isEmpty()) {
                    clinic1.setSpecializations(List.of(
                        specs.stream().filter(s -> "Cardiology".equalsIgnoreCase(s.getSpecialization())).findFirst().orElse(specs.get(0)),
                        specs.stream().filter(s -> "General Surgery".equalsIgnoreCase(s.getSpecialization())).findFirst().orElse(specs.get(1)),
                        specs.stream().filter(s -> "Orthopedics".equalsIgnoreCase(s.getSpecialization())).findFirst().orElse(specs.get(2))
                    ));
                }
                
                clinicRepository.save(clinic1);
                
                Clinic clinic2 = new Clinic();
                clinic2.setName("Shourya Hospital");
                clinic2.setAddress("A S Rao Nagar");
                clinic2.setCity("Vijayawada");
                clinic2.setLatitude(16.5210);
                clinic2.setLongitude(80.6340);
                clinic2.setPhone("+91-866-2525000");
                clinic2.setImageUrl("https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400&h=300&fit=crop");
                
                if (!specs.isEmpty()) {
                    clinic2.setSpecializations(List.of(
                        specs.stream().filter(s -> "General Medicine".equalsIgnoreCase(s.getSpecialization())).findFirst().orElse(specs.get(0)),
                        specs.stream().filter(s -> "Pediatrics".equalsIgnoreCase(s.getSpecialization())).findFirst().orElse(specs.get(1)),
                        specs.stream().filter(s -> "ENT".equalsIgnoreCase(s.getSpecialization())).findFirst().orElse(specs.get(2))
                    ));
                }
                
                clinicRepository.save(clinic2);
                
                Clinic clinic3 = new Clinic();
                clinic3.setName("Vanaja Diabetic & Multi-Speciality");
                clinic3.setAddress("A S Rao Nagar");
                clinic3.setCity("Vijayawada");
                clinic3.setLatitude(16.5162);
                clinic3.setLongitude(80.6428);
                clinic3.setPhone("+91-866-2425588");
                clinic3.setImageUrl("https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop");
                
                if (!specs.isEmpty()) {
                    clinic3.setSpecializations(List.of(
                        specs.stream().filter(s -> "Neurosurgery".equalsIgnoreCase(s.getSpecialization())).findFirst().orElse(specs.get(0)),
                        specs.stream().filter(s -> "OBG".equalsIgnoreCase(s.getSpecialization())).findFirst().orElse(specs.get(1)),
                        specs.stream().filter(s -> "Pediatrics".equalsIgnoreCase(s.getSpecialization())).findFirst().orElse(specs.get(2))
                    ));
                }
                
                clinicRepository.save(clinic3);
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