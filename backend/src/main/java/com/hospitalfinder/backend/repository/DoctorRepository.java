package com.hospitalfinder.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hospitalfinder.backend.entity.Doctor;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    // Find doctors by clinic and specialization
    List<Doctor> findByClinicIdAndSpecializationIgnoreCase(Long clinicId, String specialization);
}