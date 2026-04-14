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

import com.hospitalfinder.backend.dto.HospitalRequestCreateDTO;
import com.hospitalfinder.backend.dto.HospitalRequestDTO;
import com.hospitalfinder.backend.dto.HospitalRequestDecisionDTO;
import com.hospitalfinder.backend.service.HospitalRequestService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/hospital-requests")
@RequiredArgsConstructor
public class HospitalRequestController {

    private final HospitalRequestService hospitalRequestService;

    @PostMapping
    public ResponseEntity<HospitalRequestDTO> submitRequest(
            @RequestBody HospitalRequestCreateDTO request,
            Authentication authentication) {
        String authenticatedEmail = extractAuthenticatedEmail(authentication);
        return ResponseEntity.ok(hospitalRequestService.submitRequest(request, authenticatedEmail));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<HospitalRequestDTO>> getPendingRequests() {
        return ResponseEntity.ok(hospitalRequestService.getPendingRequests());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<HospitalRequestDTO> decideRequest(
            @PathVariable Long id,
            @RequestBody HospitalRequestDecisionDTO request) {
        return ResponseEntity.ok(hospitalRequestService.decideRequest(id, request.getStatus()));
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
