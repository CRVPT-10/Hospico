package com.hospitalfinder.backend.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;


import java.util.*;
import lombok.*;

@Table(
        name = "clinic",
        uniqueConstraints = @UniqueConstraint(columnNames = {"name", "address", "city"})
)

@Entity
public class Clinic {
    @Id
    @GeneratedValue
    @Getter @Setter
    private Long id;
    @Getter @Setter
    private String name;
    @Getter @Setter
    private String address;
    @Getter @Setter
    private String city;
    @Getter @Setter
    private Double latitude;
    @Getter @Setter
    private Double longitude;
    @ManyToMany @Getter @Setter
    private Collection<Specialization> specializations;
    @Getter @Setter
    private String phone;
    @Getter @Setter @OneToMany(mappedBy = "clinic", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<Doctor> doctors;
    @Getter @Setter
    private String imageUrl;
}
