package com.hospitalfinder.backend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@Getter @Setter
public class UserUpdateDTO {
    private String name;
    private String phone;
    private String password;
    private Integer age;
    private String gender;
}
