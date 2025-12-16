package com.hospitalfinder.backend.repository;

import com.hospitalfinder.backend.entity.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {
    // Find records by user ID
    List<MedicalRecord> findByUserId(Long userId);
}
