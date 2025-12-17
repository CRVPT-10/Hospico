package com.hospitalfinder.backend.dto;

import java.util.List;
import java.util.stream.Collectors;

import com.hospitalfinder.backend.entity.Clinic;
import com.hospitalfinder.backend.entity.Specialization;

import lombok.Getter;
import lombok.Setter;

public class ClinicSummaryDTO {
    @Getter
    @Setter
    private Long clinicId;
    @Getter
    @Setter
    private String name;
    @Getter
    @Setter
    private String address;
    @Getter
    @Setter
    private String city;
    @Getter
    @Setter
    private Double latitude;
    @Getter
    @Setter
    private Double longitude;
    @Getter
    @Setter
    private List<String> specializations;
    @Getter
    @Setter
    private Double rating;
    @Getter
    @Setter
    private Integer reviews;
    @Getter
    @Setter
    private String imageUrl;

    public ClinicSummaryDTO(Clinic clinic) {
        this.clinicId = clinic.getId();
        this.name = clinic.getName();
        this.address = clinic.getAddress();
        this.city = clinic.getCity();
        this.longitude = clinic.getLongitude();
        this.latitude = clinic.getLatitude();
        this.specializations = clinic.getSpecializations()
                .stream()
                .map(Specialization::getSpecialization)
                .collect(Collectors.toList());
        this.rating = clinic.getRating();
        this.reviews = clinic.getReviews();
        this.imageUrl = clinic.getImageUrl();
    }
}
