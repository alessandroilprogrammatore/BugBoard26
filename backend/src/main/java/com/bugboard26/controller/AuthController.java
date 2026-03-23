package com.bugboard26.controller;

import com.bugboard26.dto.LoginRequest;
import com.bugboard26.dto.MeResponse;
import com.bugboard26.model.User;
import com.bugboard26.repository.UserRepository;
import com.bugboard26.service.AuthService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final boolean cookieSecure;
    private final String cookieSameSite;
    private final Duration tokenTtl;

    public AuthController(
        AuthService authService,
        UserRepository userRepository,
        @Value("${app.cookie.secure}") boolean cookieSecure,
        @Value("${app.cookie.samesite}") String cookieSameSite,
        @Value("${app.jwt.ttl-hours}") int tokenTtlHours
    ) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.cookieSecure = cookieSecure;
        this.cookieSameSite = cookieSameSite;
        this.tokenTtl = Duration.ofHours(tokenTtlHours);
    }

    @PostMapping("/login")
    public ResponseEntity<MeResponse> login(
        @Valid @RequestBody LoginRequest request,
        HttpServletResponse response
    ) {
        MeResponse me = authService.login(request);

        response.addHeader(HttpHeaders.SET_COOKIE, buildTokenCookie(me.token(), tokenTtl).toString());

        return ResponseEntity.ok(withoutToken(me));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        authService.logout();

        response.addHeader(HttpHeaders.SET_COOKIE, buildTokenCookie("", Duration.ZERO).toString());

        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.ok().build();
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        return ResponseEntity.ok(new MeResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getRole(),
            null  // no token on /me, already in cookie
        ));
    }

    private ResponseCookie buildTokenCookie(String value, Duration maxAge) {
        return ResponseCookie.from("token", value)
            .httpOnly(true)
            .secure(cookieSecure)
            .path("/")
            .sameSite(cookieSameSite)
            .maxAge(maxAge)
            .build();
    }

    private MeResponse withoutToken(MeResponse me) {
        return new MeResponse(
            me.id(),
            me.name(),
            me.email(),
            me.role(),
            null
        );
    }
}
