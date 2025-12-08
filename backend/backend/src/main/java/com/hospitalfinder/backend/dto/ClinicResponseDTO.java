package com.hospitalfinder.backend.dto;

import com.hospitalfinder.backend.entity.Clinic;
import com.hospitalfinder.backend.entity.Specialization;

import java.util.List;
import java.util.stream.Collectors;
import lombok.*;

public class ClinicResponseDTO {
    @Getter @Setter
    private Long clinicId;
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
    private List<String> specializations;
    @Getter @Setter
    private String phone;
    @Getter @Setter
    private String imageurl;

    // Constructor
    public ClinicResponseDTO(Clinic clinic) {
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
        this.phone = clinic.getPhone();
        this.imageurl = clinic.getImageUrl();
    }

}

