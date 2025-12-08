package com.hospitalfinder.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hospitalfinder.backend.entity.Clinic;

public interface ClinicRepository extends JpaRepository<Clinic, Long> {

    List<Clinic> findByCityIgnoreCase(String city);

    @Query("SELECT c FROM Clinic c JOIN c.specializations s " +
            "WHERE LOWER(c.city) = LOWER(:city) AND LOWER(s.specialization) = LOWER(:specialization)")
    List<Clinic> findByCityAndSpecialization(@Param("city") String city, @Param("specialization") String specialization);

    @Query("SELECT DISTINCT c FROM Clinic c JOIN c.specializations s " +
            "WHERE LOWER(s.specialization) = LOWER(:specialization)")
    List<Clinic> findBySpecialization(@Param("specialization") String specialization);

    boolean existsByNameIgnoreCaseAndAddressIgnoreCaseAndCityIgnoreCase(String name, String address, String city);

    @Query(value = """
    SELECT * FROM clinic c
    WHERE (
        6371 * acos(
            cos(radians(:lat)) * cos(radians(c.latitude)) *
            cos(radians(c.longitude) - radians(:lng)) +
            sin(radians(:lat)) * sin(radians(c.latitude))
        )
    ) <= 5
    ORDER BY (
        6371 * acos(
            cos(radians(:lat)) * cos(radians(c.latitude)) *
            cos(radians(c.longitude) - radians(:lng)) +
            sin(radians(:lat)) * sin(radians(c.latitude))
        )
    )
    """, nativeQuery = true)
    List<Clinic> findNearestClinics(@Param("lat") Double latitude, @Param("lng") Double longitude);

    @Query(value = """
    SELECT * FROM clinic c
    ORDER BY (
        6371 * acos(
            cos(radians(:lat)) * cos(radians(c.latitude)) *
            cos(radians(c.longitude) - radians(:lng)) +
            sin(radians(:lat)) * sin(radians(c.latitude))
        )
    )
    """, nativeQuery = true)
    List<Clinic> findAllClinicsOrderedByDistance(@Param("lat") Double latitude, @Param("lng") Double longitude);

}

