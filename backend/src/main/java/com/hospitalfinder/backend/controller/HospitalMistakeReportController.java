package com.hospitalfinder.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hospitalfinder.backend.dto.HospitalMistakeReportCreateDTO;
import com.hospitalfinder.backend.dto.HospitalMistakeReportDTO;
import com.hospitalfinder.backend.dto.HospitalMistakeReportDecisionDTO;
import com.hospitalfinder.backend.service.HospitalMistakeReportService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/hospital-mistake-reports")
@RequiredArgsConstructor
public class HospitalMistakeReportController {

    private final HospitalMistakeReportService hospitalMistakeReportService;

    @PostMapping
    public ResponseEntity<HospitalMistakeReportDTO> submitReport(
            @RequestBody HospitalMistakeReportCreateDTO request,
            Authentication authentication) {
        String authenticatedEmail = extractAuthenticatedEmail(authentication);
        return ResponseEntity.ok(hospitalMistakeReportService.submitReport(request, authenticatedEmail));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<HospitalMistakeReportDTO>> getPendingReports() {
        return ResponseEntity.ok(hospitalMistakeReportService.getPendingReports());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<HospitalMistakeReportDTO> decideReport(
            @PathVariable Long id,
            @RequestBody HospitalMistakeReportDecisionDTO request) {
        return ResponseEntity.ok(hospitalMistakeReportService.decideReport(id, request.getStatus()));
    }

    private String extractAuthenticatedEmail(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }

        String name = authentication.getName().trim();
        if (name.isEmpty() || "anonymousUser".equalsIgnoreCase(name)) {
            return null;
        }

        return name;
    }
}