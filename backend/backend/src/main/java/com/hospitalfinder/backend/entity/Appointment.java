package com.hospitalfinder.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
public class Appointment {
    @Id
    @GeneratedValue
    @Getter @Setter
    private Long id;

    @ManyToOne
    @Getter @Setter
    private User user;

    @ManyToOne
    @Getter @Setter
    private Clinic clinic;

    @Getter @Setter
    private LocalDateTime appointmentTime;
    @Getter @Setter
    private String status;  // e.g., BOOKED, CANCELLED
}
