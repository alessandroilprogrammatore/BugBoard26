package com.bugboard26.dto;

public record MonthlyUserReportResponse(
    String email,
    long opened,
    long managed,
    long resolved,
    double avgResolutionDays
) {}
