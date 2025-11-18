package com.bugboard26.dto;

import java.util.UUID;

public record AssignRequest(
    UUID userId,
    Boolean suggest
) {}
