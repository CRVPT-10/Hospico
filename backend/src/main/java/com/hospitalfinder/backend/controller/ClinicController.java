package com.hospitalfinder.backend.controller;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.hospitalfinder.backend.dto.ClinicRequestDTO;
import com.hospitalfinder.backend.dto.ClinicResponseDTO;
import com.hospitalfinder.backend.dto.ClinicSummaryDTO;
import com.hospitalfinder.backend.dto.NearbyClinicDTO;
import com.hospitalfinder.backend.service.ClinicService;
import com.hospitalfinder.backend.service.ZohoFileStorageService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/clinics")
@RequiredArgsConstructor
public class ClinicController {

    private final ClinicService clinicService;
    private final ZohoFileStorageService zohoFileStorageService;

    @GetMapping
    public List<ClinicSummaryDTO> getClinics(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) List<String> spec,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng) {
        return clinicService.getFilteredClinics(city, spec, search, lat, lng);
    }

    @GetMapping("/nearby")
    public ResponseEntity<List<NearbyClinicDTO>> getNearbyClinics(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String specialization) {
        return ResponseEntity.ok(clinicService.getNearbyClinics(lat, lng, city, specialization));
    }

    @GetMapping("/sorted-by-distance")
    public ResponseEntity<List<NearbyClinicDTO>> getAllClinicsSortedByDistance(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) List<String> spec,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(clinicService.getAllClinicsSortedByDistance(lat, lng, city, spec, search));
    }

    @GetMapping("/id")
    public ResponseEntity<ClinicResponseDTO> getClinicById(@RequestParam(required = true) Long id) {
        try {
            return ResponseEntity.ok(clinicService.getClinicById(id));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/public/{publicId}")
    public ResponseEntity<ClinicResponseDTO> getClinicByPublicId(@PathVariable String publicId) {
        try {
            return ResponseEntity.ok(clinicService.getClinicByPublicId(publicId));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<ClinicResponseDTO> createClinic(@RequestBody ClinicRequestDTO request) {
        ClinicResponseDTO created = clinicService.createClinic(request);
        return ResponseEntity.ok(created);
    }

    @PostMapping(value = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadClinicImage(@RequestParam("file") MultipartFile file) {
        try {
            // Use Zoho File Store (integrated with your Zoho account)
            ZohoFileStorageService.StoredClinicImage storedImage = zohoFileStorageService.storeImage(file);
            return ResponseEntity.ok(Map.of(
                    "imageUrl", storedImage.getImageUrl(),
                    "fileName", storedImage.getFileName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Failed to upload hospital image: " + e.getMessage());
        }
    }

    @GetMapping("/image/{fileName:.+}")
    public ResponseEntity<byte[]> getClinicImage(@PathVariable String fileName) {
        try {
            // Retrieve from Zoho File Store
            byte[] data = zohoFileStorageService.readImage(fileName);
            return ResponseEntity.ok()
                    .contentType(zohoFileStorageService.resolveImageMediaType(fileName))
                    .body(data);
        } catch (IOException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping
    public ResponseEntity<ClinicResponseDTO> updateClinic(@RequestParam Long id,
            @RequestBody ClinicRequestDTO request) {
        return ResponseEntity.ok(clinicService.updateClinic(id, request));
    }

    @DeleteMapping("/id")
    public ResponseEntity<?> deleteClinic(@RequestParam(required = true) Long id) {
        clinicService.deleteClinic(id);
        return ResponseEntity.ok("Clinic deleted successfully");
    }
}