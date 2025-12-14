package com.hospitalfinder.backend.repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hospitalfinder.backend.entity.Appointment;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    Collection<Appointment> findByUserId(Long userId);
    Collection<Appointment> findByClinicId(Long clinicId);
    List<Appointment> findByUserIdAndStatusIgnoreCase(Long userId, String status);
    List<Appointment> findByClinicIdAndStatusIgnoreCase(Long clinicId, String status);
    List<Appointment> findByDoctorId(Long doctorId);
    boolean existsByUserIdAndClinicIdAndAppointmentTime(Long userId, Long clinicId, LocalDateTime appointmentTime);
    // check if a slot is already taken for a doctor
    boolean existsByDoctorIdAndAppointmentTime(Long doctorId, LocalDateTime appointmentTime);

    // get all booked slots of a doctor for a date
    @Query("""
    SELECT a FROM Appointment a
    WHERE a.doctor.id = :doctorId
    AND CAST(a.appointmentTime AS LocalDate) = :date
    """)
    List<Appointment> findByDoctorAndDate(@Param("doctorId") Long doctorId, @Param("date") LocalDate date);
}
