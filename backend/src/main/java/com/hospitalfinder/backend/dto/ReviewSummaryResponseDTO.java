package com.hospitalfinder.backend.dto;

import java.util.List;
import java.util.Map;

import com.hospitalfinder.backend.entity.Review;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ReviewSummaryResponseDTO {
    private long totalReviews;
    private double overallRating;
    private Map<String, Long> starDistribution;
    private Map<String, Integer> starPercentages;
    private Map<String, Double> subRatingAverages;
    private String customersSay;
    private Map<String, Long> badgeCounts;
    private List<Review> reviews;
}
