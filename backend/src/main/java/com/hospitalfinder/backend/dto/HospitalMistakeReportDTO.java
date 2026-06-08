package com.hospitalfinder.backend.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class HospitalMistakeReportDTO {
    private Long id;
    private String clinicId;
    private String hospitalName;
    private String hospitalAddress;
    private String comment;
    private String status;
    private String createdAt;
    private String reviewedAt;
    private String requesterEmail;
}