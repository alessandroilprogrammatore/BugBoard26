package com.bugboard26.repository;

import com.bugboard26.model.Label;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LabelRepository extends JpaRepository<Label, UUID> {
    Optional<Label> findByName(String name);
    boolean existsByName(String name);
}
