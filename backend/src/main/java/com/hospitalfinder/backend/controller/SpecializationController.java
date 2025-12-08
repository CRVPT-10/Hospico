package com.hospitalfinder.backend.controller;

import com.hospitalfinder.backend.entity.Specialization;
import com.hospitalfinder.backend.repository.SpecializationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/specializations")
@RequiredArgsConstructor
public class SpecializationController {
    private final SpecializationRepository specializationRepository;

    @GetMapping
    public List<Specialization> getAll() {
        return specializationRepository.findAll();
    }
}

