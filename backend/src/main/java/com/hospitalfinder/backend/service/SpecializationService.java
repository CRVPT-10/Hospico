package com.hospitalfinder.backend.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospitalfinder.backend.entity.Specialization;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class SpecializationService {

    private final DataStoreService dataStoreService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<Specialization> getAllSpecializations() {
        try {
            JsonNode result = dataStoreService.executeQuery("SELECT * FROM specializations");
            Map<String, Specialization> dedupedByCanonical = new LinkedHashMap<>();
            Map<Long, String> specializationIdToCanonical = new HashMap<>();
            if (result != null && result.isArray()) {
                for (JsonNode node : result) {
                    JsonNode data = node.has("specializations") ? node.get("specializations") : node;
                    Specialization specialization = objectMapper.convertValue(data, Specialization.class);
                    if (specialization == null || specialization.getName() == null || specialization.getName().isBlank()) {
                        continue;
                    }

                    String canonical = SpecializationNameNormalizer.toCanonicalKey(specialization.getName());
                    if (canonical.isBlank()) {
                        continue;
                    }

                    specialization.setName(SpecializationNameNormalizer.toDisplayName(specialization.getName()));
                    dedupedByCanonical.putIfAbsent(canonical, specialization);
                    if (specialization.getId() != null) {
                        specializationIdToCanonical.putIfAbsent(specialization.getId(), canonical);
                    }
                }
            }

            Map<String, Integer> usageByCanonical = loadCanonicalUsageCounts(specializationIdToCanonical);
            List<Specialization> sorted = new ArrayList<>(dedupedByCanonical.values());
            sorted.sort(Comparator
                    .comparingInt((Specialization s) -> SpecializationNameNormalizer.getPriorityRank(s.getName()))
                    .thenComparing(Comparator.comparingInt((Specialization s) -> usageByCanonical
                            .getOrDefault(SpecializationNameNormalizer.toCanonicalKey(s.getName()), 0)).reversed())
                    .thenComparing(s -> s.getName() == null ? "" : s.getName(), String.CASE_INSENSITIVE_ORDER));

            return sorted;
        } catch (RuntimeException e) {
            log.error("Error fetching specializations", e);
            return new ArrayList<>();
        }
    }

    private Map<String, Integer> loadCanonicalUsageCounts(Map<Long, String> specializationIdToCanonical) {
        Map<String, Integer> counts = new HashMap<>();
        if (specializationIdToCanonical == null || specializationIdToCanonical.isEmpty()) {
            return counts;
        }

        JsonNode mappings = dataStoreService.executeQuery("SELECT * FROM clinic_specializations");
        if (mappings == null || !mappings.isArray()) {
            return counts;
        }

        for (JsonNode node : mappings) {
            JsonNode data = node.has("clinic_specializations") ? node.get("clinic_specializations") : node;
            if (data == null || data.isNull() || !data.has("specialization_id") || data.get("specialization_id").isNull()) {
                continue;
            }

            Long specializationId = data.get("specialization_id").asLong();
            String canonical = specializationIdToCanonical.get(specializationId);
            if (canonical == null || canonical.isBlank()) {
                continue;
            }
            counts.merge(canonical, 1, Integer::sum);
        }

        return counts;
    }

    public Specialization getSpecializationByName(String name) {
        if (name == null || name.isEmpty())
            return null;
        String targetCanonical = SpecializationNameNormalizer.toCanonicalKey(name);
        return getAllSpecializations().stream()
                .filter(s -> SpecializationNameNormalizer.toCanonicalKey(s.getName()).equals(targetCanonical))
                .findFirst()
                .orElse(null);
    }

    public Specialization updateSpecialization(Long id, java.util.Map<String, Object> data) {
        try {
            JsonNode result = dataStoreService.updateRecord("specializations", id, data);
            JsonNode rowData = result.has("specializations") ? result.get("specializations") : result;
            return objectMapper.convertValue(rowData, Specialization.class);
        } catch (RuntimeException e) {
            log.error("Failed to update specialization {}", id, e);
            throw new RuntimeException("Failed to update specialization", e);
        }
    }
}
