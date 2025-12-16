package com.hospitalfinder.backend.config;

import java.util.List;
import java.util.Random;

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
    public CommandLineRunner fixDoctorNames(ClinicRepository clinicRepository,
            DoctorRepository doctorRepository) {
        return args -> {
            List<Doctor> allDoctors = doctorRepository.findAll();
            if (allDoctors.isEmpty()) {
                System.out.println("No doctors found. Please ensure clinics are seeded or manually inserted.");
                // Fallback: If no doctors exist, we might want to generate them for existing
                // clinics.
                seedMissingDoctors(clinicRepository, doctorRepository);
                return;
            }

            Random random = new Random();
            String[] firstNames = {
                    "Srinivas", "Ravi", "Lakshmi", "Priya", "Rahul", "Anjali", "Vikram", "Sneha",
                    "Rajesh", "Kavita", "Suresh", "Meera", "Manoj", "Divya", "Arjun", "Deepa",
                    "Vijay", "Swathi", "Kiran", "Nitya", "Mahesh", "Padma", "Gopal", "Anita"
            };
            String[] lastNames = {
                    "Rao", "Reddy", "Latha", "Kumar", "Sharma", "Gupta", "Singh", "Mehta", "Patil",
                    "Nair", "Prasad", "Varma", "Chowdary", "Naidu", "Babu", "Raju", "Murthy", "Sastry"
            };

            for (Doctor doc : allDoctors) {
                String name = doc.getName();
                String spec = doc.getSpecialization();

                // Check if name is generic (contains "Specialist" or equals specialization
                // name)
                if (name.contains("Specialist") || name.equalsIgnoreCase(spec)
                        || name.equalsIgnoreCase(spec + " Specialist")) {
                    String newName = "Dr. " + firstNames[random.nextInt(firstNames.length)] + " "
                            + lastNames[random.nextInt(lastNames.length)];
                    doc.setName(newName);
                    doc.setBiography("Experienced " + spec.toLowerCase() + " specialist with over "
                            + (10 + random.nextInt(15)) + " years of practice.");
                    doctorRepository.save(doc);
                    System.out.println("Renamed " + name + " to " + newName);
                }
            }
        };
    }

    private void seedMissingDoctors(ClinicRepository clinicRepository, DoctorRepository doctorRepository) {
        var clinics = clinicRepository.findAllWithSpecializations();
        Random random = new Random();
        String[] firstNames = {
                "Srinivas", "Ravi", "Lakshmi", "Priya", "Rahul", "Anjali", "Vikram", "Sneha",
                "Rajesh", "Kavita", "Suresh", "Meera", "Manoj", "Divya", "Arjun", "Deepa"
        };
        String[] lastNames = {
                "Rao", "Reddy", "Latha", "Kumar", "Sharma", "Gupta", "Singh", "Mehta", "Patil",
                "Nair", "Prasad", "Varma", "Chowdary", "Naidu"
        };

        for (Clinic clinic : clinics) {
            var specs = clinic.getSpecializations();
            if (specs == null)
                continue;

            for (Specialization spec : specs) {
                String specName = spec.getSpecialization();
                var existing = doctorRepository.findByClinicIdAndSpecializationIgnoreCase(clinic.getId(), specName);
                if (existing != null && !existing.isEmpty())
                    continue;

                Doctor doc = new Doctor();
                doc.setClinic(clinic);
                doc.setSpecialization(specName);
                String newName = "Dr. " + firstNames[random.nextInt(firstNames.length)] + " "
                        + lastNames[random.nextInt(lastNames.length)];
                doc.setName(newName);
                doc.setQualifications("MBBS, MD");
                doc.setExperience((10 + random.nextInt(15)) + " years");
                doc.setBiography("Experienced " + specName.toLowerCase() + " specialist with over "
                        + doc.getExperience() + " of practice.");
                doctorRepository.save(doc);
            }
        }
    }
}