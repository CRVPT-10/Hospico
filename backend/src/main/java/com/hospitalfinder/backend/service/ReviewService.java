package com.hospitalfinder.backend.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospitalfinder.backend.dto.ReviewCreateRequestDTO;
import com.hospitalfinder.backend.dto.ReviewRatingsDTO;
import com.hospitalfinder.backend.dto.ReviewSummaryResponseDTO;
import com.hospitalfinder.backend.dto.UserData;
import com.hospitalfinder.backend.entity.Review;
import com.hospitalfinder.backend.entity.Role;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReviewService {

    private static final DateTimeFormatter DATASTORE_DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final DataStoreService dataStoreService;
    private final UserStoreService userStoreService;
    private final OtpVerificationService otpVerificationService;
    private final ReviewProofStorageService reviewProofStorageService;
    private final ReviewVerificationService reviewVerificationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Review createReview(ReviewCreateRequestDTO request, MultipartFile proofFile, HttpServletRequest httpRequest) {
        validateReviewRequest(request);
        String reviewerIp = extractClientIp(httpRequest);

        UserData authUser = resolveAuthenticatedUser();
        boolean loggedIn = authUser != null && authUser.getId() != null;

        boolean phoneVerified = false;
        String reviewerPhone = null;
        Long userId = null;

        if (authUser != null && authUser.getId() != null) {
            userId = authUser.getId();
            reviewerPhone = authUser.getPhone();
            phoneVerified = Boolean.TRUE.equals(authUser.getPhoneVerified()) ||
                (reviewerPhone != null && !reviewerPhone.isBlank());
        } else {
            if (request.getPhone() == null || request.getPhone().isBlank()) {
                throw new IllegalArgumentException("Phone number is required for guest reviews");
            }
            if (request.getOtpSessionId() == null || request.getOtpCode() == null) {
                throw new IllegalArgumentException("OTP session and OTP code are required for guest reviews");
            }
            boolean verified = otpVerificationService.verifyOtp(request.getOtpSessionId(), request.getOtpCode());
            if (!verified) {
                throw new IllegalArgumentException("Invalid or expired OTP");
            }
            OtpVerificationService.OtpSession session = otpVerificationService.getVerifiedSession(request.getOtpSessionId());
            if (session == null) {
                throw new IllegalArgumentException("OTP verification session expired");
            }
            reviewerPhone = session.getPhone();
            phoneVerified = true;
        }

        enforceReviewThrottle(userId, reviewerPhone, reviewerIp, request.getDoctorId(), request.getHospitalId());

        Review review = new Review();
        review.setHospitalId(request.getHospitalId());
        review.setDoctorId(request.getDoctorId());
        review.setUserId(userId);
        review.setComment(request.getComment());
        review.setRatings(request.getRatings());
        review.setRating(request.getRatings().calculateAverage());
        review.setPhoneVerified(phoneVerified);
        review.setProofUploaded(false);
        review.setProofStatus(null);
        review.setBadgeType(phoneVerified ? "verified_phone" : null);
        review.setCreatedAt(LocalDateTime.now());
        review.setReviewerIp(reviewerIp);
        review.setReviewerPhone(reviewerPhone);

        Review saved = saveReviewRecord(review);

        if (loggedIn && phoneVerified && authUser != null) {
            userStoreService.markPhoneVerified(authUser.getEmail(), reviewerPhone);
        }

        if (proofFile != null && !proofFile.isEmpty()) {
            String proofType = request.getProofType();
            ReviewProofStorageService.ProofUploadResult uploadResult;
            try {
                uploadResult = reviewProofStorageService.uploadProof(
                        proofFile,
                        proofType,
                        saved.getId(),
                        saved.getUserId());
            } catch (java.io.IOException ioException) {
                throw new RuntimeException("Failed to upload proof", ioException);
            }

            Map<String, Object> updates = new HashMap<>();
            updates.put("proof_uploaded", true);
            updates.put("proof_status", "pending");
            updates.put("proof_url", uploadResult.getProofUrl());
            updates.put("proof_type", proofType);
            JsonNode updatedNode = dataStoreService.updateRecord("reviews", saved.getId(), updates);
            saved = mapReview(updatedNode.has("reviews") ? updatedNode.get("reviews") : updatedNode);
            reviewVerificationService.applyBadgeHierarchy(saved);
            Map<String, Object> badgeUpdate = new HashMap<>();
            badgeUpdate.put("badge_type", saved.getBadgeType());
            dataStoreService.updateRecord("reviews", saved.getId(), badgeUpdate);
        }

        return saved;
    }

    public Review uploadProof(Long reviewId, String proofType, MultipartFile file) {
        Review review = getReviewById(reviewId);
        if (review == null) {
            throw new IllegalArgumentException("Review not found");
        }

        ReviewProofStorageService.ProofUploadResult uploadResult;
        try {
            uploadResult = reviewProofStorageService.uploadProof(file, proofType, reviewId, review.getUserId());
        } catch (java.io.IOException ex) {
            throw new RuntimeException("Failed to upload proof", ex);
        }

        Map<String, Object> updates = new HashMap<>();
        updates.put("proof_uploaded", true);
        updates.put("proof_status", "pending");
        updates.put("proof_url", uploadResult.getProofUrl());
        updates.put("proof_type", proofType);
        JsonNode result = dataStoreService.updateRecord("reviews", reviewId, updates);

        Review updated = mapReview(result.has("reviews") ? result.get("reviews") : result);
        reviewVerificationService.applyBadgeHierarchy(updated);
        Map<String, Object> badgeUpdate = new HashMap<>();
        badgeUpdate.put("badge_type", updated.getBadgeType());
        dataStoreService.updateRecord("reviews", reviewId, badgeUpdate);
        return updated;
    }

    public ReviewSummaryResponseDTO getHospitalReviews(Long hospitalId) {
        List<Review> reviews = fetchReviews("SELECT * FROM reviews WHERE clinic_id = '" + hospitalId + "'");
        Map<String, Long> badgeCounts = new HashMap<>();
        badgeCounts.put("verified_phone", 0L);
        badgeCounts.put("verified_patient", 0L);
        badgeCounts.put("hospital_verified", 0L);

        Map<String, Long> starDistribution = new LinkedHashMap<>();
        starDistribution.put("5", 0L);
        starDistribution.put("4", 0L);
        starDistribution.put("3", 0L);
        starDistribution.put("2", 0L);
        starDistribution.put("1", 0L);

        double ratingSum = 0.0;
        int ratingCount = 0;

        Map<String, Long> attributeSums = new LinkedHashMap<>();
        Map<String, Long> attributeCounts = new LinkedHashMap<>();
        initAttributeMaps(attributeSums, attributeCounts);

        for (Review review : reviews) {
            reviewVerificationService.applyBadgeHierarchy(review);
            String badge = review.getBadgeType();
            if (badge != null) {
                badgeCounts.put(badge, badgeCounts.getOrDefault(badge, 0L) + 1L);
            }

            double effectiveRating = calculateEffectiveRating(review);
            if (effectiveRating > 0) {
                ratingSum += effectiveRating;
                ratingCount++;

                int roundedStar = clampToStar((int) Math.round(effectiveRating));
                String starKey = String.valueOf(roundedStar);
                starDistribution.put(starKey, starDistribution.getOrDefault(starKey, 0L) + 1L);
            }

            aggregateRatings(review, attributeSums, attributeCounts);
        }

        double overallRating = ratingCount == 0 ? 0.0 : roundToOneDecimal(ratingSum / ratingCount);
        Map<String, Integer> starPercentages = computeStarPercentages(starDistribution, reviews.size());
        Map<String, Double> subRatingAverages = computeSubRatingAverages(attributeSums, attributeCounts);
        String customersSay = buildCustomersSaySummary(reviews, subRatingAverages);

        return new ReviewSummaryResponseDTO(
                reviews.size(),
                overallRating,
                starDistribution,
                starPercentages,
                subRatingAverages,
                customersSay,
                badgeCounts,
                reviews);
    }

    public List<Review> getReviewsByUserId(Long userId) {
        return fetchReviews("SELECT * FROM reviews WHERE user_id = '" + userId + "'");
    }

    public List<Review> getPendingProofReviewsForModerator() {
        UserData authUser = requireAuthenticatedUser();
        Role role = authUser.getRole();

        if (Role.ADMIN.equals(role)) {
            return fetchReviews("SELECT * FROM reviews WHERE proof_status = 'pending'");
        }

        if (Role.HOSPITAL.equals(role)) {
            Long clinicId = extractClinicIdFromHospitalAccount(authUser);
            return fetchReviews("SELECT * FROM reviews WHERE clinic_id = '" + clinicId + "' AND proof_status = 'pending'");
        }

        throw new IllegalStateException("Only ADMIN or HOSPITAL accounts can moderate proof documents");
    }

    public Review moderateProofStatus(Long reviewId, String status) {
        String normalizedStatus = normalizeModerationStatus(status);
        UserData authUser = requireAuthenticatedUser();
        Role role = authUser.getRole();

        Review review = getReviewById(reviewId);
        if (review == null) {
            throw new IllegalArgumentException("Review not found");
        }

        if (Role.HOSPITAL.equals(role)) {
            Long clinicId = extractClinicIdFromHospitalAccount(authUser);
            if (review.getHospitalId() == null || !clinicId.equals(review.getHospitalId())) {
                throw new IllegalStateException("You can only moderate reviews for your hospital");
            }
        } else if (!Role.ADMIN.equals(role)) {
            throw new IllegalStateException("Only ADMIN or HOSPITAL accounts can moderate proof documents");
        }

        Map<String, Object> updates = new HashMap<>();
        updates.put("proof_status", normalizedStatus);
        JsonNode result = dataStoreService.updateRecord("reviews", reviewId, updates);
        Review updated = mapReview(result.has("reviews") ? result.get("reviews") : result);

        reviewVerificationService.applyBadgeHierarchy(updated);
        Map<String, Object> badgeUpdate = new HashMap<>();
        badgeUpdate.put("badge_type", updated.getBadgeType());
        JsonNode badgeUpdatedNode = dataStoreService.updateRecord("reviews", reviewId, badgeUpdate);

        return mapReview(badgeUpdatedNode.has("reviews") ? badgeUpdatedNode.get("reviews") : badgeUpdatedNode);
    }

    public void deleteReview(Long id) {
        boolean deleted = false;
        try {
            dataStoreService.deleteRecord("reviews", id);
            deleted = true;
        } catch (Exception e) {
            log.warn("Primary deleteRecord failed for review {}. Trying ZCQL fallback. Error: {}", id, e.getMessage());
        }

        if (!deleted) {
            try {
                JsonNode deleteResult = dataStoreService.executeQuery("DELETE FROM reviews WHERE ROWID = '" + id + "'");
                long deletedCount = deleteResult != null && deleteResult.has("deleted")
                        ? deleteResult.get("deleted").asLong()
                        : 0L;
                if (deletedCount <= 0) {
                    throw new RuntimeException("Review not deleted by fallback query");
                }
            } catch (Exception e) {
                log.error("Failed to delete review {} using ZCQL fallback", id, e);
                throw new RuntimeException("Failed to delete review", e);
            }
        }

        JsonNode existsCheck = dataStoreService.executeQuery("SELECT ROWID FROM reviews WHERE ROWID = '" + id + "'");
        if (existsCheck != null && existsCheck.isArray() && !existsCheck.isEmpty()) {
            throw new RuntimeException("Failed to delete review");
        }
    }

    public Review updateReview(Long id, Map<String, Object> data) {
        try {
            JsonNode result = dataStoreService.updateRecord("reviews", id, data);
            JsonNode rowData = result.has("reviews") ? result.get("reviews") : result;
            return mapReview(rowData);
        } catch (Exception e) {
            log.error("Failed to update review {}", id, e);
            throw new RuntimeException("Failed to update review", e);
        }
    }

    public byte[] getProofData(Long proofId) {
        return reviewProofStorageService.getProofData(proofId);
    }

    public String getProofMimeType(Long proofId) {
        return reviewProofStorageService.getProofMimeType(proofId);
    }

    private Review saveReviewRecord(Review review) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("rating", review.getRating());
        values.put("comment", review.getComment());
        values.put("user_id", review.getUserId());
        values.put("clinic_id", review.getHospitalId());
        values.put("doctor_id", review.getDoctorId());
        values.put("created_at", review.getCreatedAt().format(DATASTORE_DATE_TIME));
        values.put("phone_verified", review.getPhoneVerified());
        values.put("proof_uploaded", review.getProofUploaded());
        values.put("proof_status", review.getProofStatus());
        values.put("badge_type", review.getBadgeType());
        values.put("proof_url", review.getProofUrl());
        values.put("proof_type", review.getProofType());
        values.put("reviewer_ip", review.getReviewerIp());
        values.put("reviewer_phone", review.getReviewerPhone());
        addRatings(values, review.getRatings());

        JsonNode result = dataStoreService.insertRecord("reviews", values);
        JsonNode row = result.has("reviews") ? result.get("reviews") : result;
        return mapReview(row);
    }

    private void addRatings(Map<String, Object> values, ReviewRatingsDTO ratings) {
        values.put("explanation_clarity", ratings.getExplanationClarity());
        values.put("time_spent", ratings.getTimeSpent());
        values.put("diagnosis_confidence", ratings.getDiagnosisConfidence());
        values.put("waiting_time", ratings.getWaitingTime());
        values.put("staff_behavior", ratings.getStaffBehavior());
        values.put("cleanliness", ratings.getCleanliness());
        values.put("overall_experience", ratings.getOverallExperience());
    }

    private Review mapReview(JsonNode node) {
        Review review = objectMapper.convertValue(node, Review.class);

        ReviewRatingsDTO ratings = new ReviewRatingsDTO();
        ratings.setExplanationClarity(getInteger(node, "explanation_clarity"));
        ratings.setTimeSpent(getInteger(node, "time_spent"));
        ratings.setDiagnosisConfidence(getInteger(node, "diagnosis_confidence"));
        ratings.setWaitingTime(getInteger(node, "waiting_time"));
        ratings.setStaffBehavior(getInteger(node, "staff_behavior"));
        ratings.setCleanliness(getInteger(node, "cleanliness"));
        ratings.setOverallExperience(getInteger(node, "overall_experience"));
        review.setRatings(ratings);

        if (node.has("clinic_id") && !node.get("clinic_id").isNull()) {
            review.setHospitalId(node.get("clinic_id").asLong());
        }
        if (node.has("user_id") && !node.get("user_id").isNull()) {
            review.setUserId(node.get("user_id").asLong());
        }
        if (node.has("doctor_id") && !node.get("doctor_id").isNull()) {
            review.setDoctorId(node.get("doctor_id").asLong());
        }
        if (node.has("proof_uploaded") && !node.get("proof_uploaded").isNull()) {
            review.setProofUploaded(node.get("proof_uploaded").asBoolean());
        }
        if (node.has("phone_verified") && !node.get("phone_verified").isNull()) {
            review.setPhoneVerified(node.get("phone_verified").asBoolean());
        }
        if (node.has("proof_status") && !node.get("proof_status").isNull()) {
            review.setProofStatus(node.get("proof_status").asText());
        }
        if (node.has("badge_type") && !node.get("badge_type").isNull()) {
            review.setBadgeType(node.get("badge_type").asText());
        }
        if (node.has("proof_url") && !node.get("proof_url").isNull()) {
            review.setProofUrl(node.get("proof_url").asText());
        }
        if (node.has("proof_type") && !node.get("proof_type").isNull()) {
            review.setProofType(node.get("proof_type").asText());
        }
        if (node.has("reviewer_ip") && !node.get("reviewer_ip").isNull()) {
            review.setReviewerIp(node.get("reviewer_ip").asText());
        }
        if (node.has("reviewer_phone") && !node.get("reviewer_phone").isNull()) {
            review.setReviewerPhone(node.get("reviewer_phone").asText());
        }
        if (node.has("created_at") && !node.get("created_at").isNull()) {
            String createdAtText = node.get("created_at").asText();
            try {
                review.setCreatedAt(LocalDateTime.parse(createdAtText));
            } catch (Exception ignored) {
                try {
                    review.setCreatedAt(LocalDateTime.parse(createdAtText, DATASTORE_DATE_TIME));
                } catch (Exception ignoredAgain) {
                    review.setCreatedAt(LocalDateTime.now());
                }
            }
        }
        return review;
    }

    private Integer getInteger(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asInt() : null;
    }

    private List<Review> fetchReviews(String query) {
        try {
            JsonNode result = dataStoreService.executeQuery(query);
            List<Review> reviews = new ArrayList<>();
            if (result != null && result.isArray()) {
                for (JsonNode node : result) {
                    JsonNode data = node.has("reviews") ? node.get("reviews") : node;
                    reviews.add(mapReview(data));
                }
            }
            return reviews;
        } catch (Exception e) {
            log.error("Error fetching reviews", e);
            return new ArrayList<>();
        }
    }

    private Review getReviewById(Long id) {
        try {
            JsonNode node = dataStoreService.findById("reviews", id);
            if (node == null) {
                return null;
            }
            JsonNode row = node.has("reviews") ? node.get("reviews") : node;
            return mapReview(row);
        } catch (Exception ex) {
            log.error("Failed to fetch review {}", id, ex);
            return null;
        }
    }

    private void validateReviewRequest(ReviewCreateRequestDTO request) {
        if (request.getHospitalId() == null) {
            throw new IllegalArgumentException("hospitalId is required");
        }
        if (request.getRatings() == null) {
            throw new IllegalArgumentException("ratings are required");
        }

        validateRatingRange(request.getRatings().getExplanationClarity(), "explanation_clarity");
        validateRatingRange(request.getRatings().getTimeSpent(), "time_spent");
        validateRatingRange(request.getRatings().getDiagnosisConfidence(), "diagnosis_confidence");
        validateRatingRange(request.getRatings().getWaitingTime(), "waiting_time");
        validateRatingRange(request.getRatings().getStaffBehavior(), "staff_behavior");
        validateRatingRange(request.getRatings().getCleanliness(), "cleanliness");
        validateRatingRange(request.getRatings().getOverallExperience(), "overall_experience");
    }

    private void validateRatingRange(Integer value, String fieldName) {
        if (value == null || value < 1 || value > 5) {
            throw new IllegalArgumentException(fieldName + " must be between 1 and 5");
        }
    }

        private void enforceReviewThrottle(Long userId, String reviewerPhone, String reviewerIp, Long doctorId, Long hospitalId) {
        LocalDateTime threshold = LocalDateTime.now().minusDays(30);
        String thresholdText = threshold.format(DATASTORE_DATE_TIME);

        String safeIp = sanitizeSqlValue(reviewerIp);

        String doctorClause = doctorId != null
            ? " AND doctor_id = '" + doctorId + "'"
            : " AND clinic_id = '" + hospitalId + "'";

        String baseByUser = (userId != null && reviewerIp != null && !reviewerIp.isBlank())
            ? "SELECT * FROM reviews WHERE user_id = '" + userId + "' AND reviewer_ip = '" + safeIp
                + "'" + doctorClause + " AND created_at >= '" + thresholdText + "'"
            : null;

        String baseByPhone = (reviewerPhone != null && !reviewerPhone.isBlank() && reviewerIp != null
            && !reviewerIp.isBlank())
                ? "SELECT * FROM reviews WHERE reviewer_phone = '" + sanitizeSqlValue(reviewerPhone)
                    + "' AND reviewer_ip = '" + safeIp + "'" + doctorClause
                    + " AND created_at >= '" + thresholdText + "'"
                : null;

        if (existsAny(baseByUser) || existsAny(baseByPhone)) {
            throw new IllegalArgumentException("Only one review per doctor is allowed in 30 days from the same account/phone and network");
        }
    }

        private String sanitizeSqlValue(String value) {
        return value == null ? "" : value.replace("'", "\\'");
        }

    private boolean existsAny(String query) {
        if (query == null) {
            return false;
        }
        JsonNode node = dataStoreService.executeQuery(query);
        return node != null && node.isArray() && !node.isEmpty();
    }

    private UserData resolveAuthenticatedUser() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || authentication.getName() == null
                    || "anonymousUser".equalsIgnoreCase(authentication.getName())) {
                return null;
            }
            return userStoreService.findByEmail(authentication.getName());
        } catch (Exception ex) {
            log.warn("Unable to resolve authenticated user", ex);
            return null;
        }
    }

    private UserData requireAuthenticatedUser() {
        UserData authUser = resolveAuthenticatedUser();
        if (authUser == null || authUser.getId() == null) {
            throw new IllegalStateException("Authentication required");
        }
        return authUser;
    }

    private Long extractClinicIdFromHospitalAccount(UserData authUser) {
        String email = authUser.getEmail();
        if (email == null || email.isBlank()) {
            throw new IllegalStateException("Hospital account email is missing");
        }

        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("\\.(\\d+)@hospiico\\.com$", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(email.trim());

        if (!matcher.find()) {
            throw new IllegalStateException("Hospital account is not linked to a clinic id");
        }

        try {
            return Long.parseLong(matcher.group(1));
        } catch (NumberFormatException ex) {
            throw new IllegalStateException("Invalid clinic id mapping for hospital account");
        }
    }

    private String normalizeModerationStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("status is required (approved or rejected)");
        }
        String normalized = status.trim().toLowerCase();
        if (!"approved".equals(normalized) && !"rejected".equals(normalized)) {
            throw new IllegalArgumentException("status must be either approved or rejected");
        }
        return normalized;
    }

    private String extractClientIp(HttpServletRequest request) {
        String header = request.getHeader("X-Forwarded-For");
        if (header != null && !header.isBlank()) {
            return header.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void initAttributeMaps(Map<String, Long> sums, Map<String, Long> counts) {
        String[] keys = {
                "explanationClarity",
                "timeSpent",
                "diagnosisConfidence",
                "waitingTime",
                "staffBehavior",
                "cleanliness",
                "overallExperience"
        };
        for (String key : keys) {
            sums.put(key, 0L);
            counts.put(key, 0L);
        }
    }

    private void aggregateRatings(Review review, Map<String, Long> sums, Map<String, Long> counts) {
        ReviewRatingsDTO ratings = review.getRatings();
        if (ratings == null) {
            return;
        }

        addAttributeValue(sums, counts, "explanationClarity", ratings.getExplanationClarity());
        addAttributeValue(sums, counts, "timeSpent", ratings.getTimeSpent());
        addAttributeValue(sums, counts, "diagnosisConfidence", ratings.getDiagnosisConfidence());
        addAttributeValue(sums, counts, "waitingTime", ratings.getWaitingTime());
        addAttributeValue(sums, counts, "staffBehavior", ratings.getStaffBehavior());
        addAttributeValue(sums, counts, "cleanliness", ratings.getCleanliness());
        addAttributeValue(sums, counts, "overallExperience", ratings.getOverallExperience());
    }

    private void addAttributeValue(Map<String, Long> sums, Map<String, Long> counts, String key, Integer value) {
        if (value == null) {
            return;
        }
        sums.put(key, sums.getOrDefault(key, 0L) + value);
        counts.put(key, counts.getOrDefault(key, 0L) + 1L);
    }

    private Map<String, Double> computeSubRatingAverages(Map<String, Long> sums, Map<String, Long> counts) {
        Map<String, Double> averages = new LinkedHashMap<>();
        for (Map.Entry<String, Long> entry : sums.entrySet()) {
            String key = entry.getKey();
            long count = counts.getOrDefault(key, 0L);
            if (count == 0) {
                averages.put(key, 0.0);
                continue;
            }
            averages.put(key, roundToOneDecimal((double) entry.getValue() / count));
        }
        return averages;
    }

    private Map<String, Integer> computeStarPercentages(Map<String, Long> distribution, int totalReviews) {
        Map<String, Integer> percentages = new LinkedHashMap<>();
        for (Map.Entry<String, Long> entry : distribution.entrySet()) {
            int percent = totalReviews == 0 ? 0 : (int) Math.round((entry.getValue() * 100.0) / totalReviews);
            percentages.put(entry.getKey(), percent);
        }
        return percentages;
    }

    private double calculateEffectiveRating(Review review) {
        if (review.getRating() != null && review.getRating() > 0) {
            return review.getRating();
        }
        ReviewRatingsDTO ratings = review.getRatings();
        if (ratings == null) {
            return 0.0;
        }
        return ratings.calculateAverage();
    }

    private int clampToStar(int value) {
        return Math.max(1, Math.min(5, value));
    }

    private double roundToOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private String buildCustomersSaySummary(List<Review> reviews, Map<String, Double> subRatingAverages) {
        if (reviews.isEmpty()) {
            return "No patient insights yet. Once reviews are added, this summary will describe the strongest and weakest parts of care.";
        }

        Map<String, String> labels = new LinkedHashMap<>();
        labels.put("explanationClarity", "doctor explanations");
        labels.put("timeSpent", "time doctors spend");
        labels.put("diagnosisConfidence", "diagnosis confidence");
        labels.put("waitingTime", "waiting time");
        labels.put("staffBehavior", "staff behavior");
        labels.put("cleanliness", "cleanliness");
        labels.put("overallExperience", "overall experience");

        List<Map.Entry<String, Double>> sorted = new ArrayList<>(subRatingAverages.entrySet());
        sorted.sort(Map.Entry.comparingByValue(Comparator.reverseOrder()));

        String strongest = "overall experience";
        String weakest = "waiting time";
        if (!sorted.isEmpty()) {
            strongest = labels.getOrDefault(sorted.get(0).getKey(), sorted.get(0).getKey());
            weakest = labels.getOrDefault(sorted.get(sorted.size() - 1).getKey(), sorted.get(sorted.size() - 1).getKey());
        }

        double strongestScore = 0.0;
        double weakestScore = 0.0;
        if (!sorted.isEmpty()) {
            Double strongestValue = sorted.get(0).getValue();
            Double weakestValue = sorted.get(sorted.size() - 1).getValue();
            strongestScore = strongestValue == null ? 0.0 : strongestValue;
            weakestScore = weakestValue == null ? 0.0 : weakestValue;
        }

        int commentedCount = 0;
        for (Review review : reviews) {
            if (review.getComment() != null && !review.getComment().isBlank()) {
                commentedCount++;
            }
        }

        return "Patients consistently rate " + strongest + " highly (" + strongestScore
                + "/5). The main area to improve is " + weakest + " (" + weakestScore
                + "/5). Based on " + reviews.size() + " ratings and " + commentedCount
                + " written reviews.";
    }
}
