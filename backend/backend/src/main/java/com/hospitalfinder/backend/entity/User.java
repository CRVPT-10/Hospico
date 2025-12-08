package com.hospitalfinder.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Getter @Setter
    private Long id;


    @Getter @Setter
    private String name;
    @Getter @Setter
    private String email;
    @Getter @Setter
    private String phone;
    @Getter @Setter
    private String password;

    @Enumerated(EnumType.STRING)
    @Getter @Setter
    private Role role;
    // getters and setters
}
