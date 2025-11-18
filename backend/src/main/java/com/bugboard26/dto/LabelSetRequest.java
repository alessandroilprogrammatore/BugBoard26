package com.bugboard26.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record LabelSetRequest(
    @NotEmpty List<String> labels
) {}
