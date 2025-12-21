package com.hospitalfinder.backend.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.hospitalfinder.backend.dto.ClinicRequestDTO;
import com.hospitalfinder.backend.dto.ClinicResponseDTO;
import com.hospitalfinder.backend.dto.ClinicSummaryDTO;
import com.hospitalfinder.backend.entity.Clinic;
import com.hospitalfinder.backend.entity.Specialization;
import com.hospitalfinder.backend.repository.ClinicRepository;
import com.hospitalfinder.backend.repository.SpecializationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ClinicService {

    private final ClinicRepository clinicRepository;
    private final SpecializationRepository specializationRepository;

    public List<ClinicSummaryDTO> getFilteredClinics(String city, List<String> specializations, String search,
            Double lat, Double lng) {
        List<Clinic> clinics;

        // Start with city-filtered list if provided, otherwise all clinics
        if (city != null) {
            clinics = clinicRepository.findByCityIgnoreCase(city);
        } else {
            clinics = clinicRepository.findAll();
        }

        // Normalize specialization filters to lower-case for matching
        List<String> normalizedSpecs = specializations == null ? List.of()
                : specializations.stream()
                        .filter(spec -> spec != null && !spec.isBlank())
                        .map(spec -> spec.toLowerCase())
                        .collect(Collectors.toList());

        // Filter by specialization matches (multi-select). Keep only clinics with >=1
        // match when filters provided.
        if (!normalizedSpecs.isEmpty()) {
            clinics = clinics.stream()
                    .filter(clinic -> getMatchCount(clinic, normalizedSpecs) > 0)
                    .sorted((a, b) -> Integer.compare(
                            getMatchCount(b, normalizedSpecs),
                            getMatchCount(a, normalizedSpecs)))
                    .collect(Collectors.toList());
        }

        // Apply search filter if provided
        if (search != null && !search.isEmpty()) {
            String searchLower = search.toLowerCase();
            clinics = clinics.stream()
                    .filter(clinic -> clinic.getName().toLowerCase().contains(searchLower) ||
                            (clinic.getAddress() != null && clinic.getAddress().toLowerCase().contains(searchLower)) ||
                            (clinic.getCity() != null && clinic.getCity().toLowerCase().contains(searchLower)))
                    .collect(Collectors.toList());
        }

        return clinics.stream()
                .map(clinic -> {
                    Double distance = null;
                    Integer estimatedTime = null;
                    if (lat != null && lng != null && clinic.getLatitude() != null && clinic.getLongitude() != null) {
                        distance = calculateDistance(lat, lng, clinic.getLatitude(), clinic.getLongitude());

                        double speed;
                        if (distance < 5)
                            speed = 20.0;
                        else if (distance < 20)
                            speed = 30.0;
                        else
                            speed = 40.0;
                        estimatedTime = (int) Math.round(distance / speed * 60);
                    }
                    return new ClinicSummaryDTO(clinic, distance, estimatedTime);
                })
                .collect(Collectors.toList());
    }

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

    private int getMatchCount(Clinic clinic, List<String> normalizedSpecs) {
        if (normalizedSpecs == null || normalizedSpecs.isEmpty())
            return 0;

        return (int) clinic.getSpecializations().stream()
                .map(Specialization::getSpecialization)
                .filter(spec -> spec != null && !spec.isBlank())
                .map(String::toLowerCase)
                .filter(normalizedSpecs::contains)
                .count();
    }

    public ClinicResponseDTO createClinic(ClinicRequestDTO request) {
        boolean alreadyExists = clinicRepository.existsByNameIgnoreCaseAndAddressIgnoreCaseAndCityIgnoreCase(
                request.getName(), request.getAddress(), request.getCity());

        if (alreadyExists) {
            throw new RuntimeException("Clinic already exists at that location.");
        }

        Clinic clinic = new Clinic();
        clinic.setName(request.getName());
        clinic.setAddress(request.getAddress());
        clinic.setCity(request.getCity());
        clinic.setLatitude(request.getLatitude());
        clinic.setLongitude(request.getLongitude());
        clinic.setPhone(request.getPhone());
        clinic.setWebsite(request.getWebsite());
        clinic.setTimings(request.getTimings());
        clinic.setRating(request.getRating());
        clinic.setReviews(request.getReviews());
        clinic.setImageUrl(request.getImageUrl());

        // Fetch specializations by IDs or names
        List<Specialization> specializations;
        if (request.getSpecializationIds() != null && !request.getSpecializationIds().isEmpty()) {
            specializations = specializationRepository.findAllById(request.getSpecializationIds());
        } else if (request.getSpecializations() != null && !request.getSpecializations().isEmpty()) {
            specializations = request.getSpecializations().stream()
                    .map(name -> specializationRepository.findBySpecializationIgnoreCase(name)
                            .orElseGet(() -> {
                                Specialization newSpec = new Specialization();
                                newSpec.setSpecialization(name);
                                return specializationRepository.save(newSpec);
                            }))
                    .collect(java.util.stream.Collectors.toList());
        } else {
            specializations = java.util.Collections.emptyList();
        }
        clinic.setSpecializations(specializations);

        clinicRepository.save(clinic);
        return new ClinicResponseDTO(clinic);
    }

    public ClinicResponseDTO getClinicById(Long id) {
        Clinic clinic = clinicRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Clinic not found"));
        return new ClinicResponseDTO(clinic);
    }
}
