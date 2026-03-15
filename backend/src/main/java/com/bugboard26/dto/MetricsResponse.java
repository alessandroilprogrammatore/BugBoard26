package com.bugboard26.dto;

import java.util.Map;

public record MetricsResponse(
    long open,
    long inProgress,
    long resolved,
    long archived,
    Map<String, Long> assignedPerUser,
    double avgResolutionDays,
    Map<String, Double> avgResolutionDaysPerUser
) {}
