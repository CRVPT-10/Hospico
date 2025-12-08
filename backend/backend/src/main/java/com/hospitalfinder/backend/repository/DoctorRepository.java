package com.hospitalfinder.backend.repository;

import com.hospitalfinder.backend.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    // Find doctors by clinic and specialization
    List<Doctor> findByClinicIdAndSpecializationIgnoreCase(Long clinicId, String specialization);
}
