package com.hospitalfinder.backend.dto;

import lombok.Data;

@Data
public class OtpVerifyRequestDTO {
    private String sessionId;
    private String otpCode;
}
