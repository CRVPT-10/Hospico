package com.hospitalfinder.backend.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.hospitalfinder.backend.dto.HospitalMistakeReportCreateDTO;
import com.hospitalfinder.backend.dto.HospitalMistakeReportDTO;

@Service
public class HospitalMistakeReportService {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AtomicLong idSequence = new AtomicLong(1);
    private final Map<Long, HospitalMistakeReportRecord> reports = new ConcurrentHashMap<>();

    public HospitalMistakeReportDTO submitReport(HospitalMistakeReportCreateDTO request, String authenticatedEmail) {
        validateRequest(request);

        long id = idSequence.getAndIncrement();
        HospitalMistakeReportRecord record = new HospitalMistakeReportRecord();
        record.id = id;
        record.clinicId = request.getClinicId().trim();
        record.hospitalName = request.getHospitalName().trim();
        record.hospitalAddress = request.getHospitalAddress() == null ? null : request.getHospitalAddress().trim();
        record.comment = request.getComment().trim();
        record.requesterEmail = resolveRequesterEmail(request.getRequesterEmail(), authenticatedEmail);
        record.status = "pending";
        record.createdAt = LocalDateTime.now();

        reports.put(id, record);
        return toDto(record);
    }

    public List<HospitalMistakeReportDTO> getPendingReports() {
        return reports.values().stream()
                .filter(record -> "pending".equals(record.status))
                .sorted(Comparator.comparing((HospitalMistakeReportRecord r) -> r.createdAt).reversed())
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<HospitalMistakeReportDTO> getAllReports() {
        return reports.values().stream()
                .sorted(Comparator.comparing((HospitalMistakeReportRecord r) -> r.createdAt).reversed())
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public HospitalMistakeReportDTO decideReport(Long id, String rawStatus) {
        HospitalMistakeReportRecord record = reports.get(id);
        if (record == null) {
            throw new IllegalArgumentException("Mistake report not found");
        }

        if (!"pending".equals(record.status)) {
            throw new IllegalArgumentException("Mistake report already reviewed");
        }

        String status = normalizeStatus(rawStatus);
        record.status = status;
        record.reviewedAt = LocalDateTime.now();

        return toDto(record);
    }

    private void validateRequest(HospitalMistakeReportCreateDTO request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        if (request.getClinicId() == null || request.getClinicId().trim().isEmpty()) {
            throw new IllegalArgumentException("clinicId is required");
        }
        if (request.getHospitalName() == null || request.getHospitalName().trim().isEmpty()) {
            throw new IllegalArgumentException("Hospital name is required");
        }
        if (request.getComment() == null || request.getComment().trim().isEmpty()) {
            throw new IllegalArgumentException("Comment is required");
        }
    }

    private String normalizeStatus(String rawStatus) {
        if (rawStatus == null || rawStatus.isBlank()) {
            throw new IllegalArgumentException("status is required (resolved or dismissed)");
        }

        String normalized = rawStatus.trim().toLowerCase();
        if (!"resolved".equals(normalized) && !"dismissed".equals(normalized)) {
            throw new IllegalArgumentException("status must be resolved or dismissed");
        }
        return normalized;
    }

    private HospitalMistakeReportDTO toDto(HospitalMistakeReportRecord record) {
        return HospitalMistakeReportDTO.builder()
                .id(record.id)
                .clinicId(record.clinicId)
                .hospitalName(record.hospitalName)
                .hospitalAddress(record.hospitalAddress)
                .comment(record.comment)
                .status(record.status)
                .createdAt(record.createdAt == null ? null : record.createdAt.format(FORMATTER))
                .reviewedAt(record.reviewedAt == null ? null : record.reviewedAt.format(FORMATTER))
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

    private static class HospitalMistakeReportRecord {
        private Long id;
        private String clinicId;
        private String hospitalName;
        private String hospitalAddress;
        private String comment;
        private String status;
        private LocalDateTime createdAt;
        private LocalDateTime reviewedAt;
        private String requesterEmail;
    }
}