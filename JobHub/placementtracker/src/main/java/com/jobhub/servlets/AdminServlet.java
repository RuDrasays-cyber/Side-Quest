package com.jobhub.servlets;

import java.io.BufferedReader;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobhub.util.DBConnection;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@WebServlet("/admin/*")
public class AdminServlet extends HttpServlet {
    private final ObjectMapper mapper = new ObjectMapper();

    private String getJwtFromHeader(HttpServletRequest req) {
        String authHeader = req.getHeader("Authorization");
        return (authHeader != null && authHeader.startsWith("Bearer ")) ? authHeader.substring(7) : null;
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");
        String jwt = getJwtFromHeader(req);
        if (jwt == null) { resp.setStatus(401); return; }

        String pathInfo = req.getPathInfo();
        if (pathInfo == null) pathInfo = "/";

        try (Connection conn = DBConnection.getConnection()) {
            DBConnection.setRLSContextWithJWT(conn, jwt);

            switch (pathInfo) {
                case "/users":
                    handleGetUsers(conn, resp);
                    break;
                case "/verifications":
                    handleGetVerifications(conn, resp);
                    break;
                case "/logs":
                    handleGetLogs(conn, resp);
                    break;
                case "/analytics":
                    handleGetAnalytics(conn, resp);
                    break;
                default:
                    resp.setStatus(404);
                    resp.getWriter().write("{\"error\":\"Unknown admin endpoint\"}");
            }
        } catch (Exception e) {
            e.printStackTrace();
            resp.setStatus(500);
            resp.getWriter().write("{\"error\":\"" + e.getMessage().replace("\"", "'") + "\"}");
        }
    }

