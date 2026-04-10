package com.hospitalfinder.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ReviewCreateRequestDTO {
    private Long hospitalId;
    private Long doctorId;
    private Long userId;
    private String phone;
    private String otpSessionId;
    private String otpCode;
    private String comment;
    private String proofType;

    @JsonProperty("ratings")
    private ReviewRatingsDTO ratings;
}
