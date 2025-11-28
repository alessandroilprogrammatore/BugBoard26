package com.bugboard26.service;

import com.bugboard26.dto.LoginRequest;
import com.bugboard26.dto.MeResponse;
import com.bugboard26.model.User;
import com.bugboard26.repository.UserRepository;
import com.bugboard26.security.JwtService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, JwtService jwtService, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    public MeResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
            .orElseThrow(() -> new EntityNotFoundException("Invalid credentials"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new EntityNotFoundException("Invalid credentials");
        }

        String token = jwtService.issue(
            user.getId(),
            user.getRole().name(),
            user.getName(),
            user.getEmail()
        );

        return new MeResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(), token);
    }

    public void logout() {
        // No server-side logout needed for JWT, client just discards the token
    }
}
