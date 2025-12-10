package com.hospitalfinder.backend.repository.projection;

public interface ClinicDistanceProjection {
    Long getId();
    String getName();
    String getAddress();
    String getCity();
    Double getLatitude();
    Double getLongitude();
    String getPhone();
    String getTimings();
    Double getRating();
    Integer getReviews();
    String getImageUrl();
    Double getDistance();
}
