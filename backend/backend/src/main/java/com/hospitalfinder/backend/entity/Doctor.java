package com.hospitalfinder.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
public class Doctor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Getter @Setter
    private Long id;

    @Getter @Setter
    private String name;
    @Getter @Setter
    private String qualifications;
    @Getter @Setter
    private String specialization;
    @Getter @Setter
    private String experience;
    @Getter @Setter
    private String biography;
    @ManyToOne
    @JoinColumn(name = "clinic_id")
    @Getter @Setter
    private Clinic clinic;
    @Getter @Setter
    private String imageUrl;
}
