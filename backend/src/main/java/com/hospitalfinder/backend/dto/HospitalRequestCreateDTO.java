package com.hospitalfinder.backend.dto;

import lombok.Getter;
import lombok.Setter;

public class HospitalRequestCreateDTO {
    @Getter @Setter
    private String hospitalName;
    @Getter @Setter
    private String address;
    @Getter @Setter
    private String city;
    @Getter @Setter
    private String phone;
    @Getter @Setter
    private String timings;
    @Getter @Setter
    private Double latitude;
    @Getter @Setter
    private Double longitude;
    @Getter @Setter
    private String imageUrl;
    @Getter @Setter
    private String specializations;
}
