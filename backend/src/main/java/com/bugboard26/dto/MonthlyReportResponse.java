package com.bugboard26.dto;

import java.util.List;
import java.util.Map;

public record MonthlyReportResponse(
    int opened,
    int managed,
    int resolved,
    Map<String, Long> openedPerUser,
    Map<String, Long> managedPerUser,
    Map<String, Long> resolvedPerUser,
    double avgResolutionDays,
    Map<String, Double> avgResolutionDaysPerUser,
    List<MonthlyUserReportResponse> users
) {}
