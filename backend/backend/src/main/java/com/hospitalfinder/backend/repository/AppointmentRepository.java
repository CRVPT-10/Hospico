package com.hospitalfinder.backend.repository;

import com.hospitalfinder.backend.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.*;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    Collection<Appointment> findByUserId(Long userId);
    Collection<Appointment> findByClinicId(Long clinicId);
    List<Appointment> findByUserIdAndStatusIgnoreCase(Long userId, String status);
    List<Appointment> findByClinicIdAndStatusIgnoreCase(Long clinicId, String status);

    boolean existsByUserIdAndClinicIdAndAppointmentTime(Long userId, Long clinicId, LocalDateTime appointmentTime);
}
