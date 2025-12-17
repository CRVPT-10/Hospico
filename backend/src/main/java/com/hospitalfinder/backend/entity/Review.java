package com.hospitalfinder.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer rating;

    @Column(nullable = false, length = 1000)
    private String comment;

    @CreationTimestamp
    private LocalDateTime createdAt;

    // Relations stored as IDs to keep it lightweight and flexible
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "hospital_id")
    private Long hospitalId;

    @Column(name = "doctor_id")
    private Long doctorId;

    // Optional: Store SNAPSHOT of names in case entities are deleted,
    // but for now we'll fetch details or just use IDs.
    // User wants "User 1, User 2" logic, so we don't strictly need the user's real
    // name for display.
}
