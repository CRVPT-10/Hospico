package com.hospitalfinder.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ReviewRatingsDTO {
    private Integer explanationClarity;
    private Integer timeSpent;
    private Integer diagnosisConfidence;
    private Integer waitingTime;
    private Integer staffBehavior;
    private Integer cleanliness;
    private Integer overallExperience;

    public double calculateAverage() {
        int sum = 0;
        int count = 0;
        Integer[] values = {
                explanationClarity,
                timeSpent,
                diagnosisConfidence,
                waitingTime,
                staffBehavior,
                cleanliness,
                overallExperience
        };
        for (Integer value : values) {
            if (value != null) {
                sum += value;
                count++;
            }
        }
        return count == 0 ? 0.0 : ((double) sum / count);
    }
}
