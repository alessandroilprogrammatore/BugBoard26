package com.bugboard26.controller;

import com.bugboard26.dto.LoginRequest;
import com.bugboard26.dto.MeResponse;
import com.bugboard26.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final boolean cookieSecure;
    private final String cookieSameSite;

    public AuthController(
        AuthService authService,
        @Value("${app.cookie.secure}") boolean cookieSecure,
        @Value("${app.cookie.samesite}") String cookieSameSite
    ) {
        this.authService = authService;
        this.cookieSecure = cookieSecure;
        this.cookieSameSite = cookieSameSite;
    }

    @PostMapping("/login")
    public ResponseEntity<MeResponse> login(
        @Valid @RequestBody LoginRequest request,
        HttpServletResponse response
    ) {
        MeResponse me = authService.login(request);

        // Set JWT token in HttpOnly cookie
        Cookie cookie = new Cookie("token", me.token());
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(8 * 60 * 60); // 8 hours
        response.addCookie(cookie);

        return ResponseEntity.ok(me);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        authService.logout();

        // Clear the token cookie
        Cookie cookie = new Cookie("token", "");
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);

        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.ok().build();
        }

        String email = authentication.getName();
        // In a real implementation, you'd fetch user details from the database
        // For now, return basic info from the JWT token
        return ResponseEntity.ok().build();
    }
}
