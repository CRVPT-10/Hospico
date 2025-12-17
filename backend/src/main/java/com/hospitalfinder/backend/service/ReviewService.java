package com.hospitalfinder.backend.service;

import com.hospitalfinder.backend.entity.Review;
import com.hospitalfinder.backend.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    public Review saveReview(Review review) {
        Review existingReview = reviewRepository.findByUserIdAndDoctorId(review.getUserId(), review.getDoctorId());
        if (existingReview != null) {
            throw new RuntimeException(
                    "You have already reviewed this doctor. Please delete your old review to submit a new one.");
        }
        review.setCreatedAt(LocalDateTime.now());
        return reviewRepository.save(review);
    }

    public List<Review> getReviewsByHospital(Long hospitalId) {
        return reviewRepository.findByHospitalId(hospitalId);
    }

    public List<Review> getReviewsByDoctor(Long doctorId) {
        return reviewRepository.findByDoctorId(doctorId);
    }

    public List<Review> getReviewsByUserId(Long userId) {
        return reviewRepository.findByUserId(userId);
    }

    public void deleteReview(Long id) {
        reviewRepository.deleteById(id);
    }
}
