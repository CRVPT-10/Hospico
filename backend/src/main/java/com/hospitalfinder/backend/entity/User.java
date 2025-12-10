package com.hospitalfinder.backend.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

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

    @Getter @Setter
    private Integer age;
    @Getter @Setter
    private String gender;

    @Enumerated(EnumType.STRING)
    @Getter @Setter
    private Role role;
    // getters and setters
}
