package com.hospitalfinder.backend.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class HospitalRequestDTO {
    private Long id;
    private String hospitalName;
    private String address;
    private String city;
    private String phone;
    private String timings;
    private Double latitude;
    private Double longitude;
    private String imageUrl;
    private String specializations;
    private String status;
    private String createdAt;
    private String reviewedAt;
    private String createdClinicId;
}
