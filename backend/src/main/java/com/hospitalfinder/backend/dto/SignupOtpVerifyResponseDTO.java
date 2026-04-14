package com.hospitalfinder.backend.dto;

public class SignupOtpVerifyResponseDTO {
    private boolean success;
    private String message;
    private boolean verified;
    private String verificationToken;

    public SignupOtpVerifyResponseDTO(boolean success, String message, boolean verified, String verificationToken) {
        this.success = success;
        this.message = message;
        this.verified = verified;
        this.verificationToken = verificationToken;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public boolean isVerified() {
        return verified;
    }

    public String getVerificationToken() {
        return verificationToken;
    }
}
