package com.hospitalfinder.backend.dto;

import lombok.*;
public class LoginRequest {
    @Getter @Setter
    private String email;
    @Getter @Setter
    private String password;
}

