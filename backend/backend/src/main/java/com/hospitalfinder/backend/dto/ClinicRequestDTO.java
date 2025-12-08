package com.hospitalfinder.backend.dto;


import lombok.*;

import java.util.List;

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
    private String phone;
    @Getter @Setter
    private String imageurl;
}

