package com.hospitalfinder.backend.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class AdminStatisticsDTO {
    private long activeUsers;
    private long totalUsers;
    private long dailyRequests;
    private long weeklyRequests;
    private long monthlyRequests;
    private long hospitalRequests;
    private long mistakeReports;
}