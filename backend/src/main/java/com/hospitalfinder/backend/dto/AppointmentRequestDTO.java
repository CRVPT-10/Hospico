package com.hospitalfinder.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class AppointmentRequestDTO {

    private Long userId;
    private Long clinicId;
    private Long doctorId;

    private String appointmentTime;  // ISO format

    // patient details
    private String patientName;
    private Integer patientAge;
    private String patientGender;
    private String patientPhone;
    private String patientEmail;
    private String reason;
}
