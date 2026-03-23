package com.bugboard26.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Component
public class ProductionSecurityValidator implements ApplicationRunner {

    private final Environment environment;
    private final String jwtSecret;
    private final boolean cookieSecure;
    private final String frontOrigin;
    private final String additionalOrigins;
    private final boolean allowLocalOrigins;
    private final String datasourceUsername;
    private final String datasourcePassword;

    public ProductionSecurityValidator(
        Environment environment,
        @Value("${app.jwt.secret:}") String jwtSecret,
        @Value("${app.cookie.secure:false}") boolean cookieSecure,
        @Value("${app.front-origin:}") String frontOrigin,
        @Value("${app.additional-origins:}") String additionalOrigins,
        @Value("${app.security.allow-local-origins:false}") boolean allowLocalOrigins,
        @Value("${spring.datasource.username:}") String datasourceUsername,
        @Value("${spring.datasource.password:}") String datasourcePassword
    ) {
        this.environment = environment;
        this.jwtSecret = jwtSecret;
        this.cookieSecure = cookieSecure;
        this.frontOrigin = frontOrigin;
        this.additionalOrigins = additionalOrigins;
        this.allowLocalOrigins = allowLocalOrigins;
        this.datasourceUsername = datasourceUsername;
        this.datasourcePassword = datasourcePassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!Arrays.asList(environment.getActiveProfiles()).contains("prod")) {
            return;
        }

        List<String> errors = new ArrayList<>();

        if (jwtSecret == null || jwtSecret.isBlank() || jwtSecret.length() < 32 ||
            jwtSecret.contains("ThisIsAVeryLongAndSecureJWTSecretKey")) {
            errors.add("Configure APP_JWT_SECRET with a unique secret of at least 32 characters.");
        }

        if (!cookieSecure) {
            errors.add("Production requires secure cookies. Set APP_COOKIE_SECURE=true.");
        }

        if (allowLocalOrigins) {
            errors.add("Local wildcard origins must be disabled in production.");
        }

        validateHttpsOrigin(frontOrigin, "APP_FRONT_ORIGIN", errors);
        for (String origin : splitCsv(additionalOrigins)) {
            validateHttpsOrigin(origin, "APP_ADDITIONAL_ORIGINS", errors);
        }

        if ("bug".equals(datasourceUsername) && "bug".equals(datasourcePassword)) {
            errors.add("Replace the default PostgreSQL credentials before deploying to production.");
        }

        if (!errors.isEmpty()) {
            throw new IllegalStateException("Unsafe production configuration:\n - " + String.join("\n - ", errors));
        }
    }

    private void validateHttpsOrigin(String origin, String propertyName, List<String> errors) {
        if (origin == null || origin.isBlank()) {
            errors.add(propertyName + " must be configured.");
            return;
        }

        String trimmedOrigin = origin.trim();
        if (!trimmedOrigin.startsWith("https://")) {
            errors.add(propertyName + " must use https:// in production.");
        }

        String lower = trimmedOrigin.toLowerCase();
        if (lower.contains("localhost") || lower.contains("127.0.0.1") || lower.contains("192.168.")) {
            errors.add(propertyName + " must point to the public production domain, not a local address.");
        }
    }

    private List<String> splitCsv(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }

        List<String> values = new ArrayList<>();
        for (String item : value.split(",")) {
            String trimmed = item.trim();
            if (!trimmed.isEmpty()) {
                values.add(trimmed);
            }
        }
        return values;
    }
}
