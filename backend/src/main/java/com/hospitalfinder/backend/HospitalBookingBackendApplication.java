package com.hospitalfinder.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HospitalBookingBackendApplication {

	public static void main(String[] args) {

		SpringApplication.run(HospitalBookingBackendApplication.class, args);
	}

}
