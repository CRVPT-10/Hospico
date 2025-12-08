package com.hospitalfinder.backend.dto;

import lombok.*;
@AllArgsConstructor
@NoArgsConstructor

public class AppointmentRequestDTO {
    @Getter @Setter
    private Long userId;
    @Getter @Setter
    private Long clinicId;
    @Getter @Setter
    private String appointmentTime; // format: "2025-05-27T14:30:00"
}
