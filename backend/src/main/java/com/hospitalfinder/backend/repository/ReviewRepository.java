package com.hospitalfinder.backend.repository;

import com.hospitalfinder.backend.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByHospitalId(Long hospitalId);

    List<Review> findByDoctorId(Long doctorId);

    List<Review> findByUserId(Long userId);

    Review findByUserIdAndDoctorId(Long userId, Long doctorId);
}
