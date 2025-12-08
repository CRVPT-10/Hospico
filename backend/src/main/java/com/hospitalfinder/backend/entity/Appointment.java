package com.hospitalfinder.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // the person who is booking the appointment
    @ManyToOne
    private User user;

    @ManyToOne
    private Clinic clinic;

    @ManyToOne
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    private LocalDateTime appointmentTime;

    private String status; // BOOKED, CANCELLED

    // NEW: patient details (for someone else)
    private String patientName;
    private Integer patientAge;
    private String patientGender;
    private String patientPhone;
    private String patientEmail;
}
