package com.hospitalfinder.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hospitalfinder.backend.dto.ClinicRequestDTO;
import com.hospitalfinder.backend.dto.ClinicResponseDTO;
import com.hospitalfinder.backend.dto.NearbyClinicDTO;
import com.hospitalfinder.backend.repository.ClinicRepository;
import com.hospitalfinder.backend.repository.projection.ClinicDistanceProjection;
import com.hospitalfinder.backend.service.ClinicService;

import lombok.RequiredArgsConstructor;

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
        List<ClinicDistanceProjection> clinics = clinicRepository.findNearestClinics(lat, lng);

        List<NearbyClinicDTO> response = clinics.stream()
            .map(c -> new NearbyClinicDTO(
                c.getId(),
                c.getName(),
                c.getAddress(),
                c.getCity(),
                c.getLatitude(),
                c.getLongitude(),
                c.getDistance(),
                c.getPhone(),
                c.getTimings(),
                c.getRating(),
                c.getReviews(),
                c.getImageUrl()
            ))
            .toList();

        return ResponseEntity.ok(response);
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

