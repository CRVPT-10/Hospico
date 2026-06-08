package com.hospitalfinder.backend.service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.hospitalfinder.backend.dto.AdminStatisticsDTO;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminStatisticsService {

    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final DataStoreService dataStoreService;
    private final HospitalRequestService hospitalRequestService;
    private final HospitalMistakeReportService hospitalMistakeReportService;

    @Value("${zoho.users.table.id:users}")
    private String usersTable;

    public AdminStatisticsDTO getStatistics() {
        List<JsonNode> users = queryAll(usersTable);
        List<?> hospitalRequests = hospitalRequestService.getAllRequests();
        List<?> mistakeReports = hospitalMistakeReportService.getAllReports();

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        LocalDateTime dayAgo = now.minusDays(1);
        LocalDateTime weekAgo = now.minusDays(7);
        LocalDateTime monthAgo = now.minusDays(30);

        long activeUsers = users.stream()
                .map(node -> parseDate(getText(node, "last_active_at")))
                .filter(value -> value != null && !value.isBefore(monthAgo))
                .count();

        long dailyRequests = countRequestsSince(hospitalRequests, mistakeReports, dayAgo);
        long weeklyRequests = countRequestsSince(hospitalRequests, mistakeReports, weekAgo);
        long monthlyRequests = countRequestsSince(hospitalRequests, mistakeReports, monthAgo);

        return AdminStatisticsDTO.builder()
                .activeUsers(activeUsers)
                .totalUsers(users.size())
                .dailyRequests(dailyRequests)
                .weeklyRequests(weeklyRequests)
                .monthlyRequests(monthlyRequests)
                .hospitalRequests(hospitalRequests.size())
                .mistakeReports(mistakeReports.size())
                .build();
    }

    private long countRequestsSince(List<?> hospitalRequests, List<?> mistakeReports, LocalDateTime threshold) {
        long hospitalCount = hospitalRequests.stream()
                .map(request -> getCreatedAt(request))
                .filter(value -> value != null && !value.isBefore(threshold))
                .count();

        long mistakeCount = mistakeReports.stream()
                .map(request -> getCreatedAt(request))
                .filter(value -> value != null && !value.isBefore(threshold))
                .count();

        return hospitalCount + mistakeCount;
    }

    private LocalDateTime getCreatedAt(Object request) {
        if (request instanceof com.hospitalfinder.backend.dto.HospitalRequestDTO dto) {
            return parseDate(dto.getCreatedAt());
        }
        if (request instanceof com.hospitalfinder.backend.dto.HospitalMistakeReportDTO dto) {
            return parseDate(dto.getCreatedAt());
        }
        return null;
    }

    private List<JsonNode> queryAll(String tableName) {
        JsonNode result = dataStoreService.executeQuery("SELECT * FROM " + tableName);
        if (result == null) {
            return List.of();
        }
        JsonNode rows = result.has("data") ? result.get("data") : result;
        if (rows == null || !rows.isArray()) {
            return List.of();
        }

        return java.util.stream.StreamSupport.stream(rows.spliterator(), false)
                .map(JsonNode.class::cast)
                .toList();
    }

    private String getText(JsonNode node, String field) {
        return node != null && node.has(field) && !node.get(field).isNull() ? node.get(field).asText() : null;
    }

    private LocalDateTime parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return LocalDateTime.parse(value.trim(), DATETIME_FORMAT);
        } catch (Exception ignored) {
            try {
                return LocalDateTime.parse(value.trim());
            } catch (Exception ignoredAgain) {
                return null;
            }
        }
    }
}