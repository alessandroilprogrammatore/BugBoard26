package com.bugboard26.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey secretKey;
    private final int ttlHours;

    public JwtService(
        @Value("${app.jwt.secret}") String secret,
        @Value("${app.jwt.ttl-hours}") int ttlHours
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes());
        this.ttlHours = ttlHours;
    }

    public String issue(UUID sub, String role, String name, String email) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime exp = now.plusHours(ttlHours);

        return Jwts.builder()
            .subject(sub.toString())
            .claim("role", role)
            .claim("name", name)
            .claim("email", email)
            .issuedAt(Date.from(now.atZone(ZoneId.systemDefault()).toInstant()))
            .expiration(Date.from(exp.atZone(ZoneId.systemDefault()).toInstant()))
            .signWith(secretKey)
            .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    public UUID getSubject(String token) {
        return UUID.fromString(parse(token).getSubject());
    }

    public String getRole(String token) {
        return parse(token).get("role", String.class);
    }

    public String getName(String token) {
        return parse(token).get("name", String.class);
    }

    public String getEmail(String token) {
        return parse(token).get("email", String.class);
    }

    public boolean isExpired(String token) {
        return parse(token).getExpiration().before(new Date());
    }
}
