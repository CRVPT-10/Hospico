package com.hospitalfinder.backend.controller;

import java.util.List;
import java.util.stream.Collectors;

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
import com.hospitalfinder.backend.entity.Clinic;
import com.hospitalfinder.backend.repository.ClinicRepository;
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
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) String search
    ) {
        return clinicService.getFilteredClinics(city, specialization, search);
    }

    @GetMapping("/nearby")
    public ResponseEntity<?> getNearbyClinics(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String specialization
    ) {
        List<Clinic> clinics;
        
        // Get clinics within 5km (nearby clinics)
        clinics = clinicRepository.findNearestClinics(lat, lng);
        
        // Apply city filter if specified
        if (city != null && !city.isEmpty()) {
            clinics = clinics.stream()
                .filter(clinic -> clinic.getCity() != null && 
                       clinic.getCity().toLowerCase().contains(city.toLowerCase()))
                .collect(Collectors.toList());
        }
        
        // Apply specialization filter if specified
        if (specialization != null && !specialization.isEmpty()) {
            clinics = clinics.stream()
                .filter(clinic -> clinic.getSpecializations().stream()
                       .anyMatch(spec -> spec.getSpecialization().toLowerCase()
                             .contains(specialization.toLowerCase())))
                .collect(Collectors.toList());
        }
        
        List<NearbyClinicDTO> nearbyClinics = clinics.stream()
            .map(clinic -> {
                double distance = calculateDistance(lat, lng, clinic.getLatitude(), clinic.getLongitude());
                // Estimate time with variable speed based on distance:
                // - Short distances (< 5km): 20 km/h average (more stops, slower roads)
                // - Medium distances (5-20km): 30 km/h average
                // - Longer distances (> 20km): 40 km/h average (highways, fewer stops)
                double speed;
                if (distance < 5) {
                    speed = 20.0;
                } else if (distance < 20) {
                    speed = 30.0;
                } else {
                    speed = 40.0;
                }
                int estimatedTime = (int) Math.round(distance / speed * 60);
                return new NearbyClinicDTO(clinic, distance, estimatedTime);
            })
            .collect(Collectors.toList());

        return ResponseEntity.ok(nearbyClinics);
    }

    @GetMapping("/sorted-by-distance")
    public ResponseEntity<?> getAllClinicsSortedByDistance(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) String search
    ) {
        List<Clinic> clinics;
        
        // Get all clinics ordered by distance
        clinics = clinicRepository.findAllClinicsOrderedByDistance(lat, lng);
        
        // Apply city filter if specified
        if (city != null && !city.isEmpty()) {
            clinics = clinics.stream()
                .filter(clinic -> clinic.getCity() != null && 
                       clinic.getCity().equalsIgnoreCase(city))
                .collect(Collectors.toList());
        }
        
        // Apply specialization filter if specified
        if (specialization != null && !specialization.isEmpty()) {
            clinics = clinics.stream()
                .filter(clinic -> clinic.getSpecializations().stream()
                       .anyMatch(spec -> spec.getSpecialization().equalsIgnoreCase(specialization)))
                .collect(Collectors.toList());
        }
        
        // Apply search filter if specified
        if (search != null && !search.isEmpty()) {
            String searchLower = search.toLowerCase();
            clinics = clinics.stream()
                .filter(clinic -> clinic.getName().toLowerCase().contains(searchLower) ||
                                  (clinic.getAddress() != null && clinic.getAddress().toLowerCase().contains(searchLower)))
                .collect(Collectors.toList());
        }
        
        List<NearbyClinicDTO> sortedClinics = clinics.stream()
            .map(clinic -> {
                double distance = calculateDistance(lat, lng, clinic.getLatitude(), clinic.getLongitude());
                // Estimate time with variable speed based on distance:
                // - Short distances (< 5km): 20 km/h average (more stops, slower roads)
                // - Medium distances (5-20km): 30 km/h average
                // - Longer distances (> 20km): 40 km/h average (highways, fewer stops)
                double speed;
                if (distance < 5) {
                    speed = 20.0;
                } else if (distance < 20) {
                    speed = 30.0;
                } else {
                    speed = 40.0;
                }
                int estimatedTime = (int) Math.round(distance / speed * 60);
                return new NearbyClinicDTO(clinic, distance, estimatedTime);
            })
            .collect(Collectors.toList());

        return ResponseEntity.ok(sortedClinics);
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

    /**
     * Calculate distance between two points using Haversine formula
     * @param lat1 Latitude of point 1
     * @param lon1 Longitude of point 1
     * @param lat2 Latitude of point 2
     * @param lon2 Longitude of point 2
     * @return Distance in kilometers
     */
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int EARTH_RADIUS = 6371; // Earth radius in kilometers
        
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return EARTH_RADIUS * c;
    }
}