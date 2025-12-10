package com.hospitalfinder.backend.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.hospitalfinder.backend.dto.ClinicRequestDTO;
import com.hospitalfinder.backend.dto.ClinicResponseDTO;
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


    public List<ClinicResponseDTO> getFilteredClinics(String city, String specialization, String search) {
        List<Clinic> clinics;

        if (city != null && specialization != null) {
            clinics = clinicRepository.findByCityAndSpecialization(city, specialization);
        } else if (city != null) {
            clinics = clinicRepository.findByCityIgnoreCase(city);
        } else if (specialization != null) {
            clinics = clinicRepository.findBySpecialization(specialization); // NEW case
        } else {
            clinics = clinicRepository.findAll();
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
                .map(ClinicResponseDTO::new)
                .collect(Collectors.toList());
    }

    public ClinicResponseDTO createClinic(ClinicRequestDTO request) {
        boolean alreadyExists = clinicRepository.existsByNameIgnoreCaseAndAddressIgnoreCaseAndCityIgnoreCase(request.getName(), request.getAddress(), request.getCity());

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
        clinic.setImageUrl(request.getImageUrl());

        // Fetch specializations by IDs
        List<Specialization> specializations = specializationRepository.findAllById(request.getSpecializationIds());
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
