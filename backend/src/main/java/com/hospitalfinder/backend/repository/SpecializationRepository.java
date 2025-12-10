package com.hospitalfinder.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hospitalfinder.backend.entity.Specialization;

public interface SpecializationRepository extends JpaRepository<Specialization, Long> {
    boolean existsBySpecializationIgnoreCase(String specialization);
    Optional<Specialization> findBySpecializationIgnoreCase(String specialization);
}

