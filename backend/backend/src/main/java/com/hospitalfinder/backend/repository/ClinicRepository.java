package com.hospitalfinder.backend.repository;

import com.hospitalfinder.backend.entity.Clinic;
import com.hospitalfinder.backend.repository.projection.ClinicDistanceProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

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
        SELECT 
            c.id as id,
            c.name as name,
            c.address as address,
            c.city as city,
            c.latitude as latitude,
            c.longitude as longitude,
            c.phone as phone,
            c.timings as timings,
            c.rating as rating,
            c.reviews as reviews,
            c.image_url as imageUrl,
            ( 6371 * acos(
                cos(radians(:lat)) * cos(radians(c.latitude)) * 
                cos(radians(c.longitude) - radians(:lng)) + 
                sin(radians(:lat)) * sin(radians(c.latitude))
            )) AS distance
        FROM clinic c
        ORDER BY distance ASC
        """, nativeQuery = true)
    List<ClinicDistanceProjection> findNearestClinics(@Param("lat") Double latitude, @Param("lng") Double longitude);

}

