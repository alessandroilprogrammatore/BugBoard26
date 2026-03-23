package com.bugboard26.config;

import com.bugboard26.security.JwtAuthFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final String frontOrigin;
    private final String additionalOrigins;
    private final boolean allowLocalOrigins;
    private final boolean exposeDocs;
    private final boolean exposeH2Console;

    public SecurityConfig(
        JwtAuthFilter jwtAuthFilter,
        @Value("${app.front-origin:http://localhost:5173}") String frontOrigin,
        @Value("${app.additional-origins:}") String additionalOrigins,
        @Value("${app.security.allow-local-origins:false}") boolean allowLocalOrigins,
        @Value("${app.security.expose-docs:false}") boolean exposeDocs,
        @Value("${app.security.expose-h2-console:false}") boolean exposeH2Console
    ) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.frontOrigin = frontOrigin;
        this.additionalOrigins = additionalOrigins;
        this.allowLocalOrigins = allowLocalOrigins;
        this.exposeDocs = exposeDocs;
        this.exposeH2Console = exposeH2Console;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> {
                var registry = auth
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    .requestMatchers("/api/auth/login", "/api/auth/logout", "/api/auth/me").permitAll();

                if (exposeDocs) {
                    registry.requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll();
                }

                if (exposeH2Console) {
                    registry.requestMatchers("/h2/**").permitAll();
                }

                registry
                    .requestMatchers("/api/admin/**").hasRole("ADMIN")
                    .anyRequest().authenticated();
            })
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        http.headers(headers -> {
            headers.contentTypeOptions(Customizer.withDefaults());
            headers.cacheControl(Customizer.withDefaults());
            headers.referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN));
            headers.permissionsPolicy(policy -> policy.policy("camera=(), microphone=(), geolocation=()"));
            headers.contentSecurityPolicy(csp -> csp.policyDirectives(
                "default-src 'self'; " +
                "base-uri 'self'; " +
                "object-src 'none'; " +
                "frame-ancestors 'self'; " +
                "img-src 'self' data: blob:; " +
                "font-src 'self' data:; " +
                "style-src 'self' 'unsafe-inline'; " +
                "script-src 'self'; " +
                "connect-src 'self'; " +
                "form-action 'self'"
            ));
            headers.httpStrictTransportSecurity(hsts -> hsts
                .includeSubDomains(true)
                .preload(true)
                .maxAgeInSeconds(31536000)
            );

            if (exposeH2Console) {
                headers.frameOptions(frameOptions -> frameOptions.sameOrigin());
            } else {
                headers.frameOptions(frameOptions -> frameOptions.deny());
            }
        });

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        List<String> allowedOriginPatterns = new ArrayList<>();

        addConfiguredOrigins(allowedOriginPatterns, frontOrigin);
        addConfiguredOrigins(allowedOriginPatterns, additionalOrigins);

        if (allowLocalOrigins) {
            allowedOriginPatterns.add("http://127.0.0.1:*");
            allowedOriginPatterns.add("http://localhost:*");
            allowedOriginPatterns.add("http://192.168.*:*");
        }

        cfg.setAllowedOriginPatterns(allowedOriginPatterns);
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"));
        cfg.setExposedHeaders(List.of("Authorization", "Location"));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }

    private void addConfiguredOrigins(List<String> allowedOriginPatterns, String configuredOrigins) {
        if (configuredOrigins == null || configuredOrigins.isBlank()) {
            return;
        }

        for (String origin : configuredOrigins.split(",")) {
            String trimmed = origin.trim();
            if (!trimmed.isEmpty()) {
                allowedOriginPatterns.add(trimmed);
            }
        }
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
