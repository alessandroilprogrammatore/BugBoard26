package com.bugboard26.dto;

import java.util.Map;

public record MonthlyReportResponse(
    int opened,
    int resolved,
    Map<String, Long> resolvedPerUser,
    double avgResolutionDays
) {}
