package com.hospitalfinder.backend.entity;

import jakarta.persistence.*;


import java.util.*;
import lombok.*;
import org.springframework.data.geo.Point;

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
    private List<Doctor> doctor;
    @Column(columnDefinition = "geography(Point,4326)") @Getter @Setter
    private Point location;
    @Getter @Setter
    private String imageUrl;
}
