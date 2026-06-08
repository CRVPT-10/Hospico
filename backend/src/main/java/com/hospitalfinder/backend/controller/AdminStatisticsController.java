package com.hospitalfinder.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hospitalfinder.backend.dto.AdminStatisticsDTO;
import com.hospitalfinder.backend.service.AdminStatisticsService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminStatisticsController {

    private final AdminStatisticsService adminStatisticsService;

    @GetMapping("/stats")
    public ResponseEntity<AdminStatisticsDTO> getStatistics() {
        return ResponseEntity.ok(adminStatisticsService.getStatistics());
    }
}