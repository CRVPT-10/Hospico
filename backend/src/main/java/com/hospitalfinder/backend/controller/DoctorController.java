package com.hospitalfinder.backend.controller;


import java.util.List;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hospitalfinder.backend.entity.Clinic;
import com.hospitalfinder.backend.entity.Doctor;
import com.hospitalfinder.backend.repository.ClinicRepository;
import com.hospitalfinder.backend.repository.DoctorRepository;

@RestController
@RequestMapping("/api")

public class DoctorController {

    private final DoctorRepository doctorRepository;
    private final ClinicRepository clinicRepository;

    public DoctorController(DoctorRepository doctorRepository, ClinicRepository clinicRepository) {
        this.doctorRepository = doctorRepository;
        this.clinicRepository = clinicRepository;
    }

    @PostMapping("/clinics/{clinicId}/doctors")
    public ResponseEntity<?> addDoctorToClinic(@PathVariable Long clinicId, @RequestBody Doctor doctor) {
        Optional<Clinic> clinicOpt = clinicRepository.findById(clinicId);
        if (clinicOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Clinic not found");
        }
        doctor.setClinic(clinicOpt.get());
        Doctor savedDoctor = doctorRepository.save(doctor);
        return ResponseEntity.ok(savedDoctor);
    }


    @GetMapping("/clinics/{clinicId}/doctors")
    public ResponseEntity<?> getDoctorsByClinicAndSpecialization(
            @PathVariable Long clinicId,
            @RequestParam(required = false) String specialization) {
        List<Doctor> doctors;
        if (specialization != null && !specialization.isEmpty()) {
            doctors = doctorRepository.findByClinicIdAndSpecializationIgnoreCase(clinicId, specialization);
        } else {
            doctors = doctorRepository.findByClinicIdAndSpecializationIgnoreCase(clinicId, specialization);
        }
        return ResponseEntity.ok(doctors);
    }

    @DeleteMapping("/doctors/{doctorId}")
    public ResponseEntity<?> deleteDoctor(@PathVariable Long doctorId) {
        if (!doctorRepository.existsById(doctorId)) {
            return ResponseEntity.notFound().build();
        }
        doctorRepository.deleteById(doctorId);
        return ResponseEntity.ok("Doctor deleted successfully");
    }


}