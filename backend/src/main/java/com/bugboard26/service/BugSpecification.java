package com.bugboard26.service;

import com.bugboard26.model.Bug;
import com.bugboard26.model.BugStatus;
import com.bugboard26.model.BugType;
import com.bugboard26.model.Priority;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import java.util.ArrayList;
import java.util.List;

public class BugSpecification {

    public static Specification<Bug> createSpecification(
        BugType type,
        BugStatus status,
        Priority priority,
        String label,
        String search
    ) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (type != null) {
                predicates.add(criteriaBuilder.equal(root.get("type"), type));
            }

            if (status != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), status));
            }

            if (priority != null) {
                predicates.add(criteriaBuilder.equal(root.get("priority"), priority));
            }

            if (label != null && !label.trim().isEmpty()) {
                Join<Bug, com.bugboard26.model.Label> labelJoin = root.join("labels", JoinType.INNER);
                predicates.add(criteriaBuilder.equal(labelJoin.get("name"), label));
            }

            if (search != null && !search.trim().isEmpty()) {
                String searchPattern = "%" + search.toLowerCase() + "%";
                Predicate titleMatch = criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("title")), searchPattern
                );
                Predicate descriptionMatch = criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("description")), searchPattern
                );
                predicates.add(criteriaBuilder.or(titleMatch, descriptionMatch));
            }

            // Exclude archived bugs by default
            predicates.add(criteriaBuilder.isFalse(root.get("archived")));

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
