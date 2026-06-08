package com.hospitalfinder.backend.dto;

import lombok.Getter;
import lombok.Setter;

public class HospitalMistakeReportCreateDTO {
    @Getter @Setter
    private String clinicId;

    @Getter @Setter
    private String hospitalName;

    @Getter @Setter
    private String hospitalAddress;

    @Getter @Setter
    private String comment;

    @Getter @Setter
    private String requesterEmail;
}