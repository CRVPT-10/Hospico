package com.hospitalfinder.backend.repository;

import com.hospitalfinder.backend.entity.Clinic;
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
        SELECT *, 
        ( 6371 * acos(
            cos(radians(:lat)) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians(:lng)) + 
            sin(radians(:lat)) * sin(radians(latitude))
        )) AS distance 
        FROM clinic 
        ORDER BY distance ASC
        """, nativeQuery = true)
    List<Clinic> findNearestClinics(@Param("latitude") Double latitude, @Param("longitude") Double longitude);

}

