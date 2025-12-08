package com.hospitalfinder.backend.controller;

import com.hospitalfinder.backend.dto.ClinicRequestDTO;
import com.hospitalfinder.backend.dto.ClinicResponseDTO;
import com.hospitalfinder.backend.entity.Clinic;
import com.hospitalfinder.backend.repository.ClinicRepository;
import com.hospitalfinder.backend.service.ClinicService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clinics")
@RequiredArgsConstructor
public class ClinicController {

    private final ClinicService clinicService;
    private final ClinicRepository clinicRepository;

    @GetMapping
    public List<ClinicResponseDTO> getClinics(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String specialization
    ) {
        return clinicService.getFilteredClinics(city, specialization);
    }

    @GetMapping("/nearby")
    public ResponseEntity<?> getNearbyClinics(
            @RequestParam double lat,
            @RequestParam double lng
    ) {
        List<Clinic> clinics = clinicRepository.findNearestClinics(lat, lng);
        return ResponseEntity.ok(clinics);
    }

    @GetMapping("/id")
    public ResponseEntity<?> getClinicById(@RequestParam(required = true) Long id) {
        return clinicRepository.findById(id)
                .map(clinic -> ResponseEntity.ok(clinicService.getClinicById(id)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ClinicResponseDTO> createClinic(@RequestBody ClinicRequestDTO request) {
        ClinicResponseDTO created = clinicService.createClinic(request);
        return ResponseEntity.ok(created);
    }

    @DeleteMapping("/id")
    public ResponseEntity<?> deleteClinic(@RequestParam(required = true) Long id) {
        return clinicRepository.findById(id)
                .map(clinic -> {
                    clinicRepository.deleteById(id);
                    return ResponseEntity.ok("Clinic deleted successfully");
                })
                .orElse(ResponseEntity.notFound().build());
    }

}