    // ── GET /admin/users ──
    private void handleGetUsers(Connection conn, HttpServletResponse resp) throws Exception {
        List<Map<String, Object>> users = new ArrayList<>();
        String sql = "SELECT p.id, p.name, p.email, p.role, p.created_at, p.is_review_banned "
                   + "FROM profiles p ORDER BY p.created_at DESC NULLS LAST";
        try (PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                Map<String, Object> user = new HashMap<>();
                user.put("id", rs.getString("id"));
                String name = rs.getString("name");
                String email = rs.getString("email");
                user.put("name", name != null && !name.isEmpty() ? name : (email != null ? email.split("@")[0] : "Unknown"));
                user.put("email", email);
                user.put("role", rs.getString("role"));
                user.put("status", rs.getBoolean("is_review_banned") ? "banned" : "active");
                java.sql.Timestamp ts = rs.getTimestamp("created_at");
                user.put("createdAt", ts != null ? ts.toString().substring(0, 10) : "Recently");
                users.add(user);
            }
        }
        conn.commit();
        mapper.writeValue(resp.getWriter(), users);
    }

    // ── GET /admin/verifications ──
    private void handleGetVerifications(Connection conn, HttpServletResponse resp) throws Exception { try(java.sql.Statement s = conn.createStatement()){s.execute("RESET ROLE;");}
        List<Map<String, Object>> results = new ArrayList<>();

        // Unverified + verified companies
        String compSql = "SELECT c.id, c.name, c.risk_level, c.is_verified_by_admin, p.email, p.created_at "
                       + "FROM companies c LEFT JOIN profiles p ON c.profile_id = p.id "
                       + "ORDER BY c.is_verified_by_admin ASC, c.id DESC";
        try (PreparedStatement stmt = conn.prepareStatement(compSql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", String.valueOf(rs.getLong("id")));
                item.put("type", "company");
                item.put("name", rs.getString("name") != null ? rs.getString("name") : "Unknown Company");
                item.put("email", rs.getString("email") != null ? rs.getString("email") : "");
                item.put("domain", "");
                item.put("status", rs.getBoolean("is_verified_by_admin") ? "approved" : "pending");
                String risk = rs.getString("risk_level");
                item.put("risk", "High".equals(risk) ? "High" : "Medium".equals(risk) ? "Medium" : "Low");
                java.sql.Timestamp ts = rs.getTimestamp("created_at");
                item.put("createdAt", ts != null ? ts.toString().substring(0, 10) : "Recently");
                results.add(item);
            }
        }

        // University domains
        String uniSql = "SELECT id, university_name, domain_name, risk_level, is_verified "
                      + "FROM universities ORDER BY is_verified ASC, id DESC";
        try (PreparedStatement stmt = conn.prepareStatement(uniSql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", String.valueOf(rs.getLong("id")));
                item.put("type", "university");
                item.put("name", rs.getString("university_name") != null ? rs.getString("university_name") : "Unknown University");
                item.put("email", "");
                item.put("domain", rs.getString("domain_name") != null ? rs.getString("domain_name") : "");
                item.put("status", rs.getBoolean("is_verified") ? "approved" : "pending");
                String risk = rs.getString("risk_level");
                item.put("risk", "High".equals(risk) ? "High" : "Medium".equals(risk) ? "Medium" : "Low");
                item.put("createdAt", "Recently");
                results.add(item);
            }
        }

        conn.commit();
        mapper.writeValue(resp.getWriter(), results);
    }

    // ── GET /admin/logs ──
    private void handleGetLogs(Connection conn, HttpServletResponse resp) throws Exception {
        List<Map<String, Object>> logs = new ArrayList<>();

        // Recent notifications
        String notifSql = "SELECT id, title, message, created_at, profile_id FROM notifications "
                        + "ORDER BY created_at DESC NULLS LAST LIMIT 20";
        try (PreparedStatement stmt = conn.prepareStatement(notifSql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                Map<String, Object> log = new HashMap<>();
                log.put("id", "notif-" + rs.getLong("id"));
                log.put("type", "notification");
                log.put("action", rs.getString("title") + ": " + rs.getString("message"));
                log.put("user", "System");
                java.sql.Timestamp ts = rs.getTimestamp("created_at");
                log.put("timestamp", ts != null ? ts.toInstant().toString() : null);
                logs.add(log);
            }
        }

        // Recent applications
        String appSql = "SELECT a.id, a.status, a.applied_at, j.title AS job_title "
                      + "FROM applications a LEFT JOIN jobs j ON a.job_id = j.id "
                      + "ORDER BY a.applied_at DESC NULLS LAST LIMIT 15";
        try (PreparedStatement stmt = conn.prepareStatement(appSql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                Map<String, Object> log = new HashMap<>();
                log.put("id", "app-" + rs.getLong("id"));
                log.put("type", "application");
                String jobTitle = rs.getString("job_title");
                log.put("action", "Application for \"" + (jobTitle != null ? jobTitle : "Unknown") + "\" (" + rs.getString("status") + ")");
                log.put("user", "Student");
                java.sql.Timestamp ts = rs.getTimestamp("applied_at");
                log.put("timestamp", ts != null ? ts.toInstant().toString() : null);
                logs.add(log);
            }
        }

        // Recent reviews
        String revSql = "SELECT r.id, r.rating, r.is_approved, r.created_at, p.email "
                      + "FROM reviews r LEFT JOIN profiles p ON r.profile_id = p.id "
                      + "ORDER BY r.created_at DESC NULLS LAST LIMIT 10";
        try (PreparedStatement stmt = conn.prepareStatement(revSql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                Map<String, Object> log = new HashMap<>();
                log.put("id", "review-" + rs.getLong("id"));
                log.put("type", "review");
                String email = rs.getString("email");
                String userEmail = email != null ? email.split("@")[0] : "anonymous";
                log.put("action", rs.getInt("rating") + "-star review " + (rs.getBoolean("is_approved") ? "(Approved)" : "(Pending)"));
                log.put("user", userEmail);
                java.sql.Timestamp ts = rs.getTimestamp("created_at");
                log.put("timestamp", ts != null ? ts.toInstant().toString() : null);
                logs.add(log);
            }
        }

        // Recent registrations
        String regSql = "SELECT id, name, email, role, created_at FROM profiles "
                      + "ORDER BY created_at DESC NULLS LAST LIMIT 15";
        try (PreparedStatement stmt = conn.prepareStatement(regSql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                Map<String, Object> log = new HashMap<>();
                log.put("id", "user-" + rs.getString("id"));
                log.put("type", "registration");
                String name = rs.getString("name");
                String email = rs.getString("email");
                String userName = name != null ? name : (email != null ? email.split("@")[0] : "unknown");
                log.put("action", "New " + rs.getString("role") + " registration");
                log.put("user", userName);
                java.sql.Timestamp ts = rs.getTimestamp("created_at");
                log.put("timestamp", ts != null ? ts.toInstant().toString() : null);
                logs.add(log);
            }
        }

        // Sort by timestamp descending
        logs.sort((a, b) -> {
            String ta = (String) a.get("timestamp");
            String tb = (String) b.get("timestamp");
            if (ta == null && tb == null) return 0;
            if (ta == null) return 1;
            if (tb == null) return -1;
            return tb.compareTo(ta);
        });

        conn.commit();
        mapper.writeValue(resp.getWriter(), logs);
    }

    // ── GET /admin/analytics ──
    private void handleGetAnalytics(Connection conn, HttpServletResponse resp) throws Exception { try(java.sql.Statement s = conn.createStatement()){s.execute("RESET ROLE;");}
        Map<String, Object> result = new LinkedHashMap<>();

        // ── Total counts (single query with CTEs) ──
        String countsSql = 
            "SELECT " +
            "(SELECT COUNT(*) FROM students) AS total_students, " +
            "(SELECT COUNT(*) FROM students WHERE is_on_campus = true) AS on_campus, " +
            "(SELECT COUNT(*) FROM universities) AS total_universities, " +
            "(SELECT COUNT(*) FROM companies) AS total_companies, " +
            "(SELECT COUNT(*) FROM jobs) AS total_jobs, " +
            "(SELECT COUNT(*) FROM applications) AS total_applications, " +
            "(SELECT COUNT(*) FROM applications WHERE LOWER(status) = 'accepted') AS total_placements";

        try (PreparedStatement stmt = conn.prepareStatement(countsSql);
             ResultSet rs = stmt.executeQuery()) {
            if (rs.next()) {
                long totalStudents = rs.getLong("total_students");
                long onCampus = rs.getLong("on_campus");
                result.put("totalStudents", totalStudents);
                result.put("onCampusStudents", onCampus);
                result.put("offCampusStudents", totalStudents - onCampus);
                result.put("studentTrend", "+" + totalStudents);

                long totalUni = rs.getLong("total_universities");
                result.put("totalUniversities", totalUni);
                result.put("uniTrend", "+" + totalUni);

                long totalComp = rs.getLong("total_companies");
                result.put("totalCompanies", totalComp);
                result.put("compTrend", "+" + totalComp);

                long totalJobs = rs.getLong("total_jobs");
                result.put("totalJobs", totalJobs);
                result.put("activeJobs", totalJobs);
                result.put("jobTrend", "+" + totalJobs);

                long placements = rs.getLong("total_placements");
                result.put("totalPlacements", placements);
                result.put("placementTrend", "+" + placements);
            }
        }

        // ── Role distribution (for pie chart) ──
        List<Map<String, Object>> roleDistribution = new ArrayList<>();
        String roleSql = "SELECT role, COUNT(*) AS cnt FROM profiles WHERE role IS NOT NULL GROUP BY role";
        Map<String, String> roleLabels = Map.of(
            "student", "Students", "company", "Companies",
            "university_admin", "Universities", "super_admin", "Admins"
        );
        try (PreparedStatement stmt = conn.prepareStatement(roleSql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                Map<String, Object> item = new LinkedHashMap<>();
                String role = rs.getString("role");
                item.put("name", roleLabels.getOrDefault(role, role));
                item.put("value", rs.getLong("cnt"));
                roleDistribution.add(item);
            }
        }
        result.put("roleDistribution", roleDistribution);

        // ── Jobs by company (bar chart — top 8) ──
        List<Map<String, Object>> jobsByCompany = new ArrayList<>();
        String jobCompSql = "SELECT c.name, COUNT(j.id) AS jobs FROM jobs j "
                          + "JOIN companies c ON j.company_id = c.id "
                          + "GROUP BY c.name ORDER BY jobs DESC LIMIT 8";
        try (PreparedStatement stmt = conn.prepareStatement(jobCompSql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("company", rs.getString("name"));
                item.put("jobs", rs.getLong("jobs"));
                jobsByCompany.add(item);
            }
        }
        result.put("jobPostingsByCompany", jobsByCompany);

        // ── Monthly registrations (line chart — last 6 months from profiles.created_at) ──
        List<Map<String, Object>> monthly = new ArrayList<>();
        String monthSql = 
            "SELECT TO_CHAR(created_at, 'Mon YYYY') AS month, " +
            "SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) AS students, " +
            "SUM(CASE WHEN role = 'company' THEN 1 ELSE 0 END) AS companies, " +
            "SUM(CASE WHEN role = 'university_admin' THEN 1 ELSE 0 END) AS universities " +
            "FROM profiles " +
            "WHERE created_at >= NOW() - INTERVAL '6 months' " +
            "GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at) " +
            "ORDER BY DATE_TRUNC('month', created_at)";
        try (PreparedStatement stmt = conn.prepareStatement(monthSql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("month", rs.getString("month"));
                item.put("students", rs.getLong("students"));
                item.put("companies", rs.getLong("companies"));
                item.put("universities", rs.getLong("universities"));
                monthly.add(item);
            }
        }
        result.put("monthlyRegistrations", monthly);

        conn.commit();
        mapper.writeValue(resp.getWriter(), result);
    }

    // ── PATCH & DELETE handler ──
    @Override
    protected void service(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String method = req.getMethod();

        if ("PATCH".equalsIgnoreCase(method)) {
            resp.setContentType("application/json");
            String jwt = getJwtFromHeader(req);
            if (jwt == null) { resp.setStatus(401); return; }

            String pathInfo = req.getPathInfo();
            if (pathInfo == null) { resp.setStatus(400); return; }

            try (Connection conn = DBConnection.getConnection()) {
                DBConnection.setRLSContextWithJWT(conn, jwt);

                if (pathInfo.matches("/users/[^/]+/ban")) {
                    // Ban user: PATCH /admin/users/{id}/ban
                    String userId = pathInfo.split("/")[2];
                    try (PreparedStatement stmt = conn.prepareStatement(
                            "UPDATE profiles SET is_review_banned = true, banned_until = NOW() + INTERVAL '42 hours' WHERE id = ?::uuid")) {
                        stmt.setString(1, userId);
                        stmt.executeUpdate();
                    }
                    conn.commit();
                    resp.getWriter().write("{\"message\":\"User banned successfully\"}");

                } else if (pathInfo.matches("/verifications/\\d+/status")) {
                    // Update verification: PATCH /admin/verifications/{id}/status
                    String idStr = pathInfo.split("/")[2];
                    long entityId = Long.parseLong(idStr);
                    
                    // Read request body for status + type
                    StringBuilder body = new StringBuilder();
                    try (BufferedReader reader = req.getReader()) {
                        String line;
                        while ((line = reader.readLine()) != null) body.append(line);
                    }
                    @SuppressWarnings("unchecked")
                    Map<String, String> payload = mapper.readValue(body.toString(), Map.class);
                    String status = payload.get("status");
                    boolean approved = "approved".equalsIgnoreCase(status);

                    // Try companies first, then universities
                    try (PreparedStatement stmt = conn.prepareStatement(
                            "UPDATE companies SET is_verified_by_admin = ? WHERE id = ?")) {
                        stmt.setBoolean(1, approved);
                        stmt.setLong(2, entityId);
                        int rows = stmt.executeUpdate();
                        if (rows == 0) {
                            // Try universities
                            try (PreparedStatement stmt2 = conn.prepareStatement(
                                    "UPDATE universities SET is_verified = ? WHERE id = ?")) {
                                stmt2.setBoolean(1, approved);
                                stmt2.setLong(2, entityId);
                                stmt2.executeUpdate();
                            }
                        }
                    }
                    conn.commit();
                    resp.getWriter().write("{\"message\":\"Verification status updated\"}");

                } else {
                    resp.getWriter().write("{\"message\":\"Admin patch action successful\"}");
                }
            } catch (Exception e) {
                resp.setStatus(500);
                resp.getWriter().write("{\"error\":\"" + e.getMessage().replace("\"", "'") + "\"}");
            }

        } else if ("DELETE".equalsIgnoreCase(method)) {
            resp.setContentType("application/json");
            String jwt = getJwtFromHeader(req);
            if (jwt == null) { resp.setStatus(401); return; }

            String pathInfo = req.getPathInfo();
            if (pathInfo != null && pathInfo.matches("/users/[^/]+")) {
                String userId = pathInfo.split("/")[2];
                try (Connection conn = DBConnection.getConnection()) {
                    DBConnection.setRLSContextWithJWT(conn, jwt);
                    // Delete from profiles cascades to students/companies etc.
                    try (PreparedStatement stmt = conn.prepareStatement("DELETE FROM profiles WHERE id = ?::uuid")) {
                        stmt.setString(1, userId);
                        stmt.executeUpdate();
                    }
                    conn.commit();
                } catch (Exception e) {
                    resp.setStatus(500);
                    resp.getWriter().write("{\"error\":\"" + e.getMessage().replace("\"", "'") + "\"}");
                    return;
                }
            }
            resp.getWriter().write("{\"message\":\"Admin delete action successful\"}");

        } else {
            super.service(req, resp);
        }
    }
}
