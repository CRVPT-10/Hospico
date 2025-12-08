package com.hospitalfinder.backend.repository;

import com.hospitalfinder.backend.entity.Specialization;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpecializationRepository extends JpaRepository<Specialization, Long> {
    boolean existsBySpecializationIgnoreCase(String specialization);
}

