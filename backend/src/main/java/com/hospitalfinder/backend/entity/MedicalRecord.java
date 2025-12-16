package com.hospitalfinder.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "medical_records")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String type;

    private long size;

    @Column(nullable = false)
    private String category; // Diagnostics, Scanning, Prescriptions, Bills

    @Lob
    @Column(columnDefinition = "BLOB")
    private byte[] data;

    @Column(name = "upload_date")
    private LocalDateTime uploadDate;

    // Assuming there is a User entity. Linking to it.
    // Modify 'User' class name if it differs (e.g. 'Users' or 'AppUser')
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User user;
}
