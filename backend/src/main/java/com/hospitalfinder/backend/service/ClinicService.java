package com.hospitalfinder.backend.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospitalfinder.backend.dto.ClinicRequestDTO;
import com.hospitalfinder.backend.dto.ClinicResponseDTO;
import com.hospitalfinder.backend.dto.ClinicSummaryDTO;
import com.hospitalfinder.backend.dto.NearbyClinicDTO;
import com.hospitalfinder.backend.entity.Clinic;
import com.hospitalfinder.backend.entity.Specialization;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClinicService {

    private final DataStoreService dataStoreService;
    private final DoctorService doctorService;
    private final ClinicPublicIdService clinicPublicIdService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final long SPECIALIZATIONS_CACHE_TTL_MS = 5 * 60 * 1000;
    private static final long CLINIC_MAPPING_CACHE_TTL_MS = 2 * 60 * 1000;
    private final Object specializationCacheLock = new Object();
    private final Object clinicMappingCacheLock = new Object();
    private volatile long specializationsCacheAt = 0L;
    private Map<Long, Specialization> specializationsByIdCache = new HashMap<>();
    private final Map<Long, CachedClinicSpecIds> clinicSpecIdsCache = new HashMap<>();

    private static class CachedClinicSpecIds {
        private final List<Long> specIds;
        private final long cachedAt;

        private CachedClinicSpecIds(List<Long> specIds, long cachedAt) {
            this.specIds = specIds;
            this.cachedAt = cachedAt;
        }
    }

    public List<ClinicSummaryDTO> getFilteredClinics(String city, List<String> specializations, String search,
            Double lat, Double lng) {

        List<Clinic> clinics = fetchClinics("SELECT * FROM clinics");
        populateSpecializations(clinics);

        if (city != null && !city.isBlank()) {
            clinics = clinics.stream()
                    .filter(c -> c.getCity() != null && c.getCity().equalsIgnoreCase(city))
                    .collect(Collectors.toList());
        }

        List<String> normalizedSpecs = specializations == null ? List.of()
                : specializations.stream()
                        .filter(spec -> spec != null && !spec.isBlank())
                .map(SpecializationNameNormalizer::toCanonicalKey)
                .filter(key -> !key.isBlank())
                .distinct()
                        .collect(Collectors.toList());

        if (!normalizedSpecs.isEmpty()) {
            clinics = clinics.stream()
                    .filter(clinic -> getMatchCount(clinic, normalizedSpecs) > 0)
                    .sorted((a, b) -> Integer.compare(
                            getMatchCount(b, normalizedSpecs),
                            getMatchCount(a, normalizedSpecs)))
                    .collect(Collectors.toList());
        }

        if (search != null && !search.isEmpty()) {
            String searchLower = search.toLowerCase();
            clinics = clinics.stream()
                    .filter(clinic -> clinic.getName().toLowerCase().contains(searchLower) ||
                            (clinic.getAddress() != null && clinic.getAddress().toLowerCase().contains(searchLower)) ||
                    (clinic.getCity() != null && clinic.getCity().toLowerCase().contains(searchLower)) ||
                    clinic.getSpecializations().stream()
                        .map(Specialization::getName)
                        .filter(name -> name != null && !name.isBlank())
                        .anyMatch(name -> specializationMatchesSearch(name, searchLower)))
                    .collect(Collectors.toList());
        }

        return clinics.stream()
                .map(clinic -> {
                    Double distance = null;
                    Integer estimatedTime = null;
                    if (lat != null && lng != null && clinic.getLatitude() != null && clinic.getLongitude() != null) {
                        distance = calculateDistance(lat, lng, clinic.getLatitude(), clinic.getLongitude());
                        double speed = (distance < 5) ? 20.0 : (distance < 20) ? 30.0 : 40.0;
                        estimatedTime = (int) Math.round(distance / speed * 60);
                    }
                    ClinicSummaryDTO dto = new ClinicSummaryDTO(clinic, distance, estimatedTime);
                    dto.setPublicId(clinicPublicIdService.encode(clinic.getId()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public List<NearbyClinicDTO> getNearbyClinics(double lat, double lng, String city, String specialization) {
        List<Clinic> clinics = fetchClinics("SELECT * FROM clinics");
        populateSpecializations(clinics);

        if (city != null && !city.isEmpty()) {
            clinics = clinics.stream()
                    .filter(c -> c.getCity() != null && c.getCity().toLowerCase().contains(city.toLowerCase()))
                    .collect(Collectors.toList());
        }

        if (specialization != null && !specialization.isEmpty()) {
            String requestedCanonical = SpecializationNameNormalizer.toCanonicalKey(specialization);
            clinics = clinics.stream()
                    .filter(c -> c.getSpecializations().stream()
                    .anyMatch(spec -> {
                    String canonical = SpecializationNameNormalizer.toCanonicalKey(spec.getName());
                    return !canonical.isBlank()
                        && (canonical.equals(requestedCanonical)
                            || canonical.contains(requestedCanonical));
                    }))
                    .collect(Collectors.toList());
        }

                clinics = clinics.stream()
                    .filter(c -> c.getLatitude() != null && c.getLongitude() != null)
                    .collect(Collectors.toList());

        return clinics.stream()
                .map(clinic -> {
                    Double distance = calculateDistance(lat, lng, clinic.getLatitude(), clinic.getLongitude());
                    if (distance > 5.0)
                        return null;

                    double speed = (distance < 5) ? 20.0 : (distance < 20) ? 30.0 : 40.0;
                    int estimatedTime = (int) Math.round(distance / speed * 60);

                    NearbyClinicDTO dto = new NearbyClinicDTO(clinic, distance, estimatedTime);
                    dto.setPublicId(clinicPublicIdService.encode(clinic.getId()));
                    return dto;
                })
                .filter(dto -> dto != null)
                .sorted(Comparator.comparingDouble(dto -> dto.getDistanceKm() != null ? dto.getDistanceKm() : Double.MAX_VALUE))
                .collect(Collectors.toList());
    }

    public List<NearbyClinicDTO> getAllClinicsSortedByDistance(double lat, double lng, String city, List<String> spec,
            String search) {
        List<Clinic> clinics = fetchClinics("SELECT * FROM clinics");
        populateSpecializations(clinics);

        if (city != null && !city.isEmpty()) {
            clinics = clinics.stream()
                    .filter(clinic -> clinic.getCity() != null &&
                            clinic.getCity().equalsIgnoreCase(city))
                    .collect(Collectors.toList());
        }

        List<String> normalizedSpecs = spec == null ? List.of()
            : spec.stream()
                .filter(s -> s != null && !s.isBlank())
                .map(SpecializationNameNormalizer::toCanonicalKey)
                .filter(key -> !key.isBlank())
                .distinct()
                .collect(Collectors.toList());

        if (search != null && !search.isEmpty()) {
            String searchLower = search.toLowerCase();
            clinics = clinics.stream()
                    .filter(clinic -> clinic.getName().toLowerCase().contains(searchLower) ||
                    (clinic.getAddress() != null && clinic.getAddress().toLowerCase().contains(searchLower)) ||
                    (clinic.getCity() != null && clinic.getCity().toLowerCase().contains(searchLower)) ||
                    clinic.getSpecializations().stream()
                        .map(Specialization::getName)
                        .filter(name -> name != null && !name.isBlank())
                        .anyMatch(name -> specializationMatchesSearch(name, searchLower)))
                    .collect(Collectors.toList());
        }

        class ClinicDist {
            Clinic c;
            Double d;
            Integer t;
            int m;
            boolean hasCoordinates;

            ClinicDist(Clinic c, Double d, Integer t, int m, boolean hasCoordinates) {
                this.c = c;
                this.d = d;
                this.t = t;
                this.m = m;
                this.hasCoordinates = hasCoordinates;
            }
        }

        return clinics.stream()
                .map(c -> {
                    boolean hasCoordinates = c.getLatitude() != null && c.getLongitude() != null;
                    Double dist = null;
                    Integer time = null;
                    if (hasCoordinates) {
                        dist = calculateDistance(lat, lng, c.getLatitude(), c.getLongitude());
                        double speed = (dist < 5) ? 20.0 : (dist < 20) ? 30.0 : 40.0;
                        time = (int) Math.round(dist / speed * 60);
                    }
                    int match = getMatchCount(c, normalizedSpecs);
                    return new ClinicDist(c, dist, time, match, hasCoordinates);
                })
                // Exclude only coordinate-based nearby hospitals (already shown in "Nearby" section).
                // Hospitals without coordinates should still appear in "Other Hospitals".
                .filter(cd -> (!cd.hasCoordinates || cd.d == null || cd.d > 5.0) && (normalizedSpecs.isEmpty() || cd.m > 0))
                .sorted((a, b) -> {
                    if (!normalizedSpecs.isEmpty()) {
                        int cmp = Integer.compare(b.m, a.m);
                        if (cmp != 0)
                            return cmp;
                    }
                    if (a.hasCoordinates != b.hasCoordinates) {
                        return a.hasCoordinates ? -1 : 1;
                    }
                    if (!a.hasCoordinates) {
                        return a.c.getName().compareToIgnoreCase(b.c.getName());
                    }
                    return Double.compare(a.d, b.d);
                })
                .map(cd -> {
                    NearbyClinicDTO dto = new NearbyClinicDTO(cd.c, cd.d, cd.t);
                    dto.setPublicId(clinicPublicIdService.encode(cd.c.getId()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public List<String> getAllCities() {
        return fetchClinics("SELECT distinct city FROM clinics").stream()
                .map(Clinic::getCity)
                .distinct()
                .filter(c -> c != null && !c.isBlank())
                .collect(Collectors.toList());
    }

    // Helper to fetch clinics
    private List<Clinic> fetchClinics(String query) {
        try {
            JsonNode result = dataStoreService.executeQuery(query);
            List<Clinic> clinics = new ArrayList<>();
            if (result != null && result.isArray()) {
                for (JsonNode node : result) {
                    JsonNode data = node.has("clinics") ? node.get("clinics") : node;
                    clinics.add(mapToClinic(data));
                }
            }
            return clinics;
        } catch (Exception e) {
            log.error("Error fetching clinics", e);
            return new ArrayList<>();
        }
    }

    private Clinic mapToClinic(JsonNode node) {
        Clinic clinic = objectMapper.convertValue(node, Clinic.class);

        // Ensure clinic ID is set: Jackson @JsonAlias may not always work
        if (clinic.getId() == null) {
            Long clinicId = extractId(node);
            if (clinicId != null) {
                clinic.setId(clinicId);
            }
        }

        // Fallback for deployments storing specializations as text on clinic rows.
        if ((clinic.getSpecializations() == null || clinic.getSpecializations().isEmpty()) && node != null) {
            String raw = null;
            if (node.has("specializations") && !node.get("specializations").isNull()) {
                raw = node.get("specializations").asText();
            } else if (node.has("specialization") && !node.get("specialization").isNull()) {
                raw = node.get("specialization").asText();
            }

            if (raw != null && !raw.isBlank()) {
                clinic.setSpecializations(Arrays.stream(raw.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .map(name -> {
                            Specialization sp = new Specialization();
                            sp.setName(SpecializationNameNormalizer.toDisplayName(name));
                            return sp;
                        })
                        .collect(Collectors.toList()));
            }
        }

        return clinic;
    }

    private void populateSpecializations(List<Clinic> clinics) {
        if (clinics.isEmpty())
            return;

        try {
            Map<Long, Clinic> clinicsById = clinics.stream()
                    .filter(c -> c.getId() != null)
                    .collect(Collectors.toMap(Clinic::getId, c -> c, (a, b) -> a));
            if (clinicsById.isEmpty()) {
                return;
            }

            Map<Long, Specialization> specMap = getSpecializationsByIdCached();
            for (Map.Entry<Long, Clinic> entry : clinicsById.entrySet()) {
                Long clinicId = entry.getKey();
                Clinic clinic = entry.getValue();
                List<Long> specIds = getClinicSpecializationIdsCached(clinicId);
                if (specIds.isEmpty()) {
                    continue;
                }
                Set<String> existingCanonical = clinic.getSpecializations().stream()
                        .map(Specialization::getName)
                        .map(SpecializationNameNormalizer::toCanonicalKey)
                        .filter(key -> !key.isBlank())
                        .collect(Collectors.toSet());
                for (Long specId : specIds) {
                    Specialization specialization = specMap.get(specId);
                    if (specialization != null) {
                        String canonical = SpecializationNameNormalizer.toCanonicalKey(specialization.getName());
                        if (canonical.isBlank() || existingCanonical.contains(canonical)) {
                            continue;
                        }

                        Specialization normalized = new Specialization();
                        normalized.setId(specialization.getId());
                        normalized.setName(SpecializationNameNormalizer.toDisplayName(specialization.getName()));
                        clinic.getSpecializations().add(normalized);
                        existingCanonical.add(canonical);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error populating specializations", e);
        }
    }

    private Map<Long, Specialization> getSpecializationsByIdCached() {
        long now = System.currentTimeMillis();
        synchronized (specializationCacheLock) {
            if (now - specializationsCacheAt < SPECIALIZATIONS_CACHE_TTL_MS && !specializationsByIdCache.isEmpty()) {
                return new HashMap<>(specializationsByIdCache);
            }

            JsonNode specsResult = dataStoreService.executeQuery("SELECT * FROM specializations");
            Map<Long, Specialization> specMap = new HashMap<>();
            if (specsResult != null && specsResult.isArray()) {
                for (JsonNode node : specsResult) {
                    JsonNode data = node.has("specializations") ? node.get("specializations") : node;
                    Specialization specialization = objectMapper.convertValue(data, Specialization.class);
                    if (specialization != null && specialization.getName() != null) {
                        specialization.setName(SpecializationNameNormalizer.toDisplayName(specialization.getName()));
                    }
                    if (specialization != null && specialization.getId() != null) {
                        specMap.putIfAbsent(specialization.getId(), specialization);
                    }
                }
            }

            specializationsByIdCache = specMap;
            specializationsCacheAt = now;
            return new HashMap<>(specializationsByIdCache);
        }
    }

    private List<Long> getClinicSpecializationIdsCached(Long clinicId) {
        long now = System.currentTimeMillis();
        synchronized (clinicMappingCacheLock) {
            CachedClinicSpecIds cached = clinicSpecIdsCache.get(clinicId);
            if (cached != null && now - cached.cachedAt < CLINIC_MAPPING_CACHE_TTL_MS) {
                return cached.specIds;
            }
        }

        List<Long> specIds = fetchClinicSpecializationIds(clinicId);
        synchronized (clinicMappingCacheLock) {
            clinicSpecIdsCache.put(clinicId, new CachedClinicSpecIds(specIds, now));
        }
        return specIds;
    }

    private List<Long> fetchClinicSpecializationIds(Long clinicId) {
        JsonNode mappingResult = dataStoreService.executeQuery(
                "SELECT * FROM clinic_specializations WHERE clinic_id = " + clinicId);
        if (mappingResult == null || !mappingResult.isArray() || mappingResult.isEmpty()) {
            mappingResult = dataStoreService.executeQuery(
                    "SELECT * FROM clinic_specializations WHERE clinic_id = '" + clinicId + "'");
        }

        if (mappingResult == null || !mappingResult.isArray()) {
            return List.of();
        }

        LinkedHashSet<Long> specIds = new LinkedHashSet<>();
        for (JsonNode node : mappingResult) {
            JsonNode data = node.has("clinic_specializations") ? node.get("clinic_specializations") : node;
            if (data == null || data.isNull() ||
                    !data.has("specialization_id") || data.get("specialization_id").isNull()) {
                continue;
            }
            specIds.add(data.get("specialization_id").asLong());
        }
        return new ArrayList<>(specIds);
    }

    private void invalidateClinicSpecializationCache(Long clinicId) {
        synchronized (clinicMappingCacheLock) {
            clinicSpecIdsCache.remove(clinicId);
        }
    }

    private void invalidateSpecializationsCache() {
        synchronized (specializationCacheLock) {
            specializationsByIdCache = new HashMap<>();
            specializationsCacheAt = 0L;
        }
    }

    public ClinicResponseDTO createClinic(ClinicRequestDTO request) {
        Map<String, Object> values = new HashMap<>();
        if (request.getName() != null) {
            values.put("name", request.getName());
        }
        if (request.getAddress() != null) {
            values.put("address", request.getAddress());
        }
        if (request.getCity() != null) {
            values.put("city", request.getCity());
        }
        if (request.getLatitude() != null) {
            values.put("latitude", request.getLatitude());
        }
        if (request.getLongitude() != null) {
            values.put("longitude", request.getLongitude());
        }
        if (request.getPhone() != null) {
            values.put("phone", request.getPhone());
        }
        if (request.getTimings() != null) {
            values.put("timings", request.getTimings());
        }
        if (request.getRating() != null) {
            values.put("rating", request.getRating());
        }
        if (request.getImageUrl() != null) {
            values.put("imageUrl", request.getImageUrl());
        }

        JsonNode createdNode = dataStoreService.insertRecord("clinics", values);
        Clinic clinic = mapToClinic(createdNode);
        Long clinicId = clinic.getId();
        if (clinicId == null) {
            clinicId = extractId(createdNode);
            clinic.setId(clinicId);
        }

        List<Long> specIds = request.getSpecializationIds();
        List<String> specNames = request.getSpecializations();

        if ((specIds == null || specIds.isEmpty()) && specNames != null && !specNames.isEmpty()) {
            Set<Long> uniqueSpecIds = new LinkedHashSet<>();
            Map<String, Long> nameToId = loadSpecializationNameMap();
            for (String name : specNames) {
                if (name == null || name.isBlank()) {
                    continue;
                }
                String canonical = SpecializationNameNormalizer.toCanonicalKey(name);
                if (canonical.isBlank()) {
                    continue;
                }
                Long id = nameToId.get(canonical);
                if (id == null) {
                    id = createSpecialization(name);
                    if (id != null) {
                        nameToId.put(canonical, id);
                    }
                }
                if (id != null) {
                    uniqueSpecIds.add(id);
                }
            }
            specIds = new ArrayList<>(uniqueSpecIds);
        }

        if (clinicId != null && specIds != null && !specIds.isEmpty()) {
            for (Long specId : specIds) {
                if (specId == null) {
                    continue;
                }
                Map<String, Object> mapping = new HashMap<>();
                mapping.put("clinic_id", clinicId);
                mapping.put("specialization_id", specId);
                dataStoreService.insertRecord("clinic_specializations", mapping);
            }
        }

        invalidateClinicSpecializationCache(clinicId);

        populateSpecializations(Collections.singletonList(clinic));
        ClinicResponseDTO dto = new ClinicResponseDTO(clinic);
        dto.setPublicId(clinicPublicIdService.encode(clinic.getId()));
        return dto;
    }

    public ClinicResponseDTO updateClinic(Long id, ClinicRequestDTO request) {
        Map<String, Object> values = new HashMap<>();
        if (request.getName() != null)
            values.put("name", request.getName());
        if (request.getAddress() != null)
            values.put("address", request.getAddress());
        if (request.getCity() != null)
            values.put("city", request.getCity());
        if (request.getLatitude() != null)
            values.put("latitude", request.getLatitude());
        if (request.getLongitude() != null)
            values.put("longitude", request.getLongitude());
        if (request.getPhone() != null)
            values.put("phone", request.getPhone());
        if (request.getTimings() != null)
            values.put("timings", request.getTimings());
        if (request.getRating() != null)
            values.put("rating", request.getRating());
        if (request.getImageUrl() != null)
            values.put("imageUrl", request.getImageUrl());

        if (!values.isEmpty()) {
            dataStoreService.updateRecord("clinics", id, values);
        }

        // Handle specializations update if provided
        List<Long> specIds = request.getSpecializationIds();
        List<String> specNames = request.getSpecializations();

        if ((specIds == null || specIds.isEmpty()) && specNames != null && !specNames.isEmpty()) {
            Set<Long> uniqueSpecIds = new LinkedHashSet<>();
            Map<String, Long> nameToId = loadSpecializationNameMap();
            for (String name : specNames) {
                if (name == null || name.isBlank())
                    continue;
                String canonical = SpecializationNameNormalizer.toCanonicalKey(name);
                if (canonical.isBlank()) {
                    continue;
                }
                Long specId = nameToId.get(canonical);
                if (specId == null) {
                    specId = createSpecialization(name);
                    if (specId != null)
                        nameToId.put(canonical, specId);
                }
                if (specId != null)
                    uniqueSpecIds.add(specId);
            }
            specIds = new ArrayList<>(uniqueSpecIds);
        }

        if (specIds != null && !specIds.isEmpty()) {
            // Delete existing mappings
            dataStoreService.executeQuery("DELETE FROM clinic_specializations WHERE clinic_id = '" + id + "'");
            // Insert new mappings
            for (Long specId : specIds) {
                Map<String, Object> mapping = new HashMap<>();
                mapping.put("clinic_id", id);
                mapping.put("specialization_id", specId);
                dataStoreService.insertRecord("clinic_specializations", mapping);
            }

            invalidateClinicSpecializationCache(id);
        }

        return getClinicById(id);
    }

    private Map<String, Long> loadSpecializationNameMap() {
        Map<String, Long> map = new HashMap<>();
        JsonNode specsResult = dataStoreService.executeQuery("SELECT * FROM specializations");
        if (specsResult != null && specsResult.isArray()) {
            for (JsonNode node : specsResult) {
                JsonNode data = node.has("specializations") ? node.get("specializations") : node;
                Specialization spec = objectMapper.convertValue(data, Specialization.class);
                if (spec.getName() != null && spec.getId() != null) {
                    String canonical = SpecializationNameNormalizer.toCanonicalKey(spec.getName());
                    if (!canonical.isBlank()) {
                        map.putIfAbsent(canonical, spec.getId());
                    }
                } else if (spec.getName() != null) {
                    Long id = extractId(data);
                    if (id != null) {
                        String canonical = SpecializationNameNormalizer.toCanonicalKey(spec.getName());
                        if (!canonical.isBlank()) {
                            map.putIfAbsent(canonical, id);
                        }
                    }
                }
            }
        }
        return map;
    }

    private Long createSpecialization(String name) {
        String displayName = SpecializationNameNormalizer.toDisplayName(name);
        if (displayName.isBlank()) {
            displayName = name;
        }

        Map<String, Object> values = new HashMap<>();
        values.put("name", displayName);
        JsonNode created = dataStoreService.insertRecord("specializations", values);
        Long createdId = extractId(created);
        if (createdId != null) {
            invalidateSpecializationsCache();
            return createdId;
        }

        // Some deployments expose column as "specialization" instead of "name".
        Map<String, Object> fallbackValues = new HashMap<>();
        fallbackValues.put("specialization", displayName);
        JsonNode fallbackCreated = dataStoreService.insertRecord("specializations", fallbackValues);
        invalidateSpecializationsCache();
        return extractId(fallbackCreated);
    }

    private Long extractId(JsonNode node) {
        if (node == null) {
            return null;
        }
        if (node.has("id")) {
            return node.get("id").asLong();
        }
        if (node.has("ROWID")) {
            return node.get("ROWID").asLong();
        }

        // Handle wrapped payloads, e.g. {"specializations": {"ROWID": ...}}
        if (node.isObject()) {
            java.util.Iterator<JsonNode> fields = node.elements();
            while (fields.hasNext()) {
                Long nested = extractId(fields.next());
                if (nested != null) {
                    return nested;
                }
            }
        }

        if (node.isArray()) {
            for (JsonNode child : node) {
                Long nested = extractId(child);
                if (nested != null) {
                    return nested;
                }
            }
        }

        return null;
    }

    public ClinicResponseDTO getClinicById(Long id) {
        Clinic clinic = fetchClinics("SELECT * FROM clinics WHERE ROWID = '" + id + "'").stream().findFirst()
                .orElseThrow(() -> new RuntimeException("Clinic not found"));
        populateSpecializations(Collections.singletonList(clinic));
        clinic.setDoctors(doctorService.findByClinicId(id));
        ClinicResponseDTO dto = new ClinicResponseDTO(clinic);
        dto.setPublicId(clinicPublicIdService.encode(clinic.getId()));
        return dto;
    }

    public ClinicResponseDTO getClinicByPublicId(String publicId) {
        Long clinicId = clinicPublicIdService.decode(publicId);
        return getClinicById(clinicId);
    }

    public void deleteClinic(Long id) {
        try {
            dataStoreService.executeQuery("DELETE FROM clinics WHERE ROWID = '" + id + "'");
            invalidateClinicSpecializationCache(id);
        } catch (Exception e) {
            log.error("Failed to delete clinic", e);
            throw new RuntimeException("Failed to delete clinic", e);
        }
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int EARTH_RADIUS = 6371;
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
                .map(Specialization::getName)
                .filter(spec -> spec != null && !spec.isBlank())
                .map(SpecializationNameNormalizer::toCanonicalKey)
                .filter(key -> !key.isBlank())
                .distinct()
                .filter(normalizedSpecs::contains)
                .count();
    }

    private boolean specializationMatchesSearch(String specializationName, String searchLower) {
        if (specializationName == null || specializationName.isBlank()) {
            return false;
        }
        String canonicalSpec = SpecializationNameNormalizer.toCanonicalKey(specializationName);
        String canonicalSearch = SpecializationNameNormalizer.toCanonicalKey(searchLower);
        return specializationName.toLowerCase().contains(searchLower)
                || (!canonicalSpec.isBlank()
                        && (!canonicalSearch.isBlank()
                                ? canonicalSpec.contains(canonicalSearch)
                                : canonicalSpec.contains(searchLower)));
    }
}
