package com.hospitalfinder.backend.dto;

import com.hospitalfinder.backend.entity.Role;
import lombok.*;

public class LoginResponse {
    @Getter @Setter
    private boolean success;
    @Getter @Setter
    private String message;
    @Getter @Setter
    private Long id;
    @Getter @Setter
    private String email;
    @Getter @Setter
    private String name;
    @Getter @Setter
    private Role role;
    @Getter @Setter
    private String token;  // for the cookie value reference

    public LoginResponse(boolean success, String message, Long id, String email, String name, Role role, String token) {
        this.success = success;
        this.message = message;
        this.id = id;
        this.email = email;
        this.name = name;
        this.role = role;
        this.token = token;
    }
}

