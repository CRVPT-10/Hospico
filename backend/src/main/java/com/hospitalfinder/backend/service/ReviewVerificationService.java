package com.hospitalfinder.backend.service;

import org.springframework.stereotype.Service;

import com.hospitalfinder.backend.entity.Review;

@Service
public class ReviewVerificationService {

    public void applyBadgeHierarchy(Review review) {
        if ("hospital_verified".equalsIgnoreCase(review.getBadgeType())) {
            review.setBadgeType("hospital_verified");
            return;
        }

        if ("approved".equalsIgnoreCase(review.getProofStatus())) {
            review.setBadgeType("verified_patient");
            return;
        }

        if (Boolean.TRUE.equals(review.getPhoneVerified())) {
            review.setBadgeType("verified_phone");
            return;
        }

        review.setBadgeType(null);
    }
}
