package com.hospitalfinder.backend.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.hospitalfinder.backend.dto.OtpSendRequestDTO;
import com.hospitalfinder.backend.dto.OtpVerifyRequestDTO;
import com.hospitalfinder.backend.dto.ReviewCreateRequestDTO;
import com.hospitalfinder.backend.dto.ReviewSummaryResponseDTO;
import com.hospitalfinder.backend.entity.Review;
import com.hospitalfinder.backend.service.OtpVerificationService;
import com.hospitalfinder.backend.service.ReviewService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;
    private final OtpVerificationService otpVerificationService;

    @PostMapping("/otp/send")
    public ResponseEntity<?> sendOtp(@RequestBody OtpSendRequestDTO request) {
        if (request.getPhone() == null || request.getPhone().isBlank()) {
            return ResponseEntity.badRequest().body("phone is required");
        }
        OtpVerificationService.OtpSession session = otpVerificationService.sendOtp(request.getPhone());
        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", session.getSessionId());
        response.put("expiresAt", session.getExpiresAt().toString());
        response.put("badgeType", "verified_phone");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody OtpVerifyRequestDTO request) {
        if (request.getSessionId() == null || request.getOtpCode() == null) {
            return ResponseEntity.badRequest().body("sessionId and otpCode are required");
        }
        boolean verified = otpVerificationService.verifyOtp(request.getSessionId(), request.getOtpCode());
        if (!verified) {
            return ResponseEntity.badRequest().body("Invalid or expired OTP");
        }
        return ResponseEntity.ok(Map.of("verified", true, "badgeType", "verified_phone"));
    }

    @PostMapping(value = "/create", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createReview(
            @RequestParam("hospitalId") Long hospitalId,
            @RequestParam(value = "doctorId", required = false) Long doctorId,
            @RequestParam("explanationClarity") Integer explanationClarity,
            @RequestParam("timeSpent") Integer timeSpent,
            @RequestParam("diagnosisConfidence") Integer diagnosisConfidence,
            @RequestParam("waitingTime") Integer waitingTime,
            @RequestParam("staffBehavior") Integer staffBehavior,
            @RequestParam("cleanliness") Integer cleanliness,
            @RequestParam("overallExperience") Integer overallExperience,
            @RequestParam(value = "comment", required = false) String comment,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam(value = "otpSessionId", required = false) String otpSessionId,
            @RequestParam(value = "otpCode", required = false) String otpCode,
            @RequestParam(value = "proofType", required = false) String proofType,
            @RequestParam(value = "file", required = false) MultipartFile file,
            HttpServletRequest request) {
        try {
            ReviewCreateRequestDTO createRequest = new ReviewCreateRequestDTO();
            createRequest.setHospitalId(hospitalId);
            createRequest.setDoctorId(doctorId);
            createRequest.setComment(comment);
            createRequest.setPhone(phone);
            createRequest.setOtpSessionId(otpSessionId);
            createRequest.setOtpCode(otpCode);
            createRequest.setProofType(proofType);

            com.hospitalfinder.backend.dto.ReviewRatingsDTO ratings = new com.hospitalfinder.backend.dto.ReviewRatingsDTO();
            ratings.setExplanationClarity(explanationClarity);
            ratings.setTimeSpent(timeSpent);
            ratings.setDiagnosisConfidence(diagnosisConfidence);
            ratings.setWaitingTime(waitingTime);
            ratings.setStaffBehavior(staffBehavior);
            ratings.setCleanliness(cleanliness);
            ratings.setOverallExperience(overallExperience);
            createRequest.setRatings(ratings);

            Review savedReview = reviewService.createReview(createRequest, file, request);
            return ResponseEntity.ok(savedReview);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            String message = e.getMessage() == null || e.getMessage().isBlank() ? "Failed to submit review" : e.getMessage();
            return ResponseEntity.badRequest().body(message);
        }
    }

    @PostMapping(value = "/upload-proof", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadProof(
            @RequestParam("reviewId") Long reviewId,
            @RequestParam("proofType") String proofType,
            @RequestParam("file") MultipartFile file) {
        try {
            Review updated = reviewService.uploadProof(reviewId, proofType, file);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to upload proof");
        }
    }

    @GetMapping("/{hospitalId}")
    public ResponseEntity<ReviewSummaryResponseDTO> getHospitalReviews(@PathVariable Long hospitalId) {
        return ResponseEntity.ok(reviewService.getHospitalReviews(hospitalId));
    }

    @GetMapping("/hospital/{hospitalId}")
    public ResponseEntity<ReviewSummaryResponseDTO> getHospitalReviewsLegacy(@PathVariable Long hospitalId) {
        return ResponseEntity.ok(reviewService.getHospitalReviews(hospitalId));
    }

    @GetMapping("/moderation/pending")
    public ResponseEntity<?> getPendingProofReviews() {
        try {
            List<Review> reviews = reviewService.getPendingProofReviewsForModerator();
            return ResponseEntity.ok(reviews);
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(403).body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body("Failed to fetch pending proof reviews");
        }
    }

    @PutMapping("/moderation/{reviewId}/status")
    public ResponseEntity<?> updateProofStatus(
            @PathVariable Long reviewId,
            @RequestBody Map<String, String> payload) {
        try {
            String status = payload == null ? null : payload.get("status");
            Review updated = reviewService.moderateProofStatus(reviewId, status);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(403).body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body("Failed to update proof status");
        }
    }

    @GetMapping("/proof/{proofId}")
    public ResponseEntity<byte[]> downloadProof(@PathVariable Long proofId) {
        byte[] data = reviewService.getProofData(proofId);
        if (data == null || data.length == 0) {
            return ResponseEntity.notFound().build();
        }

        String mimeType = reviewService.getProofMimeType(proofId);
        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(mimeType);
        } catch (Exception ex) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .contentType(mediaType)
                .body(data);
    }

    @DeleteMapping("/{id}/delete")
    public ResponseEntity<Void> deleteReview(@PathVariable Long id) {
        reviewService.deleteReview(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReviewLegacy(@PathVariable Long id) {
        reviewService.deleteReview(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateReview(@PathVariable Long id, @RequestBody java.util.Map<String, Object> data) {
        try {
            Review updated = reviewService.updateReview(id, data);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to update review: " + e.getMessage());
        }
    }
}
