package com.hospitalfinder.backend.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@Getter @Setter
public class UserUpdateDTO {
    private String phone;
    private String password;
}
