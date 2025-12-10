package com.hospitalfinder.backend.dto;

public record NearbyClinicDTO(
        Long id,
        String name,
        String address,
        String city,
        Double latitude,
        Double longitude,
        Double distanceKm,
        String phone,
        String timings,
        Double rating,
        Integer reviews,
        String imageUrl
) {}
