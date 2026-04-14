package com.hospitalfinder.backend.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.hospitalfinder.backend.dto.ClinicRequestDTO;
import com.hospitalfinder.backend.dto.ClinicResponseDTO;
import com.hospitalfinder.backend.dto.HospitalRequestCreateDTO;
import com.hospitalfinder.backend.dto.HospitalRequestDTO;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class HospitalRequestService {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final ClinicService clinicService;
    private final AtomicLong idSequence = new AtomicLong(1);
    private final Map<Long, HospitalRequestRecord> requests = new ConcurrentHashMap<>();

    public HospitalRequestDTO submitRequest(HospitalRequestCreateDTO request, String authenticatedEmail) {
        validateRequest(request);

        long id = idSequence.getAndIncrement();
        HospitalRequestRecord record = new HospitalRequestRecord();
        record.id = id;
        record.hospitalName = request.getHospitalName().trim();
        record.address = request.getAddress().trim();
        record.city = request.getCity().trim();
        record.phone = request.getPhone() == null ? null : request.getPhone().trim();
        record.timings = request.getTimings() == null ? null : request.getTimings().trim();
        record.latitude = request.getLatitude();
        record.longitude = request.getLongitude();
        record.imageUrl = request.getImageUrl() == null ? null : request.getImageUrl().trim();
        record.specializations = request.getSpecializations() == null ? null : request.getSpecializations().trim();
        record.requesterEmail = resolveRequesterEmail(request.getRequesterEmail(), authenticatedEmail);
        record.status = "pending";
        record.createdAt = LocalDateTime.now();

        requests.put(id, record);
        return toDto(record);
    }

    public List<HospitalRequestDTO> getPendingRequests() {
        return requests.values().stream()
                .filter(record -> "pending".equals(record.status))
                .sorted(Comparator.comparing((HospitalRequestRecord r) -> r.createdAt).reversed())
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public HospitalRequestDTO decideRequest(Long id, String rawStatus) {
        HospitalRequestRecord record = requests.get(id);
        if (record == null) {
            throw new IllegalArgumentException("Hospital request not found");
        }

        if (!"pending".equals(record.status)) {
            throw new IllegalArgumentException("Hospital request already reviewed");
        }

        String status = normalizeStatus(rawStatus);
        record.status = status;
        record.reviewedAt = LocalDateTime.now();

        if ("approved".equals(status)) {
            ClinicRequestDTO clinicRequest = new ClinicRequestDTO();
            clinicRequest.setName(record.hospitalName);
            clinicRequest.setAddress(record.address);
            clinicRequest.setCity(record.city);
            clinicRequest.setPhone(record.phone);
            clinicRequest.setTimings(record.timings);
            clinicRequest.setLatitude(record.latitude);
            clinicRequest.setLongitude(record.longitude);
            clinicRequest.setImageUrl(record.imageUrl);
            clinicRequest.setSpecializations(parseSpecializations(record.specializations));

            ClinicResponseDTO createdClinic = clinicService.createClinic(clinicRequest);
            record.createdClinicId = createdClinic.getClinicId();
        }

        return toDto(record);
    }

    private String normalizeStatus(String rawStatus) {
        if (rawStatus == null || rawStatus.isBlank()) {
            throw new IllegalArgumentException("status is required (approved or disapproved)");
        }
        String normalized = rawStatus.trim().toLowerCase();
        if ("rejected".equals(normalized)) {
            normalized = "disapproved";
        }
        if (!"approved".equals(normalized) && !"disapproved".equals(normalized)) {
            throw new IllegalArgumentException("status must be approved or disapproved");
        }
        return normalized;
    }

    private List<String> parseSpecializations(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        String[] parts = value.split(",");
        List<String> results = new ArrayList<>();
        for (String part : parts) {
            String trimmed = part == null ? "" : part.trim();
            if (!trimmed.isEmpty()) {
                results.add(trimmed);
            }
        }
        return results;
    }

    private void validateRequest(HospitalRequestCreateDTO request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        if (request.getHospitalName() == null || request.getHospitalName().trim().isEmpty()) {
            throw new IllegalArgumentException("Hospital name is required");
        }
        if (request.getAddress() == null || request.getAddress().trim().isEmpty()) {
            throw new IllegalArgumentException("Address is required");
        }
        if (request.getCity() == null || request.getCity().trim().isEmpty()) {
            throw new IllegalArgumentException("City is required");
        }
    }

    private HospitalRequestDTO toDto(HospitalRequestRecord record) {
        return HospitalRequestDTO.builder()
                .id(record.id)
                .hospitalName(record.hospitalName)
                .address(record.address)
                .city(record.city)
                .phone(record.phone)
                .timings(record.timings)
                .latitude(record.latitude)
                .longitude(record.longitude)
                .imageUrl(record.imageUrl)
                .specializations(record.specializations)
                .status(record.status)
                .createdAt(record.createdAt == null ? null : record.createdAt.format(FORMATTER))
                .reviewedAt(record.reviewedAt == null ? null : record.reviewedAt.format(FORMATTER))
                .createdClinicId(record.createdClinicId)
                .requesterEmail(record.requesterEmail)
                .build();
    }

    private String resolveRequesterEmail(String fromRequest, String authenticatedEmail) {
        if (authenticatedEmail != null && !authenticatedEmail.isBlank()) {
            return authenticatedEmail.trim().toLowerCase();
        }
        if (fromRequest != null && !fromRequest.isBlank()) {
            return fromRequest.trim().toLowerCase();
        }
        return null;
    }

    private static class HospitalRequestRecord {
        private Long id;
        private String hospitalName;
        private String address;
        private String city;
        private String phone;
        private String timings;
        private Double latitude;
        private Double longitude;
        private String imageUrl;
        private String specializations;
        private String status;
        private LocalDateTime createdAt;
        private LocalDateTime reviewedAt;
        private String createdClinicId;
        private String requesterEmail;
    }
}
