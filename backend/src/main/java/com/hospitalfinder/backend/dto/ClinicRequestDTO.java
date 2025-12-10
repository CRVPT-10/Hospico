package com.hospitalfinder.backend.dto;


import java.util.List;

import com.hospitalfinder.backend.entity.Doctor;

import lombok.Getter;
import lombok.Setter;

public class ClinicRequestDTO {
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
    @Getter @Setter
    private List<Long> specializationIds;  // IDs of specializations selected from the dropdown
    @Getter @Setter
    private List<String> specializations;  // Names of specializations (alternative to IDs)
    @Getter @Setter
    private String phone;
    @Getter @Setter
    private String website;
    @Getter @Setter
    private String timings;
    @Getter @Setter
    private Double rating;
    @Getter @Setter
    private Integer reviews;
    @Getter @Setter
    private String imageUrl;
    @Getter @Setter
    private List<Doctor> doctors;
}

