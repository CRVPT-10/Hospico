package com.hospitalfinder.backend.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import com.hospitalfinder.backend.dto.ReviewRatingsDTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class Review {

    @JsonProperty("id")
    @JsonAlias("ROWID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    private Double rating;

    private String comment;

    private LocalDateTime createdAt;

    // Relations stored as IDs to keep it lightweight and flexible
    @JsonSerialize(using = ToStringSerializer.class)
    private Long userId;

    @JsonProperty("clinic_id")
    @JsonAlias("hospital_id")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long hospitalId;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long doctorId;

    private ReviewRatingsDTO ratings;

    private Boolean phoneVerified;

    private Boolean proofUploaded;

    private String proofStatus;

    private String badgeType;

    private String proofUrl;

    private String proofType;

    private String reviewerIp;

    private String reviewerPhone;

    private String reviewerEmail;
}
